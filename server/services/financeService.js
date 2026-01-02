/**
 * 财务记录服务
 * 统一管理收款和退款记录（使用合并后的 finance_records 表）
 */

class FinanceService {
  constructor(pool) {
    this.pool = pool;
  }
  /**
   * 获取收款记录列表
   * @param {number} orderId - 订单ID
   * @returns {Promise<Array>} 收款记录数组
   */
  async getReceipts(orderId) {
    const [rows] = await this.pool.query(
      `SELECT 
         id, 
         record_number, 
         order_id, 
         amount, 
         record_date as receipt_date,
         payment_method, 
         remark as receipt_notes, 
         attachments_json, 
         company_id,
         created_by,
         created_at, 
         updated_at
       FROM finance_records 
       WHERE order_id = ? AND record_type = 'receipt' 
       ORDER BY record_date DESC, id DESC`,
      [orderId]
    );
    return rows;
  }

  /**
   * 获取单条收款记录
   * @param {number} id - 记录ID
   * @param {number} orderId - 订单ID
   * @returns {Promise<Object|null>} 收款记录对象
   */
  async getReceiptById(id, orderId) {
    const [rows] = await this.pool.query(
      `SELECT 
         id, 
         record_number, 
         order_id, 
         amount, 
         record_date as receipt_date,
         payment_method, 
         remark as receipt_notes, 
         attachments_json, 
         company_id,
         created_by,
         created_at, 
         updated_at
       FROM finance_records 
       WHERE id = ? AND order_id = ? AND record_type = 'receipt'`,
      [id, orderId]
    );
    return rows[0] || null;
  }

  /**
   * 获取退款记录列表
   * @param {number} orderId - 订单ID
   * @returns {Promise<Array>} 退款记录数组
   */
  async getRefunds(orderId) {
    const [rows] = await this.pool.query(
      `SELECT 
         id, 
         record_number, 
         order_id, 
         amount, 
         record_date as refund_date,
         payment_method as refund_method, 
         remark as refund_reason, 
         attachments_json, 
         company_id,
         created_by,
         created_at, 
         updated_at
       FROM finance_records 
       WHERE order_id = ? AND record_type = 'refund' 
       ORDER BY record_date DESC, id DESC`,
      [orderId]
    );
    return rows;
  }

  /**
   * 获取单条退款记录
   * @param {number} id - 记录ID
   * @param {number} orderId - 订单ID
   * @returns {Promise<Object|null>} 退款记录对象
   */
  async getRefundById(id, orderId) {
    const [rows] = await this.pool.query(
      `SELECT 
         id, 
         record_number, 
         order_id, 
         amount, 
         record_date as refund_date,
         payment_method as refund_method, 
         remark as refund_reason, 
         attachments_json, 
         company_id,
         created_by,
         created_at, 
         updated_at
       FROM finance_records 
       WHERE id = ? AND order_id = ? AND record_type = 'refund'`,
      [id, orderId]
    );
    return rows[0] || null;
  }

  /**
   * 创建收款记录
   * @param {Object} data - 收款数据
   * @returns {Promise<number>} 新记录的ID
   */
  async createReceipt(data) {
    const { 
      orderId, 
      amount, 
      receiptDate, 
      paymentMethod = null, 
      notes = null, 
      attachments = null,
      companyId = null,
      createdBy = null
    } = data;
    
    const [result] = await this.pool.query(
      `INSERT INTO finance_records 
       (record_type, order_id, amount, record_date, payment_method, 
        remark, attachments_json, company_id, created_by, created_at, updated_at) 
       VALUES ('receipt', ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
      [
        orderId, 
        amount, 
        receiptDate, 
        paymentMethod, 
        notes, 
        attachments ? JSON.stringify(attachments) : null,
        companyId,
        createdBy
      ]
    );
    
    // 生成 record_number（如果没有自动生成）
    await this.pool.query(
      `UPDATE finance_records 
       SET record_number = CONCAT('REC-', LPAD(id, 8, '0')) 
       WHERE id = ? AND (record_number IS NULL OR record_number = '')`,
      [result.insertId]
    );
    
    return result.insertId;
  }

  /**
   * 创建退款记录
   * @param {Object} data - 退款数据
   * @returns {Promise<number>} 新记录的ID
   */
  async createRefund(data) {
    const { 
      orderId, 
      amount, 
      refundDate, 
      refundMethod = null, 
      reason = null, 
      attachments = null,
      companyId = null,
      createdBy = null
    } = data;
    
    const [result] = await this.pool.query(
      `INSERT INTO finance_records 
       (record_type, order_id, amount, record_date, payment_method, 
        remark, attachments_json, company_id, created_by, created_at, updated_at) 
       VALUES ('refund', ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
      [
        orderId, 
        amount, 
        refundDate, 
        refundMethod, 
        reason, 
        attachments ? JSON.stringify(attachments) : null,
        companyId,
        createdBy
      ]
    );
    
    // 生成 record_number（如果没有自动生成）
    await this.pool.query(
      `UPDATE finance_records 
       SET record_number = CONCAT('REF-', LPAD(id, 8, '0')) 
       WHERE id = ? AND (record_number IS NULL OR record_number = '')`,
      [result.insertId]
    );
    
    return result.insertId;
  }

  /**
   * 删除财务记录
   * @param {number} id - 记录ID
   * @param {number} orderId - 订单ID
   * @param {string} recordType - 记录类型 ('receipt' 或 'refund')
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deleteRecord(id, orderId, recordType = null) {
    const sql = recordType
      ? 'DELETE FROM finance_records WHERE id = ? AND order_id = ? AND record_type = ?'
      : 'DELETE FROM finance_records WHERE id = ? AND order_id = ?';
    
    const params = recordType ? [id, orderId, recordType] : [id, orderId];
    const [result] = await this.pool.query(sql, params);
    return result.affectedRows > 0;
  }

  /**
   * 删除订单的所有财务记录
   * @param {number} orderId - 订单ID
   * @returns {Promise<number>} 删除的记录数
   */
  async deleteAllByOrderId(orderId) {
    const [result] = await this.pool.query(
      'DELETE FROM finance_records WHERE order_id = ?',
      [orderId]
    );
    return result.affectedRows;
  }

  /**
   * 统计收款总额
   * @param {number} orderId - 订单ID
   * @returns {Promise<number>} 收款总额
   */
  async getReceiptSum(orderId) {
    const [rows] = await this.pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS sum 
       FROM finance_records 
       WHERE order_id = ? AND record_type = 'receipt'`,
      [orderId]
    );
    return parseFloat(rows[0].sum) || 0;
  }

  /**
   * 统计退款总额
   * @param {number} orderId - 订单ID
   * @returns {Promise<number>} 退款总额
   */
  async getRefundSum(orderId) {
    const [rows] = await this.pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS sum 
       FROM finance_records 
       WHERE order_id = ? AND record_type = 'refund'`,
      [orderId]
    );
    return parseFloat(rows[0].sum) || 0;
  }

  /**
   * 统计收款和退款数量
   * @param {number} orderId - 订单ID
   * @returns {Promise<Object>} { receiptCount, refundCount }
   */
  async getCounts(orderId) {
    const [receiptRows] = await this.pool.query(
      `SELECT COUNT(*) AS cnt FROM finance_records 
       WHERE order_id = ? AND record_type = 'receipt'`,
      [orderId]
    );
    
    const [refundRows] = await this.pool.query(
      `SELECT COUNT(*) AS cnt FROM finance_records 
       WHERE order_id = ? AND record_type = 'refund'`,
      [orderId]
    );
    
    return {
      receiptCount: receiptRows[0].cnt,
      refundCount: refundRows[0].cnt
    };
  }

  /**
   * 获取财务统计（用于仪表板）
   * @param {Object} filters - 筛选条件 { startDate, endDate, companyId }
   * @returns {Promise<Object>} 统计数据
   */
  async getStatistics(filters = {}) {
    const { startDate, endDate, companyId } = filters;
    
    let whereClause = '1=1';
    const params = [];
    
    if (startDate && endDate) {
      whereClause += ' AND record_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    if (companyId) {
      whereClause += ' AND company_id = ?';
      params.push(companyId);
    }
    
    const [rows] = await this.pool.query(
      `SELECT 
         record_type,
         COUNT(*) as count,
         COALESCE(SUM(amount), 0) as total_amount
       FROM finance_records
       WHERE ${whereClause}
       GROUP BY record_type`,
      params
    );
    
    const result = {
      receiptCount: 0,
      receiptTotal: 0,
      refundCount: 0,
      refundTotal: 0
    };
    
    rows.forEach(row => {
      if (row.record_type === 'receipt') {
        result.receiptCount = row.count;
        result.receiptTotal = parseFloat(row.total_amount) || 0;
      } else if (row.record_type === 'refund') {
        result.refundCount = row.count;
        result.refundTotal = parseFloat(row.total_amount) || 0;
      }
    });
    
    return result;
  }
}

export default FinanceService;
