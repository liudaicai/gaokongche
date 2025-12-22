import React, { useEffect, useMemo } from 'react';
import { Modal, Form, Input, Select, Radio, Button, message } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../app/store';
import { createRepair } from '../../repairs/repairsSlice';
import { fetchEmployees } from '../../employees/employeesSlice';

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

    useEffect(() => {
        if (open) {
            dispatch(fetchEmployees({}));
            // Initialize form values
            if (order) {
                form.setFieldsValue({
                    contactName: order.customerContact,
                    contactPhone: order.customerPhone,
                    isVideoDiagnosis: false,
                });
            }
        } else {
            form.resetFields();
        }
    }, [open, order, dispatch, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            // Find selected equipment to get ID
            const selectedEquipment = order.equipmentItems?.find(
                (item: any) => item.equipmentCode === values.equipmentCode
            );

            const payload = {
                equipmentCode: values.equipmentCode,
                equipmentId: selectedEquipment?.equipmentId || selectedEquipment?.id, // Try to find ID
                orderId: order.id,
                damageDescription: values.damageDescription,
                repairPerson: values.repairPerson,
                isVideoDiagnosis: values.isVideoDiagnosis,
                contactName: values.contactName,
                contactPhone: values.contactPhone,
                repairStartDate: new Date().toISOString().slice(0, 10), // Default to today?
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

    // Filter equipment items (assuming standard structure)
    const equipmentOptions = useMemo(() => {
        if (!order || !order.equipmentItems) return [];
        return order.equipmentItems.map((item: any) => ({
            label: `${item.equipmentCode || item.code} (${item.specification || item.model})`,
            value: item.equipmentCode
        }));
    }, [order]);

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
                <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
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
                    <Select placeholder="选择订单下的在租设备" options={equipmentOptions} />
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
