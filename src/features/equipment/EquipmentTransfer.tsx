import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Input, Select, Table, Modal, Form, Space, Tag, Divider, message, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AppDispatch } from '../../app/store';
import { selectStores as selectStoresFromStore, fetchStores, selectStoresLoading, selectStoresError } from '../stores/storesSlice';
import { apiGet, apiPost, apiPut } from '../../api/client';
import {
  fetchTransferOrdersStart,
  fetchTransferOrdersSuccess,
  fetchTransferOrdersFailure,
  addTransferOrderSuccess,
  updateTransferOrderSuccess,
  fetchEquipmentsStart,
  fetchEquipmentsSuccess,
  fetchEquipmentsFailure,
  fetchInventoryStart,
  fetchInventorySuccess,
  selectTransferOrders,
  selectEquipmentList,
  selectLoading,
  selectError,
  TransferOrder,
  Equipment
} from './equipmentslice';
import {
  selectVehicles,
  selectDrivers,
  selectCompanies,
  fetchVehiclesStart,
  fetchVehiclesSuccess,
  fetchVehiclesFailure,
  fetchDriversStart,
  fetchDriversSuccess,
  fetchDriversFailure,
  fetchCompaniesStart,
  fetchCompaniesSuccess,
  fetchCompaniesFailure,
  selectLoading as selectLogisticsLoading,
  selectError as selectLogisticsError
} from '../logistics/logisticsSlice';

import EquipmentPickerModal from '../orders/components/EquipmentPickerModal';
const { Option } = Select;
const { TextArea } = Input;

type LogisticsUIType = '退场物流' | '我方物流' | '第三方物流';

const EquipmentTransfer: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const transferOrders = useSelector(selectTransferOrders);
  const equipmentList = useSelector(selectEquipmentList);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);
  const stores = useSelector(selectStoresFromStore);
  const storesLoading = useSelector(selectStoresLoading);
  const storesError = useSelector(selectStoresError);
  const vehicles = useSelector(selectVehicles);
  const drivers = useSelector(selectDrivers);
  const companies = useSelector(selectCompanies);
  const logisticsLoading = useSelector(selectLogisticsLoading);
  const logisticsError = useSelector(selectLogisticsError);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  // 物流类型由表单字段控制，不再使用独立 useLogistics 状态
  const [selectedEquipments, setSelectedEquipments] = useState<Equipment[]>([]);
  const [availableEquipments, setAvailableEquipments] = useState<Equipment[]>([]);
  const [sourceWarehouse, setSourceWarehouse] = useState('');
  const [targetWarehouse, setTargetWarehouse] = useState('');
  const [isPickerModalVisible, setIsPickerModalVisible] = useState(false);

  // 模拟当前登录用户
  const currentUser = '系统管理员';

  // 模拟数据获取
  useEffect(() => {
    fetchTransferOrders();
    fetchEquipments();
    // 加载门店列表（用于仓库选择）
    if (!stores || stores.length === 0) {
      dispatch(fetchStores());
    }
    // 加载物流数据（车辆/司机/公司），与进退场逻辑保持一致
    (async () => {
      try {
        if (!vehicles || vehicles.length === 0) {
          dispatch(fetchVehiclesStart());
          try {
            const vs = await apiGet<any[]>('/logistics/vehicles');
            dispatch(fetchVehiclesSuccess(vs));
          } catch (err: any) {
            dispatch(fetchVehiclesFailure(err?.message || '获取车辆列表失败'));
            message.error(err?.message || '获取车辆列表失败');
          }
        }
        if (!drivers || drivers.length === 0) {
          dispatch(fetchDriversStart());
          try {
            const ds = await apiGet<any[]>('/logistics/drivers');
            dispatch(fetchDriversSuccess(ds));
          } catch (err: any) {
            dispatch(fetchDriversFailure(err?.message || '获取司机列表失败'));
            message.error(err?.message || '获取司机列表失败');
          }
        }
        if (!companies || companies.length === 0) {
          dispatch(fetchCompaniesStart());
          try {
            const cs = await apiGet<any[]>('/logistics/companies');
            dispatch(fetchCompaniesSuccess(cs));
          } catch (err: any) {
            dispatch(fetchCompaniesFailure(err?.message || '获取物流公司列表失败'));
            message.error(err?.message || '获取物流公司列表失败');
          }
        }
      } catch {}
    })();
  }, []);

  const fetchTransferOrders = async () => {
    dispatch(fetchTransferOrdersStart());
    try {
      // 在实际应用中，这里应该是API调用
      dispatch(fetchTransferOrdersSuccess(transferOrders as TransferOrder[]));
    } catch (err) {
      dispatch(fetchTransferOrdersFailure('获取调拨单列表失败'));
    }
  };

  const fetchEquipments = async () => {
    dispatch(fetchEquipmentsStart());
    try {
      const equipments = await apiGet<Equipment[]>('/equipments');
      dispatch(fetchEquipmentsSuccess(equipments || []));
    } catch (err) {
      dispatch(fetchEquipmentsFailure('获取设备列表失败'));
    }
  };

  // 根据选择的调出仓库过滤可用设备
  useEffect(() => {
    if (sourceWarehouse) {
      const filtered = (equipmentList as Equipment[]).filter((equipment: Equipment) => 
        equipment.storeName === sourceWarehouse &&  // 使用storeName而不是warehouse
        equipment.rentalStatus === 'waiting'  // 只显示待租状态的设备
      );
      setAvailableEquipments(filtered);
    } else {
      setAvailableEquipments([]);
    }
  }, [sourceWarehouse, equipmentList]);

  const handleAddTransferOrder = () => {
    // 生成调拨单号（格式：TR+日期+随机数）
    const today = new Date();
    const dateStr = today.getFullYear() + 
      String(today.getMonth() + 1).padStart(2, '0') + 
      String(today.getDate()).padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNumber = `TR${dateStr}${randomNum}`;

    form.resetFields();
    setSelectedEquipments([]);
    // 重置物流类型
    form.setFieldsValue({ logisticsType: undefined, vehicleId: undefined, driverId: undefined, companyId: undefined, companyContactName: undefined, companyContactPhone: undefined, logisticsCost: undefined });
    setSourceWarehouse('');
    setTargetWarehouse('');
    
    // 设置初始值
    form.setFieldsValue({
      orderNumber: orderNumber,
      applicant: currentUser,
      status: 'pending'
    });
    
    setIsModalVisible(true);
  };

  const handleSaveTransferOrder = async () => {
    try {
      const values = await form.validateFields();
      
      if (selectedEquipments.length === 0) {
        message.error('请至少选择一个设备');
        return;
      }
      // 验证：调入与调出不能为同一门店
      if (values.sourceWarehouse && values.targetWarehouse && values.sourceWarehouse === values.targetWarehouse) {
        message.error('调入仓库和调出仓库不能选择相同门店');
        return;
      }

      const logisticsType: LogisticsUIType = values.logisticsType;
      const driver = (drivers || []).find(d => d.id === values.driverId);
      const company = (companies || []).find(c => c.id === values.companyId);

      const transferOrderData: TransferOrder = {
        id: `TO${Date.now()}`,
        orderNumber: values.orderNumber,
        applicant: values.applicant,
        sourceWarehouse: values.sourceWarehouse,
        targetWarehouse: values.targetWarehouse,
        useLogistics: !!logisticsType,
        logisticsType,
        // 按物流类型映射字段
        vehicleId: logisticsType === '我方物流' ? values.vehicleId : undefined,
        driverId: logisticsType === '我方物流' ? values.driverId : undefined,
        companyId: logisticsType === '第三方物流' ? values.companyId : undefined,
        logisticsCompany: logisticsType === '第三方物流' ? company?.name : (logisticsType || undefined),
        logisticsCost: logisticsType === '第三方物流' && values.logisticsCost ? parseFloat(values.logisticsCost) : undefined,
        companyContactName: logisticsType === '第三方物流' ? values.companyContactName : undefined,
        companyContactPhone: logisticsType === '第三方物流' ? values.companyContactPhone : undefined,
        // 兼容旧字段：联系人/电话（我方物流用司机信息）
        logisticsContact: logisticsType === '我方物流' ? driver?.name : (logisticsType === '第三方物流' ? values.companyContactName : undefined),
        logisticsPhone: logisticsType === '我方物流' ? driver?.phone : (logisticsType === '第三方物流' ? values.companyContactPhone : undefined),
        reason: values.reason,
        equipmentIds: selectedEquipments.map(equip => equip.id),
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      // 后端校验与创建
      try {
        const resp = await apiPost<{ id: string }>('/transfers', {
          orderNumber: transferOrderData.orderNumber,
          applicant: transferOrderData.applicant,
          sourceWarehouse: transferOrderData.sourceWarehouse,
          targetWarehouse: transferOrderData.targetWarehouse,
          useLogistics: transferOrderData.useLogistics,
          logisticsType: transferOrderData.logisticsType,
          vehicleId: transferOrderData.vehicleId,
          driverId: transferOrderData.driverId,
          companyId: transferOrderData.companyId,
          companyContactName: transferOrderData.companyContactName,
          companyContactPhone: transferOrderData.companyContactPhone,
          logisticsCompany: transferOrderData.logisticsCompany,
          logisticsCost: transferOrderData.logisticsCost,
          logisticsContact: transferOrderData.logisticsContact,
          logisticsPhone: transferOrderData.logisticsPhone,
          reason: transferOrderData.reason,
          equipmentIds: transferOrderData.equipmentIds,
          status: transferOrderData.status,
        });
        const returnedId = resp?.id ? String(resp.id) : transferOrderData.id;
        dispatch(addTransferOrderSuccess({ ...transferOrderData, id: returnedId }));
        message.success('调拨单创建成功');
      } catch (err: any) {
        message.error(err?.message || '调拨单创建失败');
        return;
      }
      setIsModalVisible(false);
    } catch (errorInfo) {
      message.error('表单验证失败');
    }
  };

  const handleApproveTransferOrder = async (orderId: string) => {
    const order = (transferOrders as TransferOrder[]).find((o: TransferOrder) => o.id === orderId);
    if (!order) return;

    try {
      // 调用后端API审批调拨单
      await apiPut(`/transfers/${orderId}`, { status: 'approved' });

      // 更新Redux状态
      dispatch(updateTransferOrderSuccess({ ...order, status: 'approved', updatedAt: new Date().toISOString() }));
      message.success('调拨单已审批');
    } catch (err: any) {
      message.error(err?.message || '调拨审批失败');
    }
  };

  const handleCompleteTransferOrder = async (orderId: string) => {
    const order = (transferOrders as TransferOrder[]).find((o: TransferOrder) => o.id === orderId);
    if (!order) return;

    try {
      // 调用后端API完成调拨单
      await apiPut(`/transfers/${orderId}`, { status: 'completed' });

      // 更新Redux状态
      dispatch(updateTransferOrderSuccess({ ...order, status: 'completed', updatedAt: new Date().toISOString() }));
      
      // 刷新设备列表和库存统计
      fetchEquipments();
      dispatch(fetchInventoryStart());
      try {
        const inventoryStats = await apiGet<any>('/equipments/inventory/stats');
        dispatch(fetchInventorySuccess(inventoryStats));
      } catch (inventoryErr) {
        console.warn('刷新库存统计失败:', inventoryErr);
      }

      message.success('调拨单已完成，设备仓库信息已同步更新');
    } catch (err: any) {
      message.error(err?.message || '调拨完成失败');
    }
  };

  

  const handleRemoveEquipment = (equipmentId: string) => {
    setSelectedEquipments(selectedEquipments.filter(e => e.id !== equipmentId));
  };

  const handleCompanyChange = (companyId: string) => {
    const company = (companies || []).find(c => c.id === companyId);
    form.setFieldsValue({
      companyContactName: company?.contactPerson,
      companyContactPhone: company?.contactPhone,
    });
  };

  const renderLogisticsFields = () => {
    const logisticsType: LogisticsUIType = form.getFieldValue('logisticsType');
    if (logisticsType === '退场物流' || !logisticsType) return null;
    if (logisticsType === '我方物流') {
      return (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="vehicleId"
              label="物流车辆"
              rules={[
                { required: true, message: '请选择物流车辆' },
                { validator: (_, value) => { if (!value) return Promise.resolve(); return (vehicles || []).find(v => v.id === value) ? Promise.resolve() : Promise.reject(new Error('所选车辆不存在，请重新选择')); } }
              ]}
              validateStatus={logisticsError ? 'error' : undefined}
              help={logisticsError || undefined}
            >
              <Select
                placeholder="请选择车辆（车牌号）"
                loading={logisticsLoading}
                showSearch
                allowClear
                optionFilterProp="children"
                notFoundContent={logisticsLoading ? '加载中...' : '暂无车辆'}
              >
                {(vehicles || []).map(v => (
                  <Select.Option key={v.id} value={v.id}>{v.plateNumber}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="driverId"
              label="司机姓名/电话"
              rules={[
                { required: true, message: '请选择司机' },
                { validator: (_, value) => { if (!value) return Promise.resolve(); return (drivers || []).find(d => d.id === value) ? Promise.resolve() : Promise.reject(new Error('所选司机不存在，请重新选择')); } }
              ]}
              validateStatus={logisticsError ? 'error' : undefined}
              help={logisticsError || undefined}
            >
              <Select
                placeholder="请选择司机"
                loading={logisticsLoading}
                showSearch
                allowClear
                optionFilterProp="children"
                notFoundContent={logisticsLoading ? '加载中...' : '暂无司机'}
              >
                {(drivers || []).map(d => (
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
            <Form.Item
              name="companyId"
              label="物流公司"
              rules={[
                { required: true, message: '请选择物流公司' },
                { validator: (_, value) => { if (!value) return Promise.resolve(); return (companies || []).find(c => c.id === value) ? Promise.resolve() : Promise.reject(new Error('所选物流公司不存在，请重新选择')); } }
              ]}
              validateStatus={logisticsError ? 'error' : undefined}
              help={logisticsError || undefined}
            >
              <Select
                placeholder="请选择物流公司"
                onChange={handleCompanyChange}
                loading={logisticsLoading}
                showSearch
                allowClear
                optionFilterProp="children"
                notFoundContent={logisticsLoading ? '加载中...' : '暂无物流公司'}
              >
                {(companies || []).map(c => (
                  <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="联系人姓名/电话">
              <Space.Compact>
                <Form.Item name="companyContactName" noStyle>
                  <Input style={{ width: '50%' }} placeholder="自动显示联系人" disabled />
                </Form.Item>
                <Form.Item name="companyContactPhone" noStyle>
                  <Input style={{ width: '50%' }} placeholder="自动显示电话" disabled />
                </Form.Item>
              </Space.Compact>
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

  // 表格列配置
  const columns: ColumnsType<TransferOrder> = [
    {
      title: '调拨单号',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
    },
    {
      title: '申请人',
      dataIndex: 'applicant',
      key: 'applicant',
    },
    {
      title: '调出仓库',
      dataIndex: 'sourceWarehouse',
      key: 'sourceWarehouse',
    },
    {
      title: '调入仓库',
      dataIndex: 'targetWarehouse',
      key: 'targetWarehouse',
    },
    {
      title: '是否物流',
      dataIndex: 'useLogistics',
      key: 'useLogistics',
      render: (useLogistics) => (
        <Tag color={useLogistics ? 'blue' : 'gray'}>
          {useLogistics ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '调拨设备数',
      dataIndex: 'equipmentIds',
      key: 'equipmentCount',
      render: (equipmentIds) => equipmentIds.length,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = '';
        let text = '';
        switch (status) {
          case 'pending':
            color = 'orange';
            text = '待审批';
            break;
          case 'approved':
            color = 'blue';
            text = '已审批';
            break;
          case 'completed':
            color = 'green';
            text = '已完成';
            break;
          default:
            color = 'default';
            text = status;
        }
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt) => new Date(createdAt).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const actions = [];
        if (record.status === 'pending') {
          actions.push(
            <Button key="approve" type="link" icon={<CheckOutlined />} onClick={() => handleApproveTransferOrder(record.id)}>审批</Button>
          );
        } else if (record.status === 'approved') {
          actions.push(
            <Button key="complete" type="link" icon={<CheckOutlined />} onClick={() => handleCompleteTransferOrder(record.id)}>完成</Button>
          );
        }
        actions.push(
          <Button key="view" type="link" icon={<EditOutlined />}>查看</Button>
        );
        return (
          <Space size="middle">
            {actions}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>设备调拨管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTransferOrder}>
          新增调拨单
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={transferOrders as TransferOrder[]}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: '暂无调拨单数据' }}
      />

      {/* 新增调拨单模态框 */}
      <Modal
        title="新增调拨单"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={handleSaveTransferOrder}>保存</Button>
        ]}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="orderNumber"
            label="调拨单号"
          >
            <Input disabled />
          </Form.Item>

          <Form.Item
            name="applicant"
            label="申请人"
          >
            <Input disabled />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sourceWarehouse"
                label="调出仓库"
                rules={[
                  { required: true, message: '请选择调出仓库' },
                  {
                    validator: (_, value) => {
                      const target = form.getFieldValue('targetWarehouse');
                      if (!value || !target || value !== target) return Promise.resolve();
                      return Promise.reject(new Error('调出仓库和调入仓库不能选择相同门店'));
                    }
                  }
                ]}
                validateStatus={storesError ? 'error' : undefined}
                help={storesError || undefined}
              >
                <Select
                  placeholder="请选择调出仓库"
                  onChange={(value) => {
                    setSourceWarehouse(value);
                    if (form.getFieldValue('targetWarehouse') === value) {
                      form.setFieldsValue({ targetWarehouse: undefined });
                    }
                  }}
                  loading={storesLoading}
                  showSearch
                  optionFilterProp="children"
                  notFoundContent={storesLoading ? '加载中...' : '暂无门店'}
                >
                  {(stores || []).filter(s => s.name !== (targetWarehouse || '')).map(s => (
                    <Option key={s.id} value={s.name}>{s.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="targetWarehouse"
                label="调入仓库"
                rules={[
                  { required: true, message: '请选择调入仓库' },
                  {
                    validator: (_, value) => {
                      const source = form.getFieldValue('sourceWarehouse');
                      if (!value || !source || value !== source) return Promise.resolve();
                      return Promise.reject(new Error('调入仓库和调出仓库不能选择相同门店'));
                    }
                  }
                ]}
                validateStatus={storesError ? 'error' : undefined}
                help={storesError || undefined}
              >
                <Select
                  placeholder="请选择调入仓库"
                  onChange={(value) => {
                    setTargetWarehouse(value);
                    if (form.getFieldValue('sourceWarehouse') === value) {
                      form.setFieldsValue({ sourceWarehouse: undefined });
                    }
                  }}
                  loading={storesLoading}
                  showSearch
                  optionFilterProp="children"
                  notFoundContent={storesLoading ? '加载中...' : '暂无门店'}
                >
                  {(stores || []).filter(s => s.name !== (sourceWarehouse || '')).map(s => (
                    <Option key={s.id} value={s.name}>{s.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="logisticsType"
            label="物流类型"
            rules={[{ required: true, message: '请选择物流类型' }]}
          >
            <Select placeholder="请选择物流类型">
              <Option value="退场物流">退场物流</Option>
              <Option value="我方物流">我方物流</Option>
              <Option value="第三方物流">第三方物流</Option>
            </Select>
          </Form.Item>

          {/* 物流选择页面（联动显示）*/}
          <Form.Item shouldUpdate={(prev, curr) => prev.logisticsType !== curr.logisticsType} noStyle>
            {() => renderLogisticsFields()}
          </Form.Item>

          <Form.Item
            name="reason"
            label="调拨原因"
            rules={[{ required: true, message: '请输入调拨原因' }]}
          >
            <TextArea rows={3} placeholder="请输入调拨原因" />
          </Form.Item>

          <Divider>选择调拨设备</Divider>
          <Row style={{ marginBottom: 16 }}>
            <Col span={24} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button
                type="primary"
                onClick={() => setIsPickerModalVisible(true)}
                disabled={!sourceWarehouse || availableEquipments.length === 0}
              >
                选择设备
              </Button>
              {!sourceWarehouse && <span style={{ color: '#999' }}>请先选择调出仓库</span>}
              {sourceWarehouse && availableEquipments.length === 0 && <span style={{ color: '#999' }}>该仓库暂无可调拨设备</span>}
            </Col>
          </Row>

          {selectedEquipments.length > 0 && (
            <div>
              <h4 style={{ marginBottom: '12px' }}>已选择设备</h4>
              <Space direction="vertical" style={{ display: 'block', width: '100%' }}>
                {selectedEquipments.map((equipment) => (
                  <div 
                    key={equipment.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '4px'
                    }}
                  >
                    <div>
                      <span style={{ marginRight: '16px' }}>编码: {equipment.code}</span>
                      <span style={{ marginRight: '16px' }}>自编码: {equipment.customCode}</span>
                      <span>类型: {equipment.type}</span>
                    </div>
                    <Button 
                      danger 
                      type="text" 
                      icon={<CloseOutlined />} 
                      onClick={() => handleRemoveEquipment(equipment.id)}
                    />
                  </div>
                ))}
              </Space>
            </div>
          )}
        </Form>
      </Modal>

      {isPickerModalVisible && (
        <EquipmentPickerModal
          open={isPickerModalVisible}
          item={{ equipmentType: '', height: '', quantity: 0 }}
          equipmentList={availableEquipments}
          initialSelectedCodes={selectedEquipments.map(e => e.code)}
          onCancel={() => setIsPickerModalVisible(false)}
          onConfirm={(selectedCodes) => {
            const byCode = new Map(availableEquipments.map(e => [e.code, e]));
            const newSelection = selectedCodes.map(code => byCode.get(code)).filter(Boolean) as Equipment[];
            setSelectedEquipments(newSelection);
            setIsPickerModalVisible(false);
          }}
          onlyWaitingDefault={true}
          forceWaitingOnly={true} // 调拨场景下强制只显示待租设备
        />
      )}

      {error && <div style={{ color: 'red', marginTop: '10px', textAlign: 'center' }}>{error}</div>}
    </div>
  );
};

export default EquipmentTransfer;