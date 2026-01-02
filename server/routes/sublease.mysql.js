/**
 * 转租管理路由（MySQL版）
 * 包含转租公司和转租设备管理
 */

import express from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';

export default function buildSubleaseRouter(pool) {
  const router = express.Router();

  // 字段映射辅助函数：snake_case -> camelCase
  const mapCompanyFields = (row) => ({
    id: row.id,
    companyName: row.company_name,
    contactPerson: row.contact_person,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    address: row.address,
    businessLicense: row.business_license,
    taxId: row.tax_id,
    bankName: row.bank_name,
    bankAccount: row.bank_account,
    creditRating: row.credit_rating,
    rentingCount: row.renting_count || 0,
    returnedCount: row.returned_count || 0,
    idleCount: row.idle_count || 0,
    totalPayable: parseFloat(row.total_payable) || 0,
    totalPaid: parseFloat(row.total_paid) || 0,
    outstandingAmount: parseFloat(row.outstanding_amount) || 0,
    remark: row.remark,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

  const mapEquipmentFields = (row) => ({
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    storeId: row.store_id,
    storeName: row.store_name,
    equipmentCode: row.equipment_code,
    factoryNumber: row.factory_number,
    category: row.category,
    equipmentType: row.equipment_type,
    model: row.model,
    brand: row.brand,
    height: row.height,
    dailyRate: parseFloat(row.daily_rate) || 0,
    monthlyRate: parseFloat(row.monthly_rate) || 0,
    deposit: parseFloat(row.deposit) || 0,
    startDate: row.start_date,
    endDate: row.end_date,
    actualReturnDate: row.actual_return_date,
    rentalDays: row.rental_days || 0,
    totalCost: parseFloat(row.total_cost) || 0,
    paidAmount: parseFloat(row.paid_amount) || 0,
    outstandingAmount: parseFloat(row.outstanding_amount) || 0,
    status: row.status,
    suspensionReason: row.suspension_reason,
    suspensionStartDate: row.suspension_start_date,
    suspensionEndDate: row.suspension_end_date,
    linkedOrderId: row.linked_order_id,
    linkedOrderNumber: row.linked_order_number,
    remark: row.remark,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

  // ==================== 转租公司管理 ====================

  /**
   * 获取转租公司列表
   * GET /api/sublease/companies
   */
  router.get('/companies', tenantMiddleware, async (req, res) => {
    try {
      const {
        page = 1,
        pageSize = 20,
        search = '',
        status = ''
      } = req.query;

      const offset = (Number(page) - 1) * Number(pageSize);
      const limit = Number(pageSize);

      // ✅ 多租户过滤 - 为 company_id 添加表前缀以避免歧义
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      // 为 company_id 添加表前缀 sc. 以避免 JOIN 时的歧义
      const tenantWhereWithPrefix = tenantWhere.replace('WHERE ', '').replace(/\bcompany_id\b/g, 'sc.company_id');
      let whereClauses = [tenantWhereWithPrefix];
      let queryParams = [...tenantParams];

      if (search) {
        whereClauses.push('(sc.company_name LIKE ? OR sc.contact_person LIKE ? OR sc.contact_phone LIKE ?)');
        queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (status) {
        whereClauses.push('sc.status = ?');
        queryParams.push(status);
      }

      const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

      // 查询总数
      const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM sublease_companies sc ${whereSQL}`,
        queryParams
      );
      const total = countRows[0].total;

      // 查询列表（包含统计数据）
      const [rows] = await pool.query(
        `SELECT 
          sc.*,
          COUNT(CASE WHEN se.status = 'renting' THEN 1 END) as renting_count,
          COUNT(CASE WHEN se.status = 'returned' THEN 1 END) as returned_count,
          COUNT(CASE WHEN se.status = 'idle' THEN 1 END) as idle_count,
          COALESCE(SUM(se.total_cost), 0) as total_payable,
          COALESCE(SUM(se.paid_amount), 0) as total_paid,
          COALESCE(SUM(se.outstanding_amount), 0) as outstanding_amount
         FROM sublease_companies sc
         LEFT JOIN sublease_equipments se ON sc.id = se.company_id
         ${whereSQL}
         GROUP BY sc.id
         ORDER BY sc.created_at DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
      );

      // 应用字段映射
      const mappedData = rows.map(mapCompanyFields);

      res.json({
        ok: true,
        data: mappedData,
        page: Number(page),
        pageSize: limit,
        total
      });
    } catch (error) {
      console.error('[Sublease.GET/companies] Error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * 获取单个转租公司详情
   * GET /api/sublease/companies/:id
   */
  router.get('/companies/:id', tenantMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);

      // ✅ 多租户过滤
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      const [rows] = await pool.query(
        `SELECT sc.*,
          COUNT(CASE WHEN se.status = 'renting' THEN 1 END) as renting_count,
          COUNT(CASE WHEN se.status = 'returned' THEN 1 END) as returned_count,
          COUNT(CASE WHEN se.status = 'idle' THEN 1 END) as idle_count,
          COALESCE(SUM(se.total_cost), 0) as total_payable,
          COALESCE(SUM(se.paid_amount), 0) as total_paid,
          COALESCE(SUM(se.outstanding_amount), 0) as outstanding_amount
         FROM sublease_companies sc
         LEFT JOIN sublease_equipments se ON sc.id = se.company_id
         WHERE sc.id = ? AND ${tenantWhere}
         GROUP BY sc.id`,
        [id, ...tenantParams]
      );

      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: '公司不存在' });
      }

      // 字段映射：snake_case -> camelCase
      // 应用字段映射
      const mappedData = mapCompanyFields(rows[0]);

      res.json({ ok: true, data: mappedData });
    } catch (error) {
      console.error('[Sublease.GET/companies/:id] Error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * 创建转租公司
   * POST /api/sublease/companies
   */
  router.post('/companies', tenantMiddleware, async (req, res) => {
    try {
      const {
        companyName,
        contactPerson,
        contactPhone,
        address
      } = req.body;

      if (!companyName) {
        return res.status(400).json({ ok: false, error: '公司名称为必填项' });
      }

      // ✅ 从当前用户获取 company_id（多租户隔离）
      const companyId = req.user.company_id;

      const [result] = await pool.query(
        `INSERT INTO sublease_companies (
          company_id, company_name, contact_person, contact_phone, address, created_by
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          companyId, companyName, contactPerson, contactPhone, address, req.user.id
        ]
      );

      res.json({
        ok: true,
        data: { id: result.insertId },
        message: '转租公司创建成功'
      });
    } catch (error) {
      console.error('[Sublease.POST/companies] Error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * 更新转租公司
   * PUT /api/sublease/companies/:id
   */
  router.put('/companies/:id', tenantMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updates = req.body;

      const fields = [];
      const values = [];

      const fieldMap = {
        companyName: 'company_name',
        contactPerson: 'contact_person',
        contactPhone: 'contact_phone',
        address: 'address',
        status: 'status'
      };

      Object.keys(updates).forEach(key => {
        if (fieldMap[key]) {
          fields.push(`${fieldMap[key]} = ?`);
          values.push(updates[key]);
        }
      });

      if (fields.length === 0) {
        return res.status(400).json({ ok: false, error: '没有要更新的字段' });
      }

      // ✅ 多租户过滤：更新时包含租户条件
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      values.push(id);
      values.push(...tenantParams);
      await pool.query(
        `UPDATE sublease_companies SET ${fields.join(', ')} WHERE id = ? AND ${tenantWhere}`,
        values
      );

      res.json({ ok: true, message: '更新成功' });
    } catch (error) {
      console.error('[Sublease.PUT/companies/:id] Error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * 删除转租公司
   * DELETE /api/sublease/companies/:id
   */
  router.delete('/companies/:id', tenantMiddleware, async (req, res) => {
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();
      
      const id = Number(req.params.id);

      // ✅ 多租户过滤：先检查公司是否属于当前租户
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      const [existing] = await conn.query(
        `SELECT id FROM sublease_companies WHERE id = ? AND ${tenantWhere}`,
        [id, ...tenantParams]
      );

      if (existing.length === 0) {
        await conn.rollback();
        return res.status(404).json({ ok: false, error: '转租公司不存在或无权访问' });
      }

      // 查询关联设备数量（用于返回消息）
      const [equipments] = await conn.query(
        'SELECT COUNT(*) as count FROM sublease_equipments WHERE company_id = ?',
        [id]
      );
      
      const equipmentCount = equipments[0].count;

      // 级联删除：先删除关联的转租设备
      if (equipmentCount > 0) {
        await conn.query('DELETE FROM sublease_equipments WHERE company_id = ?', [id]);
      }

      // 删除公司记录（包含租户条件）
      await conn.query(
        `DELETE FROM sublease_companies WHERE id = ? AND ${tenantWhere}`,
        [id, ...tenantParams]
      );

      await conn.commit();

      res.json({ 
        ok: true, 
        message: equipmentCount > 0 
          ? `删除成功，同时删除了 ${equipmentCount} 台关联设备` 
          : '删除成功' 
      });
    } catch (error) {
      await conn.rollback();
      console.error('[Sublease.DELETE/companies/:id] Error:', error);
      res.status(500).json({ ok: false, error: error.message });
    } finally {
      conn.release();
    }
  });

  // ==================== 转租设备管理 ====================

  /**
   * 获取转租设备列表
   * GET /api/sublease/equipments
   */
  router.get('/equipments', tenantMiddleware, async (req, res) => {
    try {
      const {
        page = 1,
        pageSize = 20,
        companyId = '',
        status = '',
        search = ''
      } = req.query;

      const offset = (Number(page) - 1) * Number(pageSize);
      const limit = Number(pageSize);

      // ✅ 多租户过滤
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      const tenantWhereClean = tenantWhere.replace('WHERE ', '').replace(/\bcompany_id\b/g, 'tenant_company_id');
      let whereClauses = [tenantWhereClean];
      let queryParams = [...tenantParams];

      if (companyId) {
        whereClauses.push('company_id = ?');
        queryParams.push(Number(companyId));
      }

      if (status) {
        whereClauses.push('status = ?');
        queryParams.push(status);
      }

      if (search) {
        whereClauses.push('(equipment_code LIKE ? OR factory_number LIKE ? OR company_name LIKE ?)');
        queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

      // 查询总数
      const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM sublease_equipments ${whereSQL}`,
        queryParams
      );
      const total = countRows[0].total;

      // 查询列表
      const [rows] = await pool.query(
        `SELECT * FROM sublease_equipments
         ${whereSQL}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
      );

      // 应用字段映射
      const mappedData = rows.map(mapEquipmentFields);

      res.json({
        ok: true,
        data: mappedData,
        page: Number(page),
        pageSize: limit,
        total
      });
    } catch (error) {
      console.error('[Sublease.GET/equipments] Error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * 创建转租设备
   * POST /api/sublease/equipments
   */
  router.post('/equipments', tenantMiddleware, async (req, res) => {
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();

      const {
        companyId,
        companyName,
        storeId,
        storeName,
        equipmentCode,
        factoryNumber,
        category,
        equipmentType,
        model,
        brand,
        height,
        dailyRate,
        monthlyRate,
        deposit,
        startDate,
        endDate,
        linkedOrderId,
        linkedOrderNumber,
        remark,
        logisticsInfo
      } = req.body;

      console.log('[Sublease.POST/equipments] 接收到的数据:', {
        companyId, companyName, storeId, storeName,
        equipmentCode, factoryNumber, category, equipmentType,
        hasLogisticsInfo: !!logisticsInfo,
        transportFee: logisticsInfo?.transportFee
      });

      if (!companyId || !category || !equipmentType || !storeId) {
        await conn.rollback();
        return res.status(400).json({ ok: false, error: '公司、类别、类型、门店为必填项' });
      }

      // 计算租赁天数和成本
      let rentalDays = 0;
      let totalCost = 0;
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        rentalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        // 计算成本（使用租金计算逻辑）
        const daily = Number(dailyRate) || 0;
        const monthly = Number(monthlyRate) || 0;
        if (daily * rentalDays > monthly && monthly > 0) {
          if (rentalDays <= 30) {
            totalCost = monthly;
          } else {
            totalCost = monthly + (monthly / 30) * (rentalDays - 30);
          }
        } else {
          totalCost = daily * rentalDays;
        }
      }

      // ✅ 从当前用户获取 tenant_company_id（多租户隔离）
      const tenantCompanyId = req.user.company_id;

      // 1. 在转租设备表中创建记录
      console.log('[Sublease.POST/equipments] 步骤1: 插入转租设备表');
      const [result] = await conn.query(
        `INSERT INTO sublease_equipments (
          tenant_company_id, company_id, company_name, store_id, store_name,
          equipment_code, factory_number,
          category, equipment_type, model, brand, height,
          daily_rate, monthly_rate, deposit,
          start_date, end_date, rental_days, total_cost, outstanding_amount,
          status, linked_order_id, linked_order_number, remark, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantCompanyId, companyId, companyName, storeId, storeName,
          equipmentCode, factoryNumber,
          category, equipmentType, model, brand, height,
          dailyRate || 0, monthlyRate || 0, deposit || 0,
          startDate, endDate, rentalDays, totalCost, totalCost,
          startDate ? 'renting' : 'idle',
          linkedOrderId, linkedOrderNumber, remark, req.user.id
        ]
      );
      console.log('[Sublease.POST/equipments] 步骤1完成, ID:', result.insertId);

      // 2. 同时在设备档案表（equipments）中创建设备记录
      console.log('[Sublease.POST/equipments] 步骤2: 插入设备档案表');
      await conn.query(
        `INSERT INTO equipments (
          code, custom_code, category, type, brand, model, height,
          source, warehouse, store_id, company_id,
          purchase_date,
          status, rental_status, operation_status, working_hours,
          created_at, updated_at, is_deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'sublease', ?, ?, ?, ?, 'normal', 'idle', 'normal', 0, NOW(3), NOW(3), 0)`,
        [
          factoryNumber, // code 使用出厂编号
          equipmentCode, // custom_code 使用自编号
          category,
          equipmentType, // type
          brand || '',
          model || '',
          height || '',
          storeName || '', // warehouse
          storeId, // store_id
          null, // company_id 已移除
          startDate // purchase_date 使用起租日期
        ]
      );
      console.log('[Sublease.POST/equipments] 步骤2完成');

      // 3. 更新公司统计
      console.log('[Sublease.POST/equipments] 步骤3: 更新公司统计');
      await conn.query(
        `UPDATE sublease_companies 
         SET renting_count = renting_count + 1,
             total_payable = total_payable + ?,
             outstanding_amount = outstanding_amount + ?
         WHERE id = ?`,
        [totalCost, totalCost, companyId]
      );
      console.log('[Sublease.POST/equipments] 步骤3完成');

      // 4. 如果有物流信息且运费大于0，创建物流台账记录
      console.log('[Sublease.POST/equipments] 步骤4: 检查物流信息', {
        hasLogisticsInfo: !!logisticsInfo,
        transportFee: logisticsInfo?.transportFee
      });
      
      if (logisticsInfo && Number(logisticsInfo.transportFee) > 0) {
        console.log('[Sublease.POST/equipments] 创建物流台账记录:', logisticsInfo);
        
        // 生成物流台账编号 LG + 日期 + 6位序号
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const ledgerNumber = `LG${dateStr}${String(result.insertId).padStart(6, '0')}`;
        
        // 根据运输方式确定物流类型
        let logisticsType = 'own';
        if (logisticsInfo.transportMethod === 'third') {
          logisticsType = 'third';
        } else if (logisticsInfo.transportMethod === 'company') {
          logisticsType = 'third'; // 转租公司运输也算第三方
        }
        
        await conn.query(
          `INSERT INTO logistics_ledger (
            ledger_number, order_id, order_number,
            logistics_type, transport_type, transport_date, record_type,
            store_id, store_name,
            logistics_cost, record_date,
            vehicle_id, vehicle_plate,
            driver_id, driver_name, driver_phone,
            company_id, company_name,
            company_contact_name, company_contact_phone,
            remark, created_at, updated_at
          ) VALUES (?, NULL, ?, ?, '进场', ?, '转租', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '转租设备物流', NOW(3), NOW(3))`,
          [
            ledgerNumber,
            `SUBLEASE-${result.insertId}`, // 使用转租设备ID作为订单号
            logisticsType,
            startDate, // transport_date 使用转租开始日期
            storeId,
            storeName,
            logisticsInfo.transportFee,
            startDate, // record_date 也使用转租开始日期
            logisticsInfo.vehicleId || null,
            logisticsInfo.vehiclePlate || null,
            logisticsInfo.driverId || null,
            logisticsInfo.driverName || null,
            logisticsInfo.driverPhone || null,
            logisticsInfo.companyId || null,
            logisticsInfo.companyName || null,
            logisticsInfo.companyContactName || null,
            logisticsInfo.companyContactPhone || null,
          ]
        );
        
        console.log('[Sublease.POST/equipments] 物流台账记录创建成功:', ledgerNumber);
      }

      await conn.commit();

      res.json({
        ok: true,
        data: { id: result.insertId },
        message: '转租设备创建成功' + (logisticsInfo && logisticsInfo.transportFee > 0 ? '，物流台账已生成' : '')
      });
    } catch (error) {
      await conn.rollback();
      console.error('[Sublease.POST/equipments] Error:', error);
      res.status(500).json({ ok: false, error: error.message });
    } finally {
      conn.release();
    }
  });

  /**
   * 通过出厂编号查询转租设备ID
   * GET /api/sublease/equipments/by-factory-number/:factoryNumber
   */
  router.get('/equipments/by-factory-number/:factoryNumber', tenantMiddleware, async (req, res) => {
    try {
      const factoryNumber = req.params.factoryNumber;
      
      const [equipments] = await pool.query(
        `SELECT id, company_id, company_name, factory_number, equipment_code, status
         FROM sublease_equipments 
         WHERE factory_number = ? AND status != 'returned'
         LIMIT 1`,
        [factoryNumber]
      );

      if (equipments.length === 0) {
        return res.json({ ok: true, data: null });
      }

      res.json({ ok: true, data: equipments[0] });
    } catch (error) {
      console.error('[Sublease.GET/equipments/by-factory-number] Error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * 还租设备
   * PUT /api/sublease/equipments/:id/return
   */
  router.put('/equipments/:id/return', tenantMiddleware, async (req, res) => {
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();

      const id = Number(req.params.id);
      const { returnDate, remark } = req.body;

      // 获取设备信息
      const [equipments] = await conn.query(
        'SELECT * FROM sublease_equipments WHERE id = ?',
        [id]
      );

      if (equipments.length === 0) {
        await conn.rollback();
        return res.status(404).json({ ok: false, error: '设备不存在' });
      }

      const equipment = equipments[0];

      // 1. 更新转租设备状态
      await conn.query(
        `UPDATE sublease_equipments 
         SET status = 'returned', actual_return_date = ?, remark = ?
         WHERE id = ?`,
        [returnDate, remark, id]
      );

      // 2. 从设备档案表中删除该设备（使用出厂编号匹配）
      if (equipment.factory_number) {
        await conn.query(
          `DELETE FROM equipments WHERE code = ? AND source = 'sublease'`,
          [equipment.factory_number]
        );
        console.log(`[Sublease.Return] Deleted equipment from equipments table: ${equipment.factory_number}`);
      }

      // 3. 更新公司统计
      await conn.query(
        `UPDATE sublease_companies 
         SET renting_count = renting_count - 1,
             returned_count = returned_count + 1
         WHERE id = ?`,
        [equipment.company_id]
      );

      await conn.commit();

      res.json({ ok: true, message: '还租成功，设备已从设备档案中移除' });
    } catch (error) {
      await conn.rollback();
      console.error('[Sublease.PUT/equipments/:id/return] Error:', error);
      res.status(500).json({ ok: false, error: error.message });
    } finally {
      conn.release();
    }
  });

  /**
   * 报停设备
   * PUT /api/sublease/equipments/:id/suspend
   */
  router.put('/equipments/:id/suspend', tenantMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { suspensionReason, suspensionStartDate, suspensionEndDate } = req.body;

      await pool.query(
        `UPDATE sublease_equipments 
         SET status = 'suspended',
             suspension_reason = ?,
             suspension_start_date = ?,
             suspension_end_date = ?
         WHERE id = ?`,
        [suspensionReason, suspensionStartDate, suspensionEndDate, id]
      );

      res.json({ ok: true, message: '报停成功' });
    } catch (error) {
      console.error('[Sublease.PUT/equipments/:id/suspend] Error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * 更新设备
   * PUT /api/sublease/equipments/:id
   */
  router.put('/equipments/:id', tenantMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updates = req.body;

      const fields = [];
      const values = [];

      const fieldMap = {
        equipmentCode: 'equipment_code',
        factoryNumber: 'factory_number',
        category: 'category',
        equipmentType: 'equipment_type',
        model: 'model',
        brand: 'brand',
        height: 'height',
        dailyRate: 'daily_rate',
        monthlyRate: 'monthly_rate',
        deposit: 'deposit',
        startDate: 'start_date',
        endDate: 'end_date',
        remark: 'remark'
      };

      Object.keys(updates).forEach(key => {
        if (fieldMap[key]) {
          fields.push(`${fieldMap[key]} = ?`);
          values.push(updates[key]);
        }
      });

      if (fields.length === 0) {
        return res.status(400).json({ ok: false, error: '没有要更新的字段' });
      }

      values.push(id);
      await pool.query(
        `UPDATE sublease_equipments SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      res.json({ ok: true, message: '更新成功' });
    } catch (error) {
      console.error('[Sublease.PUT/equipments/:id] Error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 付款记录 ====================

  /**
   * 创建付款记录
   * POST /api/sublease/payments
   */
  router.post('/payments', tenantMiddleware, async (req, res) => {
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();

      const {
        companyId,
        companyName,
        paymentDate,
        paymentAmount,
        paymentMethod,
        paymentAccount,
        relatedEquipmentIds,
        handlerName,
        remark
      } = req.body;

      // 生成付款单号
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const [maxRows] = await conn.query(
        `SELECT payment_number FROM sublease_payments 
         WHERE payment_number LIKE ? 
         ORDER BY payment_number DESC 
         LIMIT 1 FOR UPDATE`,
        [`FK${dateStr}%`]
      );
      
      let seq = 1;
      if (maxRows.length > 0 && maxRows[0].payment_number) {
        const lastNumber = maxRows[0].payment_number;
        const lastSeq = parseInt(lastNumber.substring(10)) || 0;
        seq = lastSeq + 1;
      }
      const paymentNumber = `FK${dateStr}${String(seq).padStart(3, '0')}`;

      // 插入付款记录
      await conn.query(
        `INSERT INTO sublease_payments (
          company_id, company_name, payment_number, payment_date,
          payment_amount, payment_method, payment_account,
          related_equipment_ids, handler_id, handler_name, remark, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId, companyName, paymentNumber, paymentDate,
          paymentAmount, paymentMethod, paymentAccount,
          JSON.stringify(relatedEquipmentIds || []),
          req.user.id, handlerName, remark, req.user.id
        ]
      );

      // 更新公司付款统计
      await conn.query(
        `UPDATE sublease_companies 
         SET total_paid = total_paid + ?,
             outstanding_amount = outstanding_amount - ?
         WHERE id = ?`,
        [paymentAmount, paymentAmount, companyId]
      );

      // 更新相关设备的付款金额
      if (relatedEquipmentIds && relatedEquipmentIds.length > 0) {
        const perEquipmentAmount = paymentAmount / relatedEquipmentIds.length;
        await conn.query(
          `UPDATE sublease_equipments 
           SET paid_amount = paid_amount + ?,
               outstanding_amount = outstanding_amount - ?
           WHERE id IN (?)`,
          [perEquipmentAmount, perEquipmentAmount, relatedEquipmentIds]
        );
      }

      await conn.commit();

      res.json({
        ok: true,
        data: { paymentNumber },
        message: '付款记录创建成功'
      });
    } catch (error) {
      await conn.rollback();
      console.error('[Sublease.POST/payments] Error:', error);
      res.status(500).json({ ok: false, error: error.message });
    } finally {
      conn.release();
    }
  });

  /**
   * 获取付款记录列表
   * GET /api/sublease/payments
   */
  router.get('/payments', tenantMiddleware, async (req, res) => {
    try {
      const { companyId } = req.query;

      let whereSQL = '';
      let queryParams = [];

      if (companyId) {
        whereSQL = 'WHERE company_id = ?';
        queryParams.push(Number(companyId));
      }

      const [rows] = await pool.query(
        `SELECT * FROM sublease_payments ${whereSQL} ORDER BY payment_date DESC`,
        queryParams
      );

      res.json({ ok: true, data: rows });
    } catch (error) {
      console.error('[Sublease.GET/payments] Error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 对账记录 ====================

  /**
   * 创建对账记录
   * POST /api/sublease/reconciliations
   */
  router.post('/reconciliations', tenantMiddleware, async (req, res) => {
    try {
      const {
        companyId,
        companyName,
        reconciliationDate,
        startDate,
        endDate,
        reconciliationAmount,
        relatedEquipmentIds,
        remark
      } = req.body;

      // 生成对账单号
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const [maxRows] = await pool.query(
        `SELECT reconciliation_number FROM sublease_reconciliations 
         WHERE reconciliation_number LIKE ? 
         ORDER BY reconciliation_number DESC 
         LIMIT 1 FOR UPDATE`,
        [`DZ${dateStr}%`]
      );
      
      let seq = 1;
      if (maxRows.length > 0 && maxRows[0].reconciliation_number) {
        const lastNumber = maxRows[0].reconciliation_number;
        const lastSeq = parseInt(lastNumber.substring(10)) || 0;
        seq = lastSeq + 1;
      }
      const reconciliationNumber = `DZ${dateStr}${String(seq).padStart(3, '0')}`;

      await pool.query(
        `INSERT INTO sublease_reconciliations (
          company_id, company_name, reconciliation_number, reconciliation_date,
          start_date, end_date, reconciliation_amount,
          related_equipment_ids, remark, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId, companyName, reconciliationNumber, reconciliationDate,
          startDate, endDate, reconciliationAmount,
          JSON.stringify(relatedEquipmentIds || []),
          remark, req.user.id
        ]
      );

      res.json({
        ok: true,
        data: { reconciliationNumber },
        message: '对账记录创建成功'
      });
    } catch (error) {
      console.error('[Sublease.POST/reconciliations] Error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * 获取对账记录列表
   * GET /api/sublease/reconciliations
   */
  router.get('/reconciliations', tenantMiddleware, async (req, res) => {
    try {
      const { companyId } = req.query;

      let whereSQL = '';
      let queryParams = [];

      if (companyId) {
        whereSQL = 'WHERE company_id = ?';
        queryParams.push(Number(companyId));
      }

      const [rows] = await pool.query(
        `SELECT * FROM sublease_reconciliations ${whereSQL} ORDER BY reconciliation_date DESC`,
        queryParams
      );

      res.json({ ok: true, data: rows });
    } catch (error) {
      console.error('[Sublease.GET/reconciliations] Error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

