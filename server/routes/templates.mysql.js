/**
 * 文档模板管理 API 路由
 * 支持合同、进退场等各类单据模板的 CRUD 操作
 */

import express from 'express';

// 异步错误处理包装器
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 构建路由（与其他路由保持一致的格式）
export default function buildTemplatesRouter(mysqlPool) {
  const router = express.Router();

  // 辅助函数：执行查询
  const query = (sql, params) => mysqlPool.query(sql, params);
  const getConnection = () => mysqlPool.getConnection();

  // 简单日志（替代 log）
  const log = {
    info: (msg, meta) => console.log(`[Templates] ${msg}`, meta || ''),
    error: (msg, meta) => console.error(`[Templates] ${msg}`, meta || '')
  };

/**
 * @route GET /api/templates
 * @desc 获取模板列表（支持分页、筛选）
 * @query {string} type - 模板类型筛选
 * @query {string} status - 状态筛选
 * @query {number} page - 页码
 * @query {number} pageSize - 每页数量
 */
router.get('/', asyncHandler(async (req, res) => {
  const { type, status, page = 1, pageSize = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const companyId = req.user.company_id;

  let sql = `
    SELECT 
      id, template_code, name, type, description,
      status, is_default, is_system, company_id, store_id,
      version, created_by, updated_by, created_at, updated_at
    FROM document_templates 
    WHERE deleted_at IS NULL 
    AND (company_id = ? OR company_id IS NULL)
  `;
  const params = [companyId];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  // 获取总数
  const countSql = sql.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
  const [countResult] = await query(countSql, params);
  const total = countResult[0].total;

  // 获取分页数据
  sql += ' ORDER BY is_default DESC, created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);

  const [templates] = await query(sql, params);

  log.info(`获取模板列表成功: ${templates.length} 条记录`, { userId: req.user.id, type, status });

  res.json({ 
    ok: true, 
    data: templates, 
    page: parseInt(page), 
    pageSize: parseInt(pageSize), 
    total 
  });
}));

/**
 * @route GET /api/templates/:id
 * @desc 获取模板详情（包含版本历史和映射）
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [templates] = await query(
    'SELECT * FROM document_templates WHERE id = ? AND deleted_at IS NULL',
    [id]
  );

  if (!templates[0]) {
    return res.status(404).json({ ok: false, error: '模板不存在' });
  }

  // 获取版本历史
  const [versions] = await query(
    'SELECT * FROM template_versions WHERE template_id = ? ORDER BY version_number DESC',
    [id]
  );

  // 获取占位符映射
  const [mappings] = await query(
    'SELECT * FROM template_mappings WHERE template_id = ?',
    [id]
  );

  const template = {
    ...templates[0],
    versions: versions || [],
    mappings: mappings || []
  };

  log.info(`获取模板详情成功: ${template.name}`, { userId: req.user.id, templateId: id });

  res.json({ ok: true, data: template });
}));

/**
 * @route POST /api/templates
 * @desc 创建新模板
 */
router.post('/', asyncHandler(async (req, res) => {
  const { name, type, content, description, isDefault = false, mappings = [] } = req.body;
  const userId = req.user.id;
  const companyId = req.user.company_id;
  const storeId = req.user.store_id || null;

  // 参数验证
  if (!name || !type || !content) {
    return res.status(400).json({ ok: false, error: '模板名称、类型和内容为必填项' });
  }

  // 生成模板编码
  const timestamp = Date.now().toString(36).toUpperCase();
  const templateCode = `TPL-${type.substring(0, 3).toUpperCase()}-${timestamp}`;

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    // 如果设为默认，清除同类型其他默认模板
    if (isDefault) {
      await connection.query(
        'UPDATE document_templates SET is_default = 0 WHERE type = ? AND company_id = ?',
        [type, companyId]
      );
    }

    // 插入模板
    const [result] = await connection.query(
      `INSERT INTO document_templates 
      (template_code, name, type, content, description, is_default, company_id, store_id, created_by, updated_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [templateCode, name, type, content, description, isDefault ? 1 : 0, companyId, storeId, userId, userId]
    );

    const templateId = result.insertId;

    // 保存占位符映射
    if (mappings && mappings.length > 0) {
      const mappingValues = mappings.map(m => [
        templateId, 
        m.placeholder, 
        m.dataPath, 
        m.description || null, 
        m.exampleValue || null
      ]);
      await connection.query(
        'INSERT INTO template_mappings (template_id, placeholder, data_path, description, example_value) VALUES ?',
        [mappingValues]
      );
    }

    await connection.commit();

    log.info(`创建模板成功: ${name}`, { userId, templateId, templateCode });

    res.json({ 
      ok: true, 
      data: { 
        id: templateId, 
        template_code: templateCode 
      },
      message: '模板创建成功'
    });
  } catch (error) {
    await connection.rollback();
    log.error('创建模板失败', { error: error.message, userId, name });
    throw error;
  } finally {
    connection.release();
  }
}));

/**
 * @route PUT /api/templates/:id
 * @desc 更新模板（自动记录版本历史）
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, content, description, isDefault, status } = req.body;
  const userId = req.user.id;
  const companyId = req.user.company_id;

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    // 获取当前模板
    const [current] = await connection.query(
      'SELECT * FROM document_templates WHERE id = ? AND deleted_at IS NULL',
      [id]
    );

    if (!current[0]) {
      await connection.rollback();
      return res.status(404).json({ ok: false, error: '模板不存在' });
    }

    const currentTemplate = current[0];

    // 权限检查：只能修改自己公司的模板，系统模板不可修改内容
    if (currentTemplate.is_system && content) {
      await connection.rollback();
      return res.status(403).json({ ok: false, error: '系统模板不可修改内容' });
    }

    if (currentTemplate.company_id && currentTemplate.company_id !== companyId) {
      await connection.rollback();
      return res.status(403).json({ ok: false, error: '无权修改此模板' });
    }

    // 如果内容变更，保存历史版本
    if (content && content !== currentTemplate.content) {
      await connection.query(
        'INSERT INTO template_versions (template_id, version_number, content, created_by) VALUES (?, ?, ?, ?)',
        [id, currentTemplate.version, currentTemplate.content, userId]
      );
    }

    // 构建更新语句
    const updates = [];
    const params = [];

    if (name) { 
      updates.push('name = ?'); 
      params.push(name); 
    }
    if (content) {
      updates.push('content = ?', 'version = version + 1');
      params.push(content);
    }
    if (description !== undefined) { 
      updates.push('description = ?'); 
      params.push(description); 
    }
    if (status) { 
      updates.push('status = ?'); 
      params.push(status); 
    }
    if (isDefault !== undefined) {
      updates.push('is_default = ?');
      params.push(isDefault ? 1 : 0);

      // 如果设为默认，清除同类型其他默认
      if (isDefault) {
        await connection.query(
          'UPDATE document_templates SET is_default = 0 WHERE type = ? AND id != ? AND company_id = ?',
          [currentTemplate.type, id, companyId]
        );
      }
    }

    if (updates.length > 0) {
      updates.push('updated_by = ?');
      params.push(userId);
      params.push(id);

      await connection.query(
        `UPDATE document_templates SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    await connection.commit();

    log.info(`更新模板成功: ${currentTemplate.name}`, { userId, templateId: id });

    res.json({ ok: true, message: '模板已更新' });
  } catch (error) {
    await connection.rollback();
    log.error('更新模板失败', { error: error.message, userId, templateId: id });
    throw error;
  } finally {
    connection.release();
  }
}));

/**
 * @route DELETE /api/templates/:id
 * @desc 删除模板（软删除）
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const companyId = req.user.company_id;

  // 获取模板信息
  const [templates] = await query(
    'SELECT * FROM document_templates WHERE id = ? AND deleted_at IS NULL', 
    [id]
  );

  if (!templates[0]) {
    return res.status(404).json({ ok: false, error: '模板不存在' });
  }

  const template = templates[0];

  // 系统模板不可删除
  if (template.is_system) {
    return res.status(403).json({ ok: false, error: '系统模板不可删除' });
  }

  // 权限检查
  if (template.company_id && template.company_id !== companyId) {
    return res.status(403).json({ ok: false, error: '无权删除此模板' });
  }

  await query(
    'UPDATE document_templates SET deleted_at = NOW() WHERE id = ?',
    [id]
  );

  log.info(`删除模板成功: ${template.name}`, { userId: req.user.id, templateId: id });

  res.json({ ok: true, message: '模板已删除' });
}));

/**
 * @route GET /api/templates/default/:type
 * @desc 获取指定类型的默认模板
 */
router.get('/default/:type', asyncHandler(async (req, res) => {
  const { type } = req.params;
  const companyId = req.user.company_id;

  const [templates] = await query(
    `SELECT * FROM document_templates 
    WHERE type = ? AND is_default = 1 AND status = 'enabled' AND deleted_at IS NULL
    AND (company_id = ? OR company_id IS NULL)
    ORDER BY company_id DESC LIMIT 1`,
    [type, companyId]
  );

  if (!templates[0]) {
    return res.status(404).json({ ok: false, error: `未找到${type}类型的默认模板` });
  }

  log.info(`获取默认模板: ${templates[0].name}`, { userId: req.user.id, type });

  res.json({ ok: true, data: templates[0] });
}));

/**
 * @route POST /api/templates/:id/render
 * @desc 渲染模板（用于预览或生成文档）
 */
router.post('/:id/render', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data } = req.body; // 业务数据

  const [templates] = await query(
    'SELECT content, name FROM document_templates WHERE id = ? AND deleted_at IS NULL',
    [id]
  );

  if (!templates[0]) {
    return res.status(404).json({ ok: false, error: '模板不存在' });
  }

  // 返回模板内容，由前端进行渲染
  const html = templates[0].content;

  log.info(`渲染模板: ${templates[0].name}`, { userId: req.user.id, templateId: id });

  res.json({ ok: true, data: { html, name: templates[0].name } });
}));

/**
 * @route POST /api/templates/:id/mappings
 * @desc 更新模板占位符映射
 */
router.post('/:id/mappings', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { mappings } = req.body; // Array of { placeholder, dataPath, description, exampleValue }

  if (!mappings || !Array.isArray(mappings)) {
    return res.status(400).json({ ok: false, error: '映射数据格式错误' });
  }

  // 检查模板是否存在
  const [templates] = await query(
    'SELECT id FROM document_templates WHERE id = ? AND deleted_at IS NULL',
    [id]
  );

  if (!templates[0]) {
    return res.status(404).json({ ok: false, error: '模板不存在' });
  }

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    // 清空现有映射
    await connection.query('DELETE FROM template_mappings WHERE template_id = ?', [id]);

    // 插入新映射
    if (mappings.length > 0) {
      const values = mappings
        .filter(m => m.placeholder && m.dataPath) // 过滤无效数据
        .map(m => [
          id,
          m.placeholder,
          m.dataPath,
          m.description || null,
          m.exampleValue || null
        ]);

      if (values.length > 0) {
        await connection.query(
          'INSERT INTO template_mappings (template_id, placeholder, data_path, description, example_value) VALUES ?',
          [values]
        );
      }
    }

    await connection.commit();

    log.info(`更新模板映射成功`, { userId: req.user.id, templateId: id, count: mappings.length });

    res.json({ ok: true, message: '映射已保存' });
  } catch (error) {
    await connection.rollback();
    log.error('更新模板映射失败', { error: error.message, templateId: id });
    throw error;
  } finally {
    connection.release();
  }
}));

/**
 * @route POST /api/templates/:id/copy
 * @desc 复制模板
 */
router.post('/:id/copy', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const companyId = req.user.company_id;

  const [templates] = await query(
    'SELECT * FROM document_templates WHERE id = ? AND deleted_at IS NULL',
    [id]
  );

  if (!templates[0]) {
    return res.status(404).json({ ok: false, error: '模板不存在' });
  }

  const source = templates[0];
  const timestamp = Date.now().toString(36).toUpperCase();
  const newCode = `TPL-${source.type.substring(0, 3).toUpperCase()}-${timestamp}`;
  const newName = `${source.name}（副本）`;

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    // 创建副本
    const [result] = await connection.query(
      `INSERT INTO document_templates 
      (template_code, name, type, content, description, company_id, store_id, created_by, updated_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newCode, newName, source.type, source.content, source.description, companyId, source.store_id, userId, userId]
    );

    const newTemplateId = result.insertId;

    // 复制映射
    const [mappings] = await connection.query(
      'SELECT * FROM template_mappings WHERE template_id = ?',
      [id]
    );

    if (mappings.length > 0) {
      const mappingValues = mappings.map(m => [
        newTemplateId,
        m.placeholder,
        m.data_path,
        m.description,
        m.example_value
      ]);
      await connection.query(
        'INSERT INTO template_mappings (template_id, placeholder, data_path, description, example_value) VALUES ?',
        [mappingValues]
      );
    }

    await connection.commit();

    log.info(`复制模板成功: ${source.name} -> ${newName}`, { 
      userId, 
      sourceId: id, 
      newId: newTemplateId 
    });

    res.json({ 
      ok: true, 
      data: { 
        id: newTemplateId, 
        template_code: newCode 
      },
      message: '模板复制成功'
    });
  } catch (error) {
    await connection.rollback();
    log.error('复制模板失败', { error: error.message, templateId: id });
    throw error;
  } finally {
    connection.release();
  }
}));

/**
 * @route POST /api/templates/:id/rollback/:versionId
 * @desc 回滚模板到指定版本
 */
router.post('/:id/rollback/:versionId', asyncHandler(async (req, res) => {
  const { id, versionId } = req.params;
  const userId = req.user.id;

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    // 获取当前模板
    const [templates] = await connection.query(
      'SELECT * FROM document_templates WHERE id = ? AND deleted_at IS NULL',
      [id]
    );

    if (!templates[0]) {
      await connection.rollback();
      return res.status(404).json({ ok: false, error: '模板不存在' });
    }

    const currentTemplate = templates[0];

    // 获取历史版本
    const [versions] = await connection.query(
      'SELECT * FROM template_versions WHERE id = ? AND template_id = ?',
      [versionId, id]
    );

    if (!versions[0]) {
      await connection.rollback();
      return res.status(404).json({ ok: false, error: '版本不存在' });
    }

    const historyVersion = versions[0];

    // 将当前内容保存为新版本
    await connection.query(
      'INSERT INTO template_versions (template_id, version_number, content, change_note, created_by) VALUES (?, ?, ?, ?, ?)',
      [id, currentTemplate.version, currentTemplate.content, 'rollback-backup', userId]
    );

    // 更新模板内容为历史版本
    await connection.query(
      'UPDATE document_templates SET content = ?, version = version + 1, updated_by = ? WHERE id = ?',
      [historyVersion.content, userId, id]
    );

    await connection.commit();

    log.info(`回滚模板成功: ${currentTemplate.name}`, { 
      userId, 
      templateId: id, 
      versionId 
    });

    res.json({ ok: true, message: '模板已回滚到所选版本' });
  } catch (error) {
    await connection.rollback();
    log.error('回滚模板失败', { error: error.message, templateId: id, versionId });
    throw error;
  } finally {
    connection.release();
  }
}));

/**
 * @route POST /api/templates/usage/record
 * @desc 记录模板使用
 */
router.post('/usage/record', asyncHandler(async (req, res) => {
  const { orderId, templateId, documentType, generatedHtml, pdfPath } = req.body;
  const userId = req.user.id;

  if (!orderId || !templateId || !documentType) {
    return res.status(400).json({ ok: false, error: '订单ID、模板ID和单据类型为必填项' });
  }

  const [result] = await query(
    'INSERT INTO order_template_usage (order_id, template_id, document_type, generated_html, pdf_path, generated_by) VALUES (?, ?, ?, ?, ?, ?)',
    [orderId, templateId, documentType, generatedHtml || null, pdfPath || null, userId]
  );

  log.info(`记录模板使用: 订单${orderId}, 模板${templateId}, 类型${documentType}`, { userId });

  res.json({ ok: true, data: { id: result.insertId }, message: '使用记录已保存' });
}));

/**
 * @route GET /api/templates/usage/:orderId
 * @desc 获取订单的模板使用记录
 */
router.get('/usage/:orderId', asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const [records] = await query(
    `SELECT 
      u.*, 
      t.name as template_name, 
      t.type as template_type
    FROM order_template_usage u
    LEFT JOIN document_templates t ON u.template_id = t.id
    WHERE u.order_id = ?
    ORDER BY u.generated_at DESC`,
    [orderId]
  );

  res.json({ ok: true, data: records });
}));

  return router;
}

