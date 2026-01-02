import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, Select, Radio, Button, message } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../app/store';
import { createRepair } from '../../repairs/repairsSlice';
import { fetchEmployees } from '../../employees/employeesSlice';
import { fetchOrderById } from '../../orders/ordersSlice';

interface OrderRepairModalProps {
    open: boolean;
    onCancel: () => void;
    order: any; // Using any for flexibility, realistically strictly typed Order
}

const OrderRepairModal: React.FC<OrderRepairModalProps> = ({ open, onCancel, order }) => {
    const dispatch = useDispatch<AppDispatch>();
    const [form] = Form.useForm();
    const employees = useSelector((state: RootState) => state.employees?.employees || []); // Safe access
    const loading = useSelector((state: RootState) => state.repairs.loading);
    const [fullOrder, setFullOrder] = useState<any>(null);
    const [loadingOrder, setLoadingOrder] = useState(false);
    
    // 使用完整订单数据（如果已加载）或原始order
    const effectiveOrder = fullOrder || order;

    useEffect(() => {
        if (open && order) {
            dispatch(fetchEmployees({}));
            
            // 检查是否缺少entries数据，如果缺少则加载完整订单详情
            if (!order.entries || order.entries.length === 0) {
                setLoadingOrder(true);
                dispatch(fetchOrderById(order.id))
                    .unwrap()
                    .then((fullOrderData) => {
                        setFullOrder(fullOrderData);
                        setLoadingOrder(false);
                    })
                    .catch((error) => {
                        setLoadingOrder(false);
                        message.error('加载订单详情失败');
                    });
            } else {
                // 如果已有entries数据，直接使用
                setFullOrder(order);
            }
            
            // Initialize form values
            form.setFieldsValue({
                contactName: order.customerContact,
                contactPhone: order.customerPhone,
                isVideoDiagnosis: false,
            });
        } else {
            form.resetFields();
            setFullOrder(null);
        }
    }, [open, order, dispatch, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            // 从进场记录中查找选中的设备详情
            let selectedEquipmentDetail: any = null;
            (effectiveOrder?.entries || []).forEach((entry: any) => {
                if (entry.equipmentDetails && Array.isArray(entry.equipmentDetails)) {
                    const found = entry.equipmentDetails.find(
                        (detail: any) => detail.code === values.equipmentCode
                    );
                    if (found) {
                        selectedEquipmentDetail = found;
                    }
                }
            });

            const payload = {
                equipmentCode: values.equipmentCode,
                equipmentId: selectedEquipmentDetail?.equipmentId || selectedEquipmentDetail?.id,
                orderId: effectiveOrder?.id || order?.id,
                damageDescription: values.damageDescription,
                repairPerson: values.repairPerson,
                isVideoDiagnosis: values.isVideoDiagnosis,
                contactName: values.contactName,
                contactPhone: values.contactPhone,
                repairStartDate: new Date().toISOString().slice(0, 10), // Default to today
                status: 'pending' as const
            };

            await dispatch(createRepair(payload)).unwrap();
            message.success('报修单已创建');
            onCancel();
        } catch (error: any) {
            if (error?.errorFields) {
                // Form validation error, ignore
            } else {
                message.error(error.message || '创建失败');
            }
        }
    };

    // 从进场记录中获取已进场的设备列表
    const equipmentOptions = useMemo(() => {
        if (!effectiveOrder || !effectiveOrder.entries) {
            return [];
        }
        
        // 收集所有进场记录中的设备详情
        const allEquipment: any[] = [];
        (effectiveOrder.entries || []).forEach((entry: any) => {
            if (entry.equipmentDetails && Array.isArray(entry.equipmentDetails)) {
                entry.equipmentDetails.forEach((detail: any) => {
                    // 检查该设备是否已退场
                    const code = detail.code || '';
                    const hasExited = (effectiveOrder.exits || []).some((exit: any) => 
                        (exit.equipmentCodes || []).includes(code)
                    );
                    
                    // 只添加未退场的设备
                    if (!hasExited && code) {
                        allEquipment.push({
                            code: code,
                            customCode: detail.customCode || '',
                            type: detail.type || '',
                            model: detail.model || '',
                            brand: detail.brand || '',
                            height: detail.height || ''
                        });
                    }
                });
            }
        });
        
        // 生成下拉选项
        return allEquipment.map((eq) => {
            const displayCode = eq.customCode || eq.code;
            const displaySpec = [eq.brand, eq.type, eq.model, eq.height]
                .filter(Boolean)
                .join(' ');
            return {
                label: `${displayCode}${displaySpec ? ` (${displaySpec})` : ''}`,
                value: eq.code
            };
        });
    }, [effectiveOrder]);

    const employeeOptions = useMemo(() => {
        return employees.map((emp: any) => ({
            label: emp.name,
            value: emp.name // Storing name as per request "repairPerson" VARCHAR
        }));
    }, [employees]);

    return (
        <Modal
            title="订单报修"
            open={open}
            onCancel={onCancel}
            footer={[
                <Button key="cancel" onClick={onCancel}>取消</Button>,
                <Button key="submit" type="primary" loading={loading || loadingOrder} onClick={handleSubmit} disabled={loadingOrder}>
                    提交
                </Button>
            ]}
        >
            <Form form={form} layout="vertical">
                <Form.Item label="维修单号">
                    <Input disabled placeholder="系统自动生成" />
                </Form.Item>

                <Form.Item
                    name="equipmentCode"
                    label="报修设备"
                    rules={[{ required: true, message: '请选择报修设备' }]}
                >
                    <Select 
                        placeholder={loadingOrder ? "正在加载设备列表..." : "选择订单下的在租设备"} 
                        options={equipmentOptions}
                        loading={loadingOrder}
                        disabled={loadingOrder}
                    />
                </Form.Item>

                <Form.Item
                    name="isVideoDiagnosis"
                    label="是否视频判断问题"
                    rules={[{ required: true }]}
                >
                    <Radio.Group>
                        <Radio value={true}>是</Radio>
                        <Radio value={false}>否</Radio>
                    </Radio.Group>
                </Form.Item>

                <Form.Item
                    name="damageDescription"
                    label="故障现象"
                    rules={[{ required: true, message: '请填写故障现象' }]}
                >
                    <Input.TextArea rows={4} placeholder="描述故障情况..." />
                </Form.Item>

                <Form.Item label="联系信息" style={{ marginBottom: 0 }}>
                    <Form.Item
                        name="contactName"
                        rules={[{ required: true, message: '请填写联系人' }]}
                        style={{ display: 'inline-block', width: 'calc(50% - 8px)' }}
                    >
                        <Input placeholder="联系人" />
                    </Form.Item>
                    <Form.Item
                        name="contactPhone"
                        rules={[{ required: true, message: '请填写联系电话' }]}
                        style={{ display: 'inline-block', width: 'calc(50% - 8px)', margin: '0 0 0 16px' }}
                    >
                        <Input placeholder="联系电话" />
                    </Form.Item>
                </Form.Item>

                <Form.Item name="repairPerson" label="维修人员">
                    <Select
                        placeholder="选择维修员工"
                        options={employeeOptions}
                        showSearch
                        optionFilterProp="label"
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default OrderRepairModal;
