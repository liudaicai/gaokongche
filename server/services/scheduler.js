import cron from 'node-cron';
import { logger } from '../utils/logger.js';

class Scheduler {
  constructor(pool) {
    this.pool = pool;
    this.jobs = new Map();
  }

  // 初始化所有定时任务
  initialize() {
    this.scheduleDailyTasks();
    this.scheduleHourlyTasks();
    this.scheduleMinuteTasks();
  }

  // 每天凌晨2点执行
  scheduleDailyTasks() {
    this.addJob('daily-tasks', '0 2 * * *', async () => {
      await this.checkExpiringEquipment();
      await this.checkOverduePayments();
      await this.checkExpiringContracts();
      await this.checkEquipmentOverdue();
      await this.generateMonthlyBillings();
      await this.cleanOldLogs();
    });
  }

  // 每小时执行
  scheduleHourlyTasks() {
    this.addJob('hourly-tasks', '0 * * * *', async () => {
      await this.updateBillingStatus();
    });
  }

  // 每10分钟执行
  scheduleMinuteTasks() {
    this.addJob('minute-tasks', '*/10 * * * *', async () => {
      await this.processPendingNotifications();
    });
  }

  addJob(name, schedule, task) {
    const job = cron.schedule(schedule, async () => {
      const startTime = new Date();
      logger.info(`[Scheduler] Starting job: ${name}`);
      
      try {
        const result = await task();
        await this.logTaskExecution(name, 'success', startTime, result);
        logger.info(`[Scheduler] Job completed: ${name}`);
      } catch (error) {
        await this.logTaskExecution(name, 'failed', startTime, null, error);
        logger.error(`[Scheduler] Job failed: ${name}`, error);
      }
    }, {
      scheduled: false,
      timezone: process.env.CRON_TIMEZONE || 'Asia/Shanghai'
    });

    this.jobs.set(name, job);
    return job;
  }

  start() {
    this.jobs.forEach((job, name) => {
      job.start();
      logger.info(`[Scheduler] Started job: ${name}`);
    });
  }

  stop() {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`[Scheduler] Stopped job: ${name}`);
    });
  }

  async logTaskExecution(taskName, status, startTime, result = null, error = null) {
    const endTime = new Date();
    const duration = endTime - startTime;
    
    try {
      await this.pool.query(
        `INSERT INTO task_logs (
          task_name, task_type, status, start_time, end_time, duration_ms,
          processed_count, success_count, failed_count, error_message, details
        ) VALUES (?, 'scheduled', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskName, status, startTime, endTime, duration,
          result?.processed || 0,
          result?.success || 0,
          result?.failed || 0,
          error?.message || null,
          result ? JSON.stringify(result) : null
        ]
      );
    } catch (e) {
      logger.error('[Scheduler] Failed to log task execution:', e);
    }
  }

  // 获取提醒设置
  async getReminderSetting(key) {
    const [rows] = await this.pool.query(
      'SELECT setting_value FROM reminder_settings WHERE setting_key = ?',
      [key]
    );
    
    if (rows.length === 0) return null;
    
    const value = rows[0].setting_value;
    return typeof value === 'string' ? JSON.parse(value) : value;
  }

  // 检查设备到期
  async checkExpiringEquipment() {
    const reminderDays = await this.getReminderSetting('equipment_expiry_days') || [7, 3, 1];
    let totalProcessed = 0;
    let totalCreated = 0;
    
    for (const days of reminderDays) {
      const [orders] = await this.pool.query(`
        SELECT o.id, o.contract_number, o.project_name, o.customer_id,
               o.business_manager_id,
               c.name AS customer_name, c.phone AS customer_phone,
               e.name AS business_manager_name, e.email AS business_manager_email,
               oi.estimated_exit_date, oi.equipment_type, oi.height, oi.quantity
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN users e ON o.business_manager_id = e.id
        WHERE oi.estimated_exit_date = DATE_ADD(CURDATE(), INTERVAL ? DAY)
      `, [days]);

      totalProcessed += orders.length;

      for (const order of orders) {
        try {
          // 创建设备到期提醒
          const title = `设备即将到期提醒（${days}天后）`;
          const content = `订单 ${order.contract_number} 的设备将在 ${days} 天后到期。\n` +
                        `项目名称：${order.project_name}\n` +
                        `客户：${order.customer_name}\n` +
                        `设备类型：${order.equipment_type} ${order.height}\n` +
                        `数量：${order.quantity}\n` +
                        `预计退场日期：${order.estimated_exit_date}`;
          
          await this.createReminder({
            type: 'equipment_expiring',
            priority: days <= 1 ? 'urgent' : days <= 3 ? 'high' : 'normal',
            title,
            content,
            relatedType: 'order',
            relatedId: order.id,
            targetUserId: order.business_manager_id,
            metadata: {
              orderId: order.id,
              contractNumber: order.contract_number,
              daysUntilExpiry: days,
              equipmentType: order.equipment_type,
              height: order.height,
            }
          });
          
          logger.info(`[Scheduler] Created expiring equipment reminder for order ${order.contract_number}`);
          totalCreated++;
        } catch (e) {
          logger.error(`[Scheduler] Failed to process expiring equipment for order ${order.id}:`, e);
        }
      }
    }

    logger.info(`[Scheduler] Checked expiring equipment: ${totalProcessed} found, ${totalCreated} processed`);
    return { processed: totalProcessed, success: totalCreated, failed: totalProcessed - totalCreated };
  }

  // 检查设备超期未退
  async checkEquipmentOverdue() {
    const reminderDays = await this.getReminderSetting('equipment_overdue_days') || [1, 3, 7];
    let totalProcessed = 0;
    let totalCreated = 0;
    
    for (const days of reminderDays) {
      const [orders] = await this.pool.query(`
        SELECT o.id, o.contract_number, o.project_name, o.customer_id,
               o.business_manager_id,
               c.name AS customer_name,
               e.name AS business_manager_name,
               oi.estimated_exit_date, oi.equipment_type, oi.height, oi.quantity
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN users e ON o.business_manager_id = e.id
        WHERE oi.estimated_exit_date = DATE_SUB(CURDATE(), INTERVAL ? DAY)
          AND NOT EXISTS (
            SELECT 1 FROM order_exits oex 
            WHERE oex.order_id = o.id 
              AND oex.exit_date >= oi.estimated_exit_date
          )
      `, [days]);

      totalProcessed += orders.length;

      for (const order of orders) {
        try {
          // 创建设备超期未退提醒
          const title = `⚠️ 设备超期未退（已超期${days}天）`;
          const content = `订单 ${order.contract_number} 的设备已超期 ${days} 天未退场！\n` +
                        `项目名称：${order.project_name}\n` +
                        `客户：${order.customer_name}\n` +
                        `设备类型：${order.equipment_type} ${order.height}\n` +
                        `数量：${order.quantity}\n` +
                        `预计退场日期：${order.estimated_exit_date}\n` +
                        `请尽快联系客户安排退场。`;
          
          await this.createReminder({
            type: 'equipment_overdue',
            priority: days >= 7 ? 'urgent' : 'high',
            title,
            content,
            relatedType: 'order',
            relatedId: order.id,
            targetUserId: order.business_manager_id,
            metadata: {
              orderId: order.id,
              contractNumber: order.contract_number,
              daysOverdue: days,
              equipmentType: order.equipment_type,
              height: order.height,
            }
          });
          
          logger.warn(`[Scheduler] Created overdue equipment reminder for order ${order.contract_number}`);
          totalCreated++;
        } catch (e) {
          logger.error(`[Scheduler] Failed to process overdue equipment for order ${order.id}:`, e);
        }
      }
    }

    logger.info(`[Scheduler] Checked overdue equipment: ${totalProcessed} found, ${totalCreated} processed`);
    return { processed: totalProcessed, success: totalCreated, failed: totalProcessed - totalCreated };
  }

  // 检查逾期付款
  async checkOverduePayments() {
    const reminderDays = await this.getReminderSetting('payment_overdue_days') || [1, 3, 7, 15];
    let totalProcessed = 0;
    let totalCreated = 0;

    for (const targetDays of reminderDays) {
      const [billings] = await this.pool.query(`
        SELECT b.*, o.contract_number, o.project_name, o.business_manager_id,
               c.name AS customer_name, c.phone AS customer_phone,
               e.name AS business_manager_name
        FROM billings b
        JOIN orders o ON b.order_id = o.id
        JOIN customers c ON b.customer_id = c.id
        LEFT JOIN users e ON o.business_manager_id = e.id
        WHERE b.status IN ('unpaid', 'partial')
          AND b.due_date = DATE_SUB(CURDATE(), INTERVAL ? DAY)
      `, [targetDays]);

      totalProcessed += billings.length;

      for (const billing of billings) {
        try {
          // 创建账单逾期提醒
          const title = `💰 账单逾期提醒（已逾期${targetDays}天）`;
          const unpaidAmount = Number(billing.total_amount) - Number(billing.paid_amount || 0);
          const content = `订单 ${billing.contract_number} 的账单已逾期 ${targetDays} 天！\n` +
                        `项目名称：${billing.project_name}\n` +
                        `客户：${billing.customer_name}\n` +
                        `账单金额：¥${Number(billing.total_amount).toFixed(2)}\n` +
                        `未付金额：¥${unpaidAmount.toFixed(2)}\n` +
                        `到期日期：${billing.due_date}\n` +
                        `联系电话：${billing.customer_phone}\n` +
                        `请尽快催收款项。`;
          
          await this.createReminder({
            type: 'payment_overdue',
            priority: targetDays >= 15 ? 'urgent' : targetDays >= 7 ? 'high' : 'normal',
            title,
            content,
            relatedType: 'billing',
            relatedId: billing.id,
            targetUserId: billing.business_manager_id,
            metadata: {
              billingId: billing.id,
              orderId: billing.order_id,
              contractNumber: billing.contract_number,
              daysOverdue: targetDays,
              unpaidAmount,
              customerPhone: billing.customer_phone,
            }
          });
          
          logger.warn(`[Scheduler] Created overdue payment reminder for billing ${billing.billing_number || billing.id}`);
          totalCreated++;
        } catch (e) {
          logger.error(`[Scheduler] Failed to process overdue payment for billing ${billing.id}:`, e);
        }
      }
    }

    logger.info(`[Scheduler] Checked overdue payments: ${totalProcessed} found`);
    return { processed: totalProcessed, success: totalCreated, failed: totalProcessed - totalCreated };
  }

  // 检查合同到期
  async checkExpiringContracts() {
    const reminderDays = await this.getReminderSetting('contract_expiry_days') || [30, 15, 7, 3];
    let totalProcessed = 0;
    let totalCreated = 0;
    
    for (const days of reminderDays) {
      // 这里假设合同到期日期等于最后一个设备项的预计退场日期
      const [orders] = await this.pool.query(`
        SELECT o.id, o.contract_number, o.project_name, o.customer_id,
               o.business_manager_id,
               c.name AS customer_name,
               e.name AS business_manager_name,
               MAX(oi.estimated_exit_date) AS contract_end_date
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN users e ON o.business_manager_id = e.id
        WHERE MAX(oi.estimated_exit_date) = DATE_ADD(CURDATE(), INTERVAL ? DAY)
        GROUP BY o.id
      `, [days]);

      totalProcessed += orders.length;

      for (const order of orders) {
        try {
          // 创建合同到期提醒
          const title = `📋 合同即将到期提醒（${days}天后）`;
          const content = `订单 ${order.contract_number} 的合同将在 ${days} 天后到期。\n` +
                        `项目名称：${order.project_name}\n` +
                        `客户：${order.customer_name}\n` +
                        `合同结束日期：${order.contract_end_date}\n` +
                        `请及时确认是否续约或安排退场。`;
          
          await this.createReminder({
            type: 'contract_expiring',
            priority: days <= 3 ? 'urgent' : days <= 7 ? 'high' : 'normal',
            title,
            content,
            relatedType: 'order',
            relatedId: order.id,
            targetUserId: order.business_manager_id,
            metadata: {
              orderId: order.id,
              contractNumber: order.contract_number,
              daysUntilExpiry: days,
              contractEndDate: order.contract_end_date,
            }
          });
          
          logger.info(`[Scheduler] Created contract expiring reminder for order ${order.contract_number}`);
          totalCreated++;
        } catch (e) {
          logger.error(`[Scheduler] Failed to process expiring contract for order ${order.id}:`, e);
        }
      }
    }

    logger.info(`[Scheduler] Checked expiring contracts: ${totalProcessed} found`);
    return { processed: totalProcessed, success: totalCreated, failed: totalProcessed - totalCreated };
  }

  // 生成月度账单
  async generateMonthlyBillings() {
    const autoGenerate = await this.getReminderSetting('auto_generate_billing');
    const generationDay = await this.getReminderSetting('billing_generation_day') || 1;
    const dueDays = await this.getReminderSetting('billing_due_days') || 15;

    if (!autoGenerate || new Date().getDate() !== Number(generationDay)) {
      return { processed: 0, success: 0, failed: 0 };
    }

    const [orders] = await this.pool.query(`
      SELECT DISTINCT o.id, o.contract_number, o.customer_id,
             oi.daily_rate, oi.monthly_rate, oi.quantity
      FROM orders o
      JOIN order_entries oe ON o.id = oe.order_id
      JOIN order_items oi ON o.id = oi.order_id
      WHERE NOT EXISTS (
        SELECT 1 FROM order_exits oex 
        WHERE oex.order_id = o.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM billings b
        WHERE b.order_id = o.id 
          AND b.period_start = DATE_FORMAT(CURDATE(), '%Y-%m-01')
      )
    `);

    let totalCreated = 0;
    let totalFailed = 0;

    for (const order of orders) {
      try {
        await this.createBilling(order, dueDays);
        totalCreated++;
      } catch (e) {
        logger.error(`[Scheduler] Failed to create billing for order ${order.id}:`, e);
        totalFailed++;
      }
    }

    logger.info(`[Scheduler] Generated monthly billings: ${totalCreated} created, ${totalFailed} failed`);
    return { processed: orders.length, success: totalCreated, failed: totalFailed };
  }

  // 更新账单状态
  async updateBillingStatus() {
    // 更新逾期账单状态
    await this.pool.query(`
      UPDATE billings 
      SET status = 'overdue', 
          overdue_days = DATEDIFF(CURDATE(), due_date)
      WHERE status IN ('unpaid', 'partial') 
        AND due_date < CURDATE()
    `);

    // 计算滞纳金
    const lateFeeRate = (await this.getReminderSetting('late_fee_rate') || 1) / 1000;
    
    await this.pool.query(`
      UPDATE billings 
      SET late_fee = (total_amount - paid_amount) * ? * overdue_days
      WHERE status = 'overdue' AND overdue_days > 0
    `, [lateFeeRate]);
  }


  // 处理待发送通知
  async processPendingNotifications() {
    const [notifications] = await this.pool.query(`
      SELECT * FROM notification_logs 
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 50
    `);

    let success = 0;
    let failed = 0;

    for (const notification of notifications) {
      try {
        // 这里调用通知服务发送通知
        // await notificationService.send(notification);
        
        await this.pool.query(
          'UPDATE notification_logs SET status = ?, sent_at = NOW() WHERE id = ?',
          ['sent', notification.id]
        );
        success++;
      } catch (e) {
        await this.pool.query(
          'UPDATE notification_logs SET status = ?, error_message = ? WHERE id = ?',
          ['failed', e.message, notification.id]
        );
        failed++;
        logger.error(`[Scheduler] Failed to send notification ${notification.id}:`, e);
      }
    }

    if (notifications.length > 0) {
      logger.info(`[Scheduler] Processed pending notifications: ${success} sent, ${failed} failed`);
    }

    return { processed: notifications.length, success, failed };
  }

  // 清理旧日志
  async cleanOldLogs() {
    const daysToKeep = 90;
    
    const [result1] = await this.pool.query(
      'DELETE FROM task_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [daysToKeep]
    );
    
    const [result2] = await this.pool.query(
      'DELETE FROM notification_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [daysToKeep]
    );

    logger.info(`[Scheduler] Cleaned old logs: ${result1.affectedRows} task logs, ${result2.affectedRows} notification logs`);
    return { taskLogs: result1.affectedRows, notificationLogs: result2.affectedRows };
  }


  // 创建提醒记录
  async createReminder(reminderData) {
    const {
      type,
      priority = 'normal',
      title,
      content,
      relatedType = null,
      relatedId = null,
      targetUserId = null,
      targetRole = null,
      metadata = {}
    } = reminderData;

    try {
      const [result] = await this.pool.query(
        `INSERT INTO reminders (
          type, priority, title, content, 
          related_type, related_id, 
          target_user_id, target_role,
          status, send_method, metadata,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'system', ?, NOW())`,
        [
          type, priority, title, content,
          relatedType, relatedId,
          targetUserId, targetRole,
          JSON.stringify(metadata)
        ]
      );

      const reminderId = result.insertId;
      logger.info(`[Scheduler] Created reminder ${reminderId}: ${title}`);

      // 创建通知日志
      await this.pool.query(
        `INSERT INTO notification_logs (
          reminder_id, type, channel, recipient, 
          subject, content, status, created_at
        ) VALUES (?, ?, 'system', ?, ?, ?, 'pending', NOW())`,
        [
          reminderId, type,
          targetUserId ? String(targetUserId) : 'all',
          title, content
        ]
      );

      return reminderId;
    } catch (error) {
      logger.error('[Scheduler] Failed to create reminder:', error);
      throw error;
    }
  }

  // 创建账单
  async createBilling(order, dueDays = 15) {
    const periodStart = new Date();
    periodStart.setDate(1);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(0);

    const billingNumber = `BILL-${Date.now()}-${order.id}`;
    const rentalFee = order.monthly_rate * (order.quantity || 1);
    
    const [result] = await this.pool.query(
      `INSERT INTO billings (
        billing_number, order_id, customer_id, billing_type,
        period_start, period_end, rental_fee, total_amount,
        due_date, status, created_at
      ) VALUES (?, ?, ?, 'monthly', ?, ?, ?, ?, DATE_ADD(?, INTERVAL ? DAY), 'unpaid', NOW())`,
      [
        billingNumber, order.id, order.customer_id,
        periodStart, periodEnd,
        rentalFee, rentalFee,
        periodStart, dueDays
      ]
    );

    logger.info(`[Scheduler] Generated monthly billing: ${billingNumber}`);
    return result.insertId;
  }
}

export default Scheduler;

