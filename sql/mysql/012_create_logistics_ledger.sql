-- 创建物流台账表
-- 用于记录所有物流相关的费用和活动

CREATE TABLE IF NOT EXISTS `logistics_ledger` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `ledger_number` VARCHAR(50) NOT NULL COMMENT '台账编号',
  `order_id` INT NOT NULL COMMENT '订单ID',
  `order_number` VARCHAR(50) NOT NULL COMMENT '订单编号',
  `entry_id` INT NULL COMMENT '进场记录ID',
  `exit_id` INT NULL COMMENT '退场记录ID',
  `logistics_type` VARCHAR(20) NOT NULL COMMENT '物流类型：own自有物流, third三方物流',
  `record_type` VARCHAR(20) NOT NULL COMMENT '记录类型：entry进场, exit退场',
  `store_id` INT NOT NULL COMMENT '门店ID',
  `store_name` VARCHAR(255) NOT NULL COMMENT '门店名称',
  `logistics_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '物流费用',
  `record_date` DATE NOT NULL COMMENT '记录日期',
  
  -- 自有物流信息
  `vehicle_id` INT NULL COMMENT '车辆ID',
  `vehicle_plate` VARCHAR(50) NULL COMMENT '车牌号',
  `driver_id` INT NULL COMMENT '司机ID',
  `driver_name` VARCHAR(100) NULL COMMENT '司机姓名',
  `driver_phone` VARCHAR(50) NULL COMMENT '司机电话',
  
  -- 三方物流信息
  `company_id` INT NULL COMMENT '物流公司ID',
  `company_name` VARCHAR(255) NULL COMMENT '物流公司名称',
  `company_contact_name` VARCHAR(100) NULL COMMENT '物流公司联系人',
  `company_contact_phone` VARCHAR(50) NULL COMMENT '物流公司联系电话',
  
  `remark` TEXT NULL COMMENT '备注',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_logistics_ledger_number` (`ledger_number`),
  KEY `idx_logistics_ledger_order_id` (`order_id`),
  KEY `idx_logistics_ledger_store_id` (`store_id`),
  KEY `idx_logistics_ledger_record_date` (`record_date`),
  KEY `idx_logistics_ledger_logistics_type` (`logistics_type`),
  KEY `idx_logistics_ledger_record_type` (`record_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物流台账表';

-- 添加外键约束
ALTER TABLE `logistics_ledger` 
  ADD CONSTRAINT `fk_logistics_ledger_order_id` 
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

