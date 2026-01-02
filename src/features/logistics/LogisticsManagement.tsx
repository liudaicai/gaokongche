import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Table, Tabs, Modal, Form, Input, Select, Space, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AppDispatch, RootState } from '../../app/store';
import {
  deleteVehicleSuccess,
  deleteDriverSuccess,
  deleteCompanySuccess,
  Vehicle,
  Driver,
  LogisticsCompany,
  fetchVehiclesStart,
  fetchVehiclesSuccess,
  fetchVehiclesFailure,
  fetchDriversStart,
  fetchDriversSuccess,
  fetchDriversFailure,
  fetchCompaniesStart,
  fetchCompaniesSuccess,
  fetchCompaniesFailure,
  fetchStoresStart,
  fetchStoresSuccess,
  fetchStoresFailure
} from './logisticsSlice';
import { Store } from '../stores/types';
import { apiGet, apiDelete, apiPost, apiPut } from '../../api/client';


const LogisticsManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // 从Redux获取数据
  const vehicles = useSelector((state: RootState) => state.logistics.vehicles);
  const drivers = useSelector((state: RootState) => state.logistics.drivers);
  const companies = useSelector((state: RootState) => state.logistics.companies);
  const stores = useSelector((state: RootState) => state.logistics.stores);
  const loading = useSelector((state: RootState) => state.logistics.loading);
  
  // 状态管理
  const [logisticsType, setLogisticsType] = useState<'own' | 'third'>('own');
  const [isVehicleModalVisible, setIsVehicleModalVisible] = useState(false);
  const [isDriverModalVisible, setIsDriverModalVisible] = useState(false);
  const [isCompanyModalVisible, setIsCompanyModalVisible] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [currentCompany, setCurrentCompany] = useState<LogisticsCompany | null>(null);
  
  // 表单实例
  const [vehicleForm] = Form.useForm();
  const [driverForm] = Form.useForm();
  const [companyForm] = Form.useForm();
  
  // 模拟数据加载
  useEffect(() => {
    // 加载车辆数据（真实API）
    const fetchVehicles = async () => {
      dispatch(fetchVehiclesStart());
      try {
        const apiVehicles = await apiGet<Vehicle[]>('/logistics/vehicles');
        const normalized = (apiVehicles || []).map((v: any) => ({
          ...v,
          stores: Array.isArray(v?.stores) ? v.stores : [],
        }));
        dispatch(fetchVehiclesSuccess(normalized as Vehicle[]));
      } catch (err: any) {
        dispatch(fetchVehiclesFailure(err?.message || '获取车辆列表失败'));
        message.error(err?.message || '获取车辆列表失败');
      }
    };
    
    // 加载司机数据（真实API）
    const fetchDrivers = async () => {
      dispatch(fetchDriversStart());
      try {
        const apiDrivers = await apiGet<Driver[]>('/logistics/drivers');
        const normalized = (apiDrivers || []).map((d: any) => ({
          ...d,
          stores: Array.isArray(d?.stores) ? d.stores : [],
        }));
        dispatch(fetchDriversSuccess(normalized as Driver[]));
      } catch (err: any) {
        dispatch(fetchDriversFailure(err?.message || '获取司机列表失败'));
        message.error(err?.message || '获取司机列表失败');
      }
    };
    
    // 加载物流公司数据（真实API）
    const fetchCompanies = async () => {
      dispatch(fetchCompaniesStart());
      try {
        const apiCompanies = await apiGet<LogisticsCompany[]>('/logistics/companies');
        const normalized = (apiCompanies || []).map((c: any) => ({
          ...c,
          stores: Array.isArray(c?.stores) ? c.stores : [],
        }));
        dispatch(fetchCompaniesSuccess(normalized as LogisticsCompany[]));
      } catch (err: any) {
        dispatch(fetchCompaniesFailure(err?.message || '获取物流公司列表失败'));
        message.error(err?.message || '获取物流公司列表失败');
      }
    };
    
    // 加载门店数据（真实API已有）
    const fetchStores = async () => {
      dispatch(fetchStoresStart());
      try {
        const response = await apiGet<{ data: any[] } | any[]>('/stores');
        const apiStores = Array.isArray(response) ? response : (response.data || []);
        const mapped: Store[] = apiStores.map((s: any) => ({ 
          id: s.id, 
          name: s.name,
          address: s.address || '',
          managerId: s.managerId || '',
          managerName: s.managerName || '',
          managerPhone: s.managerPhone || '',
          createdAt: s.createdAt || new Date().toISOString(),
          updatedAt: s.updatedAt || new Date().toISOString()
        }));
        dispatch(fetchStoresSuccess(mapped));
      } catch (err: any) {
        dispatch(fetchStoresFailure(err?.message || '获取门店列表失败'));
        message.error(err?.message || '获取门店列表失败');
      }
    };
    
    fetchVehicles();
    fetchDrivers();
    fetchCompanies();
    fetchStores();
  }, [dispatch]);
  

  
  // 车辆表格列配置
  const vehicleColumns: ColumnsType<Vehicle> = [
    {
      title: '序号',
      key: 'index',
      render: (_, __, index) => index + 1
    },
    {
      title: '车牌',
      dataIndex: 'plateNumber',
      key: 'plateNumber'
    },
    {
      title: '规格',
      dataIndex: 'spec',
      key: 'spec'
    },
    {
      title: '服务门店',
      dataIndex: 'stores',
      key: 'stores',
      render: (stores) => Array.isArray(stores) ? stores.map((store: Store) => store.name).join(', ') : '-'
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditVehicle(record)}>
            修改
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteVehicle(record.id)}>
            删除
          </Button>
        </Space>
      )
    }
  ];
  
  // 司机表格列配置
  const driverColumns: ColumnsType<Driver> = [
    {
      title: '序号',
      key: 'index',
      render: (_, __, index) => index + 1
    },
    {
      title: '司机姓名',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone'
    },
    {
      title: '服务门店',
      dataIndex: 'stores',
      key: 'stores',
      render: (stores) => Array.isArray(stores) ? stores.map((store: Store) => store.name).join(', ') : '-'
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditDriver(record)}>
            修改
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteDriver(record.id)}>
            删除
          </Button>
        </Space>
      )
    }
  ];
  
  // 物流公司表格列配置
  const companyColumns: ColumnsType<LogisticsCompany> = [
    {
      title: '序号',
      key: 'index',
      render: (_, __, index) => index + 1
    },
    {
      title: '公司名',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '服务门店',
      dataIndex: 'stores',
      key: 'stores',
      render: (stores) => Array.isArray(stores) ? stores.map((store: Store) => store.name).join(', ') : '-'
    },
    {
      title: '联系人',
      dataIndex: 'contactPerson',
      key: 'contactPerson'
    },
    {
      title: '电话',
      dataIndex: 'contactPhone',
      key: 'contactPhone'
    },
    {
      title: '计费规则',
      dataIndex: 'pricingRule',
      key: 'pricingRule'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditCompany(record)}>
            修改
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteCompany(record.id)}>
            删除
          </Button>
        </Space>
      )
    }
  ];
  
  // 打开添加车辆模态框
  const showAddVehicleModal = () => {
    setCurrentVehicle(null);
    setIsVehicleModalVisible(true);
  };
  
  // 打开编辑车辆模态框
  const handleEditVehicle = (vehicle: Vehicle) => {
    setCurrentVehicle(vehicle);
    setIsVehicleModalVisible(true);
  };
  
  // 删除车辆
  const handleDeleteVehicle = (id: string) => {
    Modal.confirm({
      title: '确定要删除这个车辆吗？',
      content: '删除后数据将无法恢复',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        await apiDelete(`/logistics/vehicles/${id}`);
        dispatch(deleteVehicleSuccess(id));
        message.success('车辆删除成功');
      }
    });
  };
  
  // 保存车辆
  const handleSaveVehicle = async () => {
    try {
      const values = await vehicleForm.validateFields();
      const payload = {
        plateNumber: values.plateNumber,
        spec: values.spec,
        remark: values.remark,
        storeIds: Array.isArray(values.stores) ? values.stores : []
      };
      if (currentVehicle) {
        await apiPut(`/logistics/vehicles/${currentVehicle.id}`, payload);
        message.success('车辆信息更新成功');
      } else {
        await apiPost('/logistics/vehicles', payload);
        message.success('车辆添加成功');
      }
      // 保存后刷新列表
      try {
        dispatch(fetchVehiclesStart());
        const apiVehicles = await apiGet<Vehicle[]>('/logistics/vehicles');
        const normalized = (apiVehicles || []).map((v: any) => ({
          ...v,
          stores: Array.isArray(v?.stores) ? v.stores : [],
        }));
        dispatch(fetchVehiclesSuccess(normalized as Vehicle[]));
      } catch (err: any) {
        dispatch(fetchVehiclesFailure(err?.message || '获取车辆列表失败'));
        message.error(err?.message || '获取车辆列表失败');
      }
      setIsVehicleModalVisible(false);
    } catch (errorInfo) {
      message.error('表单验证失败');
    }
  };
  
  // 打开添加司机模态框
  const showAddDriverModal = () => {
    setCurrentDriver(null);
    setIsDriverModalVisible(true);
  };
  
  // 打开编辑司机模态框
  const handleEditDriver = (driver: Driver) => {
    setCurrentDriver(driver);
    setIsDriverModalVisible(true);
  };
  
  // 删除司机
  const handleDeleteDriver = (id: string) => {
    Modal.confirm({
      title: '确定要删除这个司机吗？',
      content: '删除后数据将无法恢复',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        await apiDelete(`/logistics/drivers/${id}`);
        dispatch(deleteDriverSuccess(id));
        message.success('司机删除成功');
      }
    });
  };
  
  // 保存司机
  const handleSaveDriver = async () => {
    try {
      const values = await driverForm.validateFields();
      const payload = {
        name: values.name,
        phone: values.phone,
        remark: values.remark,
        storeIds: Array.isArray(values.stores) ? values.stores : []
      };
      if (currentDriver) {
        await apiPut(`/logistics/drivers/${currentDriver.id}`, payload);
        message.success('司机信息更新成功');
      } else {
        await apiPost('/logistics/drivers', payload);
        message.success('司机添加成功');
      }
      // 保存后刷新列表
      try {
        dispatch(fetchDriversStart());
        const apiDrivers = await apiGet<Driver[]>('/logistics/drivers');
        const normalized = (apiDrivers || []).map((d: any) => ({
          ...d,
          stores: Array.isArray(d?.stores) ? d.stores : [],
        }));
        dispatch(fetchDriversSuccess(normalized as Driver[]));
      } catch (err: any) {
        dispatch(fetchDriversFailure(err?.message || '获取司机列表失败'));
        message.error(err?.message || '获取司机列表失败');
      }
      setIsDriverModalVisible(false);
    } catch (errorInfo) {
      message.error('表单验证失败');
    }
  };
  
  // 打开添加物流公司模态框
  const showAddCompanyModal = () => {
    setCurrentCompany(null);
    setIsCompanyModalVisible(true);
  };
  
  // 打开编辑物流公司模态框
  const handleEditCompany = (company: LogisticsCompany) => {
    setCurrentCompany(company);
    setIsCompanyModalVisible(true);
  };
  
  // 保存物流公司
  const handleSaveCompany = async () => {
    try {
      const values = await companyForm.validateFields();
      const payload = {
        name: values.name,
        contactPerson: values.contactPerson,
        contactPhone: values.contactPhone,
        pricingRule: values.pricingRule,
        storeIds: Array.isArray(values.stores) ? values.stores : []
      };
      if (currentCompany) {
        await apiPut(`/logistics/companies/${currentCompany.id}`, payload);
        message.success('物流公司信息更新成功');
      } else {
        await apiPost('/logistics/companies', payload);
        message.success('物流公司添加成功');
      }
      // 保存后刷新列表
      try {
        dispatch(fetchCompaniesStart());
        const apiCompanies = await apiGet<LogisticsCompany[]>('/logistics/companies');
        const normalized = (apiCompanies || []).map((c: any) => ({
          ...c,
          stores: Array.isArray(c?.stores) ? c.stores : [],
        }));
        dispatch(fetchCompaniesSuccess(normalized as LogisticsCompany[]));
      } catch (err: any) {
        dispatch(fetchCompaniesFailure(err?.message || '获取物流公司列表失败'));
        message.error(err?.message || '获取物流公司列表失败');
      }
      setIsCompanyModalVisible(false);
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  // 删除物流公司
  const handleDeleteCompany = (id: string) => {
    Modal.confirm({
      title: '确定要删除这个物流公司吗？',
      content: '删除后数据将无法恢复',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        await apiDelete(`/logistics/companies/${id}`);
        dispatch(deleteCompanySuccess(id));
        message.success('物流公司删除成功');
      }
    });
  };



  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>物流管理</h2>
      </div>
      
      {/* 物流类型切换 */}
      <Tabs 
        activeKey={logisticsType} 
        onChange={(key) => setLogisticsType(key as 'own' | 'third')}
        items={[
          {
            key: 'own',
            label: '自有物流',
            children: (
              <div>
                {/* 车辆列表 */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={showAddVehicleModal}>
                      新增车辆
                    </Button>
                  </div>
                  <h3 style={{ marginBottom: '16px' }}>拖车列表</h3>
                  <Table
                    columns={vehicleColumns}
                    dataSource={vehicles}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true
                    }}
                  />
                </div>
                
                {/* 司机列表 */}
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={showAddDriverModal}>
                      新增司机
                    </Button>
                  </div>
                  <h3 style={{ marginBottom: '16px' }}>司机列表</h3>
                  <Table
                    columns={driverColumns}
                    dataSource={drivers}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true
                    }}
                  />
                </div>
              </div>
            )
          },
          {
            key: 'third',
            label: '三方物流',
            children: (
              <div>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={showAddCompanyModal}>
                    新增物流公司
                  </Button>
                </div>
                
                {/* 物流公司列表 */}
                <Table
                  columns={companyColumns}
                  dataSource={companies}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true
                  }}
                />
              </div>
            )
          }
        ]}
      />


      
      {/* 新增/编辑车辆模态框 */}
      <Modal
        forceRender
        title={currentVehicle ? '修改车辆信息' : '新增车辆'}
        open={isVehicleModalVisible}
        onCancel={() => setIsVehicleModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsVehicleModalVisible(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={handleSaveVehicle}>确认</Button>
        ]}
        width={600}
        afterOpenChange={(open) => {
          if (open) {
            if (currentVehicle) {
              vehicleForm.setFieldsValue({
                plateNumber: currentVehicle.plateNumber,
                spec: currentVehicle.spec,
                stores: currentVehicle.stores.map(store => store.id),
                remark: currentVehicle.remark
              });
            } else {
              vehicleForm.resetFields();
            }
          }
        }}
      >
        <Form
          form={vehicleForm}
          layout="vertical"
        >
          <Form.Item
            name="plateNumber"
            label="车牌"
            rules={[{ required: true, message: '请输入车牌' }]}
          >
            <Input placeholder="请输入车牌" />
          </Form.Item>
          <Form.Item
            name="spec"
            label="规格"
            rules={[{ required: true, message: '请输入规格' }]}
          >
            <Input placeholder="请输入规格" />
          </Form.Item>
          <Form.Item
            name="stores"
            label="服务门店"
            rules={[{ required: true, message: '请选择服务门店' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择服务门店"
              style={{ width: '100%' }}
            >
              {stores.map(store => (
                <Select.Option key={store.id} value={store.id}>{store.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="remark"
            label="备注"
          >
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
          {/* 附件上传功能在实际应用中需要实现 */}
          <Form.Item label="附件">
            <div style={{ padding: '8px', border: '1px dashed #d9d9d9', borderRadius: '4px', textAlign: 'center' }}>
              <span>附件上传功能（待实现）</span>
            </div>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* 新增/编辑司机模态框 */}
      <Modal
        forceRender
        title={currentDriver ? '修改司机信息' : '新增司机'}
        open={isDriverModalVisible}
        onCancel={() => setIsDriverModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsDriverModalVisible(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={handleSaveDriver}>确认</Button>
        ]}
        width={600}
        afterOpenChange={(open) => {
          if (open) {
            if (currentDriver) {
              driverForm.setFieldsValue({
                name: currentDriver.name,
                phone: currentDriver.phone,
                stores: currentDriver.stores.map(store => store.id),
                remark: currentDriver.remark
              });
            } else {
              driverForm.resetFields();
            }
          }
        }}
      >
        <Form
          form={driverForm}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="电话"
            rules={[{ required: true, message: '请输入电话' }]}
          >
            <Input placeholder="请输入电话" />
          </Form.Item>
          <Form.Item
            name="stores"
            label="服务门店"
            rules={[{ required: true, message: '请选择服务门店' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择服务门店"
              style={{ width: '100%' }}
            >
              {stores.map(store => (
                <Select.Option key={store.id} value={store.id}>{store.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="remark"
            label="备注"
          >
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
          {/* 附件上传功能在实际应用中需要实现 */}
          <Form.Item label="附件">
            <div style={{ padding: '8px', border: '1px dashed #d9d9d9', borderRadius: '4px', textAlign: 'center' }}>
              <span>附件上传功能（待实现）</span>
            </div>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* 新增/编辑物流公司模态框 */}
      <Modal
        forceRender
        title={currentCompany ? '修改物流公司信息' : '新增物流公司'}
        open={isCompanyModalVisible}
        onCancel={() => setIsCompanyModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsCompanyModalVisible(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={handleSaveCompany}>确认</Button>
        ]}
        width={600}
        afterOpenChange={(open) => {
          if (open) {
            if (currentCompany) {
              companyForm.setFieldsValue({
                name: currentCompany.name,
                stores: currentCompany.stores.map(store => store.id),
                contactPerson: currentCompany.contactPerson,
                contactPhone: currentCompany.contactPhone,
                pricingRule: currentCompany.pricingRule
              });
            } else {
              companyForm.resetFields();
            }
          }
        }}
      >
        <Form
          form={companyForm}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="公司名称"
            rules={[{ required: true, message: '请输入公司名称' }]}
          >
            <Input placeholder="请输入公司名称" />
          </Form.Item>
          <Form.Item
            name="stores"
            label="服务门店"
            rules={[{ required: true, message: '请选择服务门店' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择服务门店"
              style={{ width: '100%' }}
            >
              {stores.map(store => (
                <Select.Option key={store.id} value={store.id}>{store.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="contactPerson"
            label="联系人"
            rules={[{ required: true, message: '请输入联系人' }]}
          >
            <Input placeholder="请输入联系人" />
          </Form.Item>
          <Form.Item
            name="contactPhone"
            label="电话"
            rules={[{ required: true, message: '请输入电话' }]}
          >
            <Input placeholder="请输入电话" />
          </Form.Item>
          <Form.Item
            name="pricingRule"
            label="计费规则"
            rules={[{ required: true, message: '请输入计费规则' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入计费规则" />
          </Form.Item>
          {/* 附件上传功能在实际应用中需要实现 */}
          <Form.Item label="附件">
            <div style={{ padding: '8px', border: '1px dashed #d9d9d9', borderRadius: '4px', textAlign: 'center' }}>
              <span>计费报价单上传功能（待实现）</span>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LogisticsManagement;