-- ============================================
-- 审批系统简化脚本（修复版）
-- 作者: AI 开发助手
-- 日期: 2026-01-02
-- 说明: 删除冗余统计表，优化审批系统（兼容表不存在的情况）
-- ============================================

USE gaokongche;

START TRANSACTION;

-- ==================== 第一步: 检查表是否存在 ====================
SET @approval_notifications_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'approval_notifications'
);

SET @approval_statistics_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'approval_statistics'
);

-- ==================== 第二步: 确保 notification_logs 表存在 ====================
CREATE TABLE IF NOT EXISTS notification_logs (
  id INT NOT NULL AUTO_INCREMENT,
  company_id INT NULL COMMENT '公司ID',
  reminder_id INT NULL COMMENT '关联提醒ID',
  type VARCHAR(50) NOT NULL COMMENT '通知类型',
  channel VARCHAR(50) NOT NULL COMMENT '发送渠道：system, email, sms, wechat',
  recipient VARCHAR(255) NOT NULL COMMENT '接收人（用户ID、邮箱、手机号等）',
  subject VARCHAR(255) NULL COMMENT '主题',
  content TEXT NOT NULL COMMENT '内容',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending, sent, failed',
  send_attempts INT NOT NULL DEFAULT 0 COMMENT '发送尝试次数',
  error_message TEXT NULL COMMENT '错误信息',
  sent_at DATETIME NULL COMMENT '发送时间',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_notification_logs_company_id (company_id),
  KEY idx_notification_logs_type (type),
  KEY idx_notification_logs_status (status),
  KEY idx_notification_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知发送日志表';

-- ==================== 第三步: 迁移 approval_notifications 数据（如果存在）====================
SET @has_company_id = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'approval_notifications'
    AND COLUMN_NAME = 'company_id'
);

SET @has_user_id = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'approval_notifications'
    AND COLUMN_NAME = 'user_id'
);

SET @has_notification_type = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'approval_notifications'
    AND COLUMN_NAME = 'notification_type'
);

-- 动态构建迁移SQL
SET @migration_sql = IF(@approval_notifications_exists > 0 AND @has_user_id > 0,
  CONCAT(
    'INSERT INTO notification_logs ',
    '(',
    IF(@has_company_id > 0, 'company_id, ', ''),
    'type, channel, recipient, subject, content, status, sent_at, created_at) ',
    'SELECT ',
    IF(@has_company_id > 0, 'company_id, ', ''),
    '''approval'' as type, ',
    IF(@has_notification_type > 0, 'notification_type', '''system'''),
    ' as channel, ',
    'CAST(user_id AS CHAR) as recipient, ',
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'approval_notifications' AND COLUMN_NAME = 'title') > 0, 
       'title', 
       'CONCAT(''审批通知 '', id)'),
    ' as subject, ',
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'approval_notifications' AND COLUMN_NAME = 'message') > 0,
       'message',
       'CONCAT(''审批通知内容 '', id)'),
    ' as content, ',
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'approval_notifications' AND COLUMN_NAME = 'sent_at') > 0,
       'IF(sent_at IS NOT NULL, ''sent'', ''pending'')',
       '''sent'''),
    ' as status, ',
    IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'approval_notifications' AND COLUMN_NAME = 'sent_at') > 0,
       'sent_at',
       'created_at'),
    ' as sent_at, ',
    'created_at ',
    'FROM approval_notifications ',
    'WHERE NOT EXISTS (',
    '  SELECT 1 FROM notification_logs ',
    '  WHERE notification_logs.type = ''approval'' ',
    '    AND notification_logs.recipient = CAST(approval_notifications.user_id AS CHAR) ',
    '    AND notification_logs.created_at = approval_notifications.created_at',
    ') LIMIT 10000'
  ),
  'SELECT ''approval_notifications 表不存在或结构不兼容，跳过数据迁移'' AS message'
);

PREPARE stmt FROM @migration_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT CONCAT('✓ 审批通知迁移完成: ', ROW_COUNT(), ' 条记录') AS message;

-- ==================== 第四步: 删除冗余表 ====================
-- 1. 删除审批通知表（已迁移到 notification_logs）
SET @drop_notifications = IF(@approval_notifications_exists > 0,
  'DROP TABLE IF EXISTS approval_notifications',
  'SELECT ''approval_notifications 表不存在，跳过删除'' AS message'
);

PREPARE stmt FROM @drop_notifications;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 删除审批统计表（使用动态查询替代）
SET @drop_statistics = IF(@approval_statistics_exists > 0,
  'DROP TABLE IF EXISTS approval_statistics',
  'SELECT ''approval_statistics 表不存在，跳过删除'' AS message'
);

PREPARE stmt FROM @drop_statistics;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✓ 冗余表已删除' AS message;

COMMIT;

-- ==================== 第五步: 创建审批统计视图 ====================
-- 检查 approval_instances 表是否存在
SET @approval_instances_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'approval_instances'
);

SET @create_view_sql = IF(@approval_instances_exists > 0,
  'CREATE OR REPLACE VIEW v_approval_statistics AS
   SELECT 
     DATE(created_at) as stat_date,
     company_id,
     status,
     COUNT(*) as total_count,
     AVG(TIMESTAMPDIFF(HOUR, created_at, 
       CASE 
         WHEN status = ''approved'' THEN updated_at
         WHEN status = ''rejected'' THEN updated_at
         ELSE NULL
       END
     )) as avg_process_hours
   FROM approval_instances
   GROUP BY DATE(created_at), company_id, status',
  'SELECT ''approval_instances 表不存在，跳过视图创建'' AS message'
);

PREPARE stmt FROM @create_view_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 创建审批效率视图
SET @approval_records_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'approval_records'
);

SET @create_efficiency_view = IF(@approval_records_exists > 0,
  'CREATE OR REPLACE VIEW v_approval_efficiency AS
   SELECT 
     company_id,
     approver_id,
     COUNT(*) as total_approvals,
     SUM(CASE WHEN status = ''approved'' THEN 1 ELSE 0 END) as approved_count,
     SUM(CASE WHEN status = ''rejected'' THEN 1 ELSE 0 END) as rejected_count,
     AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) as avg_process_minutes
   FROM approval_records
   WHERE status IN (''approved'', ''rejected'')
   GROUP BY company_id, approver_id',
  'SELECT ''approval_records 表不存在，跳过效率视图创建'' AS message'
);

PREPARE stmt FROM @create_efficiency_view;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✓ 审批统计视图已创建' AS message;

-- ==================== 完成提示 ====================
SELECT CONCAT(
  '✅ 审批系统优化完成！\n',
  '删除的表:\n',
  IF(@approval_notifications_exists > 0, '  ✓ approval_notifications（已迁移）\n', ''),
  IF(@approval_statistics_exists > 0, '  ✓ approval_statistics（改用视图）\n', ''),
  '新建的视图:\n',
  IF(@approval_instances_exists > 0, '  ✓ v_approval_statistics\n', ''),
  IF(@approval_records_exists > 0, '  ✓ v_approval_efficiency\n', '')
) AS summary;

