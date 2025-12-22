import React, { useEffect, useMemo, useState } from 'react';
import { Form, Input, DatePicker, Upload, Button, Row, Col, Divider, Typography, message, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../app/store';
import { Order, ClearanceRecord } from '../types';
import { addClearance } from '../ordersSlice';
import { useTabs } from '../../common/TabsContext';
import { FixedFooterButtons } from '../../../components/FixedFooterButtons';

const { Text } = Typography;

interface Props {
  order: Order;
  tabKey: string;
}

// 简易结清单号生成：CLS + 时间戳后8位 + 随机3位
const generateClearanceNumber = (): string => {
  const prefix = 'CLS';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

const ClearanceOperationTab: React.FC<Props> = ({ order, tabKey }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { closeTab } = useTabs();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);

  const clearanceNumber = useMemo(generateClearanceNumber, []);

  useEffect(() => {
    if (order) {
      form.resetFields();
      setFileList([]);
      form.setFieldsValue({
        clearanceNumber,
        contractName: `${order.customerName}/${order.projectName}`,
        clearanceDate: undefined,
        clearanceAmount: undefined,
        remark: undefined,
      });
    }
  }, [order, form, clearanceNumber]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!order) return;

      const dateValue = values.clearanceDate?.format('YYYY-MM-DD');
      const amountNum = values.clearanceAmount ? Number(values.clearanceAmount) : undefined;
      if (!dateValue) throw new Error('请选择结清日期');
      if (values.clearanceAmount && !(Number(values.clearanceAmount) > 0)) {
        throw new Error('请输入有效的结清金额');
      }

      const attachments = fileList.map((f) => ({ uid: f.uid, name: f.name, type: f.type, size: f.size }));

      const record: ClearanceRecord = {
        id: Date.now().toString(),
        clearanceNumber: values.clearanceNumber,
        contractName: values.contractName,
        clearanceDate: dateValue,
        clearanceAmount: amountNum,
        attachments,
        remark: values.remark?.trim(),
        createdAt: new Date().toISOString(),
      };

      await dispatch(addClearance({ orderId: order.id, record })).unwrap();
      message.success('结清记录已保存');
      closeTab(tabKey);
    } catch (e: any) {
      message.error(e?.message || '请检查表单输入');
    }
  };

  return (
    <div style={{ padding: 16 }} className="page-with-fixed-footer">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>结清</Typography.Title>
      </div>
      <Form form={form} layout="vertical">
        {(() => {
          if (!order) {
            return <Text type="secondary">请选择一个订单后再进行结清</Text>;
          }
          return (
            <React.Fragment>
              {/* 一、基本信息 */}
              <Divider orientation="left">一、基本信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="clearanceNumber" label="结清单号">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="contractName" label="合同名称">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="clearanceDate" label="结清日期" rules={[{ required: true, message: '请选择结清日期' }]}> 
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* 二、结清信息 */}
          <Divider orientation="left">二、结清信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="clearanceAmount" label="结清金额（元）">
                <Input placeholder="选填，请输入数字金额" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={3} placeholder="选填" />
              </Form.Item>
            </Col>
          </Row>

          {/* 三、附件上传 */}
          <Divider orientation="left">三、附件上传</Divider>
          <Form.Item label="单据附件">
            <Upload
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
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
              <Button icon={<PlusOutlined />}>上传附件</Button>
            </Upload>
          </Form.Item>
            </React.Fragment>
          );
        })()}
      </Form>
      
      <FixedFooterButtons>
        <Button onClick={() => closeTab(tabKey)}>返回</Button>
        <Button type="primary" onClick={handleSave}>保存</Button>
      </FixedFooterButtons>
    </div>
  );
};

export default ClearanceOperationTab;