/**
 * 工作流集成助手
 * 提供便捷的方法在业务模块中启动和管理工作流
 */

import { store } from '../../app/store';
import { startWorkflow } from './workflowsSlice';
import type { StartWorkflowForm, BusinessType } from './types';

/**
 * 启动订单审批流程
 */
export const startOrderWorkflow = async (orderId: number, orderNo: string, title: string) => {
  return store.dispatch(
    startWorkflow({
      workflowDefinitionId: 1, // ORDER_RENTAL_FLOW
      businessType: 'order' as BusinessType,
      businessId: orderId,
      businessNo: orderNo,
      title: title || `订单审批 - ${orderNo}`,
      priority: 'normal',
    })
  );
};

/**
 * 启动采购审批流程
 */
export const startPurchaseWorkflow = async (
  purchaseId: number,
  purchaseNo: string,
  title: string
) => {
  return store.dispatch(
    startWorkflow({
      workflowDefinitionId: 2, // PURCHASE_APPROVAL_FLOW
      businessType: 'purchase' as BusinessType,
      businessId: purchaseId,
      businessNo: purchaseNo,
      title: title || `采购审批 - ${purchaseNo}`,
      priority: 'normal',
    })
  );
};

/**
 * 启动维修服务流程
 */
export const startRepairWorkflow = async (
  repairId: number,
  repairNo: string,
  title: string
) => {
  return store.dispatch(
    startWorkflow({
      workflowDefinitionId: 3, // REPAIR_SERVICE_FLOW
      businessType: 'repair' as BusinessType,
      businessId: repairId,
      businessNo: repairNo,
      title: title || `维修服务 - ${repairNo}`,
      priority: 'high',
    })
  );
};

/**
 * 启动付款审批流程
 */
export const startPaymentWorkflow = async (
  paymentId: number,
  paymentNo: string,
  amount: number,
  title: string
) => {
  return store.dispatch(
    startWorkflow({
      workflowDefinitionId: 4, // PAYMENT_APPROVAL_FLOW
      businessType: 'payment' as BusinessType,
      businessId: paymentId,
      businessNo: paymentNo,
      title: title || `付款审批 - ${paymentNo}`,
      priority: amount > 100000 ? 'high' : 'normal', // 大额付款高优先级
      formData: {
        amount,
      },
    })
  );
};

/**
 * 启动客户服务流程
 */
export const startCustomerServiceWorkflow = async (
  serviceId: number,
  serviceNo: string,
  title: string
) => {
  return store.dispatch(
    startWorkflow({
      workflowDefinitionId: 5, // CUSTOMER_SERVICE_FLOW
      businessType: 'customer_service' as BusinessType,
      businessId: serviceId,
      businessNo: serviceNo,
      title: title || `客户服务 - ${serviceNo}`,
      priority: 'normal',
    })
  );
};

/**
 * 通用启动工作流方法
 */
export const startGenericWorkflow = async (params: StartWorkflowForm) => {
  return store.dispatch(startWorkflow(params));
};
