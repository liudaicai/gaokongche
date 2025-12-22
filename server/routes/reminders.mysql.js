// 一户一库，不需要租户过滤
/**
 * 智能提醒中心 - API路由
 */
import express from 'express';
export default function buildRemindersRouter(pool) {
  const router = express.Router();

  // ==================== 提醒规则API ====================
  
  // 获取规则列表
  router.get('/rules', async (req, res) => {
    try {
      const { page = 1, pageSize = 20, ruleType, isEnabled } = req.query;
      const offset = (Number(page) - 1) * Number(pageSize);
      // 一户一库，不需要租户过滤（多租户已移除）
      let whereConditions = ['1=1'];
      const params = [];

      if (ruleType) {
        whereConditions.push('rule_type = ?');
        params.push(ruleType);
      }
      if (isEnabled !== undefined) {
        whereConditions.push('is_enabled = ?');
        params.push(isEnabled === 'true' ? 1 : 0);
      }

      const whereClause = whereConditions.join(' AND ');

      // 获取总数
      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM reminder_rules WHERE ${whereClause}`,
        params
      );
      const total = countResult[0].total;

      // 获取列表
      const [rows] = await pool.query(
        `SELECT * FROM reminder_rules 
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, Number(pageSize), offset]
      );

      const list = rows.map(row => ({
        id: row.id,
        ruleName: row.rule_name,
        ruleType: row.rule_type,
        description: row.description,
        triggerType: row.trigger_type,
        advanceDays: row.advance_days,
        triggerTime: row.trigger_time,
        priority: row.priority,
        isRepeatable: Boolean(row.is_repeatable),
        repeatInterval: row.repeat_interval,
        maxRepeatTimes: row.max_repeat_times,
        receiverType: row.receiver_type,
        receiverIds: row.receiver_ids ? JSON.parse(row.receiver_ids) : [],
        notificationChannels: row.notification_channels ? JSON.parse(row.notification_channels) : [],
        messageTemplate: row.message_template,
        isEnabled: Boolean(row.is_enabled),
        isSystem: Boolean(row.is_system),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      res.json({
        ok: true,
        data: list,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total
        }
      });
    } catch (error) {
      console.error('[Reminders] Get rules error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 获取规则详情
  router.get('/rules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      // 一户一库，不需要租户过滤
      const [rows] = await pool.query(
        `SELECT * FROM reminder_rules WHERE id = ? AND 1=1`,
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: '规则不存在' });
      }

      const row = rows[0];
      const rule = {
        id: row.id,
        ruleName: row.rule_name,
        ruleType: row.rule_type,
        description: row.description,
        triggerType: row.trigger_type,
        advanceDays: row.advance_days,
        triggerTime: row.trigger_time,
        priority: row.priority,
        isRepeatable: Boolean(row.is_repeatable),
        repeatInterval: row.repeat_interval,
        maxRepeatTimes: row.max_repeat_times,
        receiverType: row.receiver_type,
        receiverIds: row.receiver_ids ? JSON.parse(row.receiver_ids) : [],
        notificationChannels: row.notification_channels ? JSON.parse(row.notification_channels) : [],
        messageTemplate: row.message_template,
        isEnabled: Boolean(row.is_enabled),
        isSystem: Boolean(row.is_system),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      res.json({ ok: true, data: rule });
    } catch (error) {
      console.error('[Reminders] Get rule error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 创建规则
  router.post('/rules', async (req, res) => {
    try {
      const {
        ruleName,
        ruleType,
        description,
        triggerType,
        advanceDays = 0,
        triggerTime = '09:00:00',
        priority = 'medium',
        isRepeatable = false,
        repeatInterval = 1,
        maxRepeatTimes = 3,
        receiverType,
        receiverIds = [],
        notificationChannels = ['system'],
        messageTemplate
      } = req.body;

      if (!ruleName || !ruleType || !triggerType || !receiverType) {
        return res.status(400).json({ ok: false, error: '规则名称、类型、触发类型、接收人类型不能为空' });
      }

      const companyId = req.user?.companyId || null;
      const userId = req.user?.id || null;

      const [result] = await pool.query(
        `INSERT INTO reminder_rules (
          rule_name, rule_type, description, trigger_type, advance_days, trigger_time,
          priority, is_repeatable, repeat_interval, max_repeat_times,
          receiver_type, receiver_ids, notification_channels, message_template,
          is_enabled, is_system, company_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ruleName, ruleType, description, triggerType, advanceDays, triggerTime,
          priority, isRepeatable, repeatInterval, maxRepeatTimes,
          receiverType,
          JSON.stringify(receiverIds),
          JSON.stringify(notificationChannels),
          messageTemplate,
          true, false, companyId, userId
        ]
      );

      res.json({ ok: true, data: { id: result.insertId }, message: '规则创建成功' });
    } catch (error) {
      console.error('[Reminders] Create rule error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 更新规则
  router.put('/rules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      // 一户一库，不需要租户过滤
      const userId = req.user?.id || null;

      // 检查规则是否存在且是否为系统规则
      const [existing] = await pool.query(
        `SELECT is_system FROM reminder_rules WHERE id = ? AND 1=1`,
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({ ok: false, error: '规则不存在' });
      }

      if (existing[0].is_system && !req.user?.isSuperAdmin) {
        return res.status(403).json({ ok: false, error: '系统规则不可修改' });
      }

      const updates = [];
      const values = [];

      const fields = [
        'rule_name', 'description', 'trigger_type', 'advance_days', 'trigger_time',
        'priority', 'is_repeatable', 'repeat_interval', 'max_repeat_times',
        'receiver_type', 'receiver_ids', 'notification_channels', 'message_template'
      ];

      const bodyMap = {
        'rule_name': 'ruleName',
        'description': 'description',
        'trigger_type': 'triggerType',
        'advance_days': 'advanceDays',
        'trigger_time': 'triggerTime',
        'priority': 'priority',
        'is_repeatable': 'isRepeatable',
        'repeat_interval': 'repeatInterval',
        'max_repeat_times': 'maxRepeatTimes',
        'receiver_type': 'receiverType',
        'receiver_ids': 'receiverIds',
        'notification_channels': 'notificationChannels',
        'message_template': 'messageTemplate'
      };

      for (const field of fields) {
        const bodyField = bodyMap[field];
        if (req.body[bodyField] !== undefined) {
          updates.push(`${field} = ?`);
          let value = req.body[bodyField];
          
          if (field === 'receiver_ids' || field === 'notification_channels') {
            value = JSON.stringify(value);
          }
          
          values.push(value);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ ok: false, error: '没有要更新的字段' });
      }

      updates.push('updated_by = ?');
      values.push(userId);

      await pool.query(
        `UPDATE reminder_rules SET ${updates.join(', ')} WHERE id = ? AND 1=1`,
        [...values, id]
      );

      res.json({ ok: true, message: '规则更新成功' });
    } catch (error) {
      console.error('[Reminders] Update rule error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 删除规则
  router.delete('/rules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      // 一户一库，不需要租户过滤
      // 检查是否为系统规则
      const [existing] = await pool.query(
        `SELECT is_system FROM reminder_rules WHERE id = ? AND 1=1`,
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({ ok: false, error: '规则不存在' });
      }

      if (existing[0].is_system) {
        return res.status(403).json({ ok: false, error: '系统规则不可删除' });
      }

      await pool.query(
        `DELETE FROM reminder_rules WHERE id = ? AND 1=1`,
        [id]
      );

      res.json({ ok: true, message: '规则删除成功' });
    } catch (error) {
      console.error('[Reminders] Delete rule error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 启用/禁用规则
  router.put('/rules/:id/toggle', async (req, res) => {
    try {
      const { id } = req.params;
      const { isEnabled } = req.body;
      // 一户一库，不需要租户过滤
      const userId = req.user?.id || null;

      await pool.query(
        `UPDATE reminder_rules SET is_enabled = ?, updated_by = ? 
         WHERE id = ? AND 1=1`,
        [isEnabled, userId, id]
      );

      res.json({ ok: true, message: isEnabled ? '规则已启用' : '规则已禁用' });
    } catch (error) {
      console.error('[Reminders] Toggle rule error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 提醒记录API ====================
  
  // 获取提醒列表
  router.get('/', async (req, res) => {
    try {
      const {
        page = 1,
        pageSize = 20,
        status,
        businessType,
        priority,
        startDate,
        endDate
      } = req.query;
      
      const offset = (Number(page) - 1) * Number(pageSize);
      const userId = req.user?.id;
      // 一户一库，不需要租户过滤（多租户已移除）
      let whereConditions = [
        '1=1',
        'receiver_id = ?'
      ];
      const params = [userId];

      if (status) {
        whereConditions.push('status = ?');
        params.push(status);
      }
      if (businessType) {
        whereConditions.push('business_type = ?');
        params.push(businessType);
      }
      if (priority) {
        whereConditions.push('priority = ?');
        params.push(priority);
      }
      if (startDate) {
        whereConditions.push('created_at >= ?');
        params.push(startDate);
      }
      if (endDate) {
        whereConditions.push('created_at <= ?');
        params.push(endDate);
      }

      const whereClause = whereConditions.join(' AND ');

      // 获取总数
      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM reminder_records WHERE ${whereClause}`,
        params
      );
      const total = countResult[0].total;

      // 获取列表
      const [rows] = await pool.query(
        `SELECT * FROM reminder_records 
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, Number(pageSize), offset]
      );

      const list = rows.map(row => ({
        id: row.id,
        ruleId: row.rule_id,
        businessType: row.business_type,
        businessId: row.business_id,
        title: row.title,
        content: row.content,
        priority: row.priority,
        receiverId: row.receiver_id,
        receiverName: row.receiver_name,
        notificationChannel: row.notification_channel,
        status: row.status,
        sentAt: row.sent_at,
        readAt: row.read_at,
        handledAt: row.handled_at,
        repeatCount: row.repeat_count,
        createdAt: row.created_at
      }));

      res.json({
        ok: true,
        data: list,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total
        }
      });
    } catch (error) {
      console.error('[Reminders] Get reminders error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 获取未读数量
  router.get('/unread-count', async (req, res) => {
    try {
      const userId = req.user?.id;
      // 一户一库，不需要租户过滤
      const [result] = await pool.query(
        `SELECT COUNT(*) as count FROM reminder_records 
         WHERE 1=1 AND receiver_id = ? AND status IN ('pending', 'sent')`,
        [ userId]
      );

      res.json({ ok: true, data: { count: result[0].count } });
    } catch (error) {
      console.error('[Reminders] Get unread count error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 获取提醒详情
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      // 一户一库，不需要租户过滤
      const [rows] = await pool.query(
        `SELECT * FROM reminder_records 
         WHERE id = ? AND 1=1 AND receiver_id = ?`,
        [id, userId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: '提醒不存在' });
      }

      const row = rows[0];
      const reminder = {
        id: row.id,
        ruleId: row.rule_id,
        businessType: row.business_type,
        businessId: row.business_id,
        title: row.title,
        content: row.content,
        priority: row.priority,
        receiverId: row.receiver_id,
        receiverName: row.receiver_name,
        notificationChannel: row.notification_channel,
        status: row.status,
        sentAt: row.sent_at,
        readAt: row.read_at,
        handledAt: row.handled_at,
        handlerId: row.handler_id,
        handlerName: row.handler_name,
        handleNote: row.handle_note,
        repeatCount: row.repeat_count,
        createdAt: row.created_at
      };

      res.json({ ok: true, data: reminder });
    } catch (error) {
      console.error('[Reminders] Get reminder error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 标记为已读
  router.put('/:id/read', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      // 一户一库，不需要租户过滤
      await pool.query(
        `UPDATE reminder_records 
         SET status = 'read', read_at = NOW(3)
         WHERE id = ? AND 1=1 AND receiver_id = ?`,
        [id, userId]
      );

      res.json({ ok: true, message: '已标记为已读' });
    } catch (error) {
      console.error('[Reminders] Mark read error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 标记为已处理
  router.put('/:id/handle', async (req, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body;
      const userId = req.user?.id;
      const userName = req.user?.username || '';
      // 一户一库，不需要租户过滤
      await pool.query(
        `UPDATE reminder_records 
         SET status = 'handled', handled_at = NOW(3), handler_id = ?, handler_name = ?, handle_note = ?
         WHERE id = ? AND 1=1 AND receiver_id = ?`,
        [userId, userName, note, id, userId]
      );

      res.json({ ok: true, message: '已标记为已处理' });
    } catch (error) {
      console.error('[Reminders] Mark handled error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 批量标记已读
  router.post('/batch-read', async (req, res) => {
    try {
      const { ids } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ ok: false, error: 'IDs不能为空' });
      }

      const userId = req.user?.id;
      // 一户一库，不需要租户过滤
      const placeholders = ids.map(() => '?').join(',');
      await pool.query(
        `UPDATE reminder_records 
         SET status = 'read', read_at = NOW(3)
         WHERE id IN (${placeholders}) AND 1=1 AND receiver_id = ?`,
        [...ids, userId]
      );

      res.json({ ok: true, message: `已标记${ids.length}条提醒为已读` });
    } catch (error) {
      console.error('[Reminders] Batch read error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 删除提醒
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      // 一户一库，不需要租户过滤
      await pool.query(
        `DELETE FROM reminder_records 
         WHERE id = ? AND 1=1 AND receiver_id = ?`,
        [id, userId]
      );

      res.json({ ok: true, message: '提醒已删除' });
    } catch (error) {
      console.error('[Reminders] Delete reminder error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 用户设置API ====================
  
  // 获取用户设置
  router.get('/settings', async (req, res) => {
    try {
      const userId = req.user?.id;
      // 一户一库，不需要租户过滤
      const [rows] = await pool.query(
        `SELECT * FROM user_reminder_settings 
         WHERE user_id = ? AND 1=1`,
        [userId]
      );

      let settings;
      if (rows.length === 0) {
        // 返回默认设置
        settings = {
          userId,
          isEnabled: true,
          quietTimeStart: null,
          quietTimeEnd: null,
          enableSystemNotification: true,
          enableEmailNotification: true,
          enableSmsNotification: false,
          enableWechatNotification: false,
          reminderTypeSettings: {},
          email: null,
          phone: null,
          wechatOpenid: null
        };
      } else {
        const row = rows[0];
        settings = {
          id: row.id,
          userId: row.user_id,
          isEnabled: Boolean(row.is_enabled),
          quietTimeStart: row.quiet_time_start,
          quietTimeEnd: row.quiet_time_end,
          enableSystemNotification: Boolean(row.enable_system_notification),
          enableEmailNotification: Boolean(row.enable_email_notification),
          enableSmsNotification: Boolean(row.enable_sms_notification),
          enableWechatNotification: Boolean(row.enable_wechat_notification),
          reminderTypeSettings: row.reminder_type_settings ? JSON.parse(row.reminder_type_settings) : {},
          email: row.email,
          phone: row.phone,
          wechatOpenid: row.wechat_openid
        };
      }

      res.json({ ok: true, data: settings });
    } catch (error) {
      console.error('[Reminders] Get settings error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 更新用户设置
  router.put('/settings', async (req, res) => {
    try {
      const userId = req.user?.id;
      const companyId = req.user?.companyId || null;
      // 一户一库，不需要租户过滤
      const {
        isEnabled,
        quietTimeStart,
        quietTimeEnd,
        enableSystemNotification,
        enableEmailNotification,
        enableSmsNotification,
        enableWechatNotification,
        reminderTypeSettings,
        email,
        phone,
        wechatOpenid
      } = req.body;

      // 检查是否已存在
      const [existing] = await pool.query(
        `SELECT id FROM user_reminder_settings 
         WHERE user_id = ? AND 1=1`,
        [userId]
      );

      if (existing.length === 0) {
        // 插入新记录
        await pool.query(
          `INSERT INTO user_reminder_settings (
            user_id, is_enabled, quiet_time_start, quiet_time_end,
            enable_system_notification, enable_email_notification,
            enable_sms_notification, enable_wechat_notification,
            reminder_type_settings, email, phone, wechat_openid, company_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId, isEnabled, quietTimeStart, quietTimeEnd,
            enableSystemNotification, enableEmailNotification,
            enableSmsNotification, enableWechatNotification,
            reminderTypeSettings ? JSON.stringify(reminderTypeSettings) : null,
            email, phone, wechatOpenid, companyId
          ]
        );
      } else {
        // 更新现有记录
        const updates = [];
        const values = [];

        const fields = {
          'is_enabled': isEnabled,
          'quiet_time_start': quietTimeStart,
          'quiet_time_end': quietTimeEnd,
          'enable_system_notification': enableSystemNotification,
          'enable_email_notification': enableEmailNotification,
          'enable_sms_notification': enableSmsNotification,
          'enable_wechat_notification': enableWechatNotification,
          'reminder_type_settings': reminderTypeSettings ? JSON.stringify(reminderTypeSettings) : null,
          'email': email,
          'phone': phone,
          'wechat_openid': wechatOpenid
        };

        for (const [field, value] of Object.entries(fields)) {
          if (value !== undefined) {
            updates.push(`${field} = ?`);
            values.push(value);
          }
        }

        if (updates.length > 0) {
          await pool.query(
            `UPDATE user_reminder_settings 
             SET ${updates.join(', ')}
             WHERE user_id = ? AND 1=1`,
            [...values, userId]
          );
        }
      }

      res.json({ ok: true, message: '设置保存成功' });
    } catch (error) {
      console.error('[Reminders] Update settings error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}
