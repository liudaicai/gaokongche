/**
 * 设备使用率分析 & 配件追踪系统数据库迁移脚本
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config();

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gaokongche',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  multipleStatements: true
};

async function migrate() {
  let connection;
  
  try {
    console.log('🔗 正在连接数据库...');
    console.log(`   主机: ${config.host}:${config.port}`);
    console.log(`   数据库: ${config.database}`);
    
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功！\n');
    
    // 读取SQL文件
    const sqlFile = path.join(__dirname, '../sql/mysql/059_equipment_usage_and_parts.sql');
    console.log('📄 正在读取SQL文件...\n');
    
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('⚙️  正在执行数据库迁移...\n');
    
    // 第一步：执行基本的表创建语句（排除存储过程、触发器、事件）
    console.log('   1/4 创建数据表...');
    const basicSql = sql
      .split('-- =====================================================')[0] // 获取到第一个分隔符之前
      .split(/;[\s\n]+/)
      .filter(stmt => {
        const trimmed = stmt.trim();
        return trimmed && 
               !trimmed.startsWith('--') && 
               !trimmed.includes('DELIMITER') &&
               !trimmed.includes('DROP PROCEDURE') &&
               !trimmed.includes('CREATE PROCEDURE') &&
               !trimmed.includes('DROP TRIGGER') &&
               !trimmed.includes('CREATE TRIGGER') &&
               !trimmed.includes('DROP EVENT') &&
               !trimmed.includes('CREATE EVENT');
      });
    
    // 执行基本SQL
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    const sections = sqlContent.split('-- =====================================================');
    
    // 执行第1-7节（表、视图、示例数据）
    for (let i = 1; i <= 7 && i < sections.length; i++) {
      const section = sections[i];
      if (!section.includes('存储过程') && !section.includes('触发器') && !section.includes('事件')) {
        const statements = section.split(';').filter(s => {
          const t = s.trim();
          return t && !t.startsWith('--') && t !== 'DELIMITER $$' && t !== 'DELIMITER ;';
        });
        
        for (const stmt of statements) {
          const trimmed = stmt.trim();
          if (trimmed) {
            try {
              await connection.query(trimmed);
            } catch (error) {
              if (!error.message.includes('already exists') && 
                  error.code !== 'ER_TABLE_EXISTS_ERROR' &&
                  error.code !== 'ER_DUP_KEYNAME') {
                console.error(`   ⚠️  警告:`, error.message.substring(0, 100));
              }
            }
          }
        }
      }
    }
    console.log('   ✓ 数据表创建完成\n');
    
    // 第二步：创建存储过程
    console.log('   2/4 创建存储过程...');
    try {
      await connection.query('DROP PROCEDURE IF EXISTS sp_calculate_equipment_usage');
      
      const procedureSql = `
CREATE PROCEDURE sp_calculate_equipment_usage(
  IN p_equipment_id INT,
  IN p_month DATE
)
BEGIN
  DECLARE v_total_days INT;
  DECLARE v_rental_days INT;
  DECLARE v_maintenance_days INT;
  DECLARE v_idle_days INT;
  DECLARE v_utilization_rate DECIMAL(5,2);
  DECLARE v_availability_rate DECIMAL(5,2);
  DECLARE v_rental_income DECIMAL(12,2);
  DECLARE v_maintenance_cost DECIMAL(12,2);
  DECLARE v_parts_cost DECIMAL(12,2);
  DECLARE v_net_profit DECIMAL(12,2);
  DECLARE v_rental_count INT;
  DECLARE v_customer_count INT;
  DECLARE v_average_rental_days DECIMAL(5,1);
  DECLARE v_month_start DATE;
  DECLARE v_month_end DATE;
  
  SET v_month_start = DATE_FORMAT(p_month, '%Y-%m-01');
  SET v_month_end = LAST_DAY(v_month_start);
  SET v_total_days = DAY(v_month_end);
  
  SELECT COALESCE(COUNT(DISTINCT DATE(start_date_actual)), 0) INTO v_rental_days
  FROM orders
  WHERE equipment_id = p_equipment_id
    AND status IN ('in_progress', 'completed', 'exited')
    AND start_date_actual IS NOT NULL
    AND start_date_actual <= v_month_end
    AND (end_date_actual IS NULL OR end_date_actual >= v_month_start);
  
  SET v_maintenance_days = 0;
  SET v_idle_days = v_total_days - v_rental_days - v_maintenance_days;
  IF v_idle_days < 0 THEN SET v_idle_days = 0; END IF;
  
  IF v_total_days > 0 THEN
    SET v_utilization_rate = (v_rental_days / v_total_days) * 100;
    SET v_availability_rate = ((v_total_days - v_maintenance_days) / v_total_days) * 100;
  ELSE
    SET v_utilization_rate = 0;
    SET v_availability_rate = 0;
  END IF;
  
  SELECT COALESCE(SUM(actual_rent), 0) INTO v_rental_income
  FROM orders
  WHERE equipment_id = p_equipment_id
    AND status IN ('in_progress', 'completed', 'exited')
    AND start_date_actual >= v_month_start
    AND start_date_actual <= v_month_end;
  
  SELECT COALESCE(SUM(total_cost), 0) INTO v_parts_cost
  FROM equipment_part_replacements
  WHERE equipment_id = p_equipment_id
    AND replacement_date >= v_month_start
    AND replacement_date <= v_month_end;
  
  SET v_maintenance_cost = v_parts_cost;
  SET v_net_profit = v_rental_income - v_maintenance_cost - v_parts_cost;
  
  SELECT COUNT(*) INTO v_rental_count
  FROM orders
  WHERE equipment_id = p_equipment_id
    AND status IN ('in_progress', 'completed', 'exited')
    AND start_date_actual >= v_month_start
    AND start_date_actual <= v_month_end;
  
  SELECT COUNT(DISTINCT customer_id) INTO v_customer_count
  FROM orders
  WHERE equipment_id = p_equipment_id
    AND status IN ('in_progress', 'completed', 'exited')
    AND start_date_actual >= v_month_start
    AND start_date_actual <= v_month_end;
  
  IF v_rental_count > 0 THEN
    SET v_average_rental_days = v_rental_days / v_rental_count;
  ELSE
    SET v_average_rental_days = 0;
  END IF;
  
  INSERT INTO equipment_usage_statistics (
    equipment_id, stat_month, total_days, rental_days, idle_days, maintenance_days,
    utilization_rate, availability_rate, rental_income, maintenance_cost, parts_cost, net_profit,
    rental_count, customer_count, average_rental_days
  ) VALUES (
    p_equipment_id, v_month_start, v_total_days, v_rental_days, v_idle_days, v_maintenance_days,
    v_utilization_rate, v_availability_rate, v_rental_income, v_maintenance_cost, v_parts_cost, v_net_profit,
    v_rental_count, v_customer_count, v_average_rental_days
  )
  ON DUPLICATE KEY UPDATE
    total_days = v_total_days,
    rental_days = v_rental_days,
    idle_days = v_idle_days,
    maintenance_days = v_maintenance_days,
    utilization_rate = v_utilization_rate,
    availability_rate = v_availability_rate,
    rental_income = v_rental_income,
    maintenance_cost = v_maintenance_cost,
    parts_cost = v_parts_cost,
    net_profit = v_net_profit,
    rental_count = v_rental_count,
    customer_count = v_customer_count,
    average_rental_days = v_average_rental_days,
    updated_at = CURRENT_TIMESTAMP;
END`;
      
      await connection.query(procedureSql);
      console.log('   ✓ 存储过程创建完成\n');
    } catch (error) {
      console.error('   ⚠️  存储过程创建失败:', error.message);
    }
    
    // 第三步：创建触发器
    console.log('   3/4 创建触发器...');
    try {
      await connection.query('DROP TRIGGER IF EXISTS trg_update_warranty_status_before_insert');
      await connection.query(`
CREATE TRIGGER trg_update_warranty_status_before_insert
BEFORE INSERT ON equipment_part_replacements
FOR EACH ROW
BEGIN
  IF NEW.warranty_months IS NOT NULL AND NEW.warranty_months > 0 THEN
    IF NEW.warranty_start_date IS NULL THEN
      SET NEW.warranty_start_date = NEW.replacement_date;
    END IF;
    SET NEW.warranty_end_date = DATE_ADD(NEW.warranty_start_date, INTERVAL NEW.warranty_months MONTH);
    SET NEW.warranty_status = CASE
      WHEN DATEDIFF(NEW.warranty_end_date, CURDATE()) < 0 THEN '已过保'
      WHEN DATEDIFF(NEW.warranty_end_date, CURDATE()) <= 30 THEN '即将过保'
      ELSE '在保'
    END;
  END IF;
  SET NEW.total_cost = NEW.part_cost + COALESCE(NEW.labor_cost, 0);
END`);
      
      await connection.query('DROP TRIGGER IF EXISTS trg_update_warranty_status_before_update');
      await connection.query(`
CREATE TRIGGER trg_update_warranty_status_before_update
BEFORE UPDATE ON equipment_part_replacements
FOR EACH ROW
BEGIN
  IF NEW.warranty_months != OLD.warranty_months OR NEW.warranty_start_date != OLD.warranty_start_date THEN
    IF NEW.warranty_months IS NOT NULL AND NEW.warranty_months > 0 THEN
      SET NEW.warranty_end_date = DATE_ADD(NEW.warranty_start_date, INTERVAL NEW.warranty_months MONTH);
    END IF;
  END IF;
  IF NEW.warranty_end_date IS NOT NULL THEN
    SET NEW.warranty_status = CASE
      WHEN DATEDIFF(NEW.warranty_end_date, CURDATE()) < 0 THEN '已过保'
      WHEN DATEDIFF(NEW.warranty_end_date, CURDATE()) <= 30 THEN '即将过保'
      ELSE '在保'
    END;
  END IF;
  SET NEW.total_cost = NEW.part_cost + COALESCE(NEW.labor_cost, 0);
END`);
      
      console.log('   ✓ 触发器创建完成\n');
    } catch (error) {
      console.error('   ⚠️  触发器创建失败:', error.message);
    }
    
    // 第四步：启用事件调度器（但不创建自动事件，避免干扰）
    console.log('   4/4 配置事件调度器...');
    try {
      await connection.query('SET GLOBAL event_scheduler = ON');
      console.log('   ✓ 事件调度器已启用\n');
    } catch (error) {
      console.log('   ⚠️  事件调度器配置失败（可能需要管理员权限）\n');
    }
    
    // 验证表是否创建成功
    console.log('🔍 验证数据表创建情况...\n');
    
    const tables = [
      'equipment_usage_statistics',
      'high_value_part_categories',
      'equipment_part_replacements',
      'part_warranty_alerts'
    ];
    
    for (const table of tables) {
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = ? AND table_name = ?`,
        [config.database, table]
      );
      
      if (rows[0].count > 0) {
        console.log(`   ✓ ${table}`);
      } else {
        console.log(`   ✗ ${table} (未找到)`);
      }
    }
    
    // 验证视图是否创建成功
    console.log('\n🔍 验证视图创建情况...\n');
    
    const views = [
      'v_equipment_part_summary',
      'v_equipment_usage_overview'
    ];
    
    for (const view of views) {
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM information_schema.views 
         WHERE table_schema = ? AND table_name = ?`,
        [config.database, view]
      );
      
      if (rows[0].count > 0) {
        console.log(`   ✓ ${view}`);
      } else {
        console.log(`   ✗ ${view} (未找到)`);
      }
    }
    
    // 查询配件类别数量
    console.log('\n📊 配件类别初始化情况...\n');
    const [categories] = await connection.query(
      'SELECT COUNT(*) as count FROM high_value_part_categories'
    );
    console.log(`   已创建配件类别: ${categories[0].count} 个\n`);
    
    // 显示配件类别列表
    const [categoryList] = await connection.query(
      'SELECT category_name, category_code, typical_price_range, default_warranty_months FROM high_value_part_categories ORDER BY sort_order'
    );
    console.log('   配件类别列表:');
    categoryList.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.category_name} (${cat.category_code}) - ${cat.typical_price_range} - 保修${cat.default_warranty_months}个月`);
    });
    
    // 验证存储过程
    console.log('\n🔍 验证存储过程...\n');
    const [procedures] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.routines 
       WHERE routine_schema = ? AND routine_type = 'PROCEDURE' AND routine_name = 'sp_calculate_equipment_usage'`,
      [config.database]
    );
    
    if (procedures[0].count > 0) {
      console.log('   ✓ sp_calculate_equipment_usage (设备使用率计算存储过程)');
    } else {
      console.log('   ✗ sp_calculate_equipment_usage (未找到)');
    }
    
    // 验证触发器
    console.log('\n🔍 验证触发器...\n');
    const triggers = [
      'trg_update_warranty_status_before_insert',
      'trg_update_warranty_status_before_update'
    ];
    
    for (const trigger of triggers) {
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM information_schema.triggers 
         WHERE trigger_schema = ? AND trigger_name = ?`,
        [config.database, trigger]
      );
      
      if (rows[0].count > 0) {
        console.log(`   ✓ ${trigger}`);
      } else {
        console.log(`   ✗ ${trigger} (未找到)`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 迁移完成！');
    console.log('='.repeat(60));
    console.log('\n💡 接下来你可以：');
    console.log('   1. 启动后端服务测试API接口');
    console.log('   2. 在设备档案中添加配件更换记录');
    console.log('   3. 调用存储过程计算设备使用率：');
    console.log('      CALL sp_calculate_equipment_usage(设备ID, \'2024-12-01\');');
    console.log('   4. 查看设备使用率统计：');
    console.log('      SELECT * FROM equipment_usage_statistics;');
    console.log('   5. 查看配件更换汇总：');
    console.log('      SELECT * FROM v_equipment_part_summary;\n');
    
  } catch (error) {
    console.error('\n❌ 迁移失败！');
    console.error('错误详情:', error.message);
    if (error.sql) {
      console.error('\nSQL语句:', error.sql.substring(0, 200) + '...');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭\n');
    }
  }
}

// 执行迁移
migrate();
