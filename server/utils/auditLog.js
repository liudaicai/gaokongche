/**
 * 审计日志工具
 * 用于记录订单相关的操作日志
 */

/**
 * 创建审计日志记录
 * @param {Object} pool - MySQL连接池
 * @param {Object} params - 日志参数
 * @param {number} params.userId - 操作用户ID
 * @param {string} params.action - 操作类型 (create_entry, create_exit, create_receipt, etc.)
 * @param {string} params.resourceType - 资源类型 (order, equipment, etc.)
 * @param {number} params.resourceId - 资源ID
 * @param {Object} params.details - 详细信息
 */
export async function createAuditLog(pool, { userId, action, resourceType, resourceId, details = {} }) {
  try {
    const detailsJson = JSON.stringify(details);
    
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, NOW(3))`,
      [userId, action, resourceType, resourceId, detailsJson]
    );
    
    console.log(`[AuditLog] 记录操作日志: ${action} on ${resourceType}#${resourceId} by user#${userId}`);
  } catch (error) {
    // 日志记录失败不应该影响主要业务逻辑
    console.error('[AuditLog] 记录日志失败:', error.message);
  }
}

/**
 * 操作类型常量
 */
export const AuditAction = {
  // 订单操作
  CREATE_ORDER: 'create_order',
  UPDATE_ORDER: 'update_order',
  DELETE_ORDER: 'delete_order',
  
  // 进退场
  CREATE_ENTRY: 'create_entry',
  UPDATE_ENTRY: 'update_entry',
  DELETE_ENTRY: 'delete_entry',
  CREATE_EXIT: 'create_exit',
  UPDATE_EXIT: 'update_exit',
  DELETE_EXIT: 'delete_exit',
  
  // 收退款
  CREATE_RECEIPT: 'create_receipt',
  DELETE_RECEIPT: 'delete_receipt',
  CREATE_REFUND: 'create_refund',
  DELETE_REFUND: 'delete_refund',
  
  // 报停索赔
  CREATE_SUSPENSION: 'create_suspension',
  UPDATE_SUSPENSION: 'update_suspension',
  DELETE_SUSPENSION: 'delete_suspension',
  CREATE_CLAIM: 'create_claim',
  UPDATE_CLAIM: 'update_claim',
  DELETE_CLAIM: 'delete_claim',
  
  // 结算清款
  CREATE_SETTLEMENT: 'create_settlement',
  UPDATE_SETTLEMENT: 'update_settlement',
  DELETE_SETTLEMENT: 'delete_settlement',
  CREATE_CLEARANCE: 'create_clearance',
  DELETE_CLEARANCE: 'delete_clearance',
};

