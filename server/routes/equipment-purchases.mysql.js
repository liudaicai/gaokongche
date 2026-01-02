import express from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';

function buildEquipmentPurchasesRouter(pool) {
  const router = express.Router();

  // 辅助函数：将snake_case转换为camelCase
  function toCamelCase(str) {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }

  // 辅助函数：转换对象的所有键为camelCase
  function keysToCamelCase(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(keysToCamelCase);
    
    const result = {};
    for (const key in obj) {
      result[toCamelCase(key)] = obj[key];
    }
    return result;
  }

  // ✅ 多租户模式：从当前用户获取company_id
  function getCompanyId(req, body = {}) {
    // 从req.user中获取company_id（由authMiddleware设置）
    // 超级管理员可以通过body.companyId指定
    if (req.user?.role === 'super_admin' || req.user?.role === 'superadmin') {
      return body.companyId || req.user.company_id || 1;
    }
    return req.user?.company_id || 1;
  }

  // 获取采购记录列表
  router.get('/', tenantMiddleware, async (req, res) => {
    try {
      const {
        page = 1,
        pageSize = 20,
        companyId: queryCompanyId,
        manufacturerName,
        purchaseType,
        startDate,
        endDate
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      // ✅ 多租户过滤
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;

      // 构建查询条件
      let whereConditions = ['ep.is_deleted = FALSE', `ep.${tenantWhere}`];
      const params = [...tenantParams];

      if (manufacturerName) {
        whereConditions.push('ep.manufacturer_name LIKE ?');
        params.push(`%${manufacturerName}%`);
      }

      if (purchaseType) {
        whereConditions.push('ep.purchase_type = ?');
        params.push(purchaseType);
      }

      if (startDate) {
        whereConditions.push('ep.purchase_date >= ?');
        params.push(startDate);
      }

      if (endDate) {
        whereConditions.push('ep.purchase_date <= ?');
        params.push(endDate);
      }

      const whereClause = whereConditions.join(' AND ');

      // 查询总数
      const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) as total FROM equipment_purchases ep WHERE ${whereClause}`,
        params
      );

      // 查询列表
      const [purchases] = await pool.query(
        `SELECT 
          ep.*,
          u1.name AS creator_name,
          u2.name AS updater_name
        FROM equipment_purchases ep
        LEFT JOIN users u1 ON ep.created_by = u1.id
        LEFT JOIN users u2 ON ep.updated_by = u2.id
        WHERE ${whereClause}
        ORDER BY ep.purchase_date DESC, ep.created_at DESC
        LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // 获取所有采购单的ID
      const purchaseIds = purchases.map(p => p.id);
      
      // 批量查询所有采购明细
      let allItems = [];
      if (purchaseIds.length > 0) {
        const [items] = await pool.query(
          `SELECT * FROM purchase_items WHERE purchase_id IN (?) ORDER BY purchase_id, id`,
          [purchaseIds]
        );
        allItems = items;
      }

      // 将明细按采购单ID分组并转换为camelCase
      const itemsByPurchaseId = {};
      allItems.forEach(item => {
        const camelItem = keysToCamelCase(item);
        if (!itemsByPurchaseId[item.purchase_id]) {
          itemsByPurchaseId[item.purchase_id] = [];
        }
        itemsByPurchaseId[item.purchase_id].push(camelItem);
      });

      // 解析JSON字段并附加明细
      const processedPurchases = purchases.map(p => {
        let attachments = [];
        if (p.attachments) {
          try {
            // 如果是字符串，尝试解析；如果已经是对象，直接使用
            attachments = typeof p.attachments === 'string' 
              ? JSON.parse(p.attachments) 
              : p.attachments;
          } catch (e) {
            console.warn(`[Purchases] Failed to parse attachments for purchase ${p.id}:`, e.message);
            attachments = [];
          }
        }
        
        // 转换为camelCase并附加明细
        const camelPurchase = keysToCamelCase(p);
        return {
          ...camelPurchase,
          attachments,
          items: itemsByPurchaseId[p.id] || []
        };
      });

      res.json({
        ok: true,
        data: processedPurchases,
        page: parseInt(page),
        pageSize: limit,
        total: total,
        pagination: {
          page: parseInt(page),
          pageSize: limit,
          total: total
        }
      });
    } catch (error) {
      console.error('获取采购列表失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // 获取单个采购记录（包含明细）
  router.get('/:id', tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;

      // ✅ 多租户过滤
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;

      // 查询主表
      const query = `SELECT 
        ep.*,
        u1.name AS creator_name,
        u2.name AS updater_name
      FROM equipment_purchases ep
      LEFT JOIN users u1 ON ep.created_by = u1.id
      LEFT JOIN users u2 ON ep.updated_by = u2.id
      WHERE ep.id = ? AND ep.is_deleted = FALSE AND ep.${tenantWhere}`;
      
      const [[purchase]] = await pool.query(query, [id, ...tenantParams]);

      if (!purchase) {
        return res.json({ ok: false, error: '采购记录不存在' });
      }

      // 查询明细
      const [items] = await pool.query(
        `SELECT * FROM purchase_items WHERE purchase_id = ? ORDER BY id`,
        [id]
      );

      // 解析JSON字段
      let attachments = [];
      if (purchase.attachments) {
        try {
          attachments = typeof purchase.attachments === 'string' 
            ? JSON.parse(purchase.attachments) 
            : purchase.attachments;
        } catch (e) {
          console.warn(`[Purchases] Failed to parse attachments for purchase ${id}:`, e.message);
          attachments = [];
        }
      }

      // 转换为camelCase
      const camelPurchase = keysToCamelCase(purchase);
      const camelItems = items.map(item => keysToCamelCase(item));

      const result = {
        ...camelPurchase,
        attachments,
        items: camelItems
      };

      res.json({ ok: true, data: result });
    } catch (error) {
      console.error('获取采购详情失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // 创建采购记录
  router.post('/', tenantMiddleware, async (req, res) => {
    const connection = await pool.getConnection();
    try {
      console.log('[Purchases] 开始创建采购记录，请求体:', JSON.stringify(req.body).substring(0, 200));
      await connection.beginTransaction();

      const {
        companyId: bodyCompanyId,
        manufacturerName,
        brand,
        purchaseDate,
        downPaymentRatio = 0,
        paymentTerms = 0,
        taxRate = 13,
        purchaseType = 'cash',
        downPayment = 0,
        loanAmount = 0,
        annualInterestRate = 0,
        repaymentPeriod,
        repaymentStartDate,
        repaymentEndDate,
        monthlyPayment,
        repaymentAccountName,
        repaymentAccountNumber,
        repaymentBank,
        warrantyPeriod = 12,
        items = [],
        attachments = [],
        remark
      } = req.body;

      const companyId = getCompanyId(req, { companyId: bodyCompanyId });
      const userId = req.user?.id;

      // 基本字段验证
      if (!purchaseDate || !items || items.length === 0) {
        console.log('[Purchases] ❌ 缺少必填字段');
        throw new Error('缺少必填字段：purchaseDate 和 items 是必需的');
      }

      // 如果没有提供 manufacturerName，尝试从第一个item的brand获取
      const finalManufacturerName = manufacturerName || (items && items[0]?.brand);
      const finalBrand = brand || (items && items[0]?.brand);

      // 验证品牌信息
      if (!finalManufacturerName || !finalBrand) {
        console.log('[Purchases] ❌ 缺少品牌信息');
        throw new Error('缺少品牌信息：请在采购明细中填写品牌');
      }

      console.log('[Purchases] 公司ID:', companyId, '用户ID:', userId);
      console.log('[Purchases] 厂家:', finalManufacturerName, '品牌:', finalBrand, '日期:', purchaseDate, '明细数量:', items.length);

      // 生成采购单号 PUR+YYYYMMDD+序号
      const dateStr = purchaseDate.replace(/-/g, '');
      const [[{ maxNum }]] = await connection.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(purchase_number, 12) AS UNSIGNED)), 0) as maxNum
         FROM equipment_purchases 
         WHERE purchase_number LIKE ? AND company_id = ?`,
        [`PUR${dateStr}%`, companyId]
      );
      const purchaseNumber = `PUR${dateStr}${String(maxNum + 1).padStart(4, '0')}`;

      // 计算总金额
      let totalAmount = 0;
      items.forEach(item => {
        item.subtotal = item.quantity * item.unitPrice;
        totalAmount += item.subtotal;
      });

      const taxAmount = totalAmount * (taxRate / 100);
      const totalWithTax = totalAmount + taxAmount;

      // 计算质保到期日期
      let warrantyExpiryDate = null;
      if (warrantyPeriod && purchaseDate) {
        const date = new Date(purchaseDate);
        date.setMonth(date.getMonth() + warrantyPeriod);
        warrantyExpiryDate = date.toISOString().split('T')[0];
      }

      // 插入主表（注意：equipment_purchases表中没有brand字段，只有manufacturer_name）
      const [result] = await connection.query(
        `INSERT INTO equipment_purchases (
          company_id, purchase_number, manufacturer_name, purchase_date,
          down_payment_ratio, payment_terms, tax_rate,
          purchase_type, down_payment, loan_amount, annual_interest_rate, repayment_period, repayment_start_date, repayment_end_date, monthly_payment,
          repayment_account_name, repayment_account_number, repayment_bank,
          warranty_period, warranty_expiry_date,
          total_amount, tax_amount, total_with_tax,
          attachments, remark, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId, purchaseNumber, finalManufacturerName, purchaseDate,
          downPaymentRatio, paymentTerms, taxRate,
          purchaseType, downPayment, loanAmount, annualInterestRate, repaymentPeriod, repaymentStartDate, repaymentEndDate, monthlyPayment,
          repaymentAccountName, repaymentAccountNumber, repaymentBank,
          warrantyPeriod, warrantyExpiryDate,
          totalAmount, taxAmount, totalWithTax,
          JSON.stringify(attachments), remark, userId
        ]
      );

      const purchaseId = result.insertId;

      // 插入明细并自动创建型号
      for (const item of items) {
        // 插入采购明细（注意：purchase_items表中没有drive_type字段）
        await connection.query(
          `INSERT INTO purchase_items (
            purchase_id, equipment_category, equipment_type, equipment_model, equipment_height,
            quantity, unit_price, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            purchaseId, item.equipmentCategory, item.equipmentType, item.equipmentModel, item.equipmentHeight || null,
            item.quantity, item.unitPrice, item.subtotal
          ]
        );

        // 如果填写了型号和高度，自动创建型号记录（如果不存在）
        if (item.equipmentModel && item.equipmentHeight) {
          // 检查型号是否已存在
          const [[existingModel]] = await connection.query(
            `SELECT id FROM equipment_models 
             WHERE model = ? AND type = ? AND height = ? AND is_deleted = FALSE
             LIMIT 1`,
            [item.equipmentModel, item.equipmentType, item.equipmentHeight]
          );

          // 如果不存在，则创建新型号
          if (!existingModel) {
            await connection.query(
              `INSERT INTO equipment_models (
                category, brand, model, type, height, drive_type
              ) VALUES (?, ?, ?, ?, ?, ?)`,
              [
                item.equipmentCategory || '未分类',
                finalBrand, // 使用采购单的品牌信息
                item.equipmentModel,
                item.equipmentType,
                item.equipmentHeight,
                item.driveType || '未知' // 使用明细项的驱动类型
              ]
            );
            console.log(`✅ 自动创建型号: ${item.equipmentType} - ${item.equipmentModel} (${item.equipmentHeight}m, ${item.driveType || '未知'})`);
          }
        }
      }

      await connection.commit();

      console.log(`[Purchases] ✅ 采购记录创建成功: ${purchaseNumber} (ID: ${purchaseId})`);
      res.json({
        ok: true,
        data: { id: purchaseId, purchaseNumber }
      });
    } catch (error) {
      await connection.rollback();
      console.error('[Purchases] ❌ 创建采购记录失败:', error);
      res.json({ ok: false, error: error.message });
    } finally {
      connection.release();
    }
  });

  // 更新采购记录
  router.put('/:id', tenantMiddleware, async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const {
        manufacturerName,
        brand,
        purchaseDate,
        downPaymentRatio,
        paymentTerms,
        taxRate,
        purchaseType,
        downPayment,
        loanAmount,
        annualInterestRate,
        repaymentPeriod,
        repaymentStartDate,
        repaymentEndDate,
        monthlyPayment,
        repaymentAccountName,
        repaymentAccountNumber,
        repaymentBank,
        warrantyPeriod,
        items = [],
        attachments,
        remark
      } = req.body;

      const userId = req.user?.id;

      // ✅ 多租户过滤
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;

      // 检查记录是否存在
      const [[existing]] = await connection.query(
        `SELECT id, company_id FROM equipment_purchases WHERE id = ? AND is_deleted = FALSE AND ${tenantWhere}`,
        [id, ...tenantParams]
      );

      if (!existing) {
        throw new Error('采购记录不存在');
      }

      const companyId = existing.company_id;
      
      // 如果没有提供brand，尝试从第一个item获取
      const finalBrand = brand || (items && items[0]?.brand) || '未知品牌';

      // 计算总金额
      let totalAmount = 0;
      items.forEach(item => {
        item.subtotal = item.quantity * item.unitPrice;
        totalAmount += item.subtotal;
      });

      const taxAmount = totalAmount * (taxRate / 100);
      const totalWithTax = totalAmount + taxAmount;

      // 计算质保到期日期
      let warrantyExpiryDate = null;
      if (warrantyPeriod && purchaseDate) {
        const date = new Date(purchaseDate);
        date.setMonth(date.getMonth() + warrantyPeriod);
        warrantyExpiryDate = date.toISOString().split('T')[0];
      }

      // 更新主表
      const updates = [];
      const params = [];

      if (manufacturerName !== undefined) {
        updates.push('manufacturer_name = ?');
        params.push(manufacturerName);
      }
      // 注意：equipment_purchases表中没有brand字段，brand仅用于创建equipment_models
      if (purchaseDate !== undefined) {
        updates.push('purchase_date = ?');
        params.push(purchaseDate);
      }
      if (downPaymentRatio !== undefined) {
        updates.push('down_payment_ratio = ?');
        params.push(downPaymentRatio);
      }
      if (paymentTerms !== undefined) {
        updates.push('payment_terms = ?');
        params.push(paymentTerms);
      }
      if (taxRate !== undefined) {
        updates.push('tax_rate = ?');
        params.push(taxRate);
      }
      if (purchaseType !== undefined) {
        updates.push('purchase_type = ?');
        params.push(purchaseType);
      }
      if (downPayment !== undefined) {
        updates.push('down_payment = ?');
        params.push(downPayment);
      }
      if (loanAmount !== undefined) {
        updates.push('loan_amount = ?');
        params.push(loanAmount);
      }
      if (annualInterestRate !== undefined) {
        updates.push('annual_interest_rate = ?');
        params.push(annualInterestRate);
      }
      if (repaymentPeriod !== undefined) {
        updates.push('repayment_period = ?');
        params.push(repaymentPeriod);
      }
      if (repaymentStartDate !== undefined) {
        updates.push('repayment_start_date = ?');
        params.push(repaymentStartDate);
      }
      if (repaymentEndDate !== undefined) {
        updates.push('repayment_end_date = ?');
        params.push(repaymentEndDate);
      }
      if (monthlyPayment !== undefined) {
        updates.push('monthly_payment = ?');
        params.push(monthlyPayment);
      }
      if (repaymentAccountName !== undefined) {
        updates.push('repayment_account_name = ?');
        params.push(repaymentAccountName);
      }
      if (repaymentAccountNumber !== undefined) {
        updates.push('repayment_account_number = ?');
        params.push(repaymentAccountNumber);
      }
      if (repaymentBank !== undefined) {
        updates.push('repayment_bank = ?');
        params.push(repaymentBank);
      }
      if (warrantyPeriod !== undefined) {
        updates.push('warranty_period = ?');
        params.push(warrantyPeriod);
      }
      if (warrantyExpiryDate) {
        updates.push('warranty_expiry_date = ?');
        params.push(warrantyExpiryDate);
      }
      if (attachments !== undefined) {
        updates.push('attachments = ?');
        params.push(JSON.stringify(attachments));
      }
      if (remark !== undefined) {
        updates.push('remark = ?');
        params.push(remark);
      }

      updates.push('total_amount = ?', 'tax_amount = ?', 'total_with_tax = ?', 'updated_by = ?');
      params.push(totalAmount, taxAmount, totalWithTax, userId, id, companyId);

      if (updates.length > 0) {
        await connection.query(
          `UPDATE equipment_purchases SET ${updates.join(', ')} WHERE id = ? AND company_id = ?`,
          params
        );
      }

      // 更新明细：删除旧的，插入新的
      if (items && items.length > 0) {
        await connection.query('DELETE FROM purchase_items WHERE purchase_id = ?', [id]);

        for (const item of items) {
          // 插入采购明细（注意：purchase_items表中没有drive_type字段）
          await connection.query(
            `INSERT INTO purchase_items (
              purchase_id, equipment_category, equipment_type, equipment_model, equipment_height,
              quantity, unit_price, subtotal
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id, item.equipmentCategory, item.equipmentType, item.equipmentModel, item.equipmentHeight || null,
              item.quantity, item.unitPrice, item.subtotal
            ]
          );

          // 如果填写了型号和高度，自动创建型号记录（如果不存在）
          if (item.equipmentModel && item.equipmentHeight) {
            // 检查型号是否已存在
            const [[existingModel]] = await connection.query(
              `SELECT id FROM equipment_models 
               WHERE model = ? AND type = ? AND height = ? AND is_deleted = FALSE
               LIMIT 1`,
              [item.equipmentModel, item.equipmentType, item.equipmentHeight]
            );

            // 如果不存在，则创建新型号
            if (!existingModel) {
              await connection.query(
                `INSERT INTO equipment_models (
                  category, brand, model, type, height, drive_type
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  item.equipmentCategory || '未分类',
                  finalBrand,
                  item.equipmentModel,
                  item.equipmentType,
                  item.equipmentHeight,
                  item.driveType || '未知'
                ]
              );
              console.log(`✅ 自动创建型号: ${item.equipmentType} - ${item.equipmentModel} (${item.equipmentHeight}m, ${item.driveType || '未知'})`);
            }
          }
        }
      }

      await connection.commit();

      res.json({ ok: true });
    } catch (error) {
      await connection.rollback();
      console.error('更新采购记录失败:', error);
      res.json({ ok: false, error: error.message });
    } finally {
      connection.release();
    }
  });

  // 删除采购记录（软删除）
  router.delete('/:id', tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;

      // ✅ 多租户过滤
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;

      // 软删除采购记录
      await pool.query(
        `UPDATE equipment_purchases 
         SET is_deleted = TRUE, deleted_at = NOW() 
         WHERE id = ? AND ${tenantWhere}`,
        [id, ...tenantParams]
      );

      res.json({ ok: true });
    } catch (error) {
      console.error('删除采购记录失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // 获取统计数据
  router.get('/stats/summary', tenantMiddleware, async (req, res) => {
    try {
      // ✅ 多租户过滤
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;

      // 查询统计数据
      const query = `SELECT 
        SUM(total_purchases) as totalPurchases,
        SUM(total_quantity) as totalQuantity,
        SUM(total_amount) as totalAmount,
        SUM(total_with_tax) as totalWithTax,
        SUM(cash_amount) as cashAmount,
        SUM(financing_amount) as financingAmount
      FROM v_purchase_statistics
      WHERE ${tenantWhere}`;
      
      const [[stats]] = await pool.query(query, tenantParams);

      res.json({
        ok: true,
        data: stats || {
          totalPurchases: 0,
          totalQuantity: 0,
          totalAmount: 0,
          totalWithTax: 0,
          cashAmount: 0,
          financingAmount: 0,
          manufacturerCount: 0
        }
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // 获取当月应还款统计
  router.get('/repayments/monthly-summary', tenantMiddleware, async (req, res) => {
    try {
      const year = req.query.year || new Date().getFullYear();
      const month = req.query.month || new Date().getMonth() + 1;

      // 计算当月应还款总额（从采购单计算，单租户模式）
      const [monthlyPayments] = await pool.query(
        `SELECT 
          SUM(monthly_payment) as total_monthly_payment,
          COUNT(*) as active_purchases
         FROM equipment_purchases
         WHERE is_deleted = FALSE
         AND purchase_type IN ('installment', 'financing')
         AND monthly_payment > 0
         AND repayment_start_date <= LAST_DAY(DATE(CONCAT(?, '-', ?, '-01')))
         AND (repayment_end_date IS NULL OR repayment_end_date >= DATE(CONCAT(?, '-', ?, '-01')))`,
        [year, month, year, month]
      );

      // 获取当月实际还款记录
      const [repaymentRecords] = await pool.query(
        `SELECT 
          COUNT(*) as paid_count,
          SUM(actual_amount) as total_paid
         FROM purchase_repayments
         WHERE repayment_year = ?
         AND repayment_month = ?
         AND is_paid = TRUE`,
        [year, month]
      );

      res.json({
        ok: true,
        data: {
          year: parseInt(year),
          month: parseInt(month),
          totalScheduled: Number(monthlyPayments[0]?.total_monthly_payment || 0),
          activePurchases: monthlyPayments[0]?.active_purchases || 0,
          totalPaid: Number(repaymentRecords[0]?.total_paid || 0),
          paidCount: repaymentRecords[0]?.paid_count || 0,
          remaining: Number(monthlyPayments[0]?.total_monthly_payment || 0) - Number(repaymentRecords[0]?.total_paid || 0)
        }
      });
    } catch (error) {
      console.error('获取月度还款统计失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // 记录还款
  router.post('/:id/repayment', tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { year, month, actualAmount, repaymentDate, remark } = req.body;
      const userId = req.user?.id;

      if (!year || !month || !actualAmount) {
        return res.json({ ok: false, error: '缺少必填字段' });
      }

      // ✅ 多租户过滤
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;

      // 查询采购记录
      const [[purchase]] = await pool.query(
        `SELECT id, company_id, monthly_payment FROM equipment_purchases WHERE id = ? AND is_deleted = FALSE AND ${tenantWhere}`,
        [id, ...tenantParams]
      );

      if (!purchase) {
        return res.json({ ok: false, error: '采购记录不存在' });
      }

      // 插入或更新还款记录
      await pool.query(
        `INSERT INTO purchase_repayments 
          (purchase_id, company_id, repayment_year, repayment_month, scheduled_amount, actual_amount, repayment_date, is_paid, remark, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          actual_amount = VALUES(actual_amount),
          repayment_date = VALUES(repayment_date),
          is_paid = TRUE,
          remark = VALUES(remark),
          updated_by = VALUES(updated_by),
          updated_at = CURRENT_TIMESTAMP`,
        [id, purchase.company_id, year, month, purchase.monthly_payment || 0, actualAmount, repaymentDate || new Date().toISOString().split('T')[0], remark, userId, userId]
      );

      res.json({ ok: true, message: '还款记录成功' });
    } catch (error) {
      console.error('记录还款失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // 获取采购单的还款记录列表
  router.get('/:id/repayments', tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;

      // ✅ 多租户过滤
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;

      // 查询采购记录
      const [[purchase]] = await pool.query(
        `SELECT id, company_id FROM equipment_purchases WHERE id = ? AND is_deleted = FALSE AND ${tenantWhere}`,
        [id, ...tenantParams]
      );

      if (!purchase) {
        return res.json({ ok: false, error: '采购记录不存在' });
      }

      // 查询还款记录
      const [repayments] = await pool.query(
        `SELECT 
          pr.*,
          u1.name AS creator_name,
          u2.name AS updater_name
         FROM purchase_repayments pr
         LEFT JOIN users u1 ON pr.created_by = u1.id
         LEFT JOIN users u2 ON pr.updated_by = u2.id
         WHERE pr.purchase_id = ?
         ORDER BY pr.repayment_year DESC, pr.repayment_month DESC`,
        [id]
      );

      res.json({ ok: true, data: repayments });
    } catch (error) {
      console.error('获取还款记录失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // 获取厂家列表（用于下拉选择）
  router.get('/manufacturers/list', tenantMiddleware, async (req, res) => {
    try {
      // 单租户模式：返回所有厂家列表
      const query = `SELECT DISTINCT manufacturer_name 
                     FROM equipment_purchases 
                     WHERE is_deleted = FALSE 
                     ORDER BY manufacturer_name`;
      
      const [manufacturers] = await pool.query(query);

      res.json({
        ok: true,
        data: manufacturers.map(m => m.manufacturer_name)
      });
    } catch (error) {
      console.error('获取厂家列表失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  return router;
}

export default buildEquipmentPurchasesRouter;
