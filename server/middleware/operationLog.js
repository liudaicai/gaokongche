/**
 * 操作日志中间件
 * 自动记录关键操作的详细日志
 */

export function operationLogMiddleware(options = {}) {
  const {
    module = 'unknown',
    excludePaths = ['/api/health', '/api/events'],
    excludeMethods = ['GET'],
  } = options;

  return async (req, res, next) => {
    // 跳过排除的路径
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // 跳过排除的方法（默认不记录GET请求）
    if (excludeMethods.includes(req.method)) {
      return next();
    }

    // 记录请求开始时间
    const startTime = Date.now();

    // 保存原始的 res.json 方法
    const originalJson = res.json.bind(res);

    // 重写 res.json 方法以捕获响应
    res.json = function(data) {
      // 计算响应时间
      const responseTime = Date.now() - startTime;

      // 异步记录日志（不阻塞响应）
      setImmediate(async () => {
        try {
          const pool = req.app.locals.mysqlPool;
          if (!pool) return;

          const user = req.user;
          const companyId = user?.company_id;

          // 提取资源信息
          const resourceMatch = req.path.match(/\/api\/(\w+)(?:\/(\d+))?/);
          const resourceType = resourceMatch ? resourceMatch[1] : null;
          const resourceId = resourceMatch ? resourceMatch[2] : null;

          // 确定操作类型
          let action = 'unknown';
          if (req.method === 'POST') action = 'create';
          else if (req.method === 'PUT' || req.method === 'PATCH') action = 'update';
          else if (req.method === 'DELETE') action = 'delete';

          // 生成操作描述
          const description = `${req.method} ${req.path}`;

          await pool.query(
            `INSERT INTO system_operation_logs (
              company_id, module, action, resource_type, resource_id, description,
              user_id, username, user_name, user_role,
              ip_address, user_agent, request_method, request_url, request_params,
              response_status, response_time, success, operated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              companyId || null,
              module,
              action,
              resourceType,
              resourceId,
              description,
              user?.id || null,
              user?.username || null,
              user?.name || null,
              user?.role || null,
              req.ip || req.connection.remoteAddress,
              req.get('user-agent'),
              req.method,
              req.originalUrl,
              JSON.stringify({
                body: req.body,
                query: req.query,
                params: req.params,
              }),
              res.statusCode,
              responseTime,
              data?.ok !== false ? 1 : 0,
            ]
          );
        } catch (error) {
          console.error('[OperationLog] 记录日志失败:', error);
        }
      });

      // 调用原始方法返回响应
      return originalJson(data);
    };

    next();
  };
}

/**
 * 记录数据变更历史
 */
export async function recordDataChange(pool, {
  companyId,
  tableName,
  recordId,
  changeType,
  changedFields = [],
  oldData = {},
  newData = {},
  changedBy,
  changedByName,
  reason = '',
}) {
  try {
    // 计算版本号
    const [[{ currentVersion }]] = await pool.query(
      'SELECT COALESCE(MAX(version), 0) as currentVersion FROM data_change_history WHERE table_name = ? AND record_id = ?',
      [tableName, recordId]
    );

    await pool.query(
      `INSERT INTO data_change_history (
        company_id, table_name, record_id, version,
        change_type, changed_fields, old_data, new_data,
        changed_by, changed_by_name, reason, changed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        companyId,
        tableName,
        recordId,
        currentVersion + 1,
        changeType,
        JSON.stringify(changedFields),
        JSON.stringify(oldData),
        JSON.stringify(newData),
        changedBy,
        changedByName,
        reason,
      ]
    );
  } catch (error) {
    console.error('[DataChange] 记录数据变更失败:', error);
    throw error;
  }
}

export default operationLogMiddleware;
