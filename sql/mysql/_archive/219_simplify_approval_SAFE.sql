-- ============================================
-- 审批系统简化脚本（安全版）
-- 不依赖可能不存在的字段
-- ============================================

USE gaokongche;

START TRANSACTION;

-- 第1步：删除冗余表（如果存在）
DROP TABLE IF EXISTS approval_statistics;
DROP TABLE IF EXISTS approval_notifications;

SELECT '✓ Step 1: 冗余表已删除' AS progress;

-- 第2步：创建简化的审批统计视图（不依赖company_id）
DROP VIEW IF EXISTS v_approval_statistics;

-- 检查 approval_instances 表是否存在
SET @approval_instances_exists = (
  SELECT COUNT(*) FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'approval_instances'
);

-- 只在表存在时创建视图
SET @create_view = IF(@approval_instances_exists > 0,
  "CREATE OR REPLACE VIEW v_approval_statistics AS
   SELECT 
     DATE(created_at) as stat_date,
     status,
     COUNT(*) as total_count,
     AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_process_hours
   FROM approval_instances
   GROUP BY DATE(created_at), status",
  "SELECT 'approval_instances 表不存在，跳过视图创建' AS info"
);

PREPARE stmt FROM @create_view;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✓ Step 2: 审批统计视图已创建（或已跳过）' AS progress;

-- 第3步：创建审批效率视图
DROP VIEW IF EXISTS v_approval_efficiency;

SET @approval_records_exists = (
  SELECT COUNT(*) FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'approval_records'
);

SET @create_efficiency = IF(@approval_records_exists > 0,
  "CREATE OR REPLACE VIEW v_approval_efficiency AS
   SELECT 
     approver_id,
     COUNT(*) as total_approvals,
     SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
     SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
     AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) as avg_process_minutes
   FROM approval_records
   WHERE status IN ('approved', 'rejected')
   GROUP BY approver_id",
  "SELECT 'approval_records 表不存在，跳过效率视图创建' AS info"
);

PREPARE stmt FROM @create_efficiency;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✓ Step 3: 审批效率视图已创建（或已跳过）' AS progress;

-- 第4步：确保 notification_logs 表存在
CREATE TABLE IF NOT EXISTS notification_logs (
  id INT NOT NULL AUTO_INCREMENT,
  type VARCHAR(50) NOT NULL COMMENT '通知类型',
  channel VARCHAR(50) NOT NULL COMMENT '发送渠道',
  recipient VARCHAR(255) NOT NULL COMMENT '接收人',
  subject VARCHAR(255) NULL COMMENT '主题',
  content TEXT NOT NULL COMMENT '内容',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态',
  sent_at DATETIME NULL COMMENT '发送时间',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_type (type),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知发送日志表';

SELECT '✓ Step 4: notification_logs 表已确保存在' AS progress;

COMMIT;

-- 验证结果
SELECT '========================================' AS '';
SELECT '✅ 审批系统简化完成！' AS '结果';
SELECT '========================================' AS '';

-- 检查视图
SELECT 
  TABLE_NAME AS '视图名称',
  'VIEW' AS '类型'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_TYPE = 'VIEW'
  AND TABLE_NAME LIKE 'v_approval%'
ORDER BY TABLE_NAME;

SELECT '提示: 如果看到视图列表，说明创建成功！' AS '';

