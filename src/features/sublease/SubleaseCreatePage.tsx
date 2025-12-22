/**
 * 新增转租页面
 */

import React, { useEffect, useState, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Card,
  Table,
  Space,
  InputNumber,
  Modal,
  message,
  Radio,
  Row,
  Col,
  Typography,
  Divider
} from 'antd';
import { PlusOutlined, DeleteOutlined, RocketOutlined, ShopOutlined, TruckOutlined } from '@ant-design/icons';
import type { AppDispatch } from '../../app/store';
import { fetchCompanies, selectCompanies, createEquipment } from './subleaseSlice';
import { TabsContext } from '../common/TabsContext';
import { selectStores, fetchStores } from '../stores/storesSlice';
import {
  selectVehicles,
  selectDrivers,
  selectCompanies as selectLogisticsCompanies,
  fetchVehiclesStart,
  fetchVehiclesSuccess,
  fetchVehiclesFailure,
  fetchDriversStart,
  fetchDriversSuccess,
  fetchDriversFailure,
  fetchCompaniesStart as fetchLogisticsCompaniesStart,
  fetchCompaniesSuccess as fetchLogisticsCompaniesSuccess,
  fetchCompaniesFailure as fetchLogisticsCompaniesFailure,
} from '../logistics/logisticsSlice';
import { apiGet } from '../../api/client';
import { FixedFooterButtons } from '../../components/FixedFooterButtons';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface EquipmentModel {
  id: number;
  category: string;
  type: string;
  height: string;
  brand: string;
  model: string;
  dailyRate?: number;
  monthlyRate?: number;
}

interface SelectedEquipment {
  key: string;
  modelId: number;
  category: string;
  type: string;
  height: string;
  model: string;
  quantity: number;
  dailyRate: number;
  monthlyRate: number;
  equipments: Array<{
    factoryNumber: string;
    equipmentCode: string;
  }>;
}

interface SubleaseCreatePageProps {
  companyId?: number;
  companyName?: string;
  tabKey?: string;
}

const SubleaseCreatePage: React.FC<SubleaseCreatePageProps> = ({ companyId, companyName, tabKey }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { closeTab } = useContext(TabsContext);

  const companies = useSelector(selectCompanies);
  const stores = useSelector(selectStores);
  const vehicles = useSelector(selectVehicles);
  const drivers = useSelector(selectDrivers);
  const logisticsCompanies = useSelector(selectLogisticsCompanies);

  const [form] = Form.useForm();
  const [employees, setEmployees] = useState<any[]>([]);
  const [equipmentModels, setEquipmentModels] = useState<EquipmentModel[]>([]);
  const [selectedEquipments, setSelectedEquipments] = useState<SelectedEquipment[]>([]);
  const [modelSelectVisible, setModelSelectVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transportMethod, setTransportMethod] = useState<string>('own');

  useEffect(() => {
    if (companies.length === 0) dispatch(fetchCompanies({ page: 1, pageSize: 1000 }));
    if (stores.length === 0) dispatch(fetchStores());
    loadLogisticsResources();
    if (companyId) form.setFieldsValue({ companyId });
    loadEmployees();
    loadEquipmentModels();
  }, []);

  const loadLogisticsResources = async () => {
    try {
      dispatch(fetchVehiclesStart());
      const vehiclesData: any = await apiGet('/logistics/vehicles');
      dispatch(fetchVehiclesSuccess(vehiclesData || []));

      dispatch(fetchDriversStart());
      const driversData: any = await apiGet('/logistics/drivers');
      dispatch(fetchDriversSuccess(driversData || []));

      dispatch(fetchLogisticsCompaniesStart());
      const companiesData: any = await apiGet('/logistics/companies');
      dispatch(fetchLogisticsCompaniesSuccess(companiesData || []));
    } catch (error) {
      console.error('加载物流资源失败:', error);
      dispatch(fetchVehiclesFailure(String(error)));
      dispatch(fetchDriversFailure(String(error)));
      dispatch(fetchLogisticsCompaniesFailure(String(error)));
    }
  };

  const loadEmployees = async () => {
    try {
      const response: any = await apiGet('/employees');
      if (Array.isArray(response)) {
        setEmployees(response);
      } else if (response && Array.isArray(response.data)) {
        setEmployees(response.data);
      }
    } catch (error) {
      console.error('加载员工列表失败:', error);
    }
  };

  const loadEquipmentModels = async () => {
    try {
      const response: any = await apiGet('/models');
      if (Array.isArray(response)) {
        setEquipmentModels(response);
      } else if (response && Array.isArray(response.data)) {
        setEquipmentModels(response.data);
      }
    } catch (error) {
      console.error('加载设备型号失败:', error);
    }
  };

  const handleAddModel = (model: EquipmentModel) => {
    const key = `${model.id}_${Date.now()}`;
    const newEquipment: SelectedEquipment = {
      key,
      modelId: model.id,
      category: model.category,
      type: model.type,
      height: model.height,
      model: model.model,
      quantity: 1,
      dailyRate: model.dailyRate || 0,
      monthlyRate: model.monthlyRate || 0,
      equipments: [{ factoryNumber: generateFactoryNumber(), equipmentCode: '' }],
    };

    setSelectedEquipments([...selectedEquipments, newEquipment]);
    setModelSelectVisible(false);
    message.success('已添加设备型号');
  };

  const generateFactoryNumber = () => {
    const now = new Date();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${random}`;
  };

  const handleQuantityChange = (key: string, newQuantity: number) => {
    setSelectedEquipments(prev => prev.map(item => {
      if (item.key === key) {
        const currentCount = item.equipments.length;
        const newEquipments = [...item.equipments];

        if (newQuantity > currentCount) {
          for (let i = currentCount; i < newQuantity; i++) {
            newEquipments.push({ factoryNumber: generateFactoryNumber(), equipmentCode: '' });
          }
        } else if (newQuantity < currentCount) {
          newEquipments.splice(newQuantity);
        }
        return { ...item, quantity: newQuantity, equipments: newEquipments };
      }
      return item;
    }));
  };

  const handleDailyRateChange = (key: string, newRate: number) => {
    setSelectedEquipments(prev => prev.map(item => item.key === key ? { ...item, dailyRate: newRate } : item));
  };

  const handleMonthlyRateChange = (key: string, newRate: number) => {
    setSelectedEquipments(prev => prev.map(item => item.key === key ? { ...item, monthlyRate: newRate } : item));
  };

  const handleRemoveEquipment = (key: string) => {
    setSelectedEquipments(prev => prev.filter(item => item.key !== key));
  };

  const handleEquipmentFieldChange = (equipmentKey: string, index: number, field: 'factoryNumber' | 'equipmentCode', value: string) => {
    setSelectedEquipments(prev => prev.map(item => {
      if (item.key === equipmentKey) {
        const newEquipments = [...item.equipments];
        newEquipments[index] = { ...newEquipments[index], [field]: value };
        return { ...item, equipments: newEquipments };
      }
      return item;
    }));
  };

  const handleSubmit = async (values: any) => {
    if (selectedEquipments.length === 0) {
      message.error('请至少选择一个设备型号');
      return;
    }

    for (const equipment of selectedEquipments) {
      for (const item of equipment.equipments) {
        if (!item.factoryNumber) {
          message.error('请填写所有设备的出厂编号');
          return;
        }
      }
    }

    setLoading(true);
    try {
      const companyName = companies.find(c => c.id === values.companyId)?.companyName || '';
      const storeName = stores.find(s => s.id === values.storeId)?.name || '';
      const transportFee = Number(values.transportFee) || 0;

      let logisticsInfo: any = null;
      if (transportFee > 0) {
        logisticsInfo = { transportMethod: values.transportMethod, transportFee };
        if (values.transportMethod === 'own') {
          const vehicle = vehicles.find(v => v.id === values.vehicleId);
          const driver = drivers.find(d => d.id === values.driverId);
          logisticsInfo.vehicleId = values.vehicleId;
          logisticsInfo.vehiclePlate = vehicle?.plateNumber || '';
          logisticsInfo.driverId = values.driverId;
          logisticsInfo.driverName = driver?.name || '';
          logisticsInfo.driverPhone = driver?.phone || '';
        } else if (values.transportMethod === 'third') {
          const company = logisticsCompanies.find(c => c.id === values.logisticsCompanyId);
          logisticsInfo.companyId = values.logisticsCompanyId;
          logisticsInfo.companyName = company?.name || '';
          logisticsInfo.companyContactName = values.logisticsContactPerson || '';
          logisticsInfo.companyContactPhone = values.logisticsContactPhone || '';
        }
      }

      for (const equipment of selectedEquipments) {
        for (const item of equipment.equipments) {
          const data = {
            companyId: values.companyId,
            companyName,
            storeId: values.storeId,
            storeName,
            equipmentCode: item.equipmentCode,
            factoryNumber: item.factoryNumber,
            category: equipment.category,
            equipmentType: equipment.type,
            model: equipment.model,
            brand: '',
            height: equipment.height,
            dailyRate: equipment.dailyRate,
            monthlyRate: equipment.monthlyRate,
            deposit: 0,
            startDate: values.startDate.format('YYYY-MM-DD'),
            endDate: null,
            remark: values.remark || '',
            logisticsInfo,
          };
          await dispatch(createEquipment(data)).unwrap();
        }
      }

      message.success('转租创建成功' + (logisticsInfo && logisticsInfo.transportFee > 0 ? '，物流台账已生成' : ''));
      dispatch(fetchCompanies({ page: 1, pageSize: 20 }));
      if (tabKey) setTimeout(() => closeTab(tabKey), 500);
    } catch (error: any) {
      message.error(error || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const equipmentColumns = [
    { title: '序号', key: 'index', width: 60, render: (_: any, __: any, index: number) => index + 1 },
    {
      title: '设备信息', key: 'info', render: (_: any, record: SelectedEquipment) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.category} - {record.type}</Text>
          <Text type="secondary">{record.brand} {record.model} ({record.height})</Text>
        </Space>
      )
    },
    {
      title: '数量', dataIndex: 'quantity', key: 'quantity', width: 100, render: (quantity: number, record: SelectedEquipment) => (
        <InputNumber min={1} value={quantity} onChange={(value) => handleQuantityChange(record.key, value || 1)} />
      )
    },
    {
      title: '租赁单价', key: 'price', width: 240, render: (_: any, record: SelectedEquipment) => (
        <Space>
          <InputNumber
            addonBefore="日"
            min={0} precision={2}
            value={record.dailyRate}
            onChange={(value) => handleDailyRateChange(record.key, value || 0)}
            style={{ width: 110 }}
          />
          <InputNumber
            addonBefore="月"
            min={0} precision={2}
            value={record.monthlyRate}
            onChange={(value) => handleMonthlyRateChange(record.key, value || 0)}
            style={{ width: 110 }}
          />
        </Space>
      )
    },
    {
      title: '操作', key: 'action', width: 60, render: (_: any, record: SelectedEquipment) => (
        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveEquipment(record.key)} />
      )
    },
  ];

  return (
    <div style={{ padding: '24px', paddingBottom: 80, background: '#f0f2f5', minHeight: '100%' }}>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>

        {/* 头部标题区 */}
        <div style={{ marginBottom: 24 }}>
          <Title level={3}>新增转租入库</Title>
          <Text type="secondary">创建外部设备的转租入库单据，包括物流信息和设备明细。</Text>
        </div>

        {/* 转租基本信息 */}
        <Card title={<Space><ShopOutlined /> 转租基本信息</Space>} bordered={false} style={{ marginBottom: 24 }}>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="转租公司名称" name="companyId" rules={[{ required: true, message: '请选择转租公司' }]}>
                <Select placeholder="选择公司" showSearch optionFilterProp="children" options={companies.map(c => ({ value: c.id, label: c.companyName }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="转租门店" name="storeId" rules={[{ required: true, message: '请选择转租门店' }]}>
                <Select placeholder="选择门店" showSearch optionFilterProp="children" options={stores.map(s => ({ value: s.id, label: s.name }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="转租人" name="subleasePersonId">
                <Select placeholder="选择经办人" showSearch optionFilterProp="children" options={employees.map(e => ({ value: e.id, label: e.name || e.username }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="起租时间" name="startDate" rules={[{ required: true, message: '请选择起租时间' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="月份计算方式" name="monthCalculation" initialValue="30days">
                <Select options={[{ label: '30天为一月', value: '30days' }, { label: '自然月', value: 'natural' }]} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="备注" name="remark">
                <TextArea rows={2} placeholder="填写备注信息..." />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 设备明细 */}
        <Card
          title={<Space><RocketOutlined /> 设备明细</Space>}
          bordered={false}
          style={{ marginBottom: 24 }}
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModelSelectVisible(true)}>
              添加设备
            </Button>
          }
        >
          {selectedEquipments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              <RocketOutlined style={{ fontSize: 24, marginBottom: 8 }} /><br />
              暂无设备，请点击右上角添加
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {selectedEquipments.map((equipment, idx) => (
                <Card
                  key={equipment.key}
                  size="small"
                  type="inner"
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>{equipment.category} - {equipment.type}</Text>
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleRemoveEquipment(equipment.key)} />
                    </div>
                  }
                >
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{equipment.brand} {equipment.model} / {equipment.height}</Text>
                  </div>
                  <Row gutter={8} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={12}>
                      <InputNumber
                        addonBefore="日租" size="small" prefix="¥"
                        style={{ width: '100%' }}
                        value={equipment.dailyRate}
                        onChange={v => handleDailyRateChange(equipment.key, v || 0)}
                      />
                    </Col>
                    <Col span={12}>
                      <InputNumber
                        addonBefore="月租" size="small" prefix="¥"
                        style={{ width: '100%' }}
                        value={equipment.monthlyRate}
                        onChange={v => handleMonthlyRateChange(equipment.key, v || 0)}
                      />
                    </Col>
                  </Row>
                  <div style={{ background: '#fafafa', padding: 8, borderRadius: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12 }}>数量: {equipment.quantity}</Text>
                      <Space>
                        <Button size="small" shape="circle" icon={<PlusOutlined />} onClick={() => handleQuantityChange(equipment.key, equipment.quantity + 1)} style={{ fontSize: 12 }} />
                        <Button size="small" shape="circle" icon={<DeleteOutlined />} onClick={() => equipment.quantity > 1 && handleQuantityChange(equipment.key, equipment.quantity - 1)} style={{ fontSize: 12 }} />
                      </Space>
                    </div>
                    {equipment.equipments.map((item, i) => (
                      <Row key={i} gutter={4} style={{ marginTop: 4 }}>
                        <Col span={12}>
                          <Input placeholder="出厂编号" size="small" value={item.factoryNumber} onChange={e => handleEquipmentFieldChange(equipment.key, i, 'factoryNumber', e.target.value)} />
                        </Col>
                        <Col span={12}>
                          <Input placeholder="自编号" size="small" value={item.equipmentCode} onChange={e => handleEquipmentFieldChange(equipment.key, i, 'equipmentCode', e.target.value)} />
                        </Col>
                      </Row>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* 物流信息 */}
        <Card title={<Space><TruckOutlined /> 物流信息</Space>} bordered={false} style={{ marginBottom: 24 }}>
          <Form.Item label="运输方式" name="transportMethod" initialValue="own">
            <Radio.Group onChange={(e) => setTransportMethod(e.target.value)} optionType="button" buttonStyle="solid">
              <Radio.Button value="own">我方运输</Radio.Button>
              <Radio.Button value="third">第三方运输</Radio.Button>
              <Radio.Button value="company">转租公司运输</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <div style={{ background: '#fafafa', padding: 16, borderRadius: 6 }}>
            {transportMethod === 'own' ? (
              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item label="车辆" name="vehicleId" style={{ marginBottom: 0 }}>
                    <Select placeholder="选择车辆" allowClear options={vehicles.map(v => ({ value: v.id, label: v.plateNumber }))} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="司机" name="driverId" style={{ marginBottom: 0 }}>
                    <Select placeholder="选择司机" allowClear options={drivers.map(d => ({ value: d.id, label: `${d.name} (${d.phone})` }))} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="运费" name="transportFee" style={{ marginBottom: 0 }}>
                    <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" placeholder="0.00" />
                  </Form.Item>
                </Col>
              </Row>
            ) : transportMethod === 'third' ? (
              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item label="物流公司" name="logisticsCompanyId" style={{ marginBottom: 0 }}>
                    <Select placeholder="选择物流公司" allowClear options={logisticsCompanies.map(c => ({ value: c.id, label: c.name }))} />
                  </Form.Item>
                </Col>
                <Col span={5}>
                  <Form.Item label="联系人" name="logisticsContactPerson" style={{ marginBottom: 0 }}>
                    <Input placeholder="姓名" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="电话" name="logisticsContactPhone" style={{ marginBottom: 0 }}>
                    <Input placeholder="电话" />
                  </Form.Item>
                </Col>
                <Col span={5}>
                  <Form.Item label="运费" name="transportFee" style={{ marginBottom: 0 }}>
                    <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" placeholder="0.00" />
                  </Form.Item>
                </Col>
              </Row>
            ) : (
              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item label="运费" name="transportFee" style={{ marginBottom: 0 }}>
                    <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" placeholder="0.00" />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </div>
        </Card>

        <Modal
          title="选择设备型号"
          open={modelSelectVisible}
          onCancel={() => setModelSelectVisible(false)}
          footer={null}
          width={800}
        >
          <Table
            columns={[
              { title: '类别', dataIndex: 'category' },
              { title: '类型', dataIndex: 'type' },
              { title: '高度', dataIndex: 'height' },
              { title: '品牌/型号', render: (_, r) => `${r.brand || ''} ${r.model}` },
              { title: '操作', render: (_, r) => <Button type="primary" size="small" onClick={() => handleAddModel(r)}>选择</Button> }
            ]}
            dataSource={equipmentModels}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </Modal>

        <FixedFooterButtons onSubmit={() => form.submit()} submitText="确认入库" loading={loading} showCancel={false} />
      </Form>
    </div>
  );
};

export default SubleaseCreatePage;
