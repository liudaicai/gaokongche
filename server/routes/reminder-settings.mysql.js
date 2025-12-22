import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

export default function buildReminderSettingsRouterMySQL(pool) {
  const router = express.Router();

  // 获取所有设置
  router.get('/', asyncHandler(async (req, res) => {
    const { category } = req.query;

    let sql = 'SELECT * FROM reminder_settings';
    const params = [];

    if (category) {
      sql += ' WHERE category = ?';
      params.push(category);
    }

    sql += ' ORDER BY category, id';

    const [rows] = await pool.query(sql, params);

    const data = rows.map(s => ({
      id: String(s.id),
      settingKey: s.setting_key,
      settingName: s.setting_name,
      settingValue: typeof s.setting_value === 'string' ? JSON.parse(s.setting_value) : s.setting_value,
      settingType: s.setting_type,
      category: s.category,
      description: s.description,
      editable: Boolean(s.editable),
      createdAt: s.created_at?.toISOString?.() || s.created_at,
      updatedAt: s.updated_at?.toISOString?.() || s.updated_at,
    }));

    res.json({ ok: true, data });
  }));

  // 获取单个设置
  router.get('/:key', asyncHandler(async (req, res) => {
    const key = req.params.key;

    const [rows] = await pool.query(
      'SELECT * FROM reminder_settings WHERE setting_key = ?',
      [key]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Setting not found' });
    }

    const s = rows[0];
    const data = {
      id: String(s.id),
      settingKey: s.setting_key,
      settingName: s.setting_name,
      settingValue: typeof s.setting_value === 'string' ? JSON.parse(s.setting_value) : s.setting_value,
      settingType: s.setting_type,
      category: s.category,
      description: s.description,
      editable: Boolean(s.editable),
      createdAt: s.created_at?.toISOString?.() || s.created_at,
      updatedAt: s.updated_at?.toISOString?.() || s.updated_at,
    };

    res.json({ ok: true, data });
  }));

  // 更新设置
  router.put('/:key', asyncHandler(async (req, res) => {
    const key = req.params.key;
    const { settingValue } = req.body;

    // 检查设置是否存在且可编辑
    const [rows] = await pool.query(
      'SELECT editable FROM reminder_settings WHERE setting_key = ?',
      [key]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Setting not found' });
    }

    if (!rows[0].editable) {
      return res.status(403).json({ ok: false, error: 'Setting is not editable' });
    }

    await pool.query(
      `UPDATE reminder_settings 
       SET setting_value = ?, updated_at = NOW() 
       WHERE setting_key = ?`,
      [JSON.stringify(settingValue), key]
    );

    res.json({ ok: true });
  }));

  // 批量更新设置
  router.put('/', asyncHandler(async (req, res) => {
    const { settings } = req.body; // { key1: value1, key2: value2, ... }

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ ok: false, error: 'Invalid settings format' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      for (const [key, value] of Object.entries(settings)) {
        // 检查设置是否存在且可编辑
        const [rows] = await conn.query(
          'SELECT editable FROM reminder_settings WHERE setting_key = ?',
          [key]
        );

        if (rows.length > 0 && rows[0].editable) {
          await conn.query(
            `UPDATE reminder_settings 
             SET setting_value = ?, updated_at = NOW() 
             WHERE setting_key = ?`,
            [JSON.stringify(value), key]
          );
        }
      }

      await conn.commit();
      res.json({ ok: true, updated: Object.keys(settings).length });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }));

  // 重置为默认值
  router.post('/:key/reset', asyncHandler(async (req, res) => {
    const key = req.params.key;

    // 定义默认值映射
    const defaults = {
      'equipment_expiry_days': [7, 3, 1],
      'payment_overdue_days': [1, 3, 7, 15],
      'contract_expiry_days': [30, 15, 7, 3],
      'equipment_overdue_days': [1, 3, 7],
      'enable_email_notification': true,
      'enable_sms_notification': false,
      'billing_due_days': 15,
      'late_fee_rate': 1,
      'auto_generate_billing': true,
      'billing_generation_day': 1,
    };

    if (!defaults[key]) {
      return res.status(404).json({ ok: false, error: 'No default value for this setting' });
    }

    await pool.query(
      `UPDATE reminder_settings 
       SET setting_value = ?, updated_at = NOW() 
       WHERE setting_key = ?`,
      [JSON.stringify(defaults[key]), key]
    );

    res.json({ ok: true, value: defaults[key] });
  }));

  return router;
}

