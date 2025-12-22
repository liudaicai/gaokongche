/**
 * Word模板 API 路由
 * 支持上传、生成、列表等操作
 */

import express from 'express';
import multer from 'multer';
import wordTemplateService from '../services/wordTemplateService.js';

const router = express.Router();

// 配置文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.originalname.endsWith('.docx')) {
      cb(null, true);
    } else {
      cb(new Error('只支持 .docx 格式的Word文档'));
    }
  }
});

/**
 * @route GET /api/word-templates
 * @desc 获取所有Word模板列表
 */
router.get('/', async (req, res) => {
  try {
    const templates = wordTemplateService.listTemplates();
    res.json({
      ok: true,
      data: templates
    });
  } catch (error) {
    console.error('[WordTemplateAPI] 获取模板列表失败:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/word-templates/:name/variables
 * @desc 提取模板中的变量
 */
router.get('/:name/variables', async (req, res) => {
  try {
    const { name } = req.params;
    const variables = wordTemplateService.extractVariables(name);
    res.json({
      ok: true,
      data: variables
    });
  } catch (error) {
    console.error('[WordTemplateAPI] 提取变量失败:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/word-templates/upload
 * @desc 上传Word模板
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: '请选择文件'
      });
    }

    const result = wordTemplateService.uploadTemplate(
      req.file.buffer,
      req.file.originalname
    );

    res.json({
      ok: true,
      data: result,
      message: '模板上传成功'
    });
  } catch (error) {
    console.error('[WordTemplateAPI] 上传失败:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/word-templates/generate
 * @desc 从模板生成Word文档
 * @body {string} templateName - 模板名称
 * @body {object} data - 数据对象
 * @body {string} filename - 生成的文件名（可选）
 */
router.post('/generate', async (req, res) => {
  try {
    const { templateName, data, filename } = req.body;

    if (!templateName) {
      return res.status(400).json({
        ok: false,
        error: '请指定模板名称'
      });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        ok: false,
        error: '请提供数据对象'
      });
    }

    console.log(`[WordTemplateAPI] 生成文档: ${templateName}`, {
      dataKeys: Object.keys(data)
    });

    // 生成文档
    const buffer = await wordTemplateService.generateFromTemplate(
      templateName,
      data
    );

    // 设置响应头，让浏览器下载文件
    const downloadFilename = filename || `${templateName}_${Date.now()}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadFilename)}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);

  } catch (error) {
    console.error('[WordTemplateAPI] 生成失败:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/word-templates/generate-order/:orderId
 * @desc 根据订单ID生成合同/单据
 * @param {string} orderId - 订单ID
 * @param {string} templateType - 模板类型: contract, entry, exit, settlement
 */
router.post('/generate-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { templateType, templateName } = req.body;

    // 从数据库获取订单数据
    const pool = req.app.get('mysqlPool');
    const [orders] = await pool.query(`
      SELECT 
        o.*,
        c.name as customerName,
        c.contact_person as customerContactPerson,
        c.phone as customerPhone,
        c.address as customerAddress,
        c.id_card as customerIdCard
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `, [orderId]);

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        ok: false,
        error: '订单不存在'
      });
    }

    const order = orders[0];

    // 获取订单关联的设备列表
    const [equipments] = await pool.query(`
      SELECT 
        e.*,
        em.model, em.brand, em.category, em.height
      FROM order_entries oe
      LEFT JOIN equipments e ON oe.equipment_id = e.id
      LEFT JOIN equipment_models em ON e.model_id = em.id
      WHERE oe.order_id = ?
    `, [orderId]);

    // 构建模板数据
    const templateData = {
      // 订单信息
      orderNumber: order.order_number,
      projectName: order.project_name,
      startDate: order.start_date ? new Date(order.start_date).toLocaleDateString('zh-CN') : '',
      endDate: order.end_date ? new Date(order.end_date).toLocaleDateString('zh-CN') : '',
      totalAmount: order.total_amount || 0,
      deposit: order.deposit || 0,
      remarks: order.remarks || '',
      
      // 客户信息
      customerName: order.customerName || '',
      customerContactPerson: order.customerContactPerson || '',
      customerPhone: order.customerPhone || '',
      customerAddress: order.customerAddress || '',
      customerIdCard: order.customerIdCard || '',
      
      // 设备列表
      equipments: equipments.map((eq, index) => ({
        index: index + 1,
        code: eq.code || '',
        customCode: eq.custom_code || '',
        model: eq.model || '',
        brand: eq.brand || '',
        category: eq.category || '',
        height: eq.height || '',
        dailyRate: eq.daily_rate || 0,
        quantity: 1 // 可根据实际情况调整
      })),
      
      // 其他信息
      createdAt: new Date().toLocaleDateString('zh-CN'),
      createdBy: req.user?.username || '系统'
    };

    // 确定模板名称
    let finalTemplateName = templateName;
    if (!finalTemplateName) {
      // 根据类型选择默认模板
      const typeMap = {
        contract: '租赁合同',
        entry: '进场单',
        exit: '退场单',
        settlement: '结算单'
      };
      finalTemplateName = typeMap[templateType] || '租赁合同';
    }

    console.log(`[WordTemplateAPI] 为订单 ${orderId} 生成文档: ${finalTemplateName}`);

    // 生成文档
    const buffer = await wordTemplateService.generateFromTemplate(
      finalTemplateName,
      templateData
    );

    // 设置响应头
    const filename = `${finalTemplateName}_${order.order_number}_${Date.now()}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);

  } catch (error) {
    console.error('[WordTemplateAPI] 生成订单文档失败:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/word-templates/:name
 * @desc 删除Word模板
 */
router.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const result = wordTemplateService.deleteTemplate(name);
    
    if (result) {
      res.json({
        ok: true,
        message: '模板已删除'
      });
    } else {
      res.status(404).json({
        ok: false,
        error: '模板不存在'
      });
    }
  } catch (error) {
    console.error('[WordTemplateAPI] 删除失败:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;
