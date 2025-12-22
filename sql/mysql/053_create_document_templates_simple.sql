-- ============================================
-- 模板管理系统 - 简化版迁移脚本
-- 可以直接复制到MySQL Workbench或其他工具执行
-- ============================================

USE gaokongche;

-- 1. 文档模板主表
CREATE TABLE IF NOT EXISTS `document_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '模板ID',
  `template_code` VARCHAR(64) NOT NULL UNIQUE COMMENT '模板编码',
  `name` VARCHAR(128) NOT NULL COMMENT '模板名称',
  `type` ENUM('合同', '进场', '退场', '结算', '索赔', '报停', '收车', '清场') NOT NULL COMMENT '单据类型',
  `content` LONGTEXT NOT NULL COMMENT '模板HTML内容',
  `description` TEXT COMMENT '模板描述说明',
  `status` ENUM('enabled', 'disabled') DEFAULT 'enabled' COMMENT '状态',
  `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否默认模板',
  `is_system` TINYINT(1) DEFAULT 0 COMMENT '是否系统内置模板',
  `company_id` INT DEFAULT NULL COMMENT '所属公司ID',
  `store_id` INT DEFAULT NULL COMMENT '所属门店ID',
  `version` INT DEFAULT 1 COMMENT '当前版本号',
  `created_by` INT COMMENT '创建人ID',
  `updated_by` INT COMMENT '最后修改人ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL COMMENT '软删除时间',
  INDEX `idx_type` (`type`),
  INDEX `idx_company_store` (`company_id`, `store_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档模板表';

-- 2. 模板版本历史表
CREATE TABLE IF NOT EXISTS `template_versions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_id` INT NOT NULL COMMENT '模板ID',
  `version_number` INT NOT NULL COMMENT '版本号',
  `content` LONGTEXT NOT NULL COMMENT '历史版本的HTML内容',
  `change_note` VARCHAR(256) COMMENT '变更说明',
  `created_by` INT COMMENT '创建人ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_template_version` (`template_id`, `version_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模板版本历史表';

-- 3. 模板占位符映射表
CREATE TABLE IF NOT EXISTS `template_mappings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_id` INT NOT NULL COMMENT '模板ID',
  `placeholder` VARCHAR(128) NOT NULL COMMENT '占位符名称',
  `data_path` VARCHAR(256) NOT NULL COMMENT '数据路径',
  `description` VARCHAR(256) COMMENT '字段说明',
  `example_value` VARCHAR(256) COMMENT '示例值',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_template_placeholder` (`template_id`, `placeholder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模板占位符映射表';

-- 4. 业务单据模板使用记录表
CREATE TABLE IF NOT EXISTS `order_template_usage` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL COMMENT '订单ID',
  `template_id` INT NOT NULL COMMENT '使用的模板ID',
  `document_type` VARCHAR(32) NOT NULL COMMENT '单据类型',
  `generated_html` LONGTEXT COMMENT '生成的HTML',
  `pdf_path` VARCHAR(512) COMMENT 'PDF文件路径',
  `generated_by` INT COMMENT '生成人ID',
  `generated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_order_type` (`order_id`, `document_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单模板使用记录表';

-- ============================================
-- 插入系统默认模板
-- ============================================

-- 注意：以下INSERT语句很长，建议逐个执行

-- 插入：标准结算模板
INSERT IGNORE INTO `document_templates` 
  (`template_code`, `name`, `type`, `content`, `description`, `status`, `is_default`, `is_system`, `version`)
VALUES (
  'TPL-SETTLE-SYSTEM-001',
  '标准结算模板',
  '结算',
  '<div style="font-family: Microsoft YaHei, Arial; width: 920px; margin: 0 auto; color: #000;"><h2 style="text-align:center; margin: 12px 0;">高空设备租赁费结算单</h2><table style="width:100%; border-collapse:collapse; font-size:13px;" border="1"><tr><td style="padding:6px;">结算周期</td><td style="padding:6px;">{{period_start}} - {{period_end}}</td><td style="padding:6px;">制作时间</td><td style="padding:6px; text-align:right;">{{print_date}}</td></tr><tr><td style="padding:6px;">承租方</td><td style="padding:6px;">{{customer_name}}</td><td style="padding:6px;">项目名称</td><td style="padding:6px; text-align:right;">{{project_name}}</td></tr></table><div style="margin:8px 0;">租赁费用明细</div><table style="width:100%; border-collapse:collapse; font-size:12px;" border="1"><thead><tr><th style="padding:4px;">序号</th><th style="padding:4px;">设备号</th><th style="padding:4px;">租期(天)</th><th style="padding:4px;">日租金</th><th style="padding:4px;">金额</th></tr></thead><tbody>{{#each items}}<tr><td style="padding:4px;">{{index}}</td><td style="padding:4px;">{{equipment_code}}</td><td style="padding:4px; text-align:right;">{{days}}</td><td style="padding:4px; text-align:right;">{{daily_price}}</td><td style="padding:4px; text-align:right;">{{amount}}</td></tr>{{/each}}</tbody><tfoot><tr><td colspan="4" style="padding:6px;">合计</td><td style="padding:6px; text-align:right;">{{total_amount}}</td></tr></tfoot></table><div style="margin-top:10px;"><div>本期应付金额：{{total_amount}}</div><div>累计欠款总额：{{total_outstanding}}</div></div><div style="margin-top:14px; display:flex; justify-content:space-between;"><div>甲方（出租方）：{{lessor_name}}</div><div>乙方（承租方）：{{lessee_name}}</div></div></div>',
  '系统内置标准结算单模板',
  'enabled',
  1,
  1,
  1
);

-- 插入：标准进场模板
INSERT IGNORE INTO `document_templates` 
  (`template_code`, `name`, `type`, `content`, `description`, `status`, `is_default`, `is_system`, `version`)
VALUES (
  'TPL-ENTRY-SYSTEM-001',
  '标准进场模板',
  '进场',
  '<div style="font-family: Microsoft YaHei, Arial; width: 920px; margin: 0 auto; color: #000;"><h2 style="text-align:center; margin: 12px 0;">设备进场单</h2><table style="width:100%; border-collapse:collapse; font-size:13px;" border="1"><tr><td style="padding:6px;">进场单号</td><td style="padding:6px;">{{entry_number}}</td><td style="padding:6px;">制作时间</td><td style="padding:6px; text-align:right;">{{print_date}}</td></tr><tr><td style="padding:6px;">合同名称</td><td style="padding:6px;">{{contract_name}}</td><td style="padding:6px;">交车位置</td><td style="padding:6px; text-align:right;">{{delivery_location}}</td></tr><tr><td style="padding:6px;">承租方</td><td style="padding:6px;">{{customer_name}}</td><td style="padding:6px;">项目名称</td><td style="padding:6px; text-align:right;">{{project_name}}</td></tr><tr><td style="padding:6px;">物流类型</td><td style="padding:6px;">{{logistics_type}}</td><td style="padding:6px;">出库门店</td><td style="padding:6px; text-align:right;">{{store_name}}</td></tr></table><div style="margin:8px 0;"><span>本次进场台数：{{entry_current_count}}</span><span style="margin-left:24px;">累计在租台数：{{rented_total_count}}</span></div><div style="margin:8px 0;">进场设备列表</div><table style="width:100%; border-collapse:collapse; font-size:12px;" border="1"><thead><tr><th style="padding:4px;">序号</th><th style="padding:4px;">设备号</th><th style="padding:4px;">类型</th><th style="padding:4px;">高度</th></tr></thead><tbody>{{#each items}}<tr><td style="padding:4px;">{{index}}</td><td style="padding:4px;">{{equipment_code}}</td><td style="padding:4px;">{{equipment_type}}</td><td style="padding:4px;">{{height}}</td></tr>{{/each}}</tbody></table><div style="margin-top:14px; display:flex; justify-content:space-between;"><div>甲方（出租方）：{{lessor_name}}</div><div>乙方（承租方）：{{lessee_name}}</div></div></div>',
  '系统内置标准进场单模板',
  'enabled',
  1,
  1,
  1
);

-- 插入：标准退场模板
INSERT IGNORE INTO `document_templates` 
  (`template_code`, `name`, `type`, `content`, `description`, `status`, `is_default`, `is_system`, `version`)
VALUES (
  'TPL-EXIT-SYSTEM-001',
  '标准退场模板',
  '退场',
  '<div style="font-family: Microsoft YaHei, Arial; width: 920px; margin: 0 auto; color: #000;"><h2 style="text-align:center; margin: 12px 0;">设备退场单</h2><table style="width:100%; border-collapse:collapse; font-size:13px;" border="1"><tr><td style="padding:6px;">退场单号</td><td style="padding:6px;">{{exit_number}}</td><td style="padding:6px;">制作时间</td><td style="padding:6px; text-align:right;">{{print_date}}</td></tr><tr><td style="padding:6px;">收车位置</td><td style="padding:6px;">{{pickup_location}}</td><td style="padding:6px;">回库门店</td><td style="padding:6px; text-align:right;">{{return_store_name}}</td></tr><tr><td style="padding:6px;">承租方</td><td style="padding:6px;">{{customer_name}}</td><td style="padding:6px;">项目名称</td><td style="padding:6px; text-align:right;">{{project_name}}</td></tr><tr><td style="padding:6px;">物流类型</td><td style="padding:6px;">{{logistics_type}}</td><td style="padding:6px;">司机</td><td style="padding:6px; text-align:right;">{{driver_name}}</td></tr><tr><td style="padding:6px;">租金结算日期</td><td style="padding:6px;" colspan="3">{{settlement_date}}</td></tr></table><div style="margin:8px 0;">退场设备列表</div><table style="width:100%; border-collapse:collapse; font-size:12px;" border="1"><thead><tr><th style="padding:4px;">序号</th><th style="padding:4px;">设备号</th><th style="padding:4px;">类型</th><th style="padding:4px;">高度</th></tr></thead><tbody>{{#each items}}<tr><td style="padding:4px;">{{index}}</td><td style="padding:4px;">{{equipment_code}}</td><td style="padding:4px;">{{equipment_type}}</td><td style="padding:4px;">{{height}}</td></tr>{{/each}}</tbody></table><div style="margin-top:14px; display:flex; justify-content:space-between;"><div>甲方（出租方）：{{lessor_name}}</div><div>乙方（承租方）：{{lessee_name}}</div></div></div>',
  '系统内置标准退场单模板',
  'enabled',
  1,
  1,
  1
);

-- 插入：标准合同模板
INSERT IGNORE INTO `document_templates` 
  (`template_code`, `name`, `type`, `content`, `description`, `status`, `is_default`, `is_system`, `version`)
VALUES (
  'TPL-CONTRACT-SYSTEM-001',
  '标准合同模板',
  '合同',
  '<div style="font-family: Microsoft YaHei, Arial; width: 920px; margin: 0 auto; color: #000;"><h2 style="text-align:center; margin: 12px 0;">设备租赁合同（预览）</h2><table style="width:100%; border-collapse:collapse; font-size:13px;" border="1"><tr><td style="padding:6px;">合同编号</td><td style="padding:6px;">{{contract_number}}</td><td style="padding:6px;">制作时间</td><td style="padding:6px; text-align:right;">{{print_date}}</td></tr><tr><td style="padding:6px;">出租方</td><td style="padding:6px;">{{lessor_name}}</td><td style="padding:6px;">承租方</td><td style="padding:6px; text-align:right;">{{lessee_name}}</td></tr><tr><td style="padding:6px;">项目名称</td><td style="padding:6px;">{{project_name}}</td><td style="padding:6px;">支付约定</td><td style="padding:6px; text-align:right;">{{payment_agreement}}</td></tr><tr><td style="padding:6px;">月份计算方式</td><td style="padding:6px;">{{month_calc_method}}</td><td style="padding:6px;">交机地点</td><td style="padding:6px; text-align:right;">{{delivery_location}}</td></tr></table><div style="margin:8px 0;">租赁设备清单</div><table style="width:100%; border-collapse:collapse; font-size:12px;" border="1"><thead><tr><th style="padding:4px;">序号</th><th style="padding:4px;">类型</th><th style="padding:4px;">高度</th><th style="padding:4px;">日租金</th><th style="padding:4px;">月租金</th></tr></thead><tbody>{{#each items}}<tr><td style="padding:4px;">{{index}}</td><td style="padding:4px;">{{equipment_type}}</td><td style="padding:4px;">{{height}}</td><td style="padding:4px; text-align:right;">{{daily_price}}</td><td style="padding:4px; text-align:right;">{{monthly_rate}}</td></tr>{{/each}}</tbody></table><div style="margin-top:14px; display:flex; justify-content:space-between;"><div>甲方（出租方）：{{lessor_name}}</div><div>乙方（承租方）：{{lessee_name}}</div></div></div>',
  '系统内置标准合同模板',
  'enabled',
  1,
  1,
  1
);

-- 完成
SELECT '✅ 模板管理系统表创建完成！' AS message;
SELECT COUNT(*) AS '系统内置模板数量' FROM document_templates WHERE is_system = 1;


