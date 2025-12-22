-- ============================================
-- 高空车租赁系统 Baseline Schema (自动生成)
-- ============================================
-- 
-- 源数据库: gaokongche_tenant_5
-- 导出时间: 2025/12/15 11:04:30
-- 字符集: utf8mb4
-- 排序规则: utf8mb4_unicode_ci
-- 
-- 📝 注意事项：
--   1. 此文件由脚本自动生成，请勿手动编辑
--   2. 如需修改表结构，请在超管数据库操作后重新导出
--   3. 使用命令: npm run schema:export
-- 
-- 🎯 用途：
--   - 新租户数据库的初始化模板
--   - 确保所有租户schema一致性
--   - Git版本控制和差异对比
-- 
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table: _migrations
-- ----------------------------
CREATE TABLE `_migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `migration_name` varchar(255) NOT NULL,
  `executed_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_migration_name` (`migration_name`),
  KEY `idx_executed_at` (`executed_at`)
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table: _tenant_meta
-- ----------------------------
CREATE TABLE `_tenant_meta` (
  `k` varchar(64) NOT NULL,
  `v` text,
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`k`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table: accessories
-- ----------------------------
CREATE TABLE `accessories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `material_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物料编号',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配件名称',
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配件大类(液压件/电气件/机械件/易损件/滤芯类)',
  `sub_category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配件小类',
  `system_category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '系统分类(液压系统/电气系统/传动系统/安全系统)',
  `model_spec` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '型号规格',
  `dimensions` json DEFAULT NULL COMMENT '尺寸规格 {"length": 100, "width": 50, "height": 30, "unit": "mm"}',
  `weight` decimal(10,3) DEFAULT NULL COMMENT '重量(kg)',
  `unit` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '个' COMMENT '单位',
  `part_type` enum('original','oem','aftermarket','generic') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'generic' COMMENT 'original=原厂件, oem=品牌副厂, aftermarket=售后市场, generic=通用件',
  `manufacturer` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '生产厂商',
  `brand` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '品牌',
  `origin_country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '产地',
  `oem_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'OEM编号',
  `standard_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '标准编号',
  `technical_specs` json DEFAULT NULL COMMENT '技术参数 {"pressure": "200bar", "temperature": "-20~80°C"}',
  `material_composition` json DEFAULT NULL COMMENT '材料成分',
  `performance_metrics` json DEFAULT NULL COMMENT '性能指标',
  `total_quantity` int NOT NULL DEFAULT '0' COMMENT '总库存',
  `reserved_quantity` int NOT NULL DEFAULT '0' COMMENT '预留数量',
  `available_quantity` int NOT NULL DEFAULT '0' COMMENT '可用数量',
  `min_stock` int DEFAULT '10' COMMENT '最低库存',
  `max_stock` int DEFAULT '1000' COMMENT '最高库存',
  `reorder_point` int DEFAULT '20' COMMENT '建议补货点',
  `reorder_quantity` int DEFAULT '50' COMMENT '建议补货量',
  `cost_price` decimal(10,2) DEFAULT '0.00' COMMENT '成本价',
  `selling_price` decimal(10,2) DEFAULT '0.00' COMMENT '销售价',
  `total_value` decimal(12,2) DEFAULT '0.00' COMMENT '库存总价值',
  `warranty_months` int DEFAULT '12' COMMENT '质保期(月)',
  `shelf_life_months` int DEFAULT NULL COMMENT '保质期(月)',
  `expected_lifespan_hours` int DEFAULT NULL COMMENT '预期使用寿命(小时)',
  `primary_supplier_id` int DEFAULT NULL COMMENT '主供应商ID',
  `primary_supplier_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '主供应商名称',
  `supplier_contact` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '供应商联系方式',
  `supplier_lead_time` int DEFAULT '7' COMMENT '供货周期(天)',
  `warehouse_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '仓库名称',
  `area` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '区域',
  `shelf_location` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '货架位置',
  `images` json DEFAULT NULL COMMENT '图片URL数组',
  `3d_model_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '3D模型地址',
  `installation_videos` json DEFAULT NULL COMMENT '安装视频链接数组',
  `documents` json DEFAULT NULL COMMENT '技术文档数组',
  `compatibility_score` decimal(3,2) DEFAULT '0.00' COMMENT '综合适配评分(0-5)',
  `popularity_score` int DEFAULT '0' COMMENT '使用热度(访问和使用次数)',
  `reliability_score` decimal(3,2) DEFAULT '0.00' COMMENT '可靠性评分(基于故障率)',
  `ai_recommend_weight` decimal(5,2) DEFAULT '1.00' COMMENT 'AI推荐权重',
  `total_usage_count` int DEFAULT '0' COMMENT '累计使用次数',
  `last_used_date` date DEFAULT NULL COMMENT '最后使用日期',
  `failure_count` int DEFAULT '0' COMMENT '故障次数',
  `failure_rate` decimal(5,2) DEFAULT '0.00' COMMENT '故障率(%)',
  `status` enum('active','discontinued','obsolete','out_of_stock') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `tags` json DEFAULT NULL COMMENT '标签数组',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `company_id` int DEFAULT NULL COMMENT '所属公司ID',
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_material_number` (`material_number`,`company_id`),
  KEY `idx_category` (`category`,`sub_category`),
  KEY `idx_system_category` (`system_category`),
  KEY `idx_brand_type` (`brand`,`part_type`),
  KEY `idx_manufacturer` (`manufacturer`),
  KEY `idx_smart_scores` (`compatibility_score`,`popularity_score`,`reliability_score`),
  KEY `idx_status` (`status`),
  KEY `idx_company` (`company_id`),
  KEY `idx_available_qty` (`available_quantity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='智能配件主表';

-- ----------------------------
-- Table: accessory_3d_positions
-- ----------------------------
CREATE TABLE `accessory_3d_positions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `accessory_id` int NOT NULL COMMENT '配件ID',
  `equipment_model` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '设备型号',
  `position_data` json NOT NULL COMMENT '3D坐标信息 {"x": 0, "y": 0, "z": 0}',
  `rotation_data` json DEFAULT NULL COMMENT '旋转角度 {"rx": 0, "ry": 0, "rz": 0}',
  `scale_data` json DEFAULT NULL COMMENT '缩放比例 {"sx": 1, "sy": 1, "sz": 1}',
  `view_angles` json DEFAULT NULL COMMENT '最佳观察角度数组',
  `camera_positions` json DEFAULT NULL COMMENT '相机位置数组',
  `annotation_points` json DEFAULT NULL COMMENT '标注点数组',
  `highlight_color` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '#FF0000' COMMENT '高亮颜色',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '位置描述',
  `installation_guide` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '安装指引',
  `created_by` int DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_accessory_model` (`accessory_id`,`equipment_model`),
  KEY `idx_equipment` (`equipment_model`),
  CONSTRAINT `fk_3d_accessory` FOREIGN KEY (`accessory_id`) REFERENCES `accessories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='配件3D位置标注';

-- ----------------------------
-- Table: accessory_alternatives
-- ----------------------------
CREATE TABLE `accessory_alternatives` (
  `id` int NOT NULL AUTO_INCREMENT,
  `primary_accessory_id` int NOT NULL COMMENT '主配件ID',
  `alternative_accessory_id` int NOT NULL COMMENT '替代配件ID',
  `alternative_type` enum('identical','upgrade','downgrade','compatible','emergency') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'compatible' COMMENT '替代类型：identical=完全相同, upgrade=升级, downgrade=降级, compatible=兼容, emergency=应急',
  `alternative_reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '替代原因（如：原厂停产/价格优势/性能提升）',
  `price_difference` decimal(10,2) DEFAULT '0.00' COMMENT '价格差异（正=更贵，负=更便宜）',
  `price_difference_percent` decimal(5,2) DEFAULT '0.00' COMMENT '价格差异百分比',
  `quality_level` tinyint DEFAULT '0' COMMENT '品质等级差异（-2到+2，0=相同）',
  `performance_comparison` json DEFAULT NULL COMMENT '性能对比（JSON格式）',
  `lifespan_difference` int DEFAULT NULL COMMENT '寿命差异（天/小时）',
  `conditions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '替代条件说明',
  `restrictions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '使用限制',
  `required_modifications` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '需要的改装说明',
  `recommend_priority` int DEFAULT '0' COMMENT '推荐优先级（数字越大越优先）',
  `recommend_scenarios` json DEFAULT NULL COMMENT '推荐使用场景数组',
  `not_recommend_scenarios` json DEFAULT NULL COMMENT '不推荐使用场景数组',
  `usage_count` int DEFAULT '0' COMMENT '实际使用次数',
  `success_rate` decimal(5,2) DEFAULT '0.00' COMMENT '替代成功率（%）',
  `user_rating` decimal(3,2) DEFAULT '0.00' COMMENT '用户评分（0-5）',
  `feedback_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '用户反馈汇总',
  `status` enum('active','testing','deprecated') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态：active=启用, testing=测试中, deprecated=已废弃',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '备注说明',
  `company_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `verified_by` int DEFAULT NULL COMMENT '验证人ID',
  `verified_at` datetime(3) DEFAULT NULL COMMENT '验证时间',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_alternative_pair` (`primary_accessory_id`,`alternative_accessory_id`),
  KEY `idx_primary` (`primary_accessory_id`),
  KEY `idx_alternative` (`alternative_accessory_id`),
  KEY `idx_type` (`alternative_type`),
  KEY `idx_priority` (`recommend_priority`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_alt_alternative` FOREIGN KEY (`alternative_accessory_id`) REFERENCES `accessories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_alt_primary` FOREIGN KEY (`primary_accessory_id`) REFERENCES `accessories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='配件替代关系表';

-- ----------------------------
-- Table: accessory_compatibility
-- ----------------------------
CREATE TABLE `accessory_compatibility` (
  `id` int NOT NULL AUTO_INCREMENT,
  `accessory_id` int NOT NULL COMMENT '配件ID',
  `equipment_category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备类别（高空车/叉车/吊车）',
  `equipment_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备类型（剪叉车/直臂车/曲臂车）',
  `equipment_brand` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '设备品牌（三一/徐工/JLG/Genie）',
  `equipment_model_id` int DEFAULT NULL COMMENT '设备型号ID（关联equipment_models表）',
  `equipment_model_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备型号名称（冗余字段，如：GTBZ12）',
  `equipment_series` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备系列（如：12米系列）',
  `equipment_year_from` int DEFAULT NULL COMMENT '适用年份起（如：2015）',
  `equipment_year_to` int DEFAULT NULL COMMENT '适用年份止（如：2023，NULL表示至今）',
  `system_category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '系统类别（液压系统/电气系统/传动系统/安全系统）',
  `part_position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '安装位置（如：前轮/后轮/液压泵/主控制器）',
  `part_function` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配件功能（如：动力传动/液压升降/安全防护）',
  `replacement_interval` int DEFAULT NULL COMMENT '更换周期（小时/天）',
  `replacement_interval_unit` enum('hours','days','months','km') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'hours' COMMENT '周期单位',
  `compatibility_level` enum('perfect','compatible','need_adapter','need_modify','not_recommended') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'compatible' COMMENT '兼容性：perfect=完美匹配, compatible=兼容, need_adapter=需转接件, need_modify=需改装, not_recommended=不推荐',
  `compatibility_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '兼容性说明（如：需配合转接头A-123使用）',
  `required_accessories` json DEFAULT NULL COMMENT '需要配套的其他配件ID数组',
  `is_original_recommended` tinyint(1) DEFAULT '0' COMMENT '是否原厂推荐',
  `is_mandatory` tinyint(1) DEFAULT '0' COMMENT '是否强制使用（安全件）',
  `priority` int DEFAULT '0' COMMENT '推荐优先级（数字越大越优先）',
  `recommended_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '推荐来源（原厂/维修手册/技术专家）',
  `usage_count` int DEFAULT '0' COMMENT '使用次数统计',
  `feedback_score` decimal(3,2) DEFAULT '0.00' COMMENT '用户反馈评分（0-5分）',
  `feedback_count` int DEFAULT '0' COMMENT '反馈数量',
  `company_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  PRIMARY KEY (`id`),
  KEY `idx_accessory` (`accessory_id`),
  KEY `idx_equipment_brand_type` (`equipment_brand`,`equipment_type`),
  KEY `idx_equipment_model` (`equipment_model_id`),
  KEY `idx_brand_model` (`equipment_brand`,`equipment_model_name`),
  KEY `idx_compatibility_level` (`compatibility_level`),
  KEY `idx_priority` (`priority`),
  KEY `idx_system_category` (`system_category`),
  CONSTRAINT `fk_compat_accessory` FOREIGN KEY (`accessory_id`) REFERENCES `accessories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='配件适配关系表';

-- ----------------------------
-- Table: accessory_transactions
-- ----------------------------
CREATE TABLE `accessory_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `accessory_id` int NOT NULL COMMENT '配件ID',
  `transaction_type` enum('purchase','issue','return','adjust','scrap','transfer') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'purchase=采购入库, issue=领用出库, return=退库, adjust=盘点调整, scrap=报废, transfer=调拨',
  `transaction_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '单据编号',
  `quantity` int NOT NULL COMMENT '数量',
  `operator_id` int DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人姓名',
  `related_order_id` int DEFAULT NULL COMMENT '关联订单ID',
  `related_equipment_id` int DEFAULT NULL COMMENT '关联设备ID',
  `related_order_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联订单号',
  `related_equipment_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联设备编码',
  `purpose` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用途说明',
  `reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '原因说明',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `unit_price` decimal(10,2) DEFAULT '0.00' COMMENT '单价',
  `total_amount` decimal(12,2) DEFAULT '0.00' COMMENT '总金额',
  `before_quantity` int DEFAULT NULL COMMENT '交易前库存',
  `after_quantity` int DEFAULT NULL COMMENT '交易后库存',
  `company_id` int DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_accessory` (`accessory_id`),
  KEY `idx_type` (`transaction_type`),
  KEY `idx_order` (`related_order_id`),
  KEY `idx_equipment` (`related_equipment_id`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `fk_trans_accessory` FOREIGN KEY (`accessory_id`) REFERENCES `accessories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='配件出入库记录表';

-- ----------------------------
-- Table: ai_recommendation_logs
-- ----------------------------
CREATE TABLE `ai_recommendation_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '推荐会话ID',
  `equipment_brand` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '设备品牌',
  `equipment_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '设备类型',
  `equipment_model` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '设备型号',
  `equipment_id` int DEFAULT NULL COMMENT '具体设备ID',
  `search_criteria` json NOT NULL COMMENT '搜索条件',
  `recommendation_algorithm` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '使用算法(collaborative/content_based/hybrid)',
  `algorithm_version` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'v1.0' COMMENT '算法版本',
  `recommended_accessories` json NOT NULL COMMENT '推荐结果数组',
  `top_recommendation_id` int DEFAULT NULL COMMENT '首选推荐配件ID',
  `alternatives_count` int DEFAULT '0' COMMENT '备选方案数量',
  `user_id` int DEFAULT NULL COMMENT '用户ID',
  `user_feedback` json DEFAULT NULL COMMENT '用户反馈',
  `final_selection` json DEFAULT NULL COMMENT '最终选择',
  `is_accepted` tinyint(1) DEFAULT NULL COMMENT '是否采纳推荐',
  `response_time_ms` int NOT NULL COMMENT '响应时间(毫秒)',
  `confidence_score` decimal(3,2) NOT NULL COMMENT '置信度(0-1)',
  `accuracy_score` decimal(3,2) DEFAULT NULL COMMENT '准确率(事后统计)',
  `company_id` int DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_session` (`session_id`),
  KEY `idx_equipment` (`equipment_brand`,`equipment_type`,`equipment_model`),
  KEY `idx_algorithm` (`recommendation_algorithm`),
  KEY `idx_created` (`created_at`),
  KEY `idx_user_feedback` (`is_accepted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI推荐日志';

-- ----------------------------
-- Table: audit_logs
-- ----------------------------
CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL COMMENT '操作用户ID',
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户名',
  `action` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作类型',
  `resource_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '资源类型',
  `resource_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '资源ID',
  `details` json DEFAULT NULL COMMENT '操作详情',
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作IP',
  `user_agent` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户代理',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'success' COMMENT '操作状态',
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '错误信息',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_user_id` (`user_id`),
  KEY `idx_audit_logs_action` (`action`),
  KEY `idx_audit_logs_resource` (`resource_type`,`resource_id`),
  KEY `idx_audit_logs_created_at` (`created_at`),
  KEY `idx_audit_logs_username` (`username`),
  CONSTRAINT `fk_audit_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审计日志表';

-- ----------------------------
-- Table: companies
-- ----------------------------
CREATE TABLE `companies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公司名称',
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公司编码',
  `contact_person` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系人',
  `contact_phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系电话',
  `address` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '公司地址',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否激活',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_companies_code` (`code`),
  KEY `idx_companies_name` (`name`),
  KEY `idx_companies_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公司表（多租户）';

-- ----------------------------
-- Table: company_verifications
-- ----------------------------
CREATE TABLE `company_verifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `credit_code` varchar(18) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_account` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_company_verifications_credit_code` (`credit_code`),
  KEY `idx_company_verifications_company_name` (`company_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: contract_renewal_records
-- ----------------------------
CREATE TABLE `contract_renewal_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL COMMENT '订单ID',
  `contract_number` varchar(100) DEFAULT NULL COMMENT '合同编号',
  `customer_id` int DEFAULT NULL COMMENT '客户ID',
  `customer_name` varchar(100) DEFAULT NULL COMMENT '客户名称',
  `renewal_type` varchar(50) NOT NULL COMMENT '续约类型: specific_date(指定日期), renewal_period(续约期限)',
  `next_reminder_date` date DEFAULT NULL COMMENT '下次提醒日期',
  `renewal_period_months` int DEFAULT NULL COMMENT '续约期限(月)',
  `renewal_start_date` date DEFAULT NULL COMMENT '续约开始日期',
  `calculated_reminder_date` date DEFAULT NULL COMMENT '计算的提醒日期',
  `advance_days` int DEFAULT '7' COMMENT '提前提醒天数',
  `is_reminded` tinyint(1) DEFAULT '0' COMMENT '是否已提醒',
  `reminded_at` timestamp(3) NULL DEFAULT NULL COMMENT '提醒时间',
  `status` varchar(50) DEFAULT 'pending' COMMENT '状态: pending(待处理), completed(已完成), cancelled(已取消)',
  `handled_by` int DEFAULT NULL COMMENT '处理人ID',
  `handled_at` timestamp(3) NULL DEFAULT NULL COMMENT '处理时间',
  `handle_note` text COMMENT '处理备注',
  `company_id` int DEFAULT NULL COMMENT '公司ID',
  `created_by` int DEFAULT NULL COMMENT '创建人',
  `created_at` timestamp(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_reminder_date` (`next_reminder_date`),
  KEY `idx_calculated_date` (`calculated_reminder_date`),
  KEY `idx_company` (`company_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='合同续约记录表';

-- ----------------------------
-- Table: customer_credit_history
-- ----------------------------
CREATE TABLE `customer_credit_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL COMMENT '客户ID',
  `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作类型:adjust_limit-调整额度/consume-消费额度/release-释放额度',
  `amount` decimal(12,2) NOT NULL COMMENT '金额（正数=增加，负数=减少）',
  `before_amount` decimal(12,2) NOT NULL COMMENT '操作前金额',
  `after_amount` decimal(12,2) NOT NULL COMMENT '操作后金额',
  `reason` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '原因说明',
  `related_order_id` int DEFAULT NULL COMMENT '关联订单ID',
  `operator_id` int DEFAULT NULL COMMENT '操作人ID',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_related_order` (`related_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户信用记录表';

-- ----------------------------
-- Table: customers
-- ----------------------------
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户编号（自动生成）',
  `company_id` int DEFAULT NULL COMMENT '所属公司ID（多租户）',
  `mongo_id` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '邮箱',
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `customer_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'enterprise' COMMENT '客户类型：enterprise(企业)/personal(个人)',
  `credit_level` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'normal' COMMENT '信用等级：excellent(优秀)/good(良好)/normal(一般)/poor(较差)',
  `business_manager_id` int DEFAULT NULL COMMENT '业务负责人ID（关联users表）',
  `business_manager_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '业务负责人姓名',
  `settlement_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'monthly' COMMENT '结算方式：daily(日结)/monthly(月结)/quarterly(季结)',
  `tax_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '税号（企业客户）',
  `bank_account` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '银行账号',
  `bank_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '开户行',
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态：active(活跃)/inactive(不活跃)/blacklist(黑名单)',
  `tags` json DEFAULT NULL COMMENT '客户标签（如：["VIP", "长期合作"]）',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `id_card_number` varchar(18) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '身份证号',
  `id_card_front_image` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '身份证正面照片URL',
  `id_card_back_image` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '身份证反面照片URL',
  `real_name_verified` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否实名认证',
  `verified_at` datetime(3) DEFAULT NULL COMMENT '认证时间',
  `company_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '企业名称',
  `business_license` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '营业执照号/统一社会信用代码',
  `legal_person` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '法定代表人',
  `enterprise_verified` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否企业认证',
  `enterprise_verified_at` datetime(3) DEFAULT NULL COMMENT '企业认证时间',
  `credit_rating` int NOT NULL DEFAULT '3' COMMENT '信用评级(0-5星)',
  `credit_limit` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '信用额度',
  `available_credit` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '可用额度',
  `total_orders` int NOT NULL DEFAULT '0' COMMENT '总订单数',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '总交易额',
  `overdue_count` int NOT NULL DEFAULT '0' COMMENT '逾期次数',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_customers_mongo_id` (`mongo_id`),
  KEY `idx_customers_is_deleted` (`is_deleted`),
  KEY `idx_customers_company_id` (`company_id`),
  KEY `idx_customers_business_manager` (`business_manager_id`),
  KEY `idx_customers_status` (`status`),
  KEY `idx_customers_credit_level` (`credit_level`),
  KEY `idx_customers_type` (`customer_type`),
  KEY `idx_code` (`code`),
  KEY `idx_id_card` (`id_card_number`),
  KEY `idx_business_license` (`business_license`),
  KEY `idx_credit_rating` (`credit_rating`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: document_templates
-- ----------------------------
CREATE TABLE `document_templates` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '模板ID',
  `template_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板编码',
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板名称',
  `type` enum('合同','进场','退场','结算','索赔','报停','收车','清场') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '单据类型',
  `content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板HTML内容',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '模板描述说明',
  `status` enum('enabled','disabled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'enabled' COMMENT '状态',
  `is_default` tinyint(1) DEFAULT '0' COMMENT '是否默认模板',
  `is_system` tinyint(1) DEFAULT '0' COMMENT '是否系统内置模板',
  `company_id` int DEFAULT NULL COMMENT '所属公司ID',
  `store_id` int DEFAULT NULL COMMENT '所属门店ID',
  `version` int DEFAULT '1' COMMENT '当前版本号',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `updated_by` int DEFAULT NULL COMMENT '最后修改人ID',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL COMMENT '软删除时间',
  `file_size` int DEFAULT NULL COMMENT '文件大小（字节）',
  `template_variables` json DEFAULT NULL COMMENT '模板变量定义',
  `is_contract_template` tinyint(1) DEFAULT '0' COMMENT '是否为合同模板',
  PRIMARY KEY (`id`),
  UNIQUE KEY `template_code` (`template_code`),
  KEY `idx_type` (`type`),
  KEY `idx_company_store` (`company_id`,`store_id`),
  KEY `idx_status` (`status`),
  KEY `idx_deleted` (`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档模板表';

-- ----------------------------
-- Table: employees
-- ----------------------------
CREATE TABLE `employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL COMMENT '关联用户ID',
  `username` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户名',
  `mongo_id` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_card_number` varchar(18) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '身份证号',
  `position` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '职务',
  `department` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '部门',
  `level` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'staff' COMMENT '级别',
  `store_id` int DEFAULT NULL COMMENT '所属门店ID',
  `direct_leader_id` int DEFAULT NULL COMMENT '直属领导ID',
  `direct_leader_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '直属领导姓名',
  `hire_date` date DEFAULT NULL COMMENT '入职日期',
  `emergency_contact` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '紧急联系人',
  `emergency_phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '紧急联系电话',
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态',
  `resign_date` date DEFAULT NULL COMMENT '离职日期',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `company_id` int DEFAULT NULL COMMENT '公司ID',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_employees_mongo_id` (`mongo_id`),
  KEY `idx_employees_is_deleted` (`is_deleted`),
  KEY `idx_employees_user_id` (`user_id`),
  KEY `idx_employees_store_id` (`store_id`),
  KEY `idx_employees_status` (`status`),
  KEY `idx_employees_company_id` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: equipment_accessory_knowledge
-- ----------------------------
CREATE TABLE `equipment_accessory_knowledge` (
  `id` int NOT NULL AUTO_INCREMENT,
  `equipment_brand` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '设备品牌',
  `equipment_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '设备类型',
  `equipment_model` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '设备型号',
  `equipment_height` int DEFAULT NULL COMMENT '设备工作高度(米)',
  `equipment_category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备类别',
  `accessory_id` int NOT NULL COMMENT '配件ID',
  `part_position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '安装位置',
  `part_function` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配件功能',
  `compatibility_level` enum('perfect','excellent','good','fair','poor') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'good' COMMENT 'perfect=完美匹配, excellent=优秀, good=良好, fair=一般, poor=差',
  `compatibility_score` decimal(3,2) DEFAULT '0.80' COMMENT '适配评分(0-5)',
  `is_original_recommended` tinyint(1) DEFAULT '0' COMMENT '是否原厂推荐',
  `installation_difficulty` enum('easy','medium','hard','expert') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `installation_time_minutes` int DEFAULT NULL COMMENT '预计安装时间(分钟)',
  `special_tools_required` json DEFAULT NULL COMMENT '所需特殊工具数组',
  `installation_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '安装注意事项',
  `replacement_interval` int DEFAULT NULL COMMENT '更换周期数值',
  `replacement_interval_unit` enum('hours','days','months','km') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'hours',
  `usage_count` int DEFAULT '0' COMMENT '实际使用次数',
  `success_rate` decimal(5,2) DEFAULT '0.00' COMMENT '安装成功率(%)',
  `avg_lifespan_hours` int DEFAULT NULL COMMENT '平均使用寿命(小时)',
  `user_rating` decimal(3,2) DEFAULT '0.00' COMMENT '用户评分(0-5)',
  `feedback_count` int DEFAULT '0' COMMENT '反馈数量',
  `positive_feedback_count` int DEFAULT '0' COMMENT '正面反馈数',
  `negative_feedback_count` int DEFAULT '0' COMMENT '负面反馈数',
  `common_issues` json DEFAULT NULL COMMENT '常见问题汇总',
  `confidence_score` decimal(3,2) DEFAULT '0.50' COMMENT 'AI置信度(0-1)',
  `data_source` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'manual' COMMENT '数据来源(manual/ai_learned/manufacturer)',
  `last_verified_date` date DEFAULT NULL COMMENT '最后验证日期',
  `company_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_equipment_accessory` (`equipment_brand`,`equipment_type`,`equipment_model`,`accessory_id`,`company_id`),
  KEY `idx_equipment` (`equipment_brand`,`equipment_type`,`equipment_model`),
  KEY `idx_accessory` (`accessory_id`),
  KEY `idx_compatibility` (`compatibility_score`,`compatibility_level`),
  KEY `idx_usage` (`usage_count`,`success_rate`),
  KEY `idx_rating` (`user_rating`),
  CONSTRAINT `fk_knowledge_accessory` FOREIGN KEY (`accessory_id`) REFERENCES `accessories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备-配件适配知识库';

-- ----------------------------
-- Table: equipment_models
-- ----------------------------
CREATE TABLE `equipment_models` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '设备类别',
  `brand` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '品牌',
  `model` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '型号',
  `type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '类型',
  `height` decimal(6,2) NOT NULL COMMENT '高度(米)',
  `drive_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '驱动方式',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_equipment_models_brand_model` (`brand`,`model`),
  KEY `idx_equipment_models_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: equipment_part_replacements
-- ----------------------------
CREATE TABLE `equipment_part_replacements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `equipment_id` int NOT NULL COMMENT '设备ID',
  `part_category_id` int NOT NULL COMMENT '配件类别ID',
  `part_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配件名称',
  `part_model` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配件型号',
  `part_brand` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配件品牌',
  `part_serial_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配件序列号',
  `replacement_date` date NOT NULL COMMENT '更换日期',
  `replacement_reason` enum('故障','损坏','老化','升级','保养','其他') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '故障' COMMENT '更换原因',
  `failure_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '故障描述',
  `old_part_serial_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '旧件序列号',
  `old_part_usage_days` int DEFAULT NULL COMMENT '旧件使用天数',
  `old_part_usage_hours` int DEFAULT NULL COMMENT '旧件使用小时数',
  `part_cost` decimal(10,2) NOT NULL COMMENT '配件成本',
  `labor_cost` decimal(10,2) DEFAULT '0.00' COMMENT '人工费用',
  `total_cost` decimal(10,2) NOT NULL COMMENT '总费用',
  `warranty_months` int DEFAULT '12' COMMENT '保修月数',
  `warranty_start_date` date DEFAULT NULL COMMENT '保修开始日期',
  `warranty_end_date` date DEFAULT NULL COMMENT '保修结束日期',
  `warranty_status` enum('在保','已过保','即将过保') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '保修状态',
  `supplier_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '供应商名称',
  `supplier_contact` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '供应商联系方式',
  `purchase_order_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '采购单号',
  `technician_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '更换技师',
  `work_hours` decimal(5,2) DEFAULT NULL COMMENT '工时',
  `order_id` int DEFAULT NULL COMMENT '关联订单ID（如果是租赁期间更换）',
  `invoice_file` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '发票文件路径',
  `photo_files` json DEFAULT NULL COMMENT '照片文件路径数组',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `created_by` int DEFAULT NULL COMMENT '创建人',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_equipment_id` (`equipment_id`),
  KEY `idx_replacement_date` (`replacement_date`),
  KEY `idx_warranty_status` (`warranty_status`),
  KEY `idx_part_category` (`part_category_id`),
  CONSTRAINT `equipment_part_replacements_ibfk_1` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `equipment_part_replacements_ibfk_2` FOREIGN KEY (`part_category_id`) REFERENCES `high_value_part_categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备配件更换记录表';

-- ----------------------------
-- Table: equipment_purchases
-- ----------------------------
CREATE TABLE `equipment_purchases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL COMMENT '公司ID',
  `purchase_number` varchar(50) NOT NULL COMMENT '采购单号',
  `manufacturer_name` varchar(200) NOT NULL COMMENT '厂家名称',
  `purchase_date` date NOT NULL COMMENT '采购日期',
  `down_payment_ratio` decimal(5,2) DEFAULT '0.00' COMMENT '首付比例（%）',
  `payment_terms` int DEFAULT '0' COMMENT '账期（月）',
  `tax_rate` decimal(5,2) DEFAULT '13.00' COMMENT '税率（%）',
  `purchase_type` enum('cash','installment','financing') DEFAULT 'cash' COMMENT '购买方式：现金、分期、融资',
  `repayment_period` int DEFAULT NULL COMMENT '还款期限（月）',
  `repayment_start_date` date DEFAULT NULL COMMENT '还款开始日期',
  `repayment_end_date` date DEFAULT NULL COMMENT '还款结束日期',
  `monthly_payment` decimal(15,2) DEFAULT NULL COMMENT '月供金额',
  `down_payment` decimal(15,2) DEFAULT '0.00' COMMENT '首付金额',
  `loan_amount` decimal(15,2) DEFAULT '0.00' COMMENT '贷款/分期金额',
  `annual_interest_rate` decimal(5,2) DEFAULT '0.00' COMMENT '年利率（%）',
  `repayment_account_name` varchar(200) DEFAULT NULL COMMENT '还款账户名称',
  `repayment_account_number` varchar(100) DEFAULT NULL COMMENT '还款账号',
  `repayment_bank` varchar(200) DEFAULT NULL COMMENT '还款银行',
  `warranty_period` int DEFAULT '12' COMMENT '质保期（月）',
  `warranty_expiry_date` date DEFAULT NULL COMMENT '质保到期日期',
  `total_amount` decimal(15,2) DEFAULT '0.00' COMMENT '总金额（不含税）',
  `tax_amount` decimal(15,2) DEFAULT '0.00' COMMENT '税额',
  `total_with_tax` decimal(15,2) DEFAULT '0.00' COMMENT '含税总额',
  `attachments` json DEFAULT NULL COMMENT '附件列表',
  `remark` text COMMENT '备注',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `updated_by` int DEFAULT NULL COMMENT '更新人ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` tinyint(1) DEFAULT '0' COMMENT '是否删除',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_number` (`purchase_number`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_purchase_number` (`purchase_number`),
  KEY `idx_purchase_date` (`purchase_date`),
  KEY `idx_manufacturer_name` (`manufacturer_name`),
  KEY `idx_is_deleted` (`is_deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备采购主表';

-- ----------------------------
-- Table: equipment_repairs
-- ----------------------------
CREATE TABLE `equipment_repairs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `repair_number` varchar(50) NOT NULL COMMENT '维修单号',
  `equipment_code` varchar(50) NOT NULL COMMENT '设备编号',
  `equipment_id` int DEFAULT NULL COMMENT '设备ID',
  `order_id` int DEFAULT NULL COMMENT '关联订单ID',
  `exit_id` int DEFAULT NULL COMMENT '关联退场记录ID',
  `damage_type` varchar(50) DEFAULT NULL COMMENT '损坏类型',
  `damage_parts` json DEFAULT NULL COMMENT '损坏部件列表',
  `damage_description` text COMMENT '损坏描述',
  `repair_person` varchar(100) DEFAULT NULL COMMENT '维修人员',
  `repair_cost` decimal(12,2) DEFAULT '0.00' COMMENT '维修费用',
  `repair_start_date` date DEFAULT NULL COMMENT '开始维修日期',
  `repair_end_date` date DEFAULT NULL COMMENT '完成维修日期',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '维修状态：pending待维修, repairing维修中, completed已完成, cancelled已取消',
  `remark` text COMMENT '备注',
  `attachments` json DEFAULT NULL COMMENT '附件',
  `company_id` int NOT NULL COMMENT '公司ID',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  `is_video_diagnosis` tinyint(1) DEFAULT '0' COMMENT '是否视频判断',
  `contact_name` varchar(50) DEFAULT NULL COMMENT '联系人',
  `contact_phone` varchar(50) DEFAULT NULL COMMENT '联系电话',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_repair_number` (`repair_number`),
  KEY `idx_equipment_code` (`equipment_code`),
  KEY `idx_equipment_id` (`equipment_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_status` (`status`),
  KEY `idx_company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='设备维修单';

-- ----------------------------
-- Table: equipment_status_logs
-- ----------------------------
CREATE TABLE `equipment_status_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `equipment_id` int NOT NULL COMMENT '设备ID',
  `from_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '变更前状态',
  `to_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '变更后状态',
  `reason` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '变更原因',
  `related_order_id` int DEFAULT NULL COMMENT '关联订单ID',
  `operator_id` int DEFAULT NULL COMMENT '操作人ID',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_equipment_id` (`equipment_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备状态变更日志';

-- ----------------------------
-- Table: equipment_usage_statistics
-- ----------------------------
CREATE TABLE `equipment_usage_statistics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `equipment_id` int NOT NULL COMMENT '设备ID',
  `stat_month` date NOT NULL COMMENT '统计月份（YYYY-MM-01）',
  `total_days` int DEFAULT '0' COMMENT '总天数',
  `rental_days` int DEFAULT '0' COMMENT '出租天数',
  `idle_days` int DEFAULT '0' COMMENT '闲置天数',
  `maintenance_days` int DEFAULT '0' COMMENT '维修天数',
  `utilization_rate` decimal(5,2) DEFAULT NULL COMMENT '利用率(%)',
  `availability_rate` decimal(5,2) DEFAULT NULL COMMENT '可用率(%) = (总天数-维修天数)/总天数',
  `rental_income` decimal(12,2) DEFAULT '0.00' COMMENT '租金收入',
  `maintenance_cost` decimal(12,2) DEFAULT '0.00' COMMENT '维护成本',
  `parts_cost` decimal(12,2) DEFAULT '0.00' COMMENT '配件成本',
  `net_profit` decimal(12,2) DEFAULT NULL COMMENT '净利润',
  `rental_count` int DEFAULT '0' COMMENT '出租次数',
  `customer_count` int DEFAULT '0' COMMENT '客户数量',
  `average_rental_days` decimal(5,1) DEFAULT NULL COMMENT '平均租期（天）',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_equipment_month` (`equipment_id`,`stat_month`),
  KEY `idx_stat_month` (`stat_month`),
  KEY `idx_utilization_rate` (`utilization_rate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备使用率统计表';

-- ----------------------------
-- Table: equipments
-- ----------------------------
CREATE TABLE `equipments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备编码',
  `company_id` int DEFAULT NULL COMMENT '所属公司ID（多租户）',
  `mongo_id` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model_id` int DEFAULT NULL,
  `serial_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `custom_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '自编码',
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `equipment_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备编码',
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备类别',
  `brand` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '品牌',
  `model` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '型号',
  `type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '类型',
  `height` decimal(6,2) DEFAULT NULL COMMENT '高度',
  `drive_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '驱动方式',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `source` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'self-owned' COMMENT '设备来源',
  `rental_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'available' COMMENT '租赁状态',
  `insurance_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'uninsured' COMMENT '保险状态',
  `warehouse` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '仓库位置',
  `store_id` int DEFAULT NULL COMMENT '所属门店ID',
  `purchase_date` date DEFAULT NULL COMMENT '购买日期',
  `factory_date` date DEFAULT NULL COMMENT '出厂日期',
  `attachments` json DEFAULT NULL COMMENT '附件',
  `operation_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available' COMMENT '运行状态:available-可用/rented-已租出/maintenance-维修中/scrapped-已报废',
  `working_hours` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '累计工作小时数',
  `last_maintenance_date` date DEFAULT NULL COMMENT '最后维修日期',
  `next_maintenance_date` date DEFAULT NULL COMMENT '下次保养日期',
  `current_location` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '当前位置/工地',
  `current_customer_id` int DEFAULT NULL COMMENT '当前租用客户ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_equipments_mongo_id` (`mongo_id`),
  UNIQUE KEY `uniq_equipments_equipment_code` (`equipment_code`),
  KEY `fk_equipments_model_id` (`model_id`),
  KEY `idx_equipments_is_deleted` (`is_deleted`),
  KEY `idx_equipments_company_id` (`company_id`),
  KEY `idx_operation_status` (`operation_status`),
  KEY `idx_current_customer` (`current_customer_id`),
  CONSTRAINT `fk_equipments_model_id` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: finance_records
-- ----------------------------
CREATE TABLE `finance_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `record_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `record_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_id` int DEFAULT NULL,
  `order_id` int DEFAULT NULL,
  `order_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payment_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `record_date` date NOT NULL,
  `customer_id` int DEFAULT NULL,
  `customer_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `attachments_json` json DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_record_number` (`record_number`),
  KEY `idx_record_type` (`record_type`),
  KEY `idx_source_type` (`source_type`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_record_date` (`record_date`),
  KEY `idx_company_id` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: high_value_part_categories
-- ----------------------------
CREATE TABLE `high_value_part_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配件类别名称',
  `category_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '类别代码',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '描述',
  `typical_price_range` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '典型价格范围',
  `default_warranty_months` int DEFAULT '12' COMMENT '默认保修月数',
  `is_critical` tinyint(1) DEFAULT '1' COMMENT '是否关键部件',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_category_code` (`category_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='高价值配件类别表';

-- ----------------------------
-- Table: insurance_policies
-- ----------------------------
CREATE TABLE `insurance_policies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL COMMENT '所属公司ID（多租户）',
  `number` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '保单号',
  `company` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '保险公司',
  `rate` decimal(5,2) NOT NULL COMMENT '费率',
  `start_date` date NOT NULL COMMENT '起保日期',
  `end_date` date NOT NULL COMMENT '止保日期',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_insurance_number` (`number`),
  KEY `idx_insurance_company` (`company`),
  KEY `idx_insurance_start_date` (`start_date`),
  KEY `idx_insurance_end_date` (`end_date`),
  KEY `idx_insurance_policies_company_id` (`company_id`),
  CONSTRAINT `insurance_policies_chk_1` CHECK (((`rate` >= 0) and (`rate` <= 100)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: logistics_companies
-- ----------------------------
CREATE TABLE `logistics_companies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公司名称',
  `contact_person` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系人',
  `contact_phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系电话',
  `pricing_rule` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '计价规则',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_logistics_companies_name` (`name`),
  KEY `idx_company_id` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: logistics_company_stores
-- ----------------------------
CREATE TABLE `logistics_company_stores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `store_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_company_store` (`company_id`,`store_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table: logistics_driver_stores
-- ----------------------------
CREATE TABLE `logistics_driver_stores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `driver_id` int NOT NULL,
  `store_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_driver_store` (`driver_id`,`store_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table: logistics_drivers
-- ----------------------------
CREATE TABLE `logistics_drivers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '姓名',
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '电话',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_logistics_drivers_phone` (`phone`),
  KEY `idx_company_id` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: logistics_ledger
-- ----------------------------
CREATE TABLE `logistics_ledger` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int DEFAULT NULL COMMENT '关联订单ID（可为空，转租等场景）',
  `transport_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '运输类型：进场/退场',
  `transport_date` date NOT NULL COMMENT '运输日期',
  `driver_id` int DEFAULT NULL COMMENT '司机ID',
  `vehicle_id` int DEFAULT NULL COMMENT '车辆ID',
  `company_id` int DEFAULT NULL COMMENT '物流公司ID',
  `freight_amount` decimal(10,2) DEFAULT NULL COMMENT '运费金额',
  `remark` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `entry_id` int DEFAULT NULL,
  `exit_id` int DEFAULT NULL,
  `record_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'entry',
  `logistics_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '自有物流',
  `logistics_cost` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '物流费用',
  `record_date` date DEFAULT NULL,
  `order_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_plate` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `driver_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `driver_phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_contact_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_contact_phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ledger_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `store_id` int DEFAULT NULL COMMENT '门店ID',
  `store_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '门店名称',
  `source_store_id` int DEFAULT NULL COMMENT '源门店ID（出库门店）',
  `source_store_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '源门店名称（出库门店）',
  `target_store_id` int DEFAULT NULL COMMENT '目标门店ID（入库门店）',
  `target_store_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '目标门店名称（入库门店）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_ledger_number` (`ledger_number`),
  KEY `fk_logistics_ledger_order_id` (`order_id`),
  KEY `fk_logistics_ledger_driver_id` (`driver_id`),
  KEY `fk_logistics_ledger_vehicle_id` (`vehicle_id`),
  KEY `fk_logistics_ledger_company_id` (`company_id`),
  KEY `idx_store_id` (`store_id`),
  CONSTRAINT `fk_logistics_ledger_company_id` FOREIGN KEY (`company_id`) REFERENCES `logistics_companies` (`id`),
  CONSTRAINT `fk_logistics_ledger_driver_id` FOREIGN KEY (`driver_id`) REFERENCES `logistics_drivers` (`id`),
  CONSTRAINT `fk_logistics_ledger_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_logistics_ledger_vehicle_id` FOREIGN KEY (`vehicle_id`) REFERENCES `logistics_vehicles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: logistics_vehicle_stores
-- ----------------------------
CREATE TABLE `logistics_vehicle_stores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vehicle_id` int NOT NULL,
  `store_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_vehicle_store` (`vehicle_id`,`store_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table: logistics_vehicles
-- ----------------------------
CREATE TABLE `logistics_vehicles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `plate_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '车牌号',
  `spec` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '规格',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_logistics_vehicles_plate` (`plate_number`),
  KEY `idx_company_id` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: models
-- ----------------------------
CREATE TABLE `models` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mongo_id` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `spec` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_models_mongo_id` (`mongo_id`),
  KEY `idx_models_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: order_claims
-- ----------------------------
CREATE TABLE `order_claims` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `order_id` int NOT NULL COMMENT '订单ID',
  `claim_amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '索赔金额',
  `claim_date` date DEFAULT NULL COMMENT '索赔日期',
  `attachments_json` json DEFAULT NULL COMMENT '附件（JSON格式，包含索赔单号、合同名称、设备选择、原因等）',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_order_claims_order_id` (`order_id`),
  KEY `idx_order_claims_claim_date` (`claim_date`),
  KEY `idx_company_id` (`company_id`),
  CONSTRAINT `fk_order_claims_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单索赔记录表';

-- ----------------------------
-- Table: order_clearances
-- ----------------------------
CREATE TABLE `order_clearances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `order_id` int NOT NULL,
  `clearance_date` date DEFAULT NULL,
  `clearance_amount` decimal(12,2) DEFAULT '0.00',
  `attachments_json` json DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_clearance_date` (`clearance_date`),
  KEY `idx_company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: order_entries
-- ----------------------------
CREATE TABLE `order_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `order_id` int NOT NULL,
  `equipment_id` int DEFAULT NULL,
  `entry_date` date DEFAULT NULL,
  `entry_location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '进场地点',
  `entry_person` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entry_contact` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '进场联系电话',
  `attachments_json` json DEFAULT NULL,
  `logistics_cost` decimal(12,2) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `equipment_count` int NOT NULL DEFAULT '1' COMMENT '进场设备数量',
  PRIMARY KEY (`id`),
  KEY `fk_order_entries_order_id` (`order_id`),
  KEY `fk_order_entries_equipment_id` (`equipment_id`),
  KEY `idx_company_id` (`company_id`),
  CONSTRAINT `fk_order_entries_equipment_id` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`id`),
  CONSTRAINT `fk_order_entries_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: order_equipment_demands
-- ----------------------------
CREATE TABLE `order_equipment_demands` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL COMMENT '订单ID',
  `equipment_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '设备类型',
  `equipment_brand` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备品牌',
  `equipment_height` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备高度',
  `equipment_model` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备型号',
  `quantity` int NOT NULL DEFAULT '1' COMMENT '数量',
  `rental_period` int NOT NULL COMMENT '租赁天数',
  `daily_rate` decimal(12,2) NOT NULL COMMENT '日租金',
  `monthly_rate` decimal(12,2) NOT NULL COMMENT '月租金',
  `calculated_rent` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '计算后租金',
  `deposit` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '押金',
  `transport_fee` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '运费',
  `modification_fee` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '改装费',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '小计金额',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `company_id` int DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单设备需求表';

-- ----------------------------
-- Table: order_exits
-- ----------------------------
CREATE TABLE `order_exits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `order_id` int NOT NULL,
  `equipment_id` int DEFAULT NULL,
  `exit_date` date DEFAULT NULL,
  `attachments_json` json DEFAULT NULL,
  `logistics_cost` decimal(12,2) DEFAULT '0.00',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `equipment_count` int NOT NULL DEFAULT '1' COMMENT '退场设备数量',
  PRIMARY KEY (`id`),
  KEY `fk_order_exits_order_id` (`order_id`),
  KEY `fk_order_exits_equipment_id` (`equipment_id`),
  KEY `idx_company_id` (`company_id`),
  CONSTRAINT `fk_order_exits_equipment_id` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`id`),
  CONSTRAINT `fk_order_exits_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: order_invoices
-- ----------------------------
CREATE TABLE `order_invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `order_id` int NOT NULL COMMENT '订单ID',
  `invoice_number` varchar(50) NOT NULL COMMENT '发票号码',
  `invoice_type` varchar(50) NOT NULL DEFAULT 'vat_normal' COMMENT '发票类型: vat_special(专票), vat_normal(普票)',
  `invoice_date` date NOT NULL COMMENT '开票日期',
  `invoice_title` varchar(255) NOT NULL COMMENT '发票抬头',
  `tax_number` varchar(100) NOT NULL DEFAULT '' COMMENT '纳税人识别号',
  `invoice_content` text COMMENT '开票内容',
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '开票金额',
  `tax_rate` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT '税率（%）',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '税额',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '价税合计',
  `invoice_status` varchar(50) NOT NULL DEFAULT 'issued' COMMENT '发票状态',
  `sent_date` date DEFAULT NULL COMMENT '寄出日期',
  `received_date` date DEFAULT NULL COMMENT '收到日期',
  `cancelled_date` date DEFAULT NULL COMMENT '作废日期',
  `cancelled_reason` text COMMENT '作废原因',
  `recipient_name` varchar(100) DEFAULT NULL COMMENT '收件人姓名',
  `recipient_phone` varchar(50) DEFAULT NULL COMMENT '收件人电话',
  `recipient_address` varchar(500) DEFAULT NULL COMMENT '收件地址',
  `express_company` varchar(100) DEFAULT NULL COMMENT '快递公司',
  `express_number` varchar(100) DEFAULT NULL COMMENT '快递单号',
  `issuer_company` varchar(255) DEFAULT NULL COMMENT '开票公司',
  `receiver_company` varchar(255) DEFAULT NULL COMMENT '收票公司',
  `attachments` json DEFAULT NULL COMMENT '附件',
  `notes` text COMMENT '备注',
  `created_by` int DEFAULT NULL COMMENT '创建人',
  `sent_by` int DEFAULT NULL COMMENT '寄出操作人',
  `cancelled_by` int DEFAULT NULL COMMENT '作废操作人',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_invoice_number` (`invoice_number`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_invoice_status` (`invoice_status`),
  KEY `idx_invoice_date` (`invoice_date`),
  KEY `idx_company_id` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='订单发票表';

-- ----------------------------
-- Table: order_items
-- ----------------------------
CREATE TABLE `order_items` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '设备项ID',
  `company_id` int DEFAULT NULL,
  `order_id` int NOT NULL COMMENT '订单ID',
  `equipment_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备类型',
  `height` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '高度',
  `quantity` int DEFAULT '0' COMMENT '数量',
  `daily_rate` decimal(12,2) DEFAULT '0.00' COMMENT '日租价',
  `monthly_rate` decimal(12,2) DEFAULT '0.00' COMMENT '月租价',
  `deposit` decimal(12,2) DEFAULT '0.00' COMMENT '押金',
  `shipping_fee` decimal(12,2) DEFAULT '0.00' COMMENT '运费',
  `modification_fee` decimal(12,2) DEFAULT '0.00' COMMENT '改装费',
  `scheduled_entry_date` date DEFAULT NULL COMMENT '计划进场日期',
  `estimated_exit_date` date DEFAULT NULL COMMENT '预计退场日期',
  `rental_period` int DEFAULT '0' COMMENT '租期（天）',
  `shipping_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '运输类型：单程/双程',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id` (`order_id`),
  KEY `idx_company_id` (`company_id`),
  CONSTRAINT `fk_order_items_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单设备需求项表';

-- ----------------------------
-- Table: order_receipts
-- ----------------------------
CREATE TABLE `order_receipts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receipt_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '收款单号',
  `company_id` int DEFAULT NULL,
  `order_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `receipt_date` date DEFAULT NULL,
  `attachments_json` json DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_receipt_number` (`receipt_number`),
  KEY `fk_order_receipts_order_id` (`order_id`),
  KEY `idx_company_id` (`company_id`),
  CONSTRAINT `fk_order_receipts_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: order_refunds
-- ----------------------------
CREATE TABLE `order_refunds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `refund_number` varchar(50) DEFAULT NULL COMMENT '退款单号',
  `company_id` int DEFAULT NULL,
  `order_id` int NOT NULL COMMENT '订单ID',
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '退款金额',
  `refund_date` date NOT NULL COMMENT '退款日期',
  `refund_method` varchar(50) DEFAULT NULL COMMENT '退款方式',
  `refund_reason` text COMMENT '退款原因',
  `attachments_json` json DEFAULT NULL COMMENT '附件（JSON格式）',
  `notes` text COMMENT '备注',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_refund_number` (`refund_number`),
  KEY `idx_order_refunds_order_id` (`order_id`),
  KEY `idx_order_refunds_refund_date` (`refund_date`),
  KEY `idx_company_id` (`company_id`),
  CONSTRAINT `fk_order_refunds_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='订单退款表';

-- ----------------------------
-- Table: order_settlements
-- ----------------------------
CREATE TABLE `order_settlements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `order_id` int NOT NULL,
  `settlement_date` date DEFAULT NULL,
  `settlement_amount` decimal(12,2) DEFAULT '0.00',
  `attachments_json` json DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_settlement_date` (`settlement_date`),
  KEY `idx_company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: order_suspensions
-- ----------------------------
CREATE TABLE `order_suspensions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `order_id` int NOT NULL,
  `equipment_id` int DEFAULT NULL,
  `suspension_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '报停类型：weather, site_stop, maintenance, customer_request',
  `start_date` date NOT NULL COMMENT '报停开始日期',
  `end_date` date DEFAULT NULL COMMENT '报停结束日期（NULL表示未恢复）',
  `suspension_days` int DEFAULT NULL COMMENT '报停天数',
  `is_charge_free` tinyint(1) DEFAULT '1' COMMENT '是否免费（1=免费，0=照常计费）',
  `discount_rate` decimal(5,2) DEFAULT '0.00' COMMENT '折扣率（0-100，100表示免费）',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '状态：pending, approved, rejected, ended',
  `reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '报停原因',
  `attachments` json DEFAULT NULL COMMENT '附件（证明文件）',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `approved_by` int DEFAULT NULL COMMENT '审批人ID',
  `approved_at` datetime DEFAULT NULL COMMENT '审批时间',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_order_suspensions_order_id` (`order_id`),
  KEY `fk_order_suspensions_equipment_id` (`equipment_id`),
  KEY `idx_order_suspensions_status` (`status`),
  KEY `idx_order_suspensions_dates` (`start_date`,`end_date`),
  KEY `idx_company_id` (`company_id`),
  CONSTRAINT `fk_order_suspensions_equipment_id` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`id`),
  CONSTRAINT `fk_order_suspensions_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: order_template_usage
-- ----------------------------
CREATE TABLE `order_template_usage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL COMMENT '订单ID',
  `template_id` int NOT NULL COMMENT '使用的模板ID',
  `document_type` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '单据类型',
  `generated_html` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '生成的HTML',
  `pdf_path` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'PDF文件路径',
  `generated_by` int DEFAULT NULL COMMENT '生成人ID',
  `generated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_type` (`order_id`,`document_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单模板使用记录表';

-- ----------------------------
-- Table: orders
-- ----------------------------
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL COMMENT '所属公司ID（多租户）',
  `mongo_id` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contract_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lessor_id` int DEFAULT NULL COMMENT '出租方ID',
  `lessor_company_id` int DEFAULT NULL COMMENT '出租方公司ID',
  `customer_id` int DEFAULT NULL COMMENT '客户ID',
  `project_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_manager_id` int DEFAULT NULL,
  `delivery_location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_agreement` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `month_calculation_method` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `project_address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '项目地址',
  `start_date` date DEFAULT NULL COMMENT '开始日期',
  `end_date` date DEFAULT NULL COMMENT '结束日期',
  `rental_period` int DEFAULT NULL COMMENT '租赁天数',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft' COMMENT '订单状态:draft-草稿/pending_entry-待进场/active-进行中/exited-已退场/settled-已结算/cleared-已结清/archived-已归档',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '订单总金额',
  `deposit_amount` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '押金总额',
  `transport_fee` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '运费总额',
  `modification_fee` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '改装费总额',
  `payment_method` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash' COMMENT '支付方式:cash-现金/transfer-转账/check-支票/credit-信用支付',
  `billing_method` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'daily' COMMENT '计费方式:daily-日租/monthly-月租',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `shipping_fee_reduction` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '无减免' COMMENT '运费减免:无减免/减免进场费/减免退场费/双程减免',
  `shipping_fee_calculation` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '按台计费' COMMENT '运费计费方式:按台计费/按车计费',
  `is_tax_invoice` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '不开票' COMMENT '是否开票:不开票/普票/专票',
  `invoice_tax_rate` decimal(5,2) DEFAULT NULL COMMENT '税率',
  `construction_category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '其他' COMMENT '施工类别',
  `other_agreements` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '其他约定',
  `has_contract` tinyint(1) DEFAULT '0' COMMENT '是否已生成合同',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_orders_mongo_id` (`mongo_id`),
  UNIQUE KEY `uniq_orders_contract_number` (`contract_number`),
  KEY `fk_orders_lessor_id` (`lessor_id`),
  KEY `fk_orders_customer_id` (`customer_id`),
  KEY `idx_orders_is_deleted` (`is_deleted`),
  KEY `idx_orders_company_id` (`company_id`),
  CONSTRAINT `fk_orders_customer_id` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_orders_lessor_id` FOREIGN KEY (`lessor_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: part_stocks
-- ----------------------------
CREATE TABLE `part_stocks` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '库存ID',
  `part_id` int NOT NULL COMMENT '配件ID',
  `store_id` int NOT NULL COMMENT '门店ID',
  `quantity` int NOT NULL DEFAULT '0' COMMENT '库存数量',
  `company_id` int DEFAULT NULL COMMENT '公司ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_part_store` (`part_id`,`store_id`),
  KEY `idx_part` (`part_id`),
  KEY `idx_store` (`store_id`),
  KEY `idx_company` (`company_id`),
  CONSTRAINT `part_stocks_ibfk_1` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='配件库存表';

-- ----------------------------
-- Table: part_transactions
-- ----------------------------
CREATE TABLE `part_transactions` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `transaction_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '单号',
  `transaction_type` enum('stock_in','use','return','scrap') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '交易类型：入库、领用、退回、报废',
  `part_id` int NOT NULL COMMENT '配件ID',
  `store_id` int NOT NULL COMMENT '门店ID',
  `quantity` int NOT NULL COMMENT '数量（正数为入库/退回，负数为领用/报废）',
  `status` enum('pending','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'completed' COMMENT '状态：pending待核销/completed已完成/cancelled已取消',
  `equipment_id` int DEFAULT NULL COMMENT '关联设备ID（核销时填写）',
  `repair_id` int DEFAULT NULL COMMENT '关联维修单ID（核销时填写）',
  `repair_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '维修单号',
  `equipment_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联设备编号',
  `write_off_time` datetime DEFAULT NULL COMMENT '核销时间',
  `write_off_by` int DEFAULT NULL COMMENT '核销人ID',
  `write_off_remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '核销备注',
  `operator_id` int DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人姓名',
  `transaction_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '交易时间',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `company_id` int DEFAULT NULL COMMENT '公司ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_no` (`transaction_no`),
  KEY `idx_transaction_no` (`transaction_no`),
  KEY `idx_type` (`transaction_type`),
  KEY `idx_part` (`part_id`),
  KEY `idx_store` (`store_id`),
  KEY `idx_company` (`company_id`),
  KEY `idx_time` (`transaction_time`),
  KEY `idx_equipment_id` (`equipment_id`),
  KEY `idx_status` (`status`),
  KEY `idx_repair_id` (`repair_id`),
  CONSTRAINT `part_transactions_ibfk_1` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='配件出入库记录表';

-- ----------------------------
-- Table: part_warranty_alerts
-- ----------------------------
CREATE TABLE `part_warranty_alerts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `replacement_id` int NOT NULL COMMENT '更换记录ID',
  `equipment_id` int NOT NULL COMMENT '设备ID',
  `alert_type` enum('即将过保','已过保','保修期内故障') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '提醒类型',
  `alert_date` date NOT NULL COMMENT '提醒日期',
  `is_read` tinyint(1) DEFAULT '0' COMMENT '是否已读',
  `is_handled` tinyint(1) DEFAULT '0' COMMENT '是否已处理',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_equipment_id` (`equipment_id`),
  KEY `idx_alert_date` (`alert_date`),
  KEY `idx_is_read` (`is_read`),
  KEY `replacement_id` (`replacement_id`),
  CONSTRAINT `part_warranty_alerts_ibfk_1` FOREIGN KEY (`replacement_id`) REFERENCES `equipment_part_replacements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `part_warranty_alerts_ibfk_2` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='配件保修提醒表';

-- ----------------------------
-- Table: parts
-- ----------------------------
CREATE TABLE `parts` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '配件ID',
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配件编号，格式：PJ+YYYYMMDD+序号',
  `category` enum('电控系统','液压系统','结构件','易损件') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配件类别',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配件名称',
  `brand` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '品牌',
  `model` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '规格型号',
  `purchase_price` decimal(10,2) DEFAULT NULL COMMENT '采购价格',
  `applicable_range` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '适用范围',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `company_id` int DEFAULT NULL COMMENT '公司ID',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_code` (`code`),
  KEY `idx_category` (`category`),
  KEY `idx_company` (`company_id`),
  KEY `idx_deleted` (`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='配件基础信息表';

-- ----------------------------
-- Table: password_reset_tokens
-- ----------------------------
CREATE TABLE `password_reset_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL COMMENT '用户ID',
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '重置令牌',
  `expires_at` datetime(3) NOT NULL COMMENT '过期时间',
  `used_at` datetime(3) DEFAULT NULL COMMENT '使用时间',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_password_reset_token` (`token`),
  KEY `idx_password_reset_user_id` (`user_id`),
  KEY `idx_password_reset_expires_at` (`expires_at`),
  CONSTRAINT `fk_password_reset_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='密码重置令牌表';

-- ----------------------------
-- Table: permissions
-- ----------------------------
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '权限代码',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '权限名称',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '权限描述',
  `resource` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '资源类型',
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作类型',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_permissions_code` (`code`),
  KEY `idx_permissions_resource_action` (`resource`,`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- ----------------------------
-- Table: policy_attachments
-- ----------------------------
CREATE TABLE `policy_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `policy_id` int NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `size` int NOT NULL,
  `storage_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `iv` varbinary(16) NOT NULL,
  `auth_tag` varbinary(16) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_policy_attachments_policy_id` (`policy_id`),
  KEY `idx_company_id` (`company_id`),
  CONSTRAINT `fk_policy_attachments_policy_id` FOREIGN KEY (`policy_id`) REFERENCES `insurance_policies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: policy_devices
-- ----------------------------
CREATE TABLE `policy_devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `policy_id` int NOT NULL,
  `device_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_policy_devices_policy_id` (`policy_id`),
  KEY `fk_policy_devices_device_id` (`device_id`),
  KEY `idx_policy_devices_policy_device` (`policy_id`,`device_id`),
  KEY `idx_company_id` (`company_id`),
  CONSTRAINT `fk_policy_devices_device_id` FOREIGN KEY (`device_id`) REFERENCES `equipments` (`id`),
  CONSTRAINT `fk_policy_devices_policy_id` FOREIGN KEY (`policy_id`) REFERENCES `insurance_policies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: policy_equipments
-- ----------------------------
CREATE TABLE `policy_equipments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `policy_id` int NOT NULL,
  `equipment_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_policy_equipments_policy_id` (`policy_id`),
  KEY `fk_policy_equipments_equipment_id` (`equipment_id`),
  KEY `idx_company_id` (`company_id`),
  CONSTRAINT `fk_policy_equipments_equipment_id` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`id`),
  CONSTRAINT `fk_policy_equipments_policy_id` FOREIGN KEY (`policy_id`) REFERENCES `insurance_policies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: purchase_items
-- ----------------------------
CREATE TABLE `purchase_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL,
  `purchase_id` int NOT NULL COMMENT '采购单ID',
  `equipment_category` varchar(100) NOT NULL COMMENT '设备类别',
  `equipment_type` varchar(100) NOT NULL COMMENT '设备类型',
  `equipment_model` varchar(200) NOT NULL COMMENT '设备型号',
  `equipment_height` decimal(6,2) DEFAULT NULL COMMENT '设备高度(米)',
  `quantity` int NOT NULL DEFAULT '1' COMMENT '数量',
  `unit_price` decimal(15,2) NOT NULL COMMENT '单价',
  `subtotal` decimal(15,2) NOT NULL COMMENT '小计金额',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_purchase_id` (`purchase_id`),
  KEY `idx_equipment_category` (`equipment_category`),
  KEY `idx_equipment_type` (`equipment_type`),
  KEY `idx_company_id` (`company_id`),
  CONSTRAINT `purchase_items_ibfk_1` FOREIGN KEY (`purchase_id`) REFERENCES `equipment_purchases` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购明细表';

-- ----------------------------
-- Table: purchase_repayments
-- ----------------------------
CREATE TABLE `purchase_repayments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_id` int NOT NULL COMMENT '采购单ID',
  `company_id` int NOT NULL COMMENT '公司ID',
  `repayment_year` int NOT NULL COMMENT '还款年份',
  `repayment_month` int NOT NULL COMMENT '还款月份（1-12）',
  `repayment_date` date DEFAULT NULL COMMENT '实际还款日期',
  `scheduled_amount` decimal(15,2) NOT NULL COMMENT '应还金额',
  `actual_amount` decimal(15,2) DEFAULT NULL COMMENT '实际还款金额',
  `is_paid` tinyint(1) DEFAULT '0' COMMENT '是否已还款',
  `remark` text COMMENT '备注',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `updated_by` int DEFAULT NULL COMMENT '更新人ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_purchase_year_month` (`purchase_id`,`repayment_year`,`repayment_month`),
  KEY `idx_purchase_id` (`purchase_id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_repayment_year_month` (`repayment_year`,`repayment_month`),
  KEY `idx_is_paid` (`is_paid`),
  CONSTRAINT `purchase_repayments_ibfk_1` FOREIGN KEY (`purchase_id`) REFERENCES `equipment_purchases` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='采购还款记录表';

-- ----------------------------
-- Table: reminder_records
-- ----------------------------
CREATE TABLE `reminder_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_id` int DEFAULT NULL COMMENT '规则ID',
  `business_type` varchar(50) NOT NULL COMMENT '业务类型',
  `business_id` int NOT NULL COMMENT '业务ID',
  `title` varchar(200) NOT NULL COMMENT '提醒标题',
  `content` text COMMENT '提醒内容',
  `priority` varchar(20) DEFAULT 'medium' COMMENT '优先级',
  `receiver_id` int NOT NULL COMMENT '接收人ID',
  `receiver_name` varchar(100) DEFAULT NULL COMMENT '接收人姓名',
  `notification_channel` varchar(50) NOT NULL COMMENT '推送渠道: system, email, sms, wechat',
  `status` varchar(50) DEFAULT 'pending' COMMENT '状态: pending, sent, read, handled, expired, failed',
  `sent_at` timestamp(3) NULL DEFAULT NULL COMMENT '发送时间',
  `read_at` timestamp(3) NULL DEFAULT NULL COMMENT '阅读时间',
  `handled_at` timestamp(3) NULL DEFAULT NULL COMMENT '处理时间',
  `repeat_count` int DEFAULT '0' COMMENT '重复次数',
  `parent_record_id` int DEFAULT NULL COMMENT '父记录ID(重复提醒)',
  `handler_id` int DEFAULT NULL COMMENT '处理人ID',
  `handler_name` varchar(100) DEFAULT NULL COMMENT '处理人姓名',
  `handle_note` text COMMENT '处理备注',
  `send_result` text COMMENT '发送结果(JSON)',
  `error_message` text COMMENT '错误信息',
  `company_id` int DEFAULT NULL COMMENT '公司ID',
  `created_at` timestamp(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_rule` (`rule_id`),
  KEY `idx_business` (`business_type`,`business_id`),
  KEY `idx_receiver` (`receiver_id`,`status`),
  KEY `idx_company` (`company_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='提醒记录表';

-- ----------------------------
-- Table: reminder_rules
-- ----------------------------
CREATE TABLE `reminder_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_name` varchar(100) NOT NULL COMMENT '规则名称',
  `rule_type` varchar(50) NOT NULL COMMENT '规则类型: contract_expire, contract_renewal, equipment_exit, reconciliation, policy_expire',
  `description` text COMMENT '规则描述',
  `trigger_type` varchar(50) NOT NULL COMMENT '触发类型: time_based(时间触发), event_based(事件触发)',
  `advance_days` int DEFAULT '0' COMMENT '提前天数',
  `trigger_time` time DEFAULT '09:00:00' COMMENT '触发时间',
  `priority` varchar(20) DEFAULT 'medium' COMMENT '优先级: low, medium, high, urgent',
  `is_repeatable` tinyint(1) DEFAULT '0' COMMENT '是否可重复提醒',
  `repeat_interval` int DEFAULT '1' COMMENT '重复间隔(天)',
  `max_repeat_times` int DEFAULT '3' COMMENT '最大重复次数',
  `receiver_type` varchar(50) NOT NULL COMMENT '接收人类型: specific_user(指定用户), role(角色), department(部门)',
  `receiver_ids` text COMMENT '接收人ID列表(JSON)',
  `notification_channels` text NOT NULL COMMENT '推送渠道(JSON): ["system", "email", "sms", "wechat"]',
  `message_template` text COMMENT '消息模板',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `is_system` tinyint(1) DEFAULT '0' COMMENT '是否系统规则(不可删除)',
  `company_id` int DEFAULT NULL COMMENT '公司ID',
  `created_by` int DEFAULT NULL COMMENT '创建人',
  `updated_by` int DEFAULT NULL COMMENT '更新人',
  `created_at` timestamp(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_rule_type` (`rule_type`),
  KEY `idx_company` (`company_id`),
  KEY `idx_enabled` (`is_enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='提醒规则表';

-- ----------------------------
-- Table: reminder_statistics
-- ----------------------------
CREATE TABLE `reminder_statistics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `stat_date` date NOT NULL COMMENT '统计日期',
  `rule_type` varchar(50) DEFAULT NULL COMMENT '规则类型',
  `total_sent` int DEFAULT '0' COMMENT '发送总数',
  `total_read` int DEFAULT '0' COMMENT '已读总数',
  `total_handled` int DEFAULT '0' COMMENT '已处理总数',
  `total_expired` int DEFAULT '0' COMMENT '已过期总数',
  `total_failed` int DEFAULT '0' COMMENT '发送失败总数',
  `system_sent` int DEFAULT '0' COMMENT '系统消息发送数',
  `email_sent` int DEFAULT '0' COMMENT '邮件发送数',
  `sms_sent` int DEFAULT '0' COMMENT '短信发送数',
  `wechat_sent` int DEFAULT '0' COMMENT '微信发送数',
  `avg_read_time_minutes` int DEFAULT NULL COMMENT '平均阅读时间(分钟)',
  `avg_handle_time_minutes` int DEFAULT NULL COMMENT '平均处理时间(分钟)',
  `company_id` int DEFAULT NULL COMMENT '公司ID',
  `created_at` timestamp(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_stat` (`stat_date`,`rule_type`,`company_id`),
  KEY `idx_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='提醒统计表';

-- ----------------------------
-- Table: revoked_tokens
-- ----------------------------
CREATE TABLE `revoked_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `token_jti` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'JWT Token ID',
  `user_id` int NOT NULL COMMENT '用户ID',
  `revoked_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '撤销时间',
  `reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '撤销原因',
  `expires_at` datetime(3) NOT NULL COMMENT 'Token原始过期时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_revoked_tokens_jti` (`token_jti`),
  KEY `idx_revoked_tokens_expires_at` (`expires_at`),
  KEY `idx_revoked_tokens_user_id` (`user_id`),
  CONSTRAINT `fk_revoked_tokens_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Token黑名单';

-- ----------------------------
-- Table: role_permissions
-- ----------------------------
CREATE TABLE `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_role_permission` (`role_id`,`permission_id`),
  KEY `idx_role_permissions_role_id` (`role_id`),
  KEY `idx_role_permissions_permission_id` (`permission_id`),
  CONSTRAINT `fk_role_permissions_permission_id` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_permissions_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- ----------------------------
-- Table: roles
-- ----------------------------
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色名称',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '角色描述',
  `company_id` int DEFAULT NULL COMMENT '所属公司ID（NULL表示系统级角色）',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_roles_name_company` (`name`,`company_id`),
  KEY `idx_roles_company_id` (`company_id`),
  CONSTRAINT `fk_roles_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- ----------------------------
-- Table: stores
-- ----------------------------
CREATE TABLE `stores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int DEFAULT NULL COMMENT '所属公司ID（多租户）',
  `store_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '门店编码',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `manager_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `store_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'branch' COMMENT '门店类型：headquarters(总部)/branch(分店)/warehouse(仓库)',
  `latitude` decimal(10,7) DEFAULT NULL COMMENT '纬度',
  `longitude` decimal(10,7) DEFAULT NULL COMMENT '经度',
  `contact_phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '门店联系电话',
  `contact_person` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系人',
  `business_hours` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '营业时间（如：周一至周五 9:00-18:00）',
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态：active(营业中)/inactive(已关闭)',
  `area_sqm` decimal(10,2) DEFAULT NULL COMMENT '面积（平方米）',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_store_code_company` (`store_code`,`company_id`),
  KEY `fk_stores_manager_id` (`manager_id`),
  KEY `idx_stores_company_id` (`company_id`),
  KEY `idx_stores_type` (`store_type`),
  KEY `idx_stores_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: sublease_companies
-- ----------------------------
CREATE TABLE `sublease_companies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) NOT NULL COMMENT '公司名称',
  `contact_person` varchar(100) DEFAULT NULL COMMENT '联系人',
  `contact_phone` varchar(50) DEFAULT NULL COMMENT '联系电话',
  `contact_email` varchar(255) DEFAULT NULL COMMENT '联系邮箱',
  `address` varchar(500) DEFAULT NULL COMMENT '公司地址',
  `business_license` varchar(100) DEFAULT NULL COMMENT '营业执照号',
  `tax_id` varchar(100) DEFAULT NULL COMMENT '税号',
  `bank_name` varchar(100) DEFAULT NULL COMMENT '开户银行',
  `bank_account` varchar(100) DEFAULT NULL COMMENT '银行账号',
  `credit_rating` decimal(3,1) DEFAULT '5.0' COMMENT '信用评分（0-5）',
  `renting_count` int DEFAULT '0' COMMENT '转租中设备数量',
  `returned_count` int DEFAULT '0' COMMENT '已还租设备数量',
  `idle_count` int DEFAULT '0' COMMENT '闲置设备数量',
  `total_payable` decimal(12,2) DEFAULT '0.00' COMMENT '应付总金额',
  `total_paid` decimal(12,2) DEFAULT '0.00' COMMENT '已付总金额',
  `outstanding_amount` decimal(12,2) DEFAULT '0.00' COMMENT '剩余应付金额',
  `remark` text COMMENT '备注',
  `status` enum('active','inactive','blacklist') DEFAULT 'active' COMMENT '状态：正常/停用/黑名单',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `tenant_id` int DEFAULT NULL COMMENT '租户ID',
  PRIMARY KEY (`id`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_contact_person` (`contact_person`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='转租公司表';

-- ----------------------------
-- Table: sublease_equipments
-- ----------------------------
CREATE TABLE `sublease_equipments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL COMMENT '转租公司ID',
  `company_name` varchar(255) NOT NULL COMMENT '转租公司名称',
  `store_id` int DEFAULT NULL COMMENT '所在门店ID',
  `store_name` varchar(255) DEFAULT NULL COMMENT '所在门店名称',
  `equipment_code` varchar(100) DEFAULT NULL COMMENT '自编号',
  `factory_number` varchar(100) DEFAULT NULL COMMENT '出厂编码',
  `category` varchar(50) NOT NULL COMMENT '设备类别',
  `equipment_type` varchar(100) NOT NULL COMMENT '设备类型',
  `model` varchar(100) DEFAULT NULL COMMENT '型号',
  `brand` varchar(100) DEFAULT NULL COMMENT '品牌',
  `height` varchar(50) DEFAULT NULL COMMENT '高度',
  `daily_rate` decimal(10,2) DEFAULT '0.00' COMMENT '日租金',
  `monthly_rate` decimal(10,2) DEFAULT '0.00' COMMENT '月租金',
  `deposit` decimal(10,2) DEFAULT '0.00' COMMENT '押金',
  `start_date` date DEFAULT NULL COMMENT '起租日期',
  `end_date` date DEFAULT NULL COMMENT '计划还租日期',
  `actual_return_date` date DEFAULT NULL COMMENT '实际还租日期',
  `rental_days` int DEFAULT '0' COMMENT '租赁天数',
  `total_cost` decimal(12,2) DEFAULT '0.00' COMMENT '总成本',
  `paid_amount` decimal(12,2) DEFAULT '0.00' COMMENT '已付金额',
  `outstanding_amount` decimal(12,2) DEFAULT '0.00' COMMENT '未付金额',
  `status` enum('idle','renting','returned','suspended','maintenance') DEFAULT 'idle' COMMENT '状态：闲置/转租中/已还租/报停/维修中',
  `suspension_reason` text COMMENT '报停原因',
  `suspension_start_date` date DEFAULT NULL COMMENT '报停开始日期',
  `suspension_end_date` date DEFAULT NULL COMMENT '报停结束日期',
  `linked_order_id` int DEFAULT NULL COMMENT '关联的客户订单ID',
  `linked_order_number` varchar(100) DEFAULT NULL COMMENT '关联的客户订单编号',
  `remark` text COMMENT '备注',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `tenant_id` int DEFAULT NULL COMMENT '租户ID',
  PRIMARY KEY (`id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_equipment_code` (`equipment_code`),
  KEY `idx_factory_number` (`factory_number`),
  KEY `idx_status` (`status`),
  KEY `idx_start_date` (`start_date`),
  KEY `idx_store_id` (`store_id`),
  CONSTRAINT `sublease_equipments_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `sublease_companies` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='转租设备表';

-- ----------------------------
-- Table: sublease_payments
-- ----------------------------
CREATE TABLE `sublease_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL COMMENT '转租公司ID',
  `company_name` varchar(255) NOT NULL COMMENT '转租公司名称',
  `payment_number` varchar(50) NOT NULL COMMENT '付款单号',
  `payment_date` date NOT NULL COMMENT '付款日期',
  `payment_amount` decimal(12,2) NOT NULL COMMENT '付款金额',
  `payment_method` enum('cash','transfer','check','other') DEFAULT 'transfer' COMMENT '付款方式',
  `payment_account` varchar(100) DEFAULT NULL COMMENT '付款账户',
  `related_equipment_ids` json DEFAULT NULL COMMENT '关联设备ID列表',
  `receipt_url` varchar(500) DEFAULT NULL COMMENT '收据URL',
  `handler_id` int DEFAULT NULL COMMENT '经办人ID',
  `handler_name` varchar(50) DEFAULT NULL COMMENT '经办人姓名',
  `remark` text COMMENT '备注',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_number` (`payment_number`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_payment_number` (`payment_number`),
  KEY `idx_payment_date` (`payment_date`),
  CONSTRAINT `sublease_payments_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `sublease_companies` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='转租付款记录表';

-- ----------------------------
-- Table: sublease_reconciliations
-- ----------------------------
CREATE TABLE `sublease_reconciliations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL COMMENT '转租公司ID',
  `company_name` varchar(255) NOT NULL COMMENT '转租公司名称',
  `reconciliation_number` varchar(50) NOT NULL COMMENT '对账单号',
  `reconciliation_date` date NOT NULL COMMENT '对账日期',
  `start_date` date DEFAULT NULL COMMENT '对账起始日期',
  `end_date` date DEFAULT NULL COMMENT '对账结束日期',
  `reconciliation_amount` decimal(12,2) NOT NULL COMMENT '对账金额',
  `related_equipment_ids` json DEFAULT NULL COMMENT '关联设备ID列表',
  `status` enum('pending','confirmed','rejected') DEFAULT 'pending' COMMENT '状态：待确认/已确认/已拒绝',
  `confirmed_by` int DEFAULT NULL COMMENT '确认人ID',
  `confirmed_at` datetime(3) DEFAULT NULL COMMENT '确认时间',
  `attachment_url` varchar(500) DEFAULT NULL COMMENT '附件URL',
  `remark` text COMMENT '备注',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `reconciliation_number` (`reconciliation_number`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_reconciliation_number` (`reconciliation_number`),
  KEY `idx_status` (`status`),
  CONSTRAINT `sublease_reconciliations_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `sublease_companies` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='转租对账记录表';

-- ----------------------------
-- Table: system_settings
-- ----------------------------
CREATE TABLE `system_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置键',
  `value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '配置值',
  `type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'string' COMMENT '值类型',
  `description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配置说明',
  `is_public` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否公开',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `updated_by` int DEFAULT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_system_settings_key` (`key`),
  KEY `fk_system_settings_updated_by` (`updated_by`),
  CONSTRAINT `fk_system_settings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- ----------------------------
-- Table: template_mappings
-- ----------------------------
CREATE TABLE `template_mappings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL COMMENT '模板ID',
  `placeholder` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '占位符名称',
  `data_path` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '数据路径',
  `description` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '字段说明',
  `example_value` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '示例值',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template_placeholder` (`template_id`,`placeholder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模板占位符映射表';

-- ----------------------------
-- Table: template_versions
-- ----------------------------
CREATE TABLE `template_versions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL COMMENT '模板ID',
  `version_number` int NOT NULL COMMENT '版本号',
  `content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '历史版本的HTML内容',
  `change_note` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '变更说明',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_template_version` (`template_id`,`version_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模板版本历史表';

-- ----------------------------
-- Table: user_permissions
-- ----------------------------
CREATE TABLE `user_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL COMMENT '用户ID',
  `permission` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '权限标识',
  `granted_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '授权时间',
  `granted_by` int DEFAULT NULL COMMENT '授权人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_permission` (`user_id`,`permission`),
  KEY `idx_user_permissions_permission` (`permission`),
  KEY `fk_user_permissions_granted_by` (`granted_by`),
  CONSTRAINT `fk_user_permissions_granted_by` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_permissions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户权限表';

-- ----------------------------
-- Table: user_reminder_settings
-- ----------------------------
CREATE TABLE `user_reminder_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL COMMENT '用户ID',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用提醒',
  `quiet_time_start` time DEFAULT NULL COMMENT '勿扰开始时间',
  `quiet_time_end` time DEFAULT NULL COMMENT '勿扰结束时间',
  `enable_system_notification` tinyint(1) DEFAULT '1' COMMENT '启用系统通知',
  `enable_email_notification` tinyint(1) DEFAULT '1' COMMENT '启用邮件通知',
  `enable_sms_notification` tinyint(1) DEFAULT '0' COMMENT '启用短信通知',
  `enable_wechat_notification` tinyint(1) DEFAULT '0' COMMENT '启用微信通知',
  `reminder_type_settings` text COMMENT '提醒类型设置',
  `email` varchar(255) DEFAULT NULL COMMENT '邮箱地址',
  `phone` varchar(20) DEFAULT NULL COMMENT '手机号',
  `wechat_openid` varchar(100) DEFAULT NULL COMMENT '微信OpenID',
  `company_id` int DEFAULT NULL COMMENT '公司ID',
  `created_at` timestamp(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user` (`user_id`),
  KEY `idx_company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户提醒配置表';

-- ----------------------------
-- Table: user_roles
-- ----------------------------
CREATE TABLE `user_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `role_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_role` (`user_id`,`role_id`),
  KEY `idx_user_roles_user_id` (`user_id`),
  KEY `idx_user_roles_role_id` (`role_id`),
  CONSTRAINT `fk_user_roles_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- ----------------------------
-- Table: user_sessions
-- ----------------------------
CREATE TABLE `user_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL COMMENT '用户ID',
  `token_jti` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'JWT Token ID',
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '登录IP',
  `user_agent` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户代理',
  `device_info` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备信息',
  `expires_at` datetime(3) NOT NULL COMMENT 'Token过期时间',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `last_activity_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '最后活动时间',
  `revoked_at` datetime(3) DEFAULT NULL COMMENT '撤销时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_sessions_token_jti` (`token_jti`),
  KEY `idx_sessions_user_id` (`user_id`),
  KEY `idx_sessions_expires_at` (`expires_at`),
  KEY `idx_sessions_revoked_at` (`revoked_at`),
  CONSTRAINT `fk_user_sessions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户会话表';

-- ----------------------------
-- Table: users
-- ----------------------------
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名（登录用）',
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '邮箱',
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'bcrypt密码哈希',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '真实姓名',
  `role` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user' COMMENT '角色：admin, manager, user',
  `department` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '部门',
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系电话',
  `avatar_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '头像URL',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '账号是否激活',
  `is_locked` tinyint(1) NOT NULL DEFAULT '0' COMMENT '账号是否锁定',
  `failed_login_attempts` int NOT NULL DEFAULT '0' COMMENT '登录失败次数',
  `last_login_at` datetime(3) DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '最后登录IP',
  `password_changed_at` datetime(3) DEFAULT NULL COMMENT '密码最后修改时间',
  `company_id` int DEFAULT NULL COMMENT '所属公司ID',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `updated_by` int DEFAULT NULL COMMENT '更新人ID',
  `employee_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '员工工号',
  `position` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '职位',
  `hire_date` date DEFAULT NULL COMMENT '入职日期',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_users_username` (`username`),
  UNIQUE KEY `uniq_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_is_active` (`is_active`),
  KEY `idx_users_company_id` (`company_id`),
  KEY `idx_users_created_at` (`created_at`),
  KEY `fk_users_created_by` (`created_by`),
  KEY `fk_users_updated_by` (`updated_by`),
  CONSTRAINT `fk_users_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_users_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 导出完成
-- 总表数: 78
-- 总触发器数: 0
-- ============================================
