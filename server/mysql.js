import mysql from 'mysql2/promise';
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 方案B（每租户一个数据库）基础设施：
 * - shared：所有租户共享一个DB（现状）
 * - database：每个 companyId 使用独立数据库（gaokongche_tenant_<companyId>）
 *
 * 重要：为了尽量少改动现有路由代码，这里提供一个“租户感知”的 pool 代理：
 * 路由继续使用 pool.query/getConnection，但实际会根据 AsyncLocalStorage 的上下文自动路由到对应租户库。
 */
const als = new AsyncLocalStorage();

export function runWithDbContext(ctx, fn) {
  return als.run(ctx, fn);
}

export function getDbContext() {
  return als.getStore();
}

function createPool({ host, port, user, password, database, connectionLimit }) {
  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit,
    queueLimit: 100,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 10000,
    maxIdle: 10,
    idleTimeout: 60000,
  });

  // 监听连接池事件
  pool.on('acquire', (connection) => {
    console.log(`[MySQL Pool] Connection ${connection.threadId} acquired`);
  });
  pool.on('release', (connection) => {
    console.log(`[MySQL Pool] Connection ${connection.threadId} released`);
  });
  pool.on('enqueue', () => {
    console.log('[MySQL Pool] Waiting for available connection slot');
  });
  return pool;
}

function normalizeSqlForTenant(sql) {
  // 仅做“够用”的清洗：去注释/空行，移除 USE / CREATE DATABASE 语句，避免切库误伤
  // 注意：迁移脚本应尽量是幂等的（CREATE IF NOT EXISTS / ALTER ... IF EXISTS 等）
  // 去除文件级 BOM（Windows/某些编辑器可能会写入）
  const normalized = String(sql || '').replace(/^\uFEFF/, '');
  const lines = normalized.split('\n').map(line => line.trimEnd());
  const out = [];
  let skipUntilSemicolon = false;

  for (const line of lines) {
    // 去除行首 BOM（保险：如果 BOM 不在文件首行也能处理）
    const t = line.trim().replace(/^\uFEFF/, '');

    // 跳过空行/注释
    if (!t) continue;
    if (t.startsWith('--')) continue;

    // 如果在跳过块中（例如 CREATE DATABASE 多行语句），直到遇到分号结束
    if (skipUntilSemicolon) {
      if (t.includes(';')) skipUntilSemicolon = false;
      continue;
    }

    // 跳过 USE 语句（一般单行）
    if (/^USE\s+/i.test(t)) {
      // 如果 USE 写成多行（极少见），也安全处理到分号
      if (!t.includes(';')) skipUntilSemicolon = true;
      continue;
    }

    // 跳过 CREATE DATABASE 语句（可能多行）
    if (/^CREATE\s+DATABASE\s+/i.test(t)) {
      if (!t.includes(';')) skipUntilSemicolon = true;
      continue;
    }

    // 其它语句保留
    out.push(line);
  }

  return out.join('\n').trim();
}

function stripBlockCommentsPreserveStrings(input) {
  // 移除 /* ... */ 块注释（但保留字符串/反引号中的内容）
  const s = String(input || '');
  let out = '';
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let i = 0;

  while (i < s.length) {
    const ch = s[i];
    const next = i + 1 < s.length ? s[i + 1] : '';
    const prev = i > 0 ? s[i - 1] : '';

    if (ch === "'" && !inDouble && !inBacktick && prev !== '\\') inSingle = !inSingle;
    if (ch === '"' && !inSingle && !inBacktick && prev !== '\\') inDouble = !inDouble;
    if (ch === '`' && !inSingle && !inDouble && prev !== '\\') inBacktick = !inBacktick;

    // 仅在非字符串环境下剥离块注释
    if (!inSingle && !inDouble && !inBacktick && ch === '/' && next === '*') {
      // 跳到注释结束 */
      i += 2;
      while (i < s.length) {
        if (s[i] === '*' && i + 1 < s.length && s[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

async function ensureMigrationsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      executed_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_executed_at (executed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function getExecutedMigrations(conn) {
  try {
    const [rows] = await conn.query('SELECT migration_name FROM _migrations');
    return new Set(rows.map(r => r.migration_name));
  } catch (_e) {
    return new Set();
  }
}

async function recordMigration(conn, migrationName) {
  await conn.query('INSERT IGNORE INTO _migrations (migration_name) VALUES (?)', [migrationName]);
}

function splitSqlStatements(sql) {
  /**
   * 支持 DELIMITER（用于 TRIGGER/PROCEDURE/EVENT 等包含内部分号的对象）
   * 规则：
   * - 默认 delimiter 为 ';'
   * - 遇到行首 "DELIMITER xx" 切换 delimiter（并跳过该行）
   * - 以当前 delimiter 作为语句结束符（在引号/反引号外生效）
   */
  const out = [];
  let buf = '';
  let delimiter = ';';

  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;

  const len = sql.length;
  let lineStart = 0;

  function flushStmt(raw) {
    const stmt = String(raw || '').trim();
    if (stmt) out.push(stmt);
  }

  for (let i = 0; i < len; ) {
    // 检测行首 DELIMITER 指令（不在引号中时才识别）
    if (!inSingle && !inDouble && !inBacktick && i === lineStart) {
      // 取本行内容（直到 \n）
      let j = i;
      while (j < len && sql[j] !== '\n') j++;
      const line = sql.slice(i, j).trim().replace(/^\uFEFF/, '');
      const m = /^DELIMITER\s+(.+)$/i.exec(line);
      if (m) {
        // 切换 delimiter，并跳过该行
        delimiter = String(m[1] || '').trim();
        if (!delimiter) delimiter = ';';
        // flush 之前累积的内容（理论上 delimiter 行应该在语句边界）
        flushStmt(buf);
        buf = '';

        // 跳到下一行
        i = j + 1;
        lineStart = i;
        continue;
      }
    }

    // delimiter 命中检测（在引号外）
    if (!inSingle && !inDouble && !inBacktick && delimiter && sql.startsWith(delimiter, i)) {
      flushStmt(buf);
      buf = '';
      i += delimiter.length;
      continue;
    }

    const ch = sql[i];
    const prev = i > 0 ? sql[i - 1] : '';

    if (ch === "'" && !inDouble && !inBacktick && prev !== '\\') inSingle = !inSingle;
    if (ch === '"' && !inSingle && !inBacktick && prev !== '\\') inDouble = !inDouble;
    if (ch === '`' && !inSingle && !inDouble && prev !== '\\') inBacktick = !inBacktick;

    buf += ch;

    if (ch === '\n') {
      lineStart = i + 1;
    }

    i++;
  }

  flushStmt(buf);
  return out;
}

function isIgnorableSqlError(err) {
  const code = err?.code;
  // 允许“幂等”执行：字段已存在、索引已存在、表已存在、列/索引不存在（drop时）等
  return (
    code === 'ER_DUP_FIELDNAME' || // Duplicate column
    code === 'ER_DUP_KEYNAME' || // Duplicate index
    code === 'ER_TABLE_EXISTS_ERROR' || // Table exists
    code === 'ER_CANT_DROP_FIELD_OR_KEY' || // Can't drop field/key
    code === 'ER_TRG_ALREADY_EXISTS' || // Trigger exists
    code === 'ER_SP_ALREADY_EXISTS' || // Stored procedure exists
    code === 'ER_EVENT_ALREADY_EXISTS' || // Event exists
    code === 'ER_FK_DUP_NAME' || // Duplicate foreign key constraint name (errno 1826)
    code === 'ER_KEY_COLUMN_DOES_NOT_EXITS' || // Key column doesn't exist (errno 1072)
    code === 'ER_NO_SUCH_TABLE' // Table doesn't exist (errno 1146)
  );
}

function sanitizeStatementForMySQL(stmt) {
  // MySQL 不支持某些对象的 IF NOT EXISTS 语法（会报 ER_PARSE_ERROR）
  let s = String(stmt || '').trim().replace(/^\uFEFF/, '');

  s = s.replace(/^CREATE\s+TRIGGER\s+IF\s+NOT\s+EXISTS\s+/i, 'CREATE TRIGGER ');
  s = s.replace(/^CREATE\s+PROCEDURE\s+IF\s+NOT\s+EXISTS\s+/i, 'CREATE PROCEDURE ');
  s = s.replace(/^CREATE\s+EVENT\s+IF\s+NOT\s+EXISTS\s+/i, 'CREATE EVENT ');
  s = s.replace(/^CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+/i, 'CREATE INDEX ');
  s = s.replace(/^CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+/i, 'CREATE UNIQUE INDEX ');
  
  // MySQL 不支持 ALTER TABLE ... ADD COLUMN/INDEX IF NOT EXISTS（使用全局替换，因为可能出现多次）
  s = s.replace(/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+/gi, 'ADD COLUMN ');
  s = s.replace(/ADD\s+INDEX\s+IF\s+NOT\s+EXISTS\s+/gi, 'ADD INDEX ');
  s = s.replace(/ADD\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+/gi, 'ADD UNIQUE INDEX ');

  return s.trim();
}

function stripAlterTableColumnPositioning(stmt) {
  // 仅用于兼容“字段位置”失败（AFTER/FIRST）。删除位置子句不影响业务语义。
  let s = String(stmt || '').trim();
  // 常见形态：... AFTER `col` 或 ... AFTER col 或 ... FIRST（一般在语句末尾）
  s = s.replace(/\s+AFTER\s+`[^`]+`\s*$/i, '');
  s = s.replace(/\s+AFTER\s+[A-Za-z0-9_]+\s*$/i, '');
  s = s.replace(/\s+FIRST\s*$/i, '');
  return s.trim();
}

async function runSqlFile(conn, absolutePath, migrationName) {
  const raw = await fs.readFile(absolutePath, 'utf8');
  // 先剥离块注释，避免出现 “near '/*' at line 1”
  const noBlockComments = stripBlockCommentsPreserveStrings(raw);
  const cleanSql = normalizeSqlForTenant(noBlockComments);
  if (!cleanSql) return;

  // 逐条语句执行，避免一个文件内“部分幂等、部分失败”导致整体失败
  const statements = splitSqlStatements(cleanSql);
  for (const stmt of statements) {
    try {
      const sanitized = sanitizeStatementForMySQL(stmt);
      if (!sanitized) continue;
      await conn.query(sanitized);
    } catch (err) {
      if (isIgnorableSqlError(err)) {
        console.warn(`[Tenant DB] 忽略可重复执行错误: ${err.code} (${migrationName || path.basename(absolutePath)})`);
        continue;
      }

      // 兼容：ER_BAD_FIELD_ERROR（字段不存在）
      if (err?.code === 'ER_BAD_FIELD_ERROR') {
        const sanitized = sanitizeStatementForMySQL(stmt);
        
        // 情况1：ALTER TABLE ... MODIFY COLUMN xxx，字段不存在 → 跳过（幂等）
        if (
          /^ALTER\s+TABLE\s+/i.test(sanitized) &&
          /\s+MODIFY\s+COLUMN\s+/i.test(sanitized)
        ) {
          console.warn(`[Tenant DB] 跳过 MODIFY COLUMN（字段不存在）: ${err.code} (${migrationName || path.basename(absolutePath)})`);
          continue;
        }
        
        // 情况2：UPDATE/DELETE/SELECT 引用不存在的字段 → 跳过（数据迁移不适用）
        if (
          /^(UPDATE|DELETE|SELECT)\s+/i.test(sanitized)
        ) {
          console.warn(`[Tenant DB] 跳过 UPDATE/DELETE/SELECT（引用字段不存在）: ${err.code} (${migrationName || path.basename(absolutePath)})`);
          continue;
        }
        
        // 情况3：CREATE [OR REPLACE] VIEW 引用不存在的字段 → 跳过（视图定义与当前表结构不兼容）
        if (
          /^CREATE\s+(OR\s+REPLACE\s+)?VIEW\s+/i.test(sanitized)
        ) {
          console.warn(`[Tenant DB] 跳过 CREATE VIEW（引用字段不存在）: ${err.code} (${migrationName || path.basename(absolutePath)})`);
          continue;
        }
        
        // 情况4：ALTER TABLE ... ADD COLUMN ... AFTER xxx，xxx 不存在 → 去掉 AFTER 重试
        const retrySql = stripAlterTableColumnPositioning(sanitized);
        if (
          retrySql &&
          retrySql !== sanitized &&
          /^ALTER\s+TABLE\s+/i.test(sanitized) &&
          /\s+ADD\s+COLUMN\s+/i.test(sanitized)
        ) {
          try {
            await conn.query(retrySql);
            console.warn(`[Tenant DB] 已自动移除 AFTER/FIRST 重试成功: (${migrationName || path.basename(absolutePath)})`);
            continue;
          } catch (_e) {
            // 如果重试也失败，交给下方 throw 输出原始错误
          }
        }
      }
      throw err;
    }
  }

  if (migrationName) await recordMigration(conn, migrationName);
}

async function withMysqlLock(conn, lockName, timeoutSeconds, fn) {
  const lockKey = String(lockName);
  const timeout = Number(timeoutSeconds) || 30;
  const [[row]] = await conn.query('SELECT GET_LOCK(?, ?) AS ok', [lockKey, timeout]);
  const ok = row?.ok === 1 || row?.ok === '1';
  if (!ok) throw new Error(`无法获取MySQL锁: ${lockKey}`);
  try {
    return await fn();
  } finally {
    try { await conn.query('SELECT RELEASE_LOCK(?)', [lockKey]); } catch (_e) { }
  }
}

async function ensureTenantMetaTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS _tenant_meta (
      k VARCHAR(64) NOT NULL,
      v TEXT NULL,
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (k)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export const initMySQL = async () => {
  const {
    MYSQL_HOST = '127.0.0.1',
    MYSQL_PORT = '3306',
    MYSQL_USER = 'root',
    MYSQL_PASSWORD = '',
    MYSQL_DB = 'gaokongche',
    // 单租户模式：固定使用 tenant_5 数据库
    MYSQL_TENANT_MODE = 'single',
    MYSQL_TENANT_DB_PREFIX = `${MYSQL_DB}_tenant_`,
    MYSQL_TENANT_POOL_LIMIT = '5',
  } = process.env;

  const host = MYSQL_HOST;
  const port = Number(MYSQL_PORT);
  const user = MYSQL_USER;
  const password = MYSQL_PASSWORD;
  // 单租户模式：使用 gaokongche 主数据库
  const commonDb = 'gaokongche';
  const tenantMode = 'single'; // 强制单租户模式
  const tenantDbPrefix = String(MYSQL_TENANT_DB_PREFIX || `${commonDb}_tenant_`);
  const tenantPoolLimit = Math.max(1, Number(MYSQL_TENANT_POOL_LIMIT) || 5);

  const commonPool = createPool({
    host,
    port,
    user,
    password,
    database: commonDb,
    connectionLimit: 50,
  });

  // ping 测试连接（common）
  try {
    await commonPool.query('SELECT 1');
    console.log(`✅ [MySQL Init] Connected to ${host}:${port} (db: ${commonDb}, tenantMode: ${tenantMode})`);
  } catch (e) {
    console.error('❌ [MySQL Init] Connection error:', e?.message || e);
    throw e;
  }

  const tenantPools = new Map(); // companyId -> pool
  const tenantPrepared = new Set(); // companyId -> boolean (当前进程已准备好)
  const tenantInitLocks = new Map(); // companyId -> Promise (防止并发初始化死锁)

  function getTenantDbName(companyId) {
    const id = Number(companyId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return `${tenantDbPrefix}${id}`;
  }

  function getTenantPool(companyId) {
    const id = Number(companyId);
    const dbName = getTenantDbName(id);
    if (!dbName) return null;
    if (tenantPools.has(id)) return tenantPools.get(id);
    const p = createPool({
      host,
      port,
      user,
      password,
      database: dbName,
      connectionLimit: tenantPoolLimit,
    });
    tenantPools.set(id, p);
    return p;
  }

  function getCurrentPool() {
    if (tenantMode !== 'database') return commonPool;
    const ctx = als.getStore();
    if (ctx?.scope === 'common') return commonPool;
    const companyId = ctx?.companyId;
    const p = companyId ? getTenantPool(companyId) : null;
    return p || commonPool;
  }

  // 关键：给路由一个“看起来像pool”的代理对象，但内部按上下文路由
  const pool = {
    query: (...args) => getCurrentPool().query(...args),
    execute: (...args) => getCurrentPool().execute?.(...args) ?? getCurrentPool().query(...args),
    getConnection: (...args) => getCurrentPool().getConnection(...args),
  };

  async function ensureTenantDatabase(companyId) {
    if (tenantMode !== 'database') {
      return { ok: false, skipped: true, reason: 'MYSQL_TENANT_MODE != database' };
    }
    const dbName = getTenantDbName(companyId);
    if (!dbName) return { ok: false, error: 'invalid companyId' };

    // 1) 创建租户数据库
    const adminConn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    });
    try {
      await adminConn.query(
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    } finally {
      await adminConn.end();
    }

    // 2) 连接租户库，执行 baseline + pending migrations
    const tenantConn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database: dbName,
      multipleStatements: true,
    });

    try {
      await ensureMigrationsTable(tenantConn);
      const executed = await getExecutedMigrations(tenantConn);

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const sqlDir = path.resolve(__dirname, '../sql/mysql');

      // 2.1 使用 Baseline Schema 快速初始化（新方案）
      const baselineName = '__baseline_v1.0';
      if (!executed.has(baselineName)) {
        console.log(`[Tenant DB] 使用 Baseline Schema 初始化租户库: ${dbName}`);
        const baselinePath = path.resolve(process.cwd(), 'sql/mysql/baseline_v1.0.sql');
        
        try {
          await runSqlFile(tenantConn, baselinePath, baselineName);
          console.log(`[Tenant DB] ✅ Baseline Schema 执行成功`);
        } catch (err) {
          console.error(`[Tenant DB] ❌ Baseline Schema 执行失败:`, err.message);
          throw err;
        }
        
        // 标记所有历史迁移（001-081）为"已执行"（不实际运行，避免兼容性问题）
        console.log(`[Tenant DB] 标记历史迁移为已执行...`);
        const allMigrationFiles = (await fs.readdir(sqlDir))
          .filter(f => f.endsWith('.sql') && /^\d{3}_/.test(f))
          .filter(f => {
            const num = parseInt(f.substring(0, 3));
            return num >= 1 && num <= 81; // 历史迁移范围
          })
          .sort();
        
        for (const f of allMigrationFiles) {
          if (!executed.has(f)) {
            await recordMigration(tenantConn, f);
          }
        }
        console.log(`[Tenant DB] 已标记 ${allMigrationFiles.length} 个历史迁移`);
      }

      // 2.2 执行新的增量迁移（082+）
      const newMigrationFiles = (await fs.readdir(sqlDir))
        .filter(f => f.endsWith('.sql') && /^\d{3}_/.test(f))
        .filter(f => {
          const num = parseInt(f.substring(0, 3));
          return num > 81; // 只执行新迁移
        })
        .sort();

      let applied = 0;
      for (const f of newMigrationFiles) {
        if (executed.has(f)) continue;
        const filePath = path.join(sqlDir, f);
        console.log(`[Tenant DB] 执行新迁移: ${f}`);
        await runSqlFile(tenantConn, filePath, f);
        applied++;
      }

      const totalMarked = executed.has(baselineName) ? 0 : (await getExecutedMigrations(tenantConn)).size - applied;
      return { 
        ok: true, 
        dbName, 
        appliedMigrations: applied,
        markedMigrations: totalMarked,
        usingBaseline: !executed.has(baselineName)
      };
    } finally {
      await tenantConn.end();
    }
  }

  async function ensureTenantSeeded(companyId) {
    if (tenantMode !== 'database') {
      return { ok: false, skipped: true, reason: 'MYSQL_TENANT_MODE != database' };
    }
    const dbName = getTenantDbName(companyId);
    if (!dbName) return { ok: false, error: 'invalid companyId' };

    // 连接租户库
    const tenantConn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database: dbName,
      multipleStatements: true,
    });

    try {
      await ensureTenantMetaTable(tenantConn);

      // 一次只允许一个并发seed（避免多请求并发复制）
      return await withMysqlLock(tenantConn, `seed:${dbName}`, 30, async () => {
        const [metaRows] = await tenantConn.query('SELECT v FROM _tenant_meta WHERE k = ?', ['seeded_from_common']);
        if (metaRows?.length && String(metaRows[0].v) === '1') {
          return { ok: true, dbName, seeded: false, already: true };
        }

        // 获取 common 库中所有包含 company_id 的表（排除视图）
        const [tables] = await commonPool.query(
          `SELECT DISTINCT c.table_name AS tableName
           FROM information_schema.columns c
           INNER JOIN information_schema.tables t 
             ON c.table_schema = t.table_schema 
             AND c.table_name = t.table_name
           WHERE c.table_schema = ? 
             AND c.column_name = 'company_id'
             AND t.table_type = 'BASE TABLE'`,
          [commonDb]
        );
        const tableNames = (tables || []).map(r => r.tableName).filter(Boolean);

        // company表一般按 id 复制（若它包含 company_id 也无妨，这里单独处理更安全）
        if (tableNames.includes('companies')) {
          // 复制当前公司信息到租户库（用于某些历史SQL join 或展示）
          const [cols] = await commonPool.query(
            `SELECT column_name AS c
             FROM information_schema.columns
             WHERE table_schema = ? AND table_name = 'companies'
             ORDER BY ordinal_position`,
            [commonDb]
          );
          const colList = (cols || []).map(x => x.c).filter(Boolean);
          if (colList.length) {
            const colsSql = colList.map(c => `\`${c}\``).join(', ');
            await tenantConn.query('SET FOREIGN_KEY_CHECKS=0');
            await tenantConn.query(
              `INSERT IGNORE INTO \`${dbName}\`.\`companies\` (${colsSql})
               SELECT ${colsSql} FROM \`${commonDb}\`.\`companies\` WHERE id = ?`,
              [Number(companyId)]
            );
            await tenantConn.query('SET FOREIGN_KEY_CHECKS=1');
          }
        }

        // 禁用外键检查，避免插入顺序问题（如果未来加了FK）
        await tenantConn.query('SET FOREIGN_KEY_CHECKS=0');

        let copiedTables = 0;
        for (const t of tableNames) {
          if (t === '_migrations' || t === '_tenant_meta') continue;
          // companies 已按 id 复制，不再重复按 company_id 复制（避免逻辑错误）
          if (t === 'companies') continue;

          // 列表（按 common 表字段顺序）
          const [cols] = await commonPool.query(
            `SELECT column_name AS c
             FROM information_schema.columns
             WHERE table_schema = ? AND table_name = ?
             ORDER BY ordinal_position`,
            [commonDb, t]
          );
          const colList = (cols || []).map(x => x.c).filter(Boolean);
          if (!colList.length) continue;
          const colsSql = colList.map(c => `\`${c}\``).join(', ');

          // 按 company_id 复制
          await tenantConn.query(
            `INSERT IGNORE INTO \`${dbName}\`.\`${t}\` (${colsSql})
             SELECT ${colsSql} FROM \`${commonDb}\`.\`${t}\`
             WHERE company_id = ?`,
            [Number(companyId)]
          );
          copiedTables++;
        }

        await tenantConn.query('SET FOREIGN_KEY_CHECKS=1');

        // 标记已完成一次性seed
        await tenantConn.query(
          `INSERT INTO _tenant_meta (k, v) VALUES ('seeded_from_common', '1')
           ON DUPLICATE KEY UPDATE v = VALUES(v)`
        );

        return { ok: true, dbName, seeded: true, copiedTables };
      });
    } finally {
      await tenantConn.end();
    }
  }

  async function syncTenantUser(companyId, userPayload) {
    if (tenantMode !== 'database') return { ok: false, skipped: true, reason: 'MYSQL_TENANT_MODE != database' };
    const dbName = getTenantDbName(companyId);
    if (!dbName) return { ok: false, error: 'invalid companyId' };
    if (!userPayload?.id) return { ok: false, skipped: true, reason: 'no user payload' };

    // 只同步必要字段，避免与 schema 差异强耦合
    const tenantConn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database: dbName,
      multipleStatements: true,
    });
    try {
      // users 表在 tenant 库由 baseline 创建；若不存在，直接跳过（避免阻塞业务）
      try {
        await tenantConn.query(
          `INSERT INTO users (id, username, role, company_id, is_active, created_at, updated_at, name)
           VALUES (?, ?, ?, ?, 1, NOW(), NOW(), ?)
           ON DUPLICATE KEY UPDATE
             username = VALUES(username),
             role = VALUES(role),
             company_id = VALUES(company_id),
             name = VALUES(name),
             updated_at = NOW()`,
          [
            Number(userPayload.id),
            String(userPayload.username || ''),
            String(userPayload.role || ''),
            Number(companyId),
            String(userPayload.name || userPayload.realName || ''),
          ]
        );
      } catch (_e) {
        return { ok: false, skipped: true, reason: 'users table not compatible' };
      }
      return { ok: true };
    } finally {
      await tenantConn.end();
    }
  }

  async function ensureTenantReady(companyId, userPayload) {
    if (tenantMode !== 'database') return { ok: false, skipped: true, reason: 'MYSQL_TENANT_MODE != database' };
    const id = Number(companyId);
    if (!Number.isFinite(id) || id <= 0) return { ok: false, error: 'invalid companyId' };

    // 防止并发初始化导致死锁：如果正在初始化，等待完成
    if (tenantInitLocks.has(id)) {
      await tenantInitLocks.get(id);
      // 等待完成后，继续执行用户同步逻辑
    } else if (!tenantPrepared.has(id)) {
      // 创建初始化 Promise 并加锁
      const initPromise = (async () => {
        try {
          const schemaRes = await ensureTenantDatabase(id);
          if (!schemaRes?.ok) return schemaRes;
          const seedRes = await ensureTenantSeeded(id);
          if (!seedRes?.ok) return seedRes;
          tenantPrepared.add(id);
          return { ok: true };
        } finally {
          tenantInitLocks.delete(id);
        }
      })();
      tenantInitLocks.set(id, initPromise);
      const result = await initPromise;
      if (!result?.ok) return result;
    }

    // 每次请求轻量同步一下当前用户，保证 join users 不会缺人
    if (userPayload) {
      await syncTenantUser(id, userPayload);
    }

    return { ok: true, companyId: id, dbName: getTenantDbName(id) };
  }

  return {
    // 兼容旧代码：mysql.pool
    pool,
    // 额外暴露：commonPool/租户能力
    commonPool,
    tenantMode,
    tenantDbPrefix,
    getTenantDbName,
    ensureTenantDatabase,
    ensureTenantSeeded,
    ensureTenantReady,
    syncTenantUser,
    runWithDbContext,
  };
};

export const mysqlHealthCheck = async (poolLike) => {
  try {
    const [rows] = await poolLike.query('SELECT 1 as ok');
    return { ok: true, result: rows[0] };
  } catch (err) {
    return { ok: false, error: err?.message || 'MySQL health error' };
  }
};