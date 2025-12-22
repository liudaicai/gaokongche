import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Button, Table, Space, App, Input, Row, Col, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { stockInParts, fetchParts } from './partsSlice';
import { fetchStores } from '../stores/storesSlice';
import PartSelectModal from './PartSelectModal';
import type { StockInFormData, PartSelectItem } from './types';

const { Option } = Select;
const { Text } = Typography;

interface StockInModalProps {
  open: boolean;
  onClose: () => void;
}

interface SelectedPartDisplay extends PartSelectItem {
  partCode?: string;
  partName?: string;
  partDisplayName?: string;
  category?: string;
}

const StockInModal: React.FC<StockInModalProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const dispatch = useAppDispatch();
  const { message: messageApi } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [showPartSelect, setShowPartSelect] = useState(false);
  const [selectedParts, setSelectedParts] = useState<SelectedPartDisplay[]>([]);
  const [transactionNo, setTransactionNo] = useState('');
  
  const { stores } = useAppSelector((state) => state.stores);
  const { parts } = useAppSelector((state) => state.parts);
  const currentUser = useAppSelector((state) => state.auth.user);

  // 生成入库单号
  useEffect(() => {
    if (open) {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = now.getTime().toString().slice(-6);
      const newTransactionNo = `RK${dateStr}${timeStr}`;
      setTransactionNo(newTransactionNo);
      form.setFieldsValue({
        transactionNo: newTransactionNo,
        operatorName: currentUser?.username || '系统',
      });
    }
  }, [open, form, currentUser]);

  // 加载门店列表
  useEffect(() => {
    if (open) {
      dispatch(fetchStores());
      dispatch(fetchParts());
      setSelectedParts([]);
    }
  }, [open, dispatch]);

  const handlePartSelect = (items: PartSelectItem[]) => {
    const displayParts: SelectedPartDisplay[] = items.map((item) => {
      const part = parts.find((p) => p.id === item.partId);
      return {
        ...item,
        partCode: part?.code,
        partName: part?.name || '-',
        partDisplayName: `${part?.brand || ''}${part?.brand && part?.model ? ' / ' : ''}${part?.model || ''}`.trim() || '-',
        category: part?.category,
      };
    });
    setSelectedParts(displayParts);
    setShowPartSelect(false);
  };

  const handleRemovePart = (partId: number) => {
    setSelectedParts(selectedParts.filter((p) => p.partId !== partId));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (selectedParts.length === 0) {
        messageApi.warning('请选择至少一个配件');
        return;
      }

      setLoading(true);

      const formData: StockInFormData = {
        transactionNo: values.transactionNo,
        storeId: values.storeId,
        operatorName: values.operatorName,
        parts: selectedParts.map((p) => ({
          partId: p.partId,
          quantity: p.quantity,
        })),
      };

      await dispatch(stockInParts(formData)).unwrap();
      messageApi.success('入库成功');
      await dispatch(fetchParts());
      form.resetFields();
      setSelectedParts([]);
      onClose();
    } catch (error: any) {
      if (error.message) {
        messageApi.error(error.message);
      } else {
        messageApi.error('入库失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedParts([]);
    onClose();
  };

  const columns = [
    {
      title: '配件编号',
      dataIndex: 'partCode',
      width: 120,
    },
    {
      title: '配件类别',
      dataIndex: 'category',
      width: 100,
    },
    {
      title: '配件名称',
      dataIndex: 'partName',
      width: 160,
    },
    {
      title: '品牌/规格型号',
      dataIndex: 'partDisplayName',
      width: 200,
    },
    {
      title: '入库数量',
      dataIndex: 'quantity',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: SelectedPartDisplay) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemovePart(record.partId)}
        >
          移除
        </Button>
      ),
    },
  ];

  return (
    <>
      <Modal
        title="配件入库"
        open={open}
        onOk={handleSubmit}
        onCancel={handleCancel}
        confirmLoading={loading}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="入库单号"
                name="transactionNo"
                rules={[{ required: true, message: '请输入入库单号' }]}
              >
                <Input disabled value={transactionNo} style={{ backgroundColor: '#f5f5f5' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="入库人"
                name="operatorName"
                rules={[{ required: true, message: '请输入入库人' }]}
              >
                <Input disabled value={currentUser?.username || '系统'} style={{ backgroundColor: '#f5f5f5' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="入库门店"
            name="storeId"
            rules={[{ required: true, message: '请选择入库门店' }]}
          >
            <Select placeholder="请选择入库门店">
              {stores.map((store) => (
                <Option key={store.id} value={store.id}>
                  {store.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="选择配件">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => setShowPartSelect(true)}
                block
              >
                点击选择配件（已选 {selectedParts.length} 个）
              </Button>

              <Text type="secondary">
                提示：可多选配件，并分别填写入库数量；入库完成后库存会自动按门店累加。
              </Text>

              {selectedParts.length > 0 && (
                <Table
                  columns={columns}
                  dataSource={selectedParts}
                  rowKey="partId"
                  pagination={false}
                  size="small"
                  scroll={{ y: 200 }}
                />
              )}
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <PartSelectModal
        open={showPartSelect}
        onClose={() => setShowPartSelect(false)}
        onConfirm={handlePartSelect}
      />
    </>
  );
};

export default StockInModal;
