-- ============================================
-- 数据库表结构优化方案（方案一）
-- 作者: AI 开发助手
-- 日期: 2026-01-02
-- 说明: 保留独立表，选择性合并优化
-- ============================================

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    优化方案总览
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

一、【财务记录合并】
   目标: order_receipts + order_refunds → finance_records
   影响表数: 3 → 1
   预计减少: 2 张表
   
二、【提醒系统优化】
   目标: 统一提醒表结构，删除重复定义
   当前问题: 
     - reminders (030版本)
     - reminder_records (057版本)
   两套系统功能重复，需要统一
   
三、【审批系统简化】
   目标: 删除冗余统计表，使用动态查询
   可删除: approval_statistics, approval_notifications
   
四、【保持独立的核心表】
   以下表保持不变:
   ✓ orders (订单主表)
   ✓ order_equipment_demands (订单设备需求)
   ✓ order_entries (进场记录)
   ✓ order_exits (退场记录)
   ✓ order_suspensions (报停记录)
   ✓ order_claims (索赔记录)
   ✓ order_settlements (结算记录)
   ✓ order_clearances (结清记录)
   ✓ equipments (设备表)
   ✓ customers (客户表)
   ✓ users (用户表)
   ✓ companies (公司表)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    实施步骤
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

步骤 1: 备份数据库
  mysqldump -u root -p gaokongche > backup_20260102.sql

步骤 2: 执行财务记录合并 (217_merge_finance_records.sql)
  - 迁移 order_receipts 数据
  - 迁移 order_refunds 数据
  - 验证数据完整性
  - 保留旧表 30 天

步骤 3: 执行提醒系统优化 (218_optimize_reminder_system.sql)
  - 统一使用 reminder_records 表
  - 合并 reminders 表数据
  - 删除重复表

步骤 4: 简化审批系统 (219_simplify_approval_system.sql)
  - 删除 approval_statistics (使用动态统计)
  - 删除 approval_notifications (使用 notification_logs)

步骤 5: 更新应用代码
  - 后端: server/routes/*.mysql.js
  - 前端: src/features/*

步骤 6: 验证和清理
  - 运行数据验证脚本
  - 确认功能正常
  - 30天后删除旧表

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    预期效果
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

优化前: 80+ 张表
优化后: 60-65 张表
减少:   ~20% 表数量

优点:
✓ 保持业务边界清晰
✓ 查询性能优化
✓ 维护成本降低
✓ 数据一致性增强

注意事项:
⚠ 必须先备份数据库
⚠ 逐步执行，不要一次性全部改动
⚠ 保留旧表 30 天作为回退方案
⚠ 更新所有相关代码

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/

-- 本文件仅为规划文档，不执行任何SQL操作
SELECT '📋 数据库优化方案已制定，请按步骤执行后续迁移脚本' AS message;

