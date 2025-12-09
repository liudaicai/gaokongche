import React, { useEffect, useMemo, useState } from 'react';
import { Form, Input, Select, DatePicker, Upload, Button, Row, Col, Divider, Typography, message, Modal } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../app/store';
import { Order, ClaimRecord } from '../types';
import { addClaim, selectOrders } from '../ordersSlice';
import { useTabs } from '../../common/TabsContext';
import { selectEquipmentList } from '../../equipment/equipmentslice';

const { Text } = Typography;

interface Props {
  order: Order;
  tabKey: string;
}

// 生成索赔单号：CLM + 时间戳后8位 + 随机3位；并在当前订单集内校验唯一性
const useUniqueClaimNumber = () => {
  const orders = useSelector(selectOrders);
  const gen = () => {
    const prefix = 'CLM';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  };
  const ensureUnique = (): string => {
    let candidate = gen();
    const seen = new Set(orders.flatMap(o => (o.claims || []).map(r => r.claimNumber)));
    while (seen.has(candidate)) {
      candidate = gen();
    }
    return candidate;
  };
  return useMemo(() => ensureUnique(), [orders]);
};

const ClaimOperationTab: React.FC<Props> = ({ order, tabKey }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { closeTab } = useTabs();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const equipmentList = useSelector(selectEquipmentList);
  const claimNumber = useUniqueClaimNumber();

  useEffect(() => {
    if (order) {
      form.resetFields();
      setFileList([]);
      form.setFieldsValue({
        claimNumber,
        contractName: `${order.customerName}/${order.projectName}`,
        reason: undefined,
        claimDate: undefined,
        claimAmount: undefined,
        claimSelections: (order.rentedEquipmentIds || (order.equipmentItems || []).map(() => []))
      });
    }
  }, [order, form, claimNumber]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!order) return;

      const date = values.claimDate;
      if (!date) throw new Error('请选择索赔日期');
      if (!values.reason || !values.reason.trim()) throw new Error('请填写索赔原因');

      const selections: string[][] = values.claimSelections || [];
      const rented: string[][] = order?.rentedEquipmentIds || [];
      const totalSelected = selections.reduce((sum, arr) => sum + (arr?.length || 0), 0);
      if (totalSelected === 0) {
        throw new Error('请至少选择一台在租设备进行索赔');
      }
      // 校验选择的设备必须在在租列表中
      for (let i = 0; i < selections.length; i++) {
        const chosen = selections[i] || [];
        const allowed = rented?.[i] || [];
        const invalid = chosen.filter(id => !allowed.includes(id));
        if (invalid.length > 0) {
          throw new Error(`设备项 ${i + 1} 包含非在租编号：${invalid.join(', ')}`);
        }
      }

      const attachments = fileList.map((f) => ({ uid: f.uid, name: f.name, type: f.type, size: f.size }));
      const amountNum = values.claimAmount ? Number(values.claimAmount) : undefined;

      const record: ClaimRecord = {
        id: Date.now().toString(),
        claimNumber: values.claimNumber,
        contractName: values.contractName,
        // 当前未提供索赔类型选择，默认归类为“其他”
        claimType: '其他',
        reason: values.reason.trim(),
        claimDate: date.format('YYYY-MM-DD'),
        claimAmount: isNaN(amountNum as number) ? undefined : amountNum,
        equipmentSelections: selections,
        attachments,
        createdAt: new Date().toISOString(),
      };

      await dispatch(addClaim({ orderId: order.id, record })).unwrap();
      message.success('索赔属性配置已保存');
      closeTab(tabKey);
    } catch (e: any) {
      message.error(e?.message || '请检查表单输入');
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>索赔属性配置</Typography.Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => closeTab(tabKey)}>返回</Button>
          <Button type="primary" onClick={handleSave}>保存</Button>
        </div>
      </div>
      <Form form={form} layout="vertical">
        {(() => {
          if (!order) {
            return <Text type="secondary">请选择一个订单后再进行索赔配置</Text>;
          }
          return (
            <React.Fragment>
              {/* 一、基本信息 */}
              <Divider orientation="left">一、基本信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="claimNumber" label="索赔单号">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="contractName" label="合同信息">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>

          {/* 二、索赔信息 */}
          <Divider orientation="left">二、索赔信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="claimDate" label="索赔日期" rules={[{ required: true, message: '请选择索赔日期' }]}> 
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="claimAmount" label="索赔金额（元）">
                <Input placeholder="请输入索赔金额（选填）" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="reason" label="索赔原因" rules={[{ required: true, message: '请填写索赔原因' }]}> 
                <Input placeholder="请输入索赔原因" />
              </Form.Item>
            </Col>
          </Row>

          {/* 三、索赔设备选择 */}
          <Divider orientation="left">三、索赔设备</Divider>
          {(order.equipmentItems || []).map((item, index) => {
            const allowedCodes = order.rentedEquipmentIds?.[index] || [];
            const options = allowedCodes.map(code => {
              const match = equipmentList.find(e => e.code === code);
              const label = match ? `${match.code} / ${match.customCode}` : code;
              return { label, value: code };
            });
            const disabled = options.length === 0;
            return (
              <Row gutter={16} key={item.id}>
                <Col span={24}>
                  <Form.Item
                    name={["claimSelections", index]}
                    label={`设备 ${index + 1}（类型：${item.equipmentType} / 高度：${item.height}，可选 ${allowedCodes.length} 台在租设备编码/自编码）`}
                  >
                    <Select
                      mode="multiple"
                      placeholder={disabled ? '该项无在租设备可选，请先完成进场记录' : '请选择需要索赔的设备（设备编码/自编码）'}
                      options={options}
                      disabled={disabled}
                    />
                  </Form.Item>
                </Col>
              </Row>
            );
          })}

          {/* 四、附件上传 */}
          <Divider orientation="left">四、附件上传</Divider>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="附件上传">
                <Upload
                  fileList={fileList}
                  onChange={({ fileList }) => setFileList(fileList)}
                  beforeUpload={() => false}
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
                  <Button icon={<UploadOutlined />}>上传索赔单据</Button>
                </Upload>
              </Form.Item>
            </Col>
          </Row>
            </React.Fragment>
          );
        })()}
      </Form>
    </div>
  );
};

export default ClaimOperationTab;