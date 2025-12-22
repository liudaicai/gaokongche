-- 071: 创建权限管理系统

-- 1. 权限定义表
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `parent_id` INT DEFAULT NULL COMMENT '父权限ID',
  `code` VARCHAR(200) NOT NULL COMMENT '权限编码',
  `name` VARCHAR(200) NOT NULL COMMENT '权限名称',
  `type` ENUM('module', 'menu', 'action', 'operation') DEFAULT 'action' COMMENT '权限类型',
  `path` VARCHAR(500) COMMENT '路径/路由',
  `sequence` INT DEFAULT 0 COMMENT '排序',
  `icon` VARCHAR(100) COMMENT '图标',
  `description` TEXT COMMENT '描述',
  `status` ENUM('enabled', 'disabled') DEFAULT 'enabled' COMMENT '状态',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_parent_id` (`parent_id`),
  INDEX `idx_code` (`code`),
  INDEX `idx_type` (`type`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限定义表';

-- 2. 角色权限关联表
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL COMMENT '公司ID',
  `role_code` VARCHAR(100) NOT NULL COMMENT '角色编码',
  `role_name` VARCHAR(100) NOT NULL COMMENT '角色名称',
  `permission_ids` JSON NOT NULL COMMENT '权限ID列表',
  `created_by` INT COMMENT '创建人ID',
  `updated_by` INT COMMENT '更新人ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_company_role` (`company_id`, `role_code`),
  UNIQUE KEY `uk_company_role` (`company_id`, `role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- 3. 用户权限关联表（个人权限）
CREATE TABLE IF NOT EXISTS `user_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL COMMENT '公司ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `permission_ids` JSON NOT NULL COMMENT '权限ID列表',
  `is_override` TINYINT(1) DEFAULT 0 COMMENT '是否覆盖角色权限',
  `created_by` INT COMMENT '创建人ID',
  `updated_by` INT COMMENT '更新人ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_company_user` (`company_id`, `user_id`),
  UNIQUE KEY `uk_company_user` (`company_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户权限关联表';

-- 插入权限数据（根据截图的权限结构）
INSERT INTO `permissions` (`parent_id`, `code`, `name`, `type`, `sequence`) VALUES
-- 一级菜单
(NULL, 'home', '首页', 'module', 1),
(NULL, 'dashboard', '数据统计', 'module', 2),
(NULL, 'reminders', '消息提醒管理', 'module', 3),
(NULL, 'contracts', '合同管理', 'module', 4);

-- 消息提醒管理子菜单
SET @reminders_id = (SELECT id FROM permissions WHERE code = 'reminders');
INSERT INTO `permissions` (`parent_id`, `code`, `name`, `type`, `sequence`) VALUES
(@reminders_id, 'reminders.pending', '待办提醒', 'menu', 1),
(@reminders_id, 'reminders.arrears', '欠款提醒', 'menu', 2),
(@reminders_id, 'reminders.equipment', '设备提醒', 'menu', 3),
(@reminders_id, 'reminders.notification', '消息通知', 'menu', 4);

-- 待办提醒
SET @pending_id = (SELECT id FROM permissions WHERE code = 'reminders.pending');
INSERT INTO `permissions` (`parent_id`, `code`, `name`, `type`, `sequence`) VALUES
(@pending_id, 'reminders.pending.settlement', '结算提醒', 'action', 1);

-- 欠款提醒
SET @arrears_id = (SELECT id FROM permissions WHERE code = 'reminders.arrears');
INSERT INTO `permissions` (`parent_id`, `code`, `name`, `type`, `sequence`) VALUES
(@arrears_id, 'reminders.arrears.settlement', '结算欠款', 'action', 1),
(@arrears_id, 'reminders.arrears.performance', '履约欠款', 'action', 2);

-- 设备提醒
SET @equipment_id = (SELECT id FROM permissions WHERE code = 'reminders.equipment');
INSERT INTO `permissions` (`parent_id`, `code`, `name`, `type`, `sequence`) VALUES
(@equipment_id, 'reminders.equipment.exit_renewal', '退场/续租提醒', 'action', 1),
(@equipment_id, 'reminders.equipment.entry', '进场提醒', 'action', 2),
(@equipment_id, 'reminders.equipment.repair', '报修提醒', 'action', 3);

-- 消息通知
SET @notification_id = (SELECT id FROM permissions WHERE code = 'reminders.notification');
INSERT INTO `permissions` (`parent_id`, `code`, `name`, `type`, `sequence`) VALUES
(@notification_id, 'reminders.notification.signing', '签署通知', 'action', 1);

-- 合同管理子菜单
SET @contracts_id = (SELECT id FROM permissions WHERE code = 'contracts');
INSERT INTO `permissions` (`parent_id`, `code`, `name`, `type`, `sequence`) VALUES
(@contracts_id, 'contracts.list', '合同列表', 'menu', 1),
(@contracts_id, 'contracts.esign', '电签记录', 'menu', 2),
(@contracts_id, 'contracts.settlement', '结算记录', 'menu', 3);

-- 合同列表操作
SET @list_id = (SELECT id FROM permissions WHERE code = 'contracts.list');
INSERT INTO `permissions` (`parent_id`, `code`, `name`, `type`, `sequence`) VALUES
(@list_id, 'contracts.list.view_basic', '操作起始借修', 'operation', 1),
(@list_id, 'contracts.list.enter_signed', '操作录入已签合同', 'operation', 2),
(@list_id, 'contracts.list.enter_double_signed', '操作录入又签已签合同', 'operation', 3),
(@list_id, 'contracts.list.start_esign', '操作起由电子合同', 'operation', 4),
(@list_id, 'contracts.list.start_vehicle_esign', '操作起由又车由子合同', 'operation', 5),
(@list_id, 'contracts.list.export', '操作导出', 'operation', 6),
(@list_id, 'contracts.list.entry', '操作合同进场', 'operation', 7),
(@list_id, 'contracts.list.add_payment', '操作新增收款', 'operation', 8),
(@list_id, 'contracts.list.add_refund', '操作新增退款', 'operation', 9),
(@list_id, 'contracts.list.add_entry', '操作新增进场', 'operation', 10),
(@list_id, 'contracts.list.add_invoice', '操作新增开票', 'operation', 11),
(@list_id, 'contracts.list.modify', '操作合同修改', 'operation', 12),
(@list_id, 'contracts.list.delete', '操作合同删除', 'operation', 13),
(@list_id, 'contracts.list.archive', '操作合同归档', 'operation', 14),
(@list_id, 'contracts.list.follow', '操作关注合同', 'operation', 15),
(@list_id, 'contracts.list.close', '操作关闭合同', 'operation', 16),
(@list_id, 'contracts.list.download', '操作下载', 'operation', 17),
(@list_id, 'contracts.list.our_sign', '操作方签署', 'operation', 18),
(@list_id, 'contracts.list.initiate_customer_sign', '操作发起客户签署', 'operation', 19),
(@list_id, 'contracts.list.view_sign_link', '操作查看签署链接', 'operation', 20),
(@list_id, 'contracts.list.revoke_sign', '操作撤回签署', 'operation', 21),
(@list_id, 'contracts.list.preview', '操作预览', 'operation', 22),
(@list_id, 'contracts.list.view_detail', '操作查看合同详情', 'operation', 23),
(@list_id, 'contracts.list.view_detail_info', '查看合同详情-合同信息', 'operation', 24),
(@list_id, 'contracts.list.change_equipment', '操作更换设备', 'operation', 25),
(@list_id, 'contracts.list.memo', '操作备忘录', 'operation', 26),
(@list_id, 'contracts.list.add_vehicle_application', '操作新增发车/退车申请', 'operation', 27),
(@list_id, 'contracts.list.add_document', '操作新增开具', 'operation', 28),
(@list_id, 'contracts.list.cancel_guarantor_sign', '操作发起保证人签署', 'operation', 29),
(@list_id, 'contracts.list.add_repair', '操作新增报修单', 'operation', 30),
(@list_id, 'contracts.list.supplement_entry_exit', '补录进退场', 'operation', 31),
(@list_id, 'contracts.list.proxy_authorization', '代签授权书', 'operation', 32),
(@list_id, 'contracts.list.change', '合同变更', 'operation', 33),
(@list_id, 'contracts.list.restart', '重启合同', 'operation', 34);

-- 电签记录操作
SET @esign_id = (SELECT id FROM permissions WHERE code = 'contracts.esign');
INSERT INTO `permissions` (`parent_id`, `code`, `name`, `type`, `sequence`) VALUES
(@esign_id, 'contracts.esign.export', '导出', 'operation', 1),
(@esign_id, 'contracts.esign.contract_to_offline', '电子合同转线下签署', 'operation', 2),
(@esign_id, 'contracts.esign.entry_to_offline', '电子进场转线下签署', 'operation', 3),
(@esign_id, 'contracts.esign.exit_to_offline', '电子退场转线下签署', 'operation', 4),
(@esign_id, 'contracts.esign.modify_flexible', '修改灵活电签', 'operation', 5),
(@esign_id, 'contracts.esign.view_flexible_detail', '灵活电签详情', 'operation', 6),
(@esign_id, 'contracts.esign.flexible_our_sign', '灵活电签-我方签署', 'operation', 7),
(@esign_id, 'contracts.esign.flexible_initiate_customer', '灵活电签-发起客户签署', 'operation', 8),
(@esign_id, 'contracts.esign.flexible_delete', '灵活电签-删除', 'operation', 9),
(@esign_id, 'contracts.esign.flexible_view_link', '灵活电签-查看签署链接', 'operation', 10),
(@esign_id, 'contracts.esign.flexible_revoke', '灵活电签-撤回签署', 'operation', 11),
(@esign_id, 'contracts.esign.flexible_preview', '灵活电签-预览', 'operation', 12),
(@esign_id, 'contracts.esign.flexible_download', '灵活电签-下载', 'operation', 13);

-- 插入默认角色权限（示例）
INSERT INTO `role_permissions` (`company_id`, `role_code`, `role_name`, `permission_ids`) VALUES
(1, 'admin', '管理员', JSON_ARRAY(
  (SELECT id FROM permissions WHERE code = 'home'),
  (SELECT id FROM permissions WHERE code = 'dashboard'),
  (SELECT id FROM permissions WHERE code = 'reminders'),
  (SELECT id FROM permissions WHERE code = 'contracts')
)),
(1, 'sales', '业务员', JSON_ARRAY(
  (SELECT id FROM permissions WHERE code = 'home'),
  (SELECT id FROM permissions WHERE code = 'contracts.list'),
  (SELECT id FROM permissions WHERE code = 'contracts.list.view_detail')
)),
(1, 'finance', '财务', JSON_ARRAY(
  (SELECT id FROM permissions WHERE code = 'home'),
  (SELECT id FROM permissions WHERE code = 'dashboard'),
  (SELECT id FROM permissions WHERE code = 'contracts.settlement')
));

SELECT 'Permission system tables created successfully' AS status;
