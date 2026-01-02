-- ============================================
-- 审批系统简化脚本（最小化版本）
-- 只做必要的清理，不创建可能出错的视图
-- ============================================

USE gaokongche;

START TRANSACTION;

-- 删除冗余的统计表和通知表
DROP TABLE IF EXISTS approval_statistics;
DROP TABLE IF EXISTS approval_notifications;

SELECT '✓ 审批系统冗余表已删除' AS result;

-- 确保 notification_logs 表存在（统一的通知管理）
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
  KEY idx_status (status),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='统一通知日志表';

SELECT '✓ notification_logs 表已确保存在' AS result;

COMMIT;

SELECT '========================================' AS '';
SELECT '✅ 审批系统简化完成！' AS '结果';
SELECT '========================================' AS '';
SELECT '说明: 已删除冗余表，统计功能可以通过动态查询实现' AS '';

