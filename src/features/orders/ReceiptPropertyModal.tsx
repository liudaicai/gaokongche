import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, Upload, Button, Row, Col, Divider, Typography, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../../app/store';
import { Order, ReceiptRecord } from './types';
import { addReceipt, selectOrders } from './ordersSlice';

const { Text } = Typography;

interface ReceiptPropertyModalProps {
  open: boolean;
  order: Order | null;
  onCancel: () => void;
}

// 生成收款单号：RCPT + 时间戳后8位 + 随机3位；并在当前订单集内校验唯一性
const useUniqueReceiptNumber = (open: boolean) => {
  const orders = useSelector(selectOrders);
  const gen = () => {
    const prefix = 'RCPT';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  };
  const ensureUnique = (): string => {
    let candidate = gen();
    // 如发生冲突则重新生成直到唯一
    const seen = new Set(orders.flatMap(o => (o.receipts || []).map(r => r.receiptNumber)));
    while (seen.has(candidate)) {
      candidate = gen();
    }
    return candidate;
  };
  return useMemo(() => ensureUnique(), [open, orders]);
};

const ReceiptPropertyModal: React.FC<ReceiptPropertyModalProps> = ({ open, order, onCancel }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const receiptNumber = useUniqueReceiptNumber(open);

  useEffect(() => {
    if (open && order) {
      form.resetFields();
      setFileList([]);
      form.setFieldsValue({
        receiptNumber,
        contractName: `${order.customerName}/${order.projectName}`,
        receiptDate: undefined,
        paymentMethod: undefined,
        amount: undefined,
        remark: undefined,
      });
    }
  }, [open, order, form, receiptNumber]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (!order) return;

      const dateValue = values.receiptDate?.format('YYYY-MM-DD');
      const amountNum = Number(values.amount);
      if (!dateValue) throw new Error('请选择收款日期');
      if (!(amountNum > 0)) throw new Error('请输入有效的收款金额');

      const attachments = fileList.map((f) => ({ uid: f.uid, name: f.name, type: f.type, size: f.size }));

      const record: ReceiptRecord = {
        id: Date.now().toString(),
        receiptNumber: values.receiptNumber,
        contractName: values.contractName,
        receiptDate: dateValue,
        paymentMethod: values.paymentMethod,
        amount: amountNum,
        attachments,
        remark: values.remark?.trim(),
        createdAt: new Date().toISOString(),
      };

      await dispatch(addReceipt({ orderId: order.id, record })).unwrap();
      message.success('收款属性配置已保存');
      onCancel();
    } catch (e: any) {
      message.error(e?.message || '请检查表单输入');
    }
  };

  return (
    <Modal
      title="收款属性配置"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      width={800}
      forceRender
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
    >
      <Form form={form} layout="vertical">
        {!order ? (
          <Text type="secondary">请选择一个订单后再进行收款配置</Text>
        ) : (
          <>
          {/* 基本信息 */}
          <Divider orientation="left">基本信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="receiptNumber" label="收款单号">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="contractName" label="合同">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>

          {/* 收款信息 */}
          <Divider orientation="left">收款信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="receiptDate" label="收款日期" rules={[{ required: true, message: '请选择收款日期' }]}> 
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="paymentMethod" label="收款方式" rules={[{ required: true, message: '请选择收款方式' }]}> 
                <Select placeholder="请选择收款方式">
                  <Select.Option value="二维码">二维码</Select.Option>
                  <Select.Option value="微信">微信</Select.Option>
                  <Select.Option value="支付宝">支付宝</Select.Option>
                  <Select.Option value="公账">公账</Select.Option>
                  <Select.Option value="银行卡">银行卡</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="amount" label="收款金额" rules={[{ required: true, message: '请输入收款金额' }]}> 
                <Input placeholder="请输入有效数值" />
              </Form.Item>
            </Col>
          </Row>

          <Row>
            <Col span={24}>
              <Form.Item name="remark" label="备注">
                <Input.TextArea placeholder="可选，填写收款备注说明" autoSize={{ minRows: 2, maxRows: 6 }} />
              </Form.Item>
            </Col>
          </Row>

          {/* 附件上传 */}
          <Divider orientation="left">附件</Divider>
          <Form.Item label="付款凭证截图（JPG/PNG/PDF）">
            <Upload
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList }) => setFileList(fileList)}
              accept=".jpg,.jpeg,.png,.pdf"
              listType="picture"
              onRemove={(file) => new Promise((resolve) => {
                Modal.confirm({
                  title: '确认删除该附件？',
                  content: `附件 ${file.name || ''} 将被移除。`,
                  okText: '删除',
                  cancelText: '取消',
                  okButtonProps: { danger: true },
                  onOk: () => resolve(true),
                  onCancel: () => resolve(false),
                });
              })}
            >
              <Button icon={<UploadOutlined />}>上传附件</Button>
            </Upload>
          </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default ReceiptPropertyModal;