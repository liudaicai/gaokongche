import React, { useEffect, useState } from 'react';
import { Modal, Form, InputNumber, Input, Tag, Space, App, Button } from 'antd';
import { SelectOutlined } from '@ant-design/icons';
import { useAppDispatch } from '../../app/hooks';
import { writeOffPart, fetchPendingWriteoffs, fetchParts } from './partsSlice';
import RepairSelectModal from './RepairSelectModal';
import type { PartTransaction } from './types';

const { TextArea } = Input;

interface EquipmentRepair {
  id: number;
  repairNumber: string;
  equipmentCode: string;
  equipmentId?: number;
}

interface WriteOffModalProps {
  open: boolean;
  onClose: () => void;
  transaction: PartTransaction | null;
}

const WriteOffModal: React.FC<WriteOffModalProps> = ({ open, transaction, onClose }) => {
  const [form] = Form.useForm();
  const dispatch = useAppDispatch();
  const { message: messageApi } = App.useApp();
  const [showRepairSelect, setShowRepairSelect] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<EquipmentRepair | null>(null);

  useEffect(() => {
    if (open && transaction) {
      form.setFieldsValue({
        quantity: transaction.quantity,
        equipmentCode: '',
        repairNumber: '',
        remark: '',
      });
      setSelectedRepair(null);
    }
  }, [open, transaction, form]);

  // 选择维修单据
  const handleRepairSelect = (repair: EquipmentRepair) => {
    setSelectedRepair(repair);
    form.setFieldsValue({
      equipmentCode: repair.equipmentCode,
      repairNumber: repair.repairNumber,
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await dispatch(writeOffPart({
        transactionId: transaction?.transactionId || transaction?.id || 0,
        equipmentId: selectedRepair?.equipmentId,
        equipmentCode: values.equipmentCode || selectedRepair?.equipmentCode,
        repairId: selectedRepair?.id,
        repairNumber: values.repairNumber || selectedRepair?.repairNumber,
        quantity: values.quantity,
        remark: values.remark,
      })).unwrap();
      
      messageApi.success('核销成功');
      await dispatch(fetchPendingWriteoffs());
      await dispatch(fetchParts());
      form.resetFields();
      setSelectedRepair(null);
      onClose();
    } catch (error: any) {
      if (error.message) {
        messageApi.error(error.message);
      } else {
        messageApi.error('核销失败');
      }
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedRepair(null);
    onClose();
  };

  return (
    <>
      <Modal
        title="配件核销"
        open={open}
        onOk={handleSubmit}
        onCancel={handleCancel}
        width={600}
        okText="确认核销"
        cancelText="取消"
      >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 配件信息展示 */}
        <div>
          <div style={{ marginBottom: 8, color: '#666' }}>配件编号</div>
          <div style={{ fontWeight: 500 }}>{transaction?.partCode}</div>
        </div>

        <div>
          <div style={{ marginBottom: 8, color: '#666' }}>配件名称</div>
          <div style={{ fontWeight: 500 }}>{transaction?.partName || '-'}</div>
        </div>

        {transaction?.partCategory && (
          <div>
            <div style={{ marginBottom: 8, color: '#666' }}>配件类别</div>
            <Tag color="blue">{transaction.partCategory}</Tag>
          </div>
        )}

        <div>
          <div style={{ marginBottom: 8, color: '#666' }}>品牌/规格型号</div>
          <div>
            {transaction?.partBrand || ''}{' '}
            {transaction?.partBrand && transaction?.partModel ? '/' : ''}{' '}
            {transaction?.partModel || ''}
          </div>
        </div>

        <div>
          <div style={{ marginBottom: 8, color: '#666' }}>领用门店</div>
          <div>{transaction?.storeName}</div>
        </div>

        <div>
          <div style={{ marginBottom: 8, color: '#666' }}>领用人</div>
          <div>{transaction?.operatorRealName || transaction?.operatorName || '-'}</div>
        </div>

        {/* 核销表单 */}
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item 
            label={
              <Space>
                <span>关联维修单据</span>
                <Button
                  type="link"
                  size="small"
                  icon={<SelectOutlined />}
                  onClick={() => setShowRepairSelect(true)}
                  style={{ padding: 0 }}
                >
                  选择维修单据
                </Button>
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {selectedRepair && (
                <div style={{ 
                  padding: '8px 12px', 
                  background: '#f0f7ff', 
                  borderRadius: 4,
                  fontSize: 13 
                }}>
                  <div><strong>维修单号：</strong>{selectedRepair.repairNumber}</div>
                  <div><strong>设备编号：</strong>{selectedRepair.equipmentCode}</div>
                </div>
              )}
            </Space>
          </Form.Item>

          <Form.Item 
            label="设备编号" 
            name="equipmentCode"
            tooltip="可手动输入或通过选择维修单据自动填充"
          >
            <Input 
              placeholder="请输入设备编号或选择维修单据" 
              disabled={!!selectedRepair}
            />
          </Form.Item>

          <Form.Item 
            label="维修单号" 
            name="repairNumber"
            tooltip="通过选择维修单据自动填充，也可手动输入"
            style={{ display: 'none' }}
          >
            <Input disabled />
          </Form.Item>

          <Form.Item 
            label="核销数量" 
            name="quantity" 
            rules={[
              { required: true, message: '请输入核销数量' },
              { 
                type: 'number', 
                max: transaction?.quantity || 0, 
                message: `核销数量不能超过${transaction?.quantity || 0}` 
              },
            ]}
          >
            <InputNumber 
              min={1} 
              max={transaction?.quantity || 1}
              style={{ width: '100%' }} 
              placeholder={`最多可核销 ${transaction?.quantity || 0} 个`}
            />
          </Form.Item>

          <Form.Item label="核销备注" name="remark">
            <TextArea 
              rows={3} 
              placeholder="请输入核销备注（如：更换液压泵）"
            />
          </Form.Item>
      </Form>
    </Space>
  </Modal>

  {/* 维修单据选择弹窗 */}
  <RepairSelectModal
    open={showRepairSelect}
    onClose={() => setShowRepairSelect(false)}
    onSelect={handleRepairSelect}
  />
</>
);
};

export default WriteOffModal;
