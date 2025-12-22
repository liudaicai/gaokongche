-- =====================================================
-- 智能适配型配件管理系统 V3.0
-- 作者: AI 开发助手
-- 日期: 2025-12-09
-- 说明: 支持AI智能匹配、3D可视化、用户反馈的配件管理系统
-- =====================================================

START TRANSACTION;

-- =====================================================
-- 1. 配件主表 (增强版)
-- =====================================================
CREATE TABLE IF NOT EXISTS `accessories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `material_number` VARCHAR(100) NOT NULL COMMENT '物料编号',
  `name` VARCHAR(255) NOT NULL COMMENT '配件名称',
  
  -- 分类信息
  `category` VARCHAR(100) NOT NULL COMMENT '配件大类(液压件/电气件/机械件/易损件/滤芯类)',
  `sub_category` VARCHAR(100) NULL COMMENT '配件小类',
  `system_category` VARCHAR(100) NULL COMMENT '系统分类(液压系统/电气系统/传动系统/安全系统)',
  
  -- 规格信息
  `model_spec` VARCHAR(100) NULL COMMENT '型号规格',
  `dimensions` JSON NULL COMMENT '尺寸规格 {"length": 100, "width": 50, "height": 30, "unit": "mm"}',
  `weight` DECIMAL(10,3) NULL COMMENT '重量(kg)',
  `unit` VARCHAR(50) DEFAULT '个' COMMENT '单位',
  
  -- 品牌厂商
  `part_type` ENUM('original', 'oem', 'aftermarket', 'generic') DEFAULT 'generic' 
    COMMENT 'original=原厂件, oem=品牌副厂, aftermarket=售后市场, generic=通用件',
  `manufacturer` VARCHAR(255) NULL COMMENT '生产厂商',
  `brand` VARCHAR(100) NULL COMMENT '品牌',
  `origin_country` VARCHAR(100) NULL COMMENT '产地',
  `oem_number` VARCHAR(100) NULL COMMENT 'OEM编号',
  `standard_number` VARCHAR(100) NULL COMMENT '标准编号',
  
  -- 技术参数 (JSON格式存储复杂参数)
  `technical_specs` JSON NULL COMMENT '技术参数 {"pressure": "200bar", "temperature": "-20~80°C"}',
  `material_composition` JSON NULL COMMENT '材料成分',
  `performance_metrics` JSON NULL COMMENT '性能指标',
  
  -- 库存管理
  `total_quantity` INT NOT NULL DEFAULT 0 COMMENT '总库存',
  `reserved_quantity` INT NOT NULL DEFAULT 0 COMMENT '预留数量',
  `available_quantity` INT NOT NULL DEFAULT 0 COMMENT '可用数量',
  `min_stock` INT DEFAULT 10 COMMENT '最低库存',
  `max_stock` INT DEFAULT 1000 COMMENT '最高库存',
  `reorder_point` INT DEFAULT 20 COMMENT '建议补货点',
  `reorder_quantity` INT DEFAULT 50 COMMENT '建议补货量',
  
  -- 价格成本
  `cost_price` DECIMAL(10,2) DEFAULT 0.00 COMMENT '成本价',
  `selling_price` DECIMAL(10,2) DEFAULT 0.00 COMMENT '销售价',
  `total_value` DECIMAL(12,2) DEFAULT 0.00 COMMENT '库存总价值',
  
  -- 质保信息
  `warranty_months` INT DEFAULT 12 COMMENT '质保期(月)',
  `shelf_life_months` INT NULL COMMENT '保质期(月)',
  `expected_lifespan_hours` INT NULL COMMENT '预期使用寿命(小时)',
  
  -- 供应商信息
  `primary_supplier_id` INT NULL COMMENT '主供应商ID',
  `primary_supplier_name` VARCHAR(255) NULL COMMENT '主供应商名称',
  `supplier_contact` VARCHAR(255) NULL COMMENT '供应商联系方式',
  `supplier_lead_time` INT DEFAULT 7 COMMENT '供货周期(天)',
  
  -- 仓储信息
  `warehouse_name` VARCHAR(255) NULL COMMENT '仓库名称',
  `area` VARCHAR(100) NULL COMMENT '区域',
  `shelf_location` VARCHAR(100) NULL COMMENT '货架位置',
  
  -- 多媒体信息
  `images` JSON NULL COMMENT '图片URL数组',
  `3d_model_url` VARCHAR(500) NULL COMMENT '3D模型地址',
  `installation_videos` JSON NULL COMMENT '安装视频链接数组',
  `documents` JSON NULL COMMENT '技术文档数组',
  
  -- 智能推荐数据 (基于历史数据计算)
  `compatibility_score` DECIMAL(3,2) DEFAULT 0.00 COMMENT '综合适配评分(0-5)',
  `popularity_score` INT DEFAULT 0 COMMENT '使用热度(访问和使用次数)',
  `reliability_score` DECIMAL(3,2) DEFAULT 0.00 COMMENT '可靠性评分(基于故障率)',
  `ai_recommend_weight` DECIMAL(5,2) DEFAULT 1.00 COMMENT 'AI推荐权重',
  
  -- 使用统计
  `total_usage_count` INT DEFAULT 0 COMMENT '累计使用次数',
  `last_used_date` DATE NULL COMMENT '最后使用日期',
  `failure_count` INT DEFAULT 0 COMMENT '故障次数',
  `failure_rate` DECIMAL(5,2) DEFAULT 0.00 COMMENT '故障率(%)',
  
  -- 状态与标签
  `status` ENUM('active', 'discontinued', 'obsolete', 'out_of_stock') DEFAULT 'active',
  `tags` JSON NULL COMMENT '标签数组',
  `notes` TEXT NULL COMMENT '备注',
  
  -- 系统字段
  `company_id` INT NULL COMMENT '所属公司ID',
  `created_by` INT NULL,
  `updated_by` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deleted_at` DATETIME(3) NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_material_number` (`material_number`, `company_id`),
  KEY `idx_category` (`category`, `sub_category`),
  KEY `idx_system_category` (`system_category`),
  KEY `idx_brand_type` (`brand`, `part_type`),
  KEY `idx_manufacturer` (`manufacturer`),
  KEY `idx_smart_scores` (`compatibility_score`, `popularity_score`, `reliability_score`),
  KEY `idx_status` (`status`),
  KEY `idx_company` (`company_id`),
  KEY `idx_available_qty` (`available_quantity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='智能配件主表';

-- =====================================================
-- 2. 设备-配件适配知识库
-- =====================================================
CREATE TABLE IF NOT EXISTS `equipment_accessory_knowledge` (
  `id` INT NOT NULL AUTO_INCREMENT,
  
  -- 设备信息
  `equipment_brand` VARCHAR(100) NOT NULL COMMENT '设备品牌',
  `equipment_type` VARCHAR(100) NOT NULL COMMENT '设备类型',
  `equipment_model` VARCHAR(100) NOT NULL COMMENT '设备型号',
  `equipment_height` INT NULL COMMENT '设备工作高度(米)',
  `equipment_category` VARCHAR(100) NULL COMMENT '设备类别',
  
  -- 配件信息
  `accessory_id` INT NOT NULL COMMENT '配件ID',
  `part_position` VARCHAR(255) NOT NULL COMMENT '安装位置',
  `part_function` VARCHAR(255) NOT NULL COMMENT '配件功能',
  
  -- 适配等级
  `compatibility_level` ENUM('perfect', 'excellent', 'good', 'fair', 'poor') DEFAULT 'good'
    COMMENT 'perfect=完美匹配, excellent=优秀, good=良好, fair=一般, poor=差',
  `compatibility_score` DECIMAL(3,2) DEFAULT 0.80 COMMENT '适配评分(0-5)',
  `is_original_recommended` TINYINT(1) DEFAULT 0 COMMENT '是否原厂推荐',
  
  -- 安装信息
  `installation_difficulty` ENUM('easy', 'medium', 'hard', 'expert') DEFAULT 'medium',
  `installation_time_minutes` INT NULL COMMENT '预计安装时间(分钟)',
  `special_tools_required` JSON NULL COMMENT '所需特殊工具数组',
  `installation_notes` TEXT NULL COMMENT '安装注意事项',
  
  -- 更换周期
  `replacement_interval` INT NULL COMMENT '更换周期数值',
  `replacement_interval_unit` ENUM('hours', 'days', 'months', 'km') DEFAULT 'hours',
  
  -- 使用统计
  `usage_count` INT DEFAULT 0 COMMENT '实际使用次数',
  `success_rate` DECIMAL(5,2) DEFAULT 0.00 COMMENT '安装成功率(%)',
  `avg_lifespan_hours` INT NULL COMMENT '平均使用寿命(小时)',
  
  -- 用户反馈
  `user_rating` DECIMAL(3,2) DEFAULT 0.00 COMMENT '用户评分(0-5)',
  `feedback_count` INT DEFAULT 0 COMMENT '反馈数量',
  `positive_feedback_count` INT DEFAULT 0 COMMENT '正面反馈数',
  `negative_feedback_count` INT DEFAULT 0 COMMENT '负面反馈数',
  `common_issues` JSON NULL COMMENT '常见问题汇总',
  
  -- AI学习数据
  `confidence_score` DECIMAL(3,2) DEFAULT 0.50 COMMENT 'AI置信度(0-1)',
  `data_source` VARCHAR(50) DEFAULT 'manual' COMMENT '数据来源(manual/ai_learned/manufacturer)',
  `last_verified_date` DATE NULL COMMENT '最后验证日期',
  
  -- 系统字段
  `company_id` INT NULL,
  `created_by` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_active` TINYINT(1) DEFAULT 1,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_equipment_accessory` (`equipment_brand`, `equipment_type`, `equipment_model`, `accessory_id`, `company_id`),
  KEY `idx_equipment` (`equipment_brand`, `equipment_type`, `equipment_model`),
  KEY `idx_accessory` (`accessory_id`),
  KEY `idx_compatibility` (`compatibility_score`, `compatibility_level`),
  KEY `idx_usage` (`usage_count`, `success_rate`),
  KEY `idx_rating` (`user_rating`),
  CONSTRAINT `fk_knowledge_accessory` FOREIGN KEY (`accessory_id`) REFERENCES `accessories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备-配件适配知识库';

-- =====================================================
-- 3. 智能推荐日志
-- =====================================================
CREATE TABLE IF NOT EXISTS `ai_recommendation_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `session_id` VARCHAR(100) NOT NULL COMMENT '推荐会话ID',
  
  -- 输入条件
  `equipment_brand` VARCHAR(100) NOT NULL COMMENT '设备品牌',
  `equipment_type` VARCHAR(100) NOT NULL COMMENT '设备类型',
  `equipment_model` VARCHAR(100) NOT NULL COMMENT '设备型号',
  `equipment_id` INT NULL COMMENT '具体设备ID',
  `search_criteria` JSON NOT NULL COMMENT '搜索条件',
  
  -- 推荐算法
  `recommendation_algorithm` VARCHAR(50) NOT NULL COMMENT '使用算法(collaborative/content_based/hybrid)',
  `algorithm_version` VARCHAR(20) DEFAULT 'v1.0' COMMENT '算法版本',
  
  -- 推荐结果
  `recommended_accessories` JSON NOT NULL COMMENT '推荐结果数组',
  `top_recommendation_id` INT NULL COMMENT '首选推荐配件ID',
  `alternatives_count` INT DEFAULT 0 COMMENT '备选方案数量',
  
  -- 用户交互
  `user_id` INT NULL COMMENT '用户ID',
  `user_feedback` JSON NULL COMMENT '用户反馈',
  `final_selection` JSON NULL COMMENT '最终选择',
  `is_accepted` TINYINT(1) NULL COMMENT '是否采纳推荐',
  
  -- 性能指标
  `response_time_ms` INT NOT NULL COMMENT '响应时间(毫秒)',
  `confidence_score` DECIMAL(3,2) NOT NULL COMMENT '置信度(0-1)',
  `accuracy_score` DECIMAL(3,2) NULL COMMENT '准确率(事后统计)',
  
  -- 系统字段
  `company_id` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  KEY `idx_session` (`session_id`),
  KEY `idx_equipment` (`equipment_brand`, `equipment_type`, `equipment_model`),
  KEY `idx_algorithm` (`recommendation_algorithm`),
  KEY `idx_created` (`created_at`),
  KEY `idx_user_feedback` (`is_accepted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI推荐日志';

-- =====================================================
-- 4. 配件3D位置标注
-- =====================================================
CREATE TABLE IF NOT EXISTS `accessory_3d_positions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `accessory_id` INT NOT NULL COMMENT '配件ID',
  `equipment_model` VARCHAR(100) NOT NULL COMMENT '设备型号',
  
  -- 3D位置数据
  `position_data` JSON NOT NULL COMMENT '3D坐标信息 {"x": 0, "y": 0, "z": 0}',
  `rotation_data` JSON NULL COMMENT '旋转角度 {"rx": 0, "ry": 0, "rz": 0}',
  `scale_data` JSON NULL COMMENT '缩放比例 {"sx": 1, "sy": 1, "sz": 1}',
  
  -- 视图设置
  `view_angles` JSON NULL COMMENT '最佳观察角度数组',
  `camera_positions` JSON NULL COMMENT '相机位置数组',
  `annotation_points` JSON NULL COMMENT '标注点数组',
  `highlight_color` VARCHAR(20) DEFAULT '#FF0000' COMMENT '高亮颜色',
  
  -- 说明信息
  `description` TEXT NULL COMMENT '位置描述',
  `installation_guide` TEXT NULL COMMENT '安装指引',
  
  -- 系统字段
  `created_by` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `is_active` TINYINT(1) DEFAULT 1,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_accessory_model` (`accessory_id`, `equipment_model`),
  KEY `idx_equipment` (`equipment_model`),
  CONSTRAINT `fk_3d_accessory` FOREIGN KEY (`accessory_id`) REFERENCES `accessories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='配件3D位置标注';

-- =====================================================
-- 5. 配件出入库记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS `accessory_transactions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `accessory_id` INT NOT NULL COMMENT '配件ID',
  
  -- 交易类型
  `transaction_type` ENUM('purchase', 'issue', 'return', 'adjust', 'scrap', 'transfer') NOT NULL
    COMMENT 'purchase=采购入库, issue=领用出库, return=退库, adjust=盘点调整, scrap=报废, transfer=调拨',
  `transaction_number` VARCHAR(100) NULL COMMENT '单据编号',
  `quantity` INT NOT NULL COMMENT '数量',
  
  -- 操作人信息
  `operator_id` INT NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(255) NULL COMMENT '操作人姓名',
  
  -- 关联业务信息
  `related_order_id` INT NULL COMMENT '关联订单ID',
  `related_equipment_id` INT NULL COMMENT '关联设备ID',
  `related_order_number` VARCHAR(100) NULL COMMENT '关联订单号',
  `related_equipment_code` VARCHAR(100) NULL COMMENT '关联设备编码',
  
  -- 业务说明
  `purpose` VARCHAR(500) NULL COMMENT '用途说明',
  `reason` VARCHAR(500) NULL COMMENT '原因说明',
  `notes` TEXT NULL COMMENT '备注',
  
  -- 价格成本
  `unit_price` DECIMAL(10,2) DEFAULT 0.00 COMMENT '单价',
  `total_amount` DECIMAL(12,2) DEFAULT 0.00 COMMENT '总金额',
  
  -- 库存快照
  `before_quantity` INT NULL COMMENT '交易前库存',
  `after_quantity` INT NULL COMMENT '交易后库存',
  
  -- 系统字段
  `company_id` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  KEY `idx_accessory` (`accessory_id`),
  KEY `idx_type` (`transaction_type`),
  KEY `idx_order` (`related_order_id`),
  KEY `idx_equipment` (`related_equipment_id`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `fk_trans_accessory` FOREIGN KEY (`accessory_id`) REFERENCES `accessories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='配件出入库记录表';

-- =====================================================
-- 6. 插入示例数据
-- =====================================================

-- 插入配件示例数据
INSERT INTO `accessories` (
  `material_number`, `name`, `category`, `sub_category`, `system_category`,
  `model_spec`, `unit`, `part_type`, `manufacturer`, `brand`,
  `total_quantity`, `available_quantity`, `min_stock`, `max_stock`,
  `cost_price`, `selling_price`, `warranty_months`,
  `compatibility_score`, `popularity_score`, `reliability_score`,
  `status`
) VALUES 
  -- 液压系统配件
  ('ACC-HYD-001', '液压油滤芯(原厂)', '滤芯类', '液压滤芯', '液压系统', 'H12-456', '个', 'original', '派克汉尼汾', 'Parker', 100, 100, 20, 200, 85.00, 120.00, 12, 4.8, 150, 4.6, 'active'),
  ('ACC-HYD-002', '液压油滤芯(副厂)', '滤芯类', '液压滤芯', '液压系统', 'H12-456-OEM', '个', 'oem', '液压配件厂', '通用', 80, 80, 15, 150, 65.00, 90.00, 6, 4.2, 200, 4.1, 'active'),
  ('ACC-HYD-003', '液压泵密封圈', '液压件', '密封件', '液压系统', 'SP-789', '套', 'original', '博世力士乐', 'Bosch', 50, 50, 10, 100, 45.00, 65.00, 12, 4.7, 120, 4.5, 'active'),
  
  -- 电气系统配件
  ('ACC-ELE-001', '24V继电器', '电气件', '控制元件', '电气系统', 'REL-24V-30A', '个', 'generic', '欧姆龙', 'Omron', 60, 60, 15, 120, 35.00, 50.00, 24, 4.5, 180, 4.6, 'active'),
  ('ACC-ELE-002', '蓄电池12V100AH', '电气件', '电池', '电气系统', 'BAT-12V-100AH', '个', 'oem', '骆驼电池', 'Camel', 30, 30, 5, 50, 680.00, 850.00, 18, 4.4, 90, 4.3, 'active'),
  
  -- 易损件
  ('ACC-WEAR-001', '14寸轮胎', '易损件', '轮胎', '行走系统', 'TY-14-001', '条', 'aftermarket', '朝阳轮胎', 'Chaoyang', 80, 80, 20, 150, 450.00, 580.00, 12, 4.3, 250, 4.0, 'active'),
  ('ACC-WEAR-002', '液压软管1米', '易损件', '软管', '液压系统', 'HSE-25-1M', '米', 'oem', '康迪泰克', 'ContiTech', 200, 200, 50, 500, 28.00, 42.00, 6, 4.1, 300, 3.9, 'active'),
  
  -- 滤芯类
  ('ACC-FILT-001', '空气滤芯', '滤芯类', '空气滤芯', '发动机系统', 'AF-2588', '个', 'original', '曼胡默尔', 'Mann', 150, 150, 30, 300, 55.00, 78.00, 12, 4.6, 220, 4.5, 'active'),
  ('ACC-FILT-002', '机油滤芯', '滤芯类', '机油滤芯', '发动机系统', 'OF-1012', '个', 'original', '马勒', 'Mahle', 120, 120, 25, 250, 38.00, 55.00, 12, 4.7, 240, 4.6, 'active'),
  ('ACC-FILT-003', '燃油滤芯', '滤芯类', '燃油滤芯', '发动机系统', 'FF-5632', '个', 'oem', '弗列加', 'Fleetguard', 100, 100, 20, 200, 42.00, 60.00, 12, 4.5, 180, 4.4, 'active');

-- 插入适配知识库数据
INSERT INTO `equipment_accessory_knowledge` (
  `equipment_brand`, `equipment_type`, `equipment_model`, `equipment_height`,
  `accessory_id`, `part_position`, `part_function`,
  `compatibility_level`, `compatibility_score`, `is_original_recommended`,
  `installation_difficulty`, `installation_time_minutes`,
  `usage_count`, `success_rate`, `user_rating`
) VALUES 
  -- 液压滤芯适配三一设备
  ('三一', '剪叉车', 'GTBZ12', 12, 1, '液压泵滤清器', '液压油过滤', 'perfect', 5.0, 1, 'easy', 15, 45, 98.5, 4.8),
  ('三一', '剪叉车', 'GTBZ14', 14, 1, '液压泵滤清器', '液压油过滤', 'perfect', 5.0, 1, 'easy', 15, 38, 97.8, 4.7),
  ('三一', '直臂车', 'GTBZ16', 16, 1, '液压泵滤清器', '液压油过滤', 'excellent', 4.5, 0, 'easy', 15, 25, 96.0, 4.5),
  
  -- 副厂液压滤芯适配
  ('三一', '剪叉车', 'GTBZ12', 12, 2, '液压泵滤清器', '液压油过滤', 'good', 4.0, 0, 'easy', 15, 32, 95.0, 4.2),
  ('三一', '剪叉车', 'GTBZ14', 14, 2, '液压泵滤清器', '液压油过滤', 'good', 4.0, 0, 'easy', 15, 28, 94.5, 4.1),
  
  -- 轮胎适配
  ('三一', '剪叉车', 'GTBZ12', 12, 6, '前轮', '行走支撑', 'perfect', 5.0, 0, 'medium', 30, 50, 99.0, 4.3),
  ('徐工', '剪叉车', 'XS12', 12, 6, '前轮', '行走支撑', 'excellent', 4.5, 0, 'medium', 30, 40, 98.0, 4.2),
  ('JLG', '剪叉车', '1932E2', 12, 6, '前轮', '行走支撑', 'good', 3.8, 0, 'hard', 45, 15, 92.0, 3.9),
  
  -- 蓄电池适配
  ('三一', '剪叉车', 'GTBZ12E', 12, 5, '蓄电池舱', '电力供应', 'perfect', 5.0, 0, 'easy', 20, 28, 100.0, 4.4),
  ('徐工', '剪叉车', 'XS12E', 12, 5, '蓄电池舱', '电力供应', 'excellent', 4.5, 0, 'easy', 20, 22, 98.5, 4.3);

COMMIT;

-- =====================================================
-- 7. 创建视图和存储过程
-- =====================================================

-- 配件库存预警视图
CREATE OR REPLACE VIEW v_accessories_low_stock AS
SELECT 
  a.id,
  a.material_number,
  a.name,
  a.category,
  a.available_quantity,
  a.min_stock,
  a.reorder_point,
  a.reorder_quantity,
  a.primary_supplier_name,
  a.supplier_lead_time,
  CASE 
    WHEN a.available_quantity = 0 THEN '紧急缺货'
    WHEN a.available_quantity <= a.min_stock THEN '低库存预警'
    WHEN a.available_quantity <= a.reorder_point THEN '建议补货'
    ELSE '库存正常'
  END as stock_status,
  CASE
    WHEN a.available_quantity = 0 THEN 1
    WHEN a.available_quantity <= a.min_stock THEN 2
    WHEN a.available_quantity <= a.reorder_point THEN 3
    ELSE 4
  END as priority_level
FROM accessories a
WHERE a.is_deleted = 0 
  AND a.status = 'active'
  AND a.available_quantity <= a.reorder_point
ORDER BY priority_level ASC, a.available_quantity ASC;

-- 热门配件统计视图
CREATE OR REPLACE VIEW v_popular_accessories AS
SELECT 
  a.id,
  a.material_number,
  a.name,
  a.category,
  a.brand,
  a.popularity_score,
  a.compatibility_score,
  a.reliability_score,
  a.total_usage_count,
  a.failure_rate,
  COUNT(DISTINCT k.equipment_model) as compatible_models_count,
  AVG(k.user_rating) as avg_user_rating
FROM accessories a
LEFT JOIN equipment_accessory_knowledge k ON a.id = k.accessory_id AND k.is_active = 1
WHERE a.is_deleted = 0 AND a.status = 'active'
GROUP BY a.id
ORDER BY a.popularity_score DESC, a.compatibility_score DESC
LIMIT 100;

-- =====================================================
-- 8. 完成提示
-- =====================================================
SELECT '✅ 智能配件管理系统数据库创建成功！' as message;
SELECT '📊 已创建 5 张核心表：accessories, equipment_accessory_knowledge, ai_recommendation_logs, accessory_3d_positions, accessory_transactions' as info;
SELECT '📝 已插入 10 条配件示例数据和 10 条适配知识' as data_info;
SELECT '📈 已创建 2 个统计视图' as view_info;
SELECT '🎉 系统就绪，可以开始实现前后端功能！' as status;

