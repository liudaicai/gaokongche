import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Form, Input, Select, DatePicker, InputNumber, Row, Col, Button, Typography, message, Modal, Tooltip, Card, Divider, Space, Tag, Statistic } from 'antd';
import { PlusOutlined, DeleteOutlined, FileDoneOutlined, CalculatorOutlined, RocketOutlined, InfoCircleOutlined, SaveOutlined, CalendarOutlined, EnvironmentOutlined } from '@ant-design/icons';
import type { AppDispatch } from '../../../app/store';
import { addOrder, fetchOrders } from '../ordersSlice';
import { OrderFormData, OrderEquipmentItem } from '../types';
import { useTabs } from '../../common/TabsContext';
import { fetchCompanyVerifications, selectCompanyVerifications, selectCompanyVerificationsLoading } from '../../stores/storesSlice';
import { fetchEmployees, selectEmployees, selectEmployeesLoading } from '../../employees/employeesSlice';
import { selectEquipmentList, fetchEquipmentsStart, fetchEquipmentsSuccess, fetchEquipmentsFailure, Equipment } from '../../equipment/equipmentslice';
import { fetchCustomers } from '../../customers/customerSlice';
import { FixedFooterButtons } from '../../../components/FixedFooterButtons';
import EquipmentPickerModal from '../components/EquipmentPickerModal';
import CustomerPickerModal from '../../customers/CustomerPickerModal';
import dayjs from 'dayjs';
import { apiGet } from '../../../api/client';
import { calculateOrderEstimatedAmount } from '../pricing';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

interface NewOrderTabProps {
   tabKey: string;
   orderId?: string;
}

interface EquipmentModel {
   id: string;
   category: string;
   brand: string;
   model: string;
   type: string;
   height: number;
   driveType: string;
}

const EQUIPMENT_CATEGORIES = ['高空车', '叉车', '吊车', '车载高空车'];
const EQUIPMENT_TYPES = ['剪叉车', '曲臂车', '直臂车', '履带剪叉', '套筒车', '蜘蛛车', '吸盘车'];

const NewOrderTab: React.FC<NewOrderTabProps> = ({ tabKey }) => {
   const [form] = Form.useForm();
   const dispatch = useDispatch<AppDispatch>();
   const { closeTab } = useTabs();
   const isUpdatingRef = useRef(false);

   const companyVerifications = useSelector(selectCompanyVerifications);
   const employees = useSelector(selectEmployees);
   const equipmentList = useSelector(selectEquipmentList);

   const safeEmployees = Array.isArray(employees) ? employees : [];
   const safeCompanyVerifications = Array.isArray(companyVerifications) ? companyVerifications : [];

   const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
   const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
   const [pickerOpen, setPickerOpen] = useState(false);
   const [equipmentModels, setEquipmentModels] = useState<EquipmentModel[]>([]);

   useEffect(() => {
      dispatch(fetchEmployees({ page: 1, pageSize: 100 }));
      dispatch(fetchCompanyVerifications());
      dispatch(fetchCustomers());

      const fetchModels = async () => {
         try {
            const data = await apiGet<EquipmentModel[]>('/models');
            setEquipmentModels(data || []);
         } catch (err) { console.error(err); }
      };
      fetchModels();
   }, [dispatch]);

   const getAvailableTypes = (category: string): string[] => {
      if (!category) return EQUIPMENT_TYPES;
      const categoryModels = equipmentModels.filter(model => model.category === category);
      const types = [...new Set(categoryModels.map(model => model.type))];
      return types.length > 0 ? types : EQUIPMENT_TYPES;
   };

   const getAvailableHeights = (category: string, type: string): number[] => {
      if (!category || !type) return [];
      const filteredModels = equipmentModels.filter(model => model.category === category && model.type === type);
      return [...new Set(filteredModels.map(model => model.height))].sort((a, b) => a - b);
   };

   const handleDateFieldChange = (index: number, source?: 'entry' | 'exit' | 'rentalPeriod') => {
      const items = form.getFieldValue('equipmentItems') || [];
      const item = items[index];
      if (!item) return;

      const { scheduledEntryDate, estimatedExitDate, rentalPeriod } = item;
      let updatedItem = { ...item };
      let shouldUpdate = false;

      if (source !== 'rentalPeriod' && scheduledEntryDate && estimatedExitDate) {
         const entry = dayjs(scheduledEntryDate);
         const exit = dayjs(estimatedExitDate);
         if (exit.isBefore(entry)) return message.error('退场日期不能早于进场日期');
         const period = exit.diff(entry, 'day') + 1;
         if (updatedItem.rentalPeriod !== period) {
            updatedItem.rentalPeriod = period;
            shouldUpdate = true;
         }
      } else if (scheduledEntryDate && rentalPeriod > 0) {
         const exit = dayjs(scheduledEntryDate).add(rentalPeriod - 1, 'day');
         if (!estimatedExitDate || !dayjs(estimatedExitDate).isSame(exit, 'day')) {
            updatedItem.estimatedExitDate = exit;
            shouldUpdate = true;
         }
      }

      if (shouldUpdate) {
         items[index] = updatedItem;
         form.setFieldsValue({ equipmentItems: items });
      }
   };

   const handleFinish = async (values: any) => {
      try {
         const payload: OrderFormData = {
            ...values,
            equipmentItems: (values.equipmentItems || []).map((it: any) => ({
               ...it,
               quantity: Number(it.quantity || 0),
               dailyRate: Number(it.dailyRate || 0),
               monthlyRate: Number(it.monthlyRate || 0),
               scheduledEntryDate: it.scheduledEntryDate ? dayjs(it.scheduledEntryDate).format('YYYY-MM-DD') : undefined,
               estimatedExitDate: it.estimatedExitDate ? dayjs(it.estimatedExitDate).format('YYYY-MM-DD') : undefined,
            })),
         };
         await dispatch(addOrder(payload)).unwrap();
         message.success('订单提交成功！');
         dispatch(fetchOrders());
         closeTab(tabKey);
      } catch (err: any) {
         message.error(err?.message || '订单提交失败');
      }
   };

   const equipmentItems = Form.useWatch('equipmentItems', form);
   const estimatedTotal = calculateOrderEstimatedAmount(equipmentItems || []);

   return (
      <div style={{ padding: '24px', paddingBottom: 80, background: '#f0f2f5', minHeight: '100%' }}>
         <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            initialValues={{
               monthCalculationMethod: '30天为一月',
               paymentAgreement: '预付',
               shippingFeeReduction: '无减免',
               shippingFeeCalculation: '按台计费',
               invoiceType: '不开票',
               equipmentItems: [],
            }}
         >
            <div style={{ marginBottom: 24 }}>
               <Row justify="space-between" align="middle">
                  <Col>
                     <Title level={2} style={{ margin: 0 }}>创建新订单</Title>
                     <Text type="secondary">请填写合同基本信息、项目详情及设备需求</Text>
                  </Col>
                  <Col />
               </Row>
            </div>

            <Row gutter={24}>
               {/* 左侧：基本信息 */}
               <Col span={24}>
                  <Card
                     title={<Space><FileDoneOutlined /> 合同基本信息</Space>}
                     bordered={false}
                     style={{ marginBottom: 24, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                  >
                     <Row gutter={24}>
                        <Col span={12}>
                           <Form.Item name="lessorId" label="出租方主体" rules={[{ required: true }]}>
                              <Select placeholder="选择出租方" allowClear size="large">
                                 {safeCompanyVerifications.map(c => <Option key={c.id} value={c.id}>{c.companyName}</Option>)}
                              </Select>
                           </Form.Item>
                        </Col>
                        <Col span={12}>
                           <Form.Item label="客户名称" required>
                              <Input.Search
                                 readOnly
                                 placeholder="点击选择客户"
                                 value={selectedCustomer?.name || selectedCustomer?.companyName}
                                 onSearch={() => setCustomerPickerOpen(true)}
                                 onClick={() => setCustomerPickerOpen(true)}
                                 enterButton={<Button icon={<PlusOutlined />}>选择</Button>}
                                 size="large"
                              />
                           </Form.Item>
                           <Form.Item name="customerId" hidden><Input /></Form.Item>
                        </Col>
                        <Col span={12}>
                           <Form.Item name="projectName" label="项目名称" rules={[{ required: true }]}>
                              <Input placeholder="输入项目名称" size="large" />
                           </Form.Item>
                        </Col>
                        <Col span={12}>
                           <Form.Item name="businessManagerId" label="业务负责人">
                              <Select placeholder="选择负责人" showSearch optionFilterProp="children" size="large">
                                 {safeEmployees.map(e => <Option key={e.id} value={e.id}>{e.name}</Option>)}
                              </Select>
                           </Form.Item>
                        </Col>
                        <Col span={24}>
                           <Form.Item name="deliveryLocation" label="交机地点" rules={[{ required: true }]}>
                              <Input placeholder="输入详细地址" prefix={<EnvironmentOutlined style={{ color: '#ccc' }} />} size="large" />
                           </Form.Item>
                        </Col>
                        <Col span={24}>
                           <Form.Item name="otherAgreements" label="其他约定">
                              <TextArea rows={3} placeholder="填写其他特别约定..." />
                           </Form.Item>
                        </Col>
                     </Row>
                  </Card>

                  <Card
                     title={<Space><CalculatorOutlined /> 结算与财务</Space>}
                     bordered={false}
                     style={{ marginBottom: 24, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                  >
                     <Row gutter={24}>
                        <Col span={8}>
                           <Form.Item name="monthCalculationMethod" label="月份计算">
                              <Select size="large" options={[{ label: '30天为一月', value: '30天为一月' }, { label: '自然月', value: '自然月' }]} />
                           </Form.Item>
                        </Col>
                        <Col span={8}>
                           <Form.Item name="paymentAgreement" label="支付约定">
                              <Select size="large" options={[{ label: '预付', value: '预付' }, { label: '月结', value: '月结' }]} />
                           </Form.Item>
                        </Col>
                        <Col span={8}>
                           <Form.Item name="shippingFeeReduction" label="运费减免">
                              <Select size="large" options={[{ label: '无减免', value: '无减免' }, { label: '三个月免运费', value: '三个月免运费' }]} />
                           </Form.Item>
                        </Col>
                        <Col span={8}>
                           <Form.Item name="invoiceType" label="发票类型">
                              <Select size="large" options={[{ label: '不开票', value: '不开票' }, { label: '专票', value: '专票' }, { label: '普票', value: '普票' }]} />
                           </Form.Item>
                        </Col>
                        <Col span={8}>
                           <Form.Item noStyle shouldUpdate={(p, c) => p.invoiceType !== c.invoiceType}>
                              {({ getFieldValue }) => getFieldValue('invoiceType') !== '不开票' && (
                                 <Form.Item name="invoiceTaxRate" label="税率(%)">
                                    <InputNumber size="large" style={{ width: '100%' }} />
                                 </Form.Item>
                              )}
                           </Form.Item>
                        </Col>
                     </Row>
                  </Card>
               </Col>

               {/* 设备需求 */}
               <Col span={24}>
                  <Card
                     title={<Space><RocketOutlined /> 设备需求清单</Space>}
                     bordered={false}
                     style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                     extra={
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                           const items = form.getFieldValue('equipmentItems') || [];
                           form.setFieldsValue({
                              equipmentItems: [...items, { quantity: 1, shippingType: '双程' }]
                           });
                        }}>添加设备</Button>
                     }
                     bodyStyle={{ padding: '16px', background: '#fafafa', minHeight: 400 }}
                  >
                     <Form.List name="equipmentItems">
                        {(fields, { remove }) => (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                              {fields.length > 0 && (
                                 <Row gutter={8} style={{ padding: '0 8px 4px 8px', fontWeight: 'bold', color: '#666', fontSize: 13, textAlign: 'center' }}>
                                    <Col span={2}>类别</Col>
                                    <Col span={2}>类型</Col>
                                    <Col span={2}>高度</Col>
                                    <Col span={2}>数量/台</Col>
                                    <Col span={3}>进场日期</Col>
                                    <Col span={2}>租期/天</Col>
                                    <Col span={2}>日租/元/台</Col>
                                    <Col span={2}>月租/元/台</Col>
                                    <Col span={2}>运费/元/台</Col>
                                    <Col span={2}>押金/元/台</Col>
                                    <Col span={2}>改装费/元/台</Col>
                                    <Col span={1}></Col>
                                 </Row>
                              )}
                              {fields.map(({ key, name, ...restField }) => {
                                 const item = form.getFieldValue(['equipmentItems', name]) || {};
                                 const availableTypes = getAvailableTypes(item.equipmentCategory);
                                 const availableHeights = getAvailableHeights(item.equipmentCategory, item.equipmentType);

                                 return (
                                    <div key={key} style={{ background: '#fff', padding: '8px', marginBottom: 8, borderRadius: 4, border: '1px solid #f0f0f0' }}>
                                       <Row gutter={8} align="middle">
                                          <Col span={2}>
                                             <Form.Item {...restField} name={[name, 'equipmentCategory']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                                <Select size="small" placeholder="类别" options={EQUIPMENT_CATEGORIES.map(c => ({ label: c, value: c }))} onChange={() => {
                                                   const items = form.getFieldValue('equipmentItems');
                                                   items[name].equipmentType = undefined;
                                                   items[name].height = undefined;
                                                   form.setFieldsValue({ equipmentItems: items });
                                                }} />
                                             </Form.Item>
                                          </Col>
                                          <Col span={2}>
                                             <Form.Item {...restField} name={[name, 'equipmentType']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                                <Select size="small" placeholder="类型" options={availableTypes.map(t => ({ label: t, value: t }))} disabled={!item.equipmentCategory} onChange={() => {
                                                   const items = form.getFieldValue('equipmentItems');
                                                   items[name].height = undefined;
                                                   form.setFieldsValue({ equipmentItems: items });
                                                }} />
                                             </Form.Item>
                                          </Col>
                                          <Col span={2}>
                                             <Form.Item {...restField} name={[name, 'height']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                                <Select size="small" placeholder="高度" options={availableHeights.map(h => ({ label: h + '米', value: h }))} disabled={!item.equipmentType} />
                                             </Form.Item>
                                          </Col>
                                          <Col span={2}>
                                             <Form.Item {...restField} name={[name, 'quantity']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                                <InputNumber size="small" min={1} placeholder="数量" style={{ width: '100%' }} />
                                             </Form.Item>
                                          </Col>
                                          <Col span={3}>
                                             <Form.Item {...restField} name={[name, 'scheduledEntryDate']} style={{ marginBottom: 0 }}>
                                                <DatePicker size="small" placeholder="进场" style={{ width: '100%' }} onChange={() => handleDateFieldChange(name, 'entry')} />
                                             </Form.Item>
                                          </Col>
                                          <Col span={2}>
                                             <Form.Item {...restField} name={[name, 'rentalPeriod']} style={{ marginBottom: 0 }}>
                                                <InputNumber size="small" min={1} placeholder="租期" style={{ width: '100%' }} onBlur={() => handleDateFieldChange(name, 'rentalPeriod')} />
                                             </Form.Item>
                                          </Col>
                                          <Col span={2}>
                                             <Form.Item {...restField} name={[name, 'dailyRate']} style={{ marginBottom: 0 }}>
                                                <InputNumber size="small" min={0} placeholder="日租" style={{ width: '100%' }} />
                                             </Form.Item>
                                          </Col>
                                          <Col span={2}>
                                             <Form.Item {...restField} name={[name, 'monthlyRate']} style={{ marginBottom: 0 }}>
                                                <InputNumber size="small" min={0} placeholder="月租" style={{ width: '100%' }} />
                                             </Form.Item>
                                          </Col>
                                          <Col span={2}>
                                             <Form.Item {...restField} name={[name, 'shippingFee']} style={{ marginBottom: 0 }}>
                                                <InputNumber size="small" min={0} placeholder="运费" style={{ width: '100%' }} />
                                             </Form.Item>
                                          </Col>
                                          <Col span={2}>
                                             <Form.Item {...restField} name={[name, 'deposit']} style={{ marginBottom: 0 }}>
                                                <InputNumber size="small" min={0} placeholder="押金" style={{ width: '100%' }} />
                                             </Form.Item>
                                          </Col>
                                          <Col span={2}>
                                             <Form.Item {...restField} name={[name, 'modificationFee']} style={{ marginBottom: 0 }}>
                                                <InputNumber size="small" min={0} placeholder="改装" style={{ width: '100%' }} />
                                             </Form.Item>
                                          </Col>
                                          <Col span={1} style={{ textAlign: 'center' }}>
                                             <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                                          </Col>
                                       </Row>
                                    </div>
                                 );
                              })}
                           </div>
                        )}
                     </Form.List>
                  </Card>
               </Col>
            </Row>

            <FixedFooterButtons
               onCancel={() => closeTab(tabKey)}
               onSubmit={() => form.submit()}
               submitText="提交订单"
               extra={
                  <Space size="large">
                     <span style={{ fontSize: 16 }}>合同预估总金额:</span>
                     <span style={{ color: '#52c41a', fontWeight: 'bold', fontSize: 24 }}>
                        ¥{estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     </span>
                  </Space>
               }
            />
            <CustomerPickerModal
               visible={customerPickerOpen}
               onCancel={() => setCustomerPickerOpen(false)}
               onSelect={(customer: any) => {
                  setSelectedCustomer(customer);
                  form.setFieldsValue({ customerId: customer.id || customer._id });
                  setCustomerPickerOpen(false);
               }}
            />
         </Form>
      </div>
   );
};

export default NewOrderTab;
