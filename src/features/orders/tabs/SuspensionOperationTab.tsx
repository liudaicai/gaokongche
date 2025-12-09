import React, { useEffect, useMemo, useState } from 'react';
import { Form, Input, Select, DatePicker, Upload, Button, Row, Col, Divider, Typography, message, Modal, Tag } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../app/store';
import { Order, SuspensionRecord } from '../types';
import { addSuspension, selectOrders } from '../ordersSlice';
import { useTabs } from '../../common/TabsContext';
import { selectEquipmentList } from '../../equipment/equipmentslice';
import EquipmentPickerModal from '../components/EquipmentPickerModal';

const { Text } = Typography;

interface Props {
  order: Order;
  tabKey: string;
}

// 生成报停单号：SUSP + 时间戳后8位 + 随机3位；并在当前订单集内校验唯一性
const useUniqueSuspensionNumber = () => {
  const orders = useSelector(selectOrders);
  const gen = () => {
    const prefix = 'SUSP';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  };
  const ensureUnique = (): string => {
    let candidate = gen();
    const seen = new Set(orders.flatMap(o => (o.suspensions || []).map(r => r.suspensionNumber)));
    while (seen.has(candidate)) {
      candidate = gen();
    }
    return candidate;
  };
  return useMemo(() => ensureUnique(), [orders]);
};

const SuspensionOperationTab: React.FC<Props> = ({ order, tabKey }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { closeTab } = useTabs();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const equipmentList = useSelector(selectEquipmentList);
  const suspensionNumber = useUniqueSuspensionNumber();
  // 设备选择弹窗状态
  const [pickerState, setPickerState] = useState<{ open: boolean; index: number; item: any; initialCodes: string[]; allowedCodes: string[] }>({ open: false, index: -1, item: null, initialCodes: [], allowedCodes: [] });

  useEffect(() => {
    if (order) {
      form.resetFields();
      setFileList([]);
      form.setFieldsValue({
        suspensionNumber,
        contractName: `${order.customerName}/${order.projectName}`,
        suspensionType: undefined,
        reason: undefined,
        startDate: undefined,
        endDate: undefined,
        suspensionSelections: (order.rentedEquipmentIds || (order.equipmentItems || []).map(() => []))
      });
    }
  }, [order, form, suspensionNumber]);

  const confirmSubmit = async (count: number): Promise<boolean> => new Promise((resolve) => {
    Modal.confirm({
      title: '确认提交报停',
      content: `即将提交对 ${count} 台设备的报停。是否继续？`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!order) return;

      const start = values.startDate;
      const end = values.endDate;
      if (!start) throw new Error('请选择报停开始日期');
      if (!end) throw new Error('请选择报停结束日期');
      const diffDays = end.diff(start, 'day');
      if (diffDays < 0) throw new Error('结束日期不得早于开始日期');
      const suspensionDays = diffDays + 1; // 按自然日计算，含首尾

      const selections: string[][] = values.suspensionSelections || [];
      const rented: string[][] = order?.rentedEquipmentIds || [];
      const totalSelected = selections.reduce((sum, arr) => sum + (arr?.length || 0), 0);
      if (totalSelected === 0) {
        throw new Error('请至少选择一台在租设备进行报停');
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
      // 校验设备当前状态为“在租”
      const nonRenting: string[] = [];
      selections.flat().forEach(code => {
        const eq = (equipmentList || []).find(e => e.code === code);
        if (!eq || eq.rentalStatus !== 'renting') {
          nonRenting.push(code);
        }
      });
      if (nonRenting.length > 0) {
        throw new Error(`存在状态非“在租”的设备：${nonRenting.join(', ')}`);
      }

      // 二次确认
      const ok = await confirmSubmit(totalSelected);
      if (!ok) return;

      const attachments = fileList.map((f) => ({ uid: f.uid, name: f.name, type: f.type, size: f.size }));

      const record: SuspensionRecord = {
        id: Date.now().toString(),
        suspensionNumber: values.suspensionNumber,
        contractName: values.contractName,
        suspensionType: values.suspensionType,
        reason: values.reason?.trim(),
        startDate: start.format('YYYY-MM-DD'),
        endDate: end.format('YYYY-MM-DD'),
        suspensionDays,
        equipmentSelections: selections,
        attachments,
        createdAt: new Date().toISOString(),
      };

      await dispatch(addSuspension({ orderId: order.id, record })).unwrap();
      message.success('报停属性配置已保存');
      closeTab(tabKey);
    } catch (e: any) {
      message.error(e?.message || '请检查表单输入');
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>报停属性配置</Typography.Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => closeTab(tabKey)}>返回</Button>
          <Button type="primary" onClick={handleSave}>保存</Button>
        </div>
      </div>
      <Form form={form} layout="vertical">
        {!order ? (
          <Text type="secondary">请选择一个订单后再进行报停配置</Text>
        ) : (
          <React.Fragment>
          {/* 一、基本信息 */}
          <Divider orientation="left">一、基本信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="suspensionNumber" label="报停单号">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="contractName" label="合同信息">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="suspensionType" label="报停类型" rules={[{ required: true, message: '请选择报停类型' }]}> 
                <Select placeholder="请选择报停类型">
                  <Select.Option value="维修报停">维修报停</Select.Option>
                  <Select.Option value="假期报停">假期报停</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="reason" label="原因备注">
                <Input.TextArea rows={3} placeholder="填写详细原因（选填）" />
              </Form.Item>
            </Col>
          </Row>

          {/* 二、报停设备 */}
          <Divider orientation="left">二、报停设备</Divider>
          {(order.equipmentItems || []).map((item, index) => {
            // 仅显示当前订单在租且设备状态为“在租”的编码集合
            const rentedCodes = order.rentedEquipmentIds?.[index] || [];
            const allowedCodes = rentedCodes.filter(code => {
              const eq = (equipmentList || []).find(e => e.code === code);
              return !!eq && eq.rentalStatus === 'renting';
            });
            const disabled = allowedCodes.length === 0;
            return (
              <Row gutter={16} key={item.id}>
                <Col span={24}>
                  <Form.Item label={`设备 ${index + 1}（类型：${item.equipmentType} / 高度：${item.height}，可选 ${allowedCodes.length} 台在租设备）`}>
                    <Form.Item shouldUpdate noStyle>
                      {() => {
                        const selected: string[] = form.getFieldValue(["suspensionSelections", index]) || [];
                        return (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Button type="primary" disabled={disabled} onClick={() => setPickerState({ open: true, index, item, initialCodes: selected, allowedCodes })}>
                              选择设备
                            </Button>
                            <Text type="secondary">{disabled ? '该项无在租设备可选，请先完成进场记录' : `已选 ${selected.length}/${allowedCodes.length} 台`}</Text>
                            {selected.length > 0 && (
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {selected.slice(0, 5).map(code => <Tag key={code}>{code}</Tag>)}
                                {selected.length > 5 ? <Text>等 {selected.length} 台</Text> : null}
                              </div>
                            )}
                            <Button onClick={() => {
                              const current = form.getFieldValue('suspensionSelections') || [];
                              const next = [...current];
                              next[index] = [];
                              form.setFieldsValue({ suspensionSelections: next });
                            }} disabled={selected.length === 0}>清空选择</Button>
                          </div>
                        );
                      }}
                    </Form.Item>
                  </Form.Item>
                </Col>
              </Row>
            );
          })}

          {/* 三、日期设置与附件上传 */}
          <Divider orientation="left">三、日期与附件</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="startDate" label="报停开始日期" rules={[{ required: true, message: '请选择开始日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="endDate" label="报停结束日期" rules={[{ required: true, message: '请选择结束日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item shouldUpdate={(prev, curr) => prev.startDate !== curr.startDate || prev.endDate !== curr.endDate} label="报停天数">
                {() => {
                  const s = form.getFieldValue('startDate');
                  const e = form.getFieldValue('endDate');
                  let daysText = '-';
                  if (s && e) {
                    const d = e.diff(s, 'day');
                    daysText = d < 0 ? '日期不合法' : `${d + 1} 天`;
                  }
                  return <Text>{daysText}</Text>;
                }}
              </Form.Item>
            </Col>
          </Row>
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
                  <Button icon={<UploadOutlined />}>上传报停单据</Button>
                </Upload>
              </Form.Item>
            </Col>
          </Row>
          </React.Fragment>
        )}
        </Form>
      {/* 设备选择弹窗 */}
      {pickerState.open && (
        <EquipmentPickerModal
          open={pickerState.open}
          item={pickerState.item}
          equipmentList={equipmentList}
          initialSelectedCodes={pickerState.initialCodes}
          allowedCodes={pickerState.allowedCodes}
          onlyWaitingDefault={false}
          onCancel={() => setPickerState(prev => ({ ...prev, open: false }))}
          onConfirm={(selectedCodes: string[]) => {
            const current = form.getFieldValue('suspensionSelections') || [];
            const next = [...current];
            next[pickerState.index] = selectedCodes;
            form.setFieldsValue({ suspensionSelections: next });
            setPickerState({ open: false, index: -1, item: null, initialCodes: [], allowedCodes: [] });
          }}
        />
      )}
    </div>
  );
};

export default SuspensionOperationTab;