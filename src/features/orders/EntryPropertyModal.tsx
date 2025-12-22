import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, Divider, Typography, message, Upload, Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import { Order } from './types';
import { selectVehicles, selectDrivers, selectCompanies } from '../logistics/logisticsSlice';
import { selectStores as selectStoresFromStore } from '../stores/storesSlice';
import { selectEquipmentList, fetchEquipmentsStart, fetchEquipmentsSuccess, fetchEquipmentsFailure, Equipment } from '../equipment/equipmentslice';
import { updateOrder } from './ordersSlice';
import { apiGet } from '../../api/client';
import EquipmentPickerModal from './components/EquipmentPickerModal';

const { Text } = Typography;

type LogisticsUIType = '客户自提' | '我方物流' | '第三方物流';

interface EntryPropertyModalProps {
  open: boolean;
  order: Order | null;
  onCancel: () => void;
}

// 简易进场单号生成：IN + 时间戳后8位 + 随机3位
const generateEntryNumber = (): string => {
  const prefix = 'IN';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

const EntryPropertyModal: React.FC<EntryPropertyModalProps> = ({ open, order, onCancel }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [form] = Form.useForm();
  const [entryAttachmentMap, setEntryAttachmentMap] = useState<Record<string, any[]>>({});
const [pickerState, setPickerState] = useState<{ open: boolean; index: number; item: any; initialCodes: string[] } | null>(null);

  const stores = useSelector(selectStoresFromStore);
  const vehicles = useSelector(selectVehicles);
  const drivers = useSelector(selectDrivers);
  const companies = useSelector(selectCompanies);
  const equipmentList = useSelector(selectEquipmentList);
  const customers = useSelector((state: RootState) => state.customers.customers);

  const entryNumber = useMemo(generateEntryNumber, [open]);

  useEffect(() => {
    if (open && order) {
      form.resetFields();
      setEntryAttachmentMap({});
      const customer: any = customers.find(c => c.id === order.customerId);
      const defaultName: string = customer
        ? (customer.type === 'enterprise'
            ? ((customer.contacts || []).map((ct: any) => ct.name).find((n: string) => !!n) || customer.companyName || order.customerName)
            : (customer.name || order.customerName))
        : order.customerName;
      const defaultPhone: string = customer
        ? (customer.type === 'enterprise'
            ? ((customer.contacts || []).map((ct: any) => ct.phone).find((p: string) => !!p) || '')
            : (customer.phone || ''))
        : '';
      form.setFieldsValue({
        entryNumber,
        contractName: `${order.customerName}/${order.projectName}`,
        businessManager: order.businessManagerName,
        contactName: defaultName,
        contactPhone: defaultPhone,
        logisticsType: '客户自提' as LogisticsUIType,
        storeId: stores?.[0]?.id,
        deliveryLocation: order.projectName,
        vehicleId: undefined,
        driverId: undefined,
        companyId: undefined,
        companyContactName: undefined,
        companyContactPhone: undefined,
        logisticsCost: undefined,
        equipmentSelections: (order.equipmentItems || []).map(() => [])
      });
    }
  }, [open, order, form, entryNumber, stores, customers]);

  // 加载设备列表（弹窗打开时）
  useEffect(() => {
    if (open) {
      dispatch(fetchEquipmentsStart());
      apiGet<Equipment[]>('/equipments')
        .then(list => dispatch(fetchEquipmentsSuccess(list)))
        .catch((err: any) => dispatch(fetchEquipmentsFailure(err?.message || '获取设备列表失败')));
    }
  }, [open, dispatch]);

  // 如果客户列表晚于订单到达，则在字段为空时补全默认联系人与电话
  useEffect(() => {
    if (!order) return;
    const v = form.getFieldsValue(true) as any;
    const needName = !v.contactName;
    const needPhone = !v.contactPhone;
    if (needName || needPhone) {
      const customer: any = customers.find(c => c.id === order.customerId);
      const defaultName: string = customer
        ? (customer.type === 'enterprise'
            ? ((customer.contacts || []).map((ct: any) => ct.name).find((n: string) => !!n) || customer.companyName || order.customerName)
            : (customer.name || order.customerName))
        : order.customerName;
      const defaultPhone: string = customer
        ? (customer.type === 'enterprise'
            ? ((customer.contacts || []).map((ct: any) => ct.phone).find((p: string) => !!p) || '')
            : (customer.phone || ''))
        : '';
      form.setFieldsValue({
        contactName: needName ? defaultName : v.contactName,
        contactPhone: needPhone ? defaultPhone : v.contactPhone,
      });
    }
  }, [customers, order, form]);

  const handleCompanyChange = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    form.setFieldsValue({
      companyContactName: company?.contactPerson,
      companyContactPhone: company?.contactPhone,
    });
  };

  const handleOk = async () => {
    if (!order) {
      message.error('请选择一个订单');
      return;
    }
    try {
      const values = await form.validateFields();
      const items = order?.equipmentItems || [];
      const selections: string[][] = values.equipmentSelections || [];

      // 允许超额进场：至少选择一台设备
      const totalSelected = selections.reduce((sum, arr) => sum + ((arr || []).length), 0);
      if (totalSelected === 0) {
        throw new Error('请至少选择一台设备进行进场');
      }

      // 合并在租列表：历史在租 + 本次选择（去重），允许超过合同数量
      const prevRented = order?.rentedEquipmentIds || [];
      const mergedRented: string[][] = items.map((_, idx) => {
        const prev = prevRented?.[idx] || [];
        const chosen = selections?.[idx] || [];
        return Array.from(new Set([...(prev || []), ...chosen]));
      });

      // 附件映射：仅记录所选设备的附件元数据
      const selectedCodes = selections.flat();
      const attachmentsMap: Record<string, Array<{ uid: string; name: string; type?: string; size?: number }>> = {};
      selectedCodes.forEach(code => {
        const files = entryAttachmentMap[code] || [];
        attachmentsMap[code] = files.map((f: any) => ({ uid: f.uid, name: f.name, type: f.type, size: f.size }));
      });

      // ⚠️ 关键修复：明确保留 equipmentItems，避免后端清空设备需求
      const updated: any = {
        ...order,
        rentedEquipmentIds: mergedRented,
        entryAttachments: { ...(order?.entryAttachments || {}), ...attachmentsMap },
        equipmentItems: order.equipmentItems // 保留原有的设备需求
      };
      await dispatch(updateOrder(updated)).unwrap();

      message.success('进场属性配置已保存');
      onCancel();
    } catch (e: any) {
      message.error(e?.message || '请检查表单输入');
    }
  };

  // 使用设备模块实际数据：按类型/高度筛选"待租"设备，展示出厂编号/自编号

  const renderLogisticsFields = () => {
    const logisticsType: LogisticsUIType = form.getFieldValue('logisticsType');
    if (logisticsType === '客户自提') return null;
    if (logisticsType === '我方物流') {
      return (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="vehicleId" label="物流车辆" rules={[{ required: true, message: '请选择物流车辆' }]}> 
              <Select placeholder="请选择车辆（车牌号）">
                {vehicles.map(v => (
                  <Select.Option key={v.id} value={v.id}>{v.plateNumber}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="driverId" label="司机姓名/电话" rules={[{ required: true, message: '请选择司机' }]}> 
              <Select placeholder="请选择司机">
                {drivers.map(d => (
                  <Select.Option key={d.id} value={d.id}>{`${d.name} / ${d.phone}`}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      );
    }
    // 第三方物流
    return (
      <>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="companyId" label="物流公司" rules={[{ required: true, message: '请选择物流公司' }]}> 
              <Select placeholder="请选择物流公司" onChange={handleCompanyChange}>
                {companies.map(c => (
                  <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="联系人姓名/电话">
              <Input.Group compact>
                <Form.Item name="companyContactName" noStyle>
                  <Input style={{ width: '50%' }} placeholder="自动显示联系人" disabled />
                </Form.Item>
                <Form.Item name="companyContactPhone" noStyle>
                  <Input style={{ width: '50%' }} placeholder="自动显示电话" disabled />
                </Form.Item>
              </Input.Group>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="logisticsCost" label="物流成本" rules={[{ required: true, message: '请输入物流成本' }]}> 
              <Input placeholder="请输入物流成本" />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  };

  return (
    <Modal
      title="进场属性配置"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      width={900}
      forceRender
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
    >
      <Form form={form} layout="vertical">
        {!order ? (
          <Text type="secondary">请选择一个订单后再进行进场配置</Text>
        ) : (
          <>
          {/* 一、基本信息 */}
          <Divider orientation="left">一、基本信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="entryNumber" label="进场单号">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="contractName" label="合同名称">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="businessManager" label="业务负责人">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="contactName" label="客户联系人" rules={[{ required: true, message: '请输入客户联系人' }]}> 
                <Input placeholder="请输入客户联系人" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="contactPhone" label="电话" rules={[{ required: true, message: '请输入电话' }]}> 
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
          </Row>

          {/* 二、物流配置 */}
          <Divider orientation="left">二、物流配置</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="logisticsType" label="物流类型" rules={[{ required: true, message: '请选择物流类型' }]}> 
                <Select placeholder="请选择物流类型">
                  <Select.Option value="客户自提">客户自提</Select.Option>
                  <Select.Option value="我方物流">我方物流</Select.Option>
                  <Select.Option value="第三方物流">第三方物流</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="storeId" label="出库门店" rules={[{ required: true, message: '请选择出库门店' }]}> 
                <Select placeholder="请选择门店">
                  {stores.map(s => (
                    <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="deliveryLocation" label="交车位置" rules={[{ required: true, message: '请输入交车位置' }]}> 
                <Input placeholder="默认项目名称，可修改" />
              </Form.Item>
            </Col>
          </Row>

          {/* 三、物流信息 （联动显示）*/}
          <Form.Item shouldUpdate={(prev, curr) => prev.logisticsType !== curr.logisticsType} noStyle>
            {() => renderLogisticsFields()}
          </Form.Item>

          {/* 四、进场设备选择 */}
          <Divider orientation="left">三、进场设备</Divider>
          {((order.equipmentItems || []).length === 0) && (
            <Text type="secondary">当前订单尚未配置“设备需求”，请先在订单的“设备需求”中添加设备类型/高度/数量再进行进场设备选择。</Text>
          )}
          {(order.equipmentItems || []).map((item, index) => (
            <Row gutter={16} key={item.id ?? `entry-equip-${index}`}>
              <Col span={24}>
                <Form.Item label={`设备 ${index + 1}（类型：${item.equipmentType} / 高度：${item.height}，建议选 ${item.quantity} 台，可超额）`}>
                  <Form.Item shouldUpdate noStyle>
                    {() => {
                      const selected: string[] = form.getFieldValue(["equipmentSelections", index]) || [];
                      return (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Button type="primary" onClick={() => setPickerState({ open: true, index, item, initialCodes: selected })}>
                            选择设备
                          </Button>
                          <Text type="secondary">已选 {selected.length}/{item.quantity} 台</Text>
                          {selected.length > 0 && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {selected.slice(0, 5).map(code => <Tag key={code}>{code}</Tag>)}
                              {selected.length > 5 ? <Text>等 {selected.length} 台</Text> : null}
                            </div>
                          )}
                          <Button onClick={() => {
                            Modal.confirm({
                              title: '确认清空已选设备？',
                              content: '清空后需要重新选择设备。',
                              okText: '清空',
                              cancelText: '取消',
                              okButtonProps: { danger: true },
                              onOk: () => {
                                const current = form.getFieldValue('equipmentSelections') || [];
                                const next = [...current];
                                next[index] = [];
                                form.setFieldsValue({ equipmentSelections: next });
                              },
                            });
                          }}>清空所选</Button>
                        </div>
                      );
                    }}
                  </Form.Item>
                  <Form.Item name={["equipmentSelections", index]} style={{ display: 'none' }}>
                    <Input />
                  </Form.Item>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item shouldUpdate={(prev, curr) => {
                  const a = prev?.equipmentSelections?.[index] || [];
                  const b = curr?.equipmentSelections?.[index] || [];
                  return JSON.stringify(a) !== JSON.stringify(b);
                }} noStyle>
                  {() => {
                    const selected: string[] = form.getFieldValue(["equipmentSelections", index]) || [];
                    if (!selected.length) return null;
                    return (
                      <div>
                        <Divider orientation="left">设备 {index + 1} 进场附件</Divider>
                        {selected.map(code => (
                          <Row gutter={8} key={code}>
                            <Col span={24}>
                              <Form.Item label={`出厂编号 ${code} 的进场附件`}>
                                <Upload
                                  fileList={entryAttachmentMap[code] || []}
                                  beforeUpload={() => false}
                                  onChange={({ fileList }) => setEntryAttachmentMap(prev => ({ ...prev, [code]: fileList }))}
                                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                                  listType="text"
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
                            </Col>
                          </Row>
                        ))}
                      </div>
                    );
                  }}
                </Form.Item>
              </Col>
            </Row>
          ))}
          </>
        )}
      </Form>
      <EquipmentPickerModal
        open={!!pickerState?.open}
        item={pickerState?.item || { equipmentType: '', height: 0, quantity: 0 }}
        equipmentList={equipmentList}
        initialSelectedCodes={pickerState?.initialCodes || []}
        onCancel={() => setPickerState(null)}
        onConfirm={(codes) => {
          const current = form.getFieldValue('equipmentSelections') || [];
          const next = [...current];
          if (pickerState) next[pickerState.index] = codes;
          form.setFieldsValue({ equipmentSelections: next });
          setPickerState(null);
        }}
      />
    </Modal>
  );
};

export default EntryPropertyModal;

// EquipmentItemSelector 已迁移为通用弹窗组件 EquipmentPickerModal