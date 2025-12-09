import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, Divider, Typography, message, Upload, Button, Tag } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import { Order } from './types';
import { selectVehicles, selectDrivers, selectCompanies, addLedgerItem, LogisticsLedgerItem } from '../logistics/logisticsSlice';
import { selectStores as selectStoresFromStore } from '../stores/storesSlice';
import { selectEquipmentList, fetchEquipmentsStart, fetchEquipmentsSuccess, fetchEquipmentsFailure, Equipment } from '../equipment/equipmentslice';
import { updateOrder } from './ordersSlice';
import { apiGet } from '../../api/client';
import EquipmentPickerModal from './components/EquipmentPickerModal';

const { Text } = Typography;

type LogisticsUIType = '客户自提' | '我方物流' | '第三方物流';

interface ExitPropertyModalProps {
  open: boolean;
  order: Order | null;
  onCancel: () => void;
}

const generateExitNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `EXIT-${year}${month}${day}-${random}`;
};

const ExitPropertyModal: React.FC<ExitPropertyModalProps> = ({ open, order, onCancel }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [form] = Form.useForm();
  const [exitAttachmentMap, setExitAttachmentMap] = useState<Record<string, any[]>>({});
  const [pickerState, setPickerState] = useState<{ open: boolean; index: number; item: any; initialCodes: string[] } | null>(null);

  const stores = useSelector(selectStoresFromStore);
  const vehicles = useSelector(selectVehicles);
  const drivers = useSelector(selectDrivers);
  const companies = useSelector(selectCompanies);
  const equipmentList = useSelector(selectEquipmentList);
  const customers = useSelector((state: RootState) => state.customers.customers);

  const exitNumber = useMemo(generateExitNumber, [open]);

  useEffect(() => {
    if (open && order) {
      const customer = customers.find(c => c.id === order.customerId);
      const store = stores.find(s => s.id === order.lessorId);
      
      // 获取联系人姓名和电话
      const contactName = customer
        ? (customer.type === 'enterprise'
            ? ((customer as any).contacts?.[0]?.name || (customer as any).companyName || '')
            : (customer as any).name || '')
        : '';
      const contactPhone = customer
        ? (customer.type === 'enterprise'
            ? ((customer as any).contacts?.[0]?.phone || '')
            : (customer as any).phone || '')
        : '';
      
      form.setFieldsValue({
        exitNumber,
        contractName: order.contractNumber || '',
        businessManager: order.businessManagerName || '',
        contactName,
        contactPhone,
        pickupLocation: order.projectName || '',
        returnSelections: (order.equipmentItems || []).map(() => [])
      });
      
      if (store) {
        form.setFieldValue('returnStoreId', store.id);
      }
    }
  }, [open, order, form, exitNumber, stores, customers]);

  useEffect(() => {
    if (open) {
      dispatch(fetchEquipmentsStart());
      // 通过统一的 API_BASE，避免路径中包含 '/api' 导致重复
      apiGet('/equipments').then(data => {
        dispatch(fetchEquipmentsSuccess(data as Equipment[]));
      }).catch(error => {
        dispatch(fetchEquipmentsFailure(error.message));
      });
    }
  }, [open, dispatch]);

  useEffect(() => {
    if (customers.length === 0 || !order) return;
    
    const customer = customers.find(c => c.id === order.customerId);
    if (customer) {
      const contactName = customer.type === 'enterprise' 
        ? (customer.contacts?.[0]?.name || customer.companyName)
        : customer.name;
      const contactPhone = customer.type === 'enterprise'
        ? (customer.contacts?.[0]?.phone || '')
        : customer.phone;
      
      form.setFieldsValue({
        contactName: contactName || '',
        contactPhone: contactPhone || ''
      });
    }
  }, [customers, order, form]);

  const handleCompanyChange = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      form.setFieldsValue({
        thirdPartyCompany: company.name
      });
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (!order) {
        message.error('请选择一个订单');
        return;
      }

      const ledgerItem: LogisticsLedgerItem = {
        id: Date.now().toString(),
        orderNumber: order.contractNumber,
        logisticsType: values.logisticsType === '我方物流' ? 'own' : 'third',
        orderType: 'outbound',
        storeId: values.returnStoreId,
        storeName: stores.find(s => s.id === values.returnStoreId)?.name || '',
        amount: values.logisticsType === '第三方物流' ? (Number(values.logisticsCost) || 0) : 0,
        date: new Date().toISOString(),
        remark: `退场单号: ${values.exitNumber}`,
        vehicleInfo: values.vehicleId ? vehicles.find(v => v.id === values.vehicleId)?.plateNumber : undefined,
        driverInfo: values.driverId ? drivers.find(d => d.id === values.driverId)?.name : undefined,
        companyInfo: values.logisticsType === '第三方物流' ? values.thirdPartyCompany : undefined
      };

      dispatch(addLedgerItem(ledgerItem));
      
      const updatedOrder: any = {
        ...order,
        status: 'exiting' as any,
        exitConfig: {
          exitNumber: values.exitNumber,
          logisticsType: values.logisticsType,
          pickupLocation: values.pickupLocation,
          returnStoreId: values.returnStoreId,
          contactName: values.contactName,
          contactPhone: values.contactPhone,
          vehicleId: values.vehicleId,
          driverId: values.driverId,
          thirdPartyCompany: values.thirdPartyCompany,
          returnSelections: values.returnSelections || [],
          exitAttachments: exitAttachmentMap
        }
      };

      dispatch(updateOrder(updatedOrder));
      message.success('退场配置已保存');
      onCancel();
    } catch (error) {
      console.error('退场配置保存失败:', error);
    }
  };

  const renderLogisticsFields = () => {
    const logisticsType = form.getFieldValue('logisticsType') as LogisticsUIType;
    
    if (logisticsType === '我方物流') {
      return (
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="vehicleId" label="车辆" rules={[{ required: true, message: '请选择车辆' }]}>
              <Select placeholder="请选择车辆">
                {vehicles.map(v => (
                  <Select.Option key={v.id} value={v.id}>{v.plateNumber}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="driverId" label="司机" rules={[{ required: true, message: '请选择司机' }]}>
              <Select placeholder="请选择司机">
                {drivers.map(d => (
                  <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      );
    } else if (logisticsType === '第三方物流') {
      return (
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="thirdPartyCompanyId" label="物流公司" rules={[{ required: true, message: '请选择物流公司' }]}>
              <Select placeholder="请选择物流公司" onChange={handleCompanyChange}>
                {companies.map(c => (
                  <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="thirdPartyCompany" label="公司名称">
              <Input disabled />
            </Form.Item>
          </Col>
        </Row>
      );
    }
    return null;
  };

  return (
    <Modal
      title="退场属性配置"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      width={900}
      forceRender
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
    >
      <Form form={form} layout="vertical">
        {!order ? (
          <Text type="secondary">请选择一个订单后再进行退场配置</Text>
        ) : (
          <>
          <Divider orientation="left">一、基本信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="exitNumber" label="退场单号">
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
              <Form.Item name="pickupLocation" label="收车位置" rules={[{ required: true, message: '请输入收车位置' }]}> 
                <Input placeholder="默认项目名称，可修改" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="returnStoreId" label="回库门店" rules={[{ required: true, message: '请选择回库门店' }]}> 
                <Select placeholder="请选择门店">
                  {stores.map(s => (
                    <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item shouldUpdate={(prev, curr) => prev.logisticsType !== curr.logisticsType} noStyle>
            {() => renderLogisticsFields()}
          </Form.Item>

          <Divider orientation="left">三、退场设备</Divider>
          {(order.equipmentItems || []).map((item, index) => {
            const allowedCodes = order.rentedEquipmentIds?.[index] || [];
            const disabled = allowedCodes.length === 0;
            return (
              <Row gutter={16} key={item.id ?? `exit-equip-${index}`}>
                <Col span={24}>
                  <Form.Item label={`设备 ${index + 1}（类型：${item.equipmentType} / 高度：${item.height}，可选 ${allowedCodes.length} 台在租设备）`}>
                    <Form.Item shouldUpdate noStyle>
                      {() => {
                        const selected: string[] = form.getFieldValue(["returnSelections", index]) || [];
                        return (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Button type="primary" disabled={disabled} onClick={() => setPickerState({ open: true, index, item, initialCodes: selected })}>
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
                              Modal.confirm({
                                title: '确认清空已选设备？',
                                content: '清空后需要重新选择设备。',
                                okText: '清空',
                                cancelText: '取消',
                                okButtonProps: { danger: true },
                                onOk: () => {
                                  const current = form.getFieldValue('returnSelections') || [];
                                  const next = [...current];
                                  next[index] = [];
                                  form.setFieldsValue({ returnSelections: next });
                                },
                              });
                            }}>清空所选</Button>
                          </div>
                        );
                      }}
                    </Form.Item>
                    <Form.Item name={["returnSelections", index]} style={{ display: 'none' }}>
                      <Input />
                    </Form.Item>
                  </Form.Item>
                </Col>
                {!disabled && (
                  <Col span={24}>
                    <Form.Item shouldUpdate={(prev, curr) => {
                      const a = prev?.returnSelections?.[index] || [];
                      const b = curr?.returnSelections?.[index] || [];
                      return JSON.stringify(a) !== JSON.stringify(b);
                    }} noStyle>
                      {() => {
                        const selected: string[] = form.getFieldValue(["returnSelections", index]) || [];
                        if (!selected.length) return null;
                        return (
                          <div>
                            <Divider orientation="left">设备 {index + 1} 退场附件</Divider>
                            {selected.map(code => (
                              <Row gutter={8} key={code}>
                                <Col span={24}>
                                  <Form.Item label={`设备编码 ${code} 的退场附件`}>
                                    <Upload
                                      fileList={exitAttachmentMap[code] || []}
                                      beforeUpload={() => false}
                                      onChange={({ fileList }) => setExitAttachmentMap(prev => ({ ...prev, [code]: fileList }))}
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
                                      <Button icon={<UploadOutlined />}>上传附件</Button>
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
                )}
              </Row>
            );
          })}
          </>
        )}
      </Form>
      <EquipmentPickerModal
        open={!!pickerState?.open}
        item={pickerState?.item || { equipmentType: '', height: 0, quantity: 0 }}
        equipmentList={equipmentList}
        initialSelectedCodes={pickerState?.initialCodes || []}
        allowedCodes={(order?.rentedEquipmentIds?.[(pickerState?.index ?? 0)] || [])}
        onlyWaitingDefault={false}
        onCancel={() => setPickerState(null)}
        onConfirm={(codes) => {
          const current = form.getFieldValue('returnSelections') || [];
          const next = [...current];
          if (pickerState) next[pickerState.index] = codes;
          form.setFieldsValue({ returnSelections: next });
          setPickerState(null);
        }}
      />
    </Modal>
  );
}

export default ExitPropertyModal;