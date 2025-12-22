/**
 * 物流台账页面
 * 功能：展示和管理所有物流台账记录（自动记录 + 手动创建）
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  DatePicker,
  Select,
  Input,
  Row,
  Col,
  Statistic,
  Modal,
  Form,
  InputNumber,
  message,
  Tooltip,
  Badge,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  EyeOutlined,
  FilterOutlined,
  DollarOutlined,
  CarOutlined,
  ShopOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { apiGet, apiPost, apiDelete } from '../../api/client';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../app/store';
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
  fetchCompaniesFailure
} from '../logistics/logisticsSlice';
import { selectStores, fetchStores } from '../stores/storesSlice';

const { RangePicker } = DatePicker;
const { Option } = Select;

// 物流台账记录类型
interface LogisticsLedgerRecord {
  id: number;
  ledgerNumber: string;
  orderId: number;
  orderNumber: string;
  customerName?: string;
  projectName?: string;
  entryId?: number;
  exitId?: number;
  logisticsType: 'own' | 'third' | 'customer';
  recordType: 'entry' | 'exit' | 'warehouse_transfer';
  storeId: number;
  storeName: string;
  logisticsCost: number;
  recordDate: string;
  vehicleId?: number;
  vehiclePlate?: string;
  driverId?: number;
  driverName?: string;
  driverPhone?: string;
  companyId?: number;
  companyName?: string;
  companyContactName?: string;
  companyContactPhone?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

// 统计数据类型
interface StatisticsData {
  totalCount: number;
  totalCost: number;
  entryCount: number;
  exitCount: number;
  ownLogisticsCount: number;
  thirdLogisticsCount: number;
}

const LogisticsLedgerPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<LogisticsLedgerRecord[]>([]);
  const [statistics, setStatistics] = useState<StatisticsData>({
    totalCount: 0,
    totalCost: 0,
    entryCount: 0,
    exitCount: 0,
    ownLogisticsCount: 0,
    thirdLogisticsCount: 0,
  });
  
  // 订单列表（用于下拉选择）
  const [orderList, setOrderList] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // 物流资源（车辆、司机、物流公司）
  const vehicles = useSelector(selectVehicles);
  const drivers = useSelector(selectDrivers);
  const companies = useSelector(selectCompanies);
  const stores = useSelector(selectStores);
  
  // 筛选条件
  const [filters, setFilters] = useState({
    dateRange: null as [Dayjs, Dayjs] | null,
    logisticsType: undefined as string | undefined,
    recordType: undefined as string | undefined,
    orderNumber: '',
    ledgerNumber: '',
  });
  
  // 详情弹窗
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<LogisticsLedgerRecord | null>(null);
  
  // 手动创建弹窗
  const [createVisible, setCreateVisible] = useState(false);
  const [form] = Form.useForm();

  // 加载数据
  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      
      if (filters.dateRange) {
        params.startDate = filters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = filters.dateRange[1].format('YYYY-MM-DD');
      }
      if (filters.logisticsType) params.logisticsType = filters.logisticsType;
      if (filters.recordType) params.recordType = filters.recordType;
      if (filters.orderNumber) params.orderNumber = filters.orderNumber;
      if (filters.ledgerNumber) params.ledgerNumber = filters.ledgerNumber;
      
      const response = await apiGet<any>('/logistics/ledger?' + params.toString());
      // 后端可能返回 { ok, data } 格式
      const data = response?.data || response || [];
      console.log('[LogisticsLedger] 获取到的数据:', data);
      setDataSource(Array.isArray(data) ? data : []);
      
      // 计算统计数据
      calculateStatistics(Array.isArray(data) ? data : []);
    } catch (error: any) {
      message.error(error.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 计算统计数据
  const calculateStatistics = (data: LogisticsLedgerRecord[]) => {
    const stats: StatisticsData = {
      totalCount: data.length,
      totalCost: data.reduce((sum, item) => sum + Number(item.logisticsCost || 0), 0),
      entryCount: data.filter(item => item.recordType === 'entry').length,
      exitCount: data.filter(item => item.recordType === 'exit').length,
      ownLogisticsCount: data.filter(item => item.logisticsType === 'own').length,
      thirdLogisticsCount: data.filter(item => item.logisticsType === 'third').length,
    };
    setStatistics(stats);
  };

  // 获取订单列表
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await apiGet<any>('/orders');
      const data = response?.data || response || [];
      if (Array.isArray(data)) {
        setOrderList(data);
      }
    } catch (error) {
      console.error('获取订单列表失败:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // 获取物流资源（车辆、司机、物流公司）
  const fetchLogisticsResources = async () => {
    try {
      // 获取车辆
      dispatch(fetchVehiclesStart());
      const vehiclesRes = await apiGet<any[]>('/logistics/vehicles');
      if (Array.isArray(vehiclesRes)) {
        dispatch(fetchVehiclesSuccess(vehiclesRes));
      }
    } catch (err) {
      dispatch(fetchVehiclesFailure(String(err)));
    }

    try {
      // 获取司机
      dispatch(fetchDriversStart());
      const driversRes = await apiGet<any[]>('/logistics/drivers');
      if (Array.isArray(driversRes)) {
        dispatch(fetchDriversSuccess(driversRes));
      }
    } catch (err) {
      dispatch(fetchDriversFailure(String(err)));
    }

    try {
      // 获取物流公司
      dispatch(fetchCompaniesStart());
      const companiesRes = await apiGet<any[]>('/logistics/companies');
      if (Array.isArray(companiesRes)) {
        dispatch(fetchCompaniesSuccess(companiesRes));
      }
    } catch (err) {
      dispatch(fetchCompaniesFailure(String(err)));
    }
  };

  useEffect(() => {
    fetchData();
    fetchOrders();
    fetchLogisticsResources();
    dispatch(fetchStores());
  }, []);

  // 查看详情
  const handleViewDetail = (record: LogisticsLedgerRecord) => {
    setSelectedRecord(record);
    setDetailVisible(true);
  };

  // 删除台账记录
  const handleDelete = (record: LogisticsLedgerRecord) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除台账编号为 "${record.ledgerNumber}" 的记录吗？`,
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await apiDelete(`/logistics/ledger/${record.id}`);
          message.success('删除成功');
          fetchData(); // 重新加载数据
        } catch (error: any) {
          message.error(error.message || '删除失败');
        }
      },
    });
  };

  // 物流公司选择变更时，自动填充联系人信息
  const handleCompanyChange = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      form.setFieldsValue({
        companyContactName: company.contactPerson || '',
        companyContactPhone: company.contactPhone || ''
      });
    }
  };

  // 手动创建台账
  const handleCreate = async (values: any) => {
    try {
      // 从订单ID获取订单编号
      const selectedOrder = orderList.find(o => String(o.id) === String(values.orderId));
      
      // 获取门店信息
      const selectedStore = stores.find(s => String(s.id) === String(values.storeId));
      
      // 构建物流信息
      let vehiclePlate, driverName, driverPhone, companyName, companyContactName, companyContactPhone;
      
      if (values.logisticsType === 'own') {
        // 我方物流
        const vehicle = vehicles.find(v => v.id === values.vehicleId);
        const driver = drivers.find(d => d.id === values.driverId);
        vehiclePlate = vehicle?.plateNumber;
        driverName = driver?.name;
        driverPhone = driver?.phone;
      } else if (values.logisticsType === 'third') {
        // 第三方物流
        const company = companies.find(c => c.id === values.companyId);
        companyName = company?.name;
        companyContactName = company?.contactPerson;
        companyContactPhone = company?.contactPhone;
      }
      
      const payload = {
        orderId: values.orderId,
        orderNumber: selectedOrder?.contractNumber || '',
        recordType: values.recordType,
        logisticsType: values.logisticsType,
        storeId: values.storeId,
        storeName: selectedStore?.name || '',
        logisticsCost: values.logisticsCost || 0,
        recordDate: values.recordDate ? dayjs(values.recordDate).format('YYYY-MM-DD') : undefined,
        vehicleId: values.vehicleId,
        vehiclePlate,
        driverId: values.driverId,
        driverName,
        driverPhone,
        companyId: values.companyId,
        companyName,
        companyContactName,
        companyContactPhone,
        remark: values.remark
      };
      
      const response = await apiPost('/logistics/ledger', payload);
      message.success('台账创建成功');
      setCreateVisible(false);
      form.resetFields();
      fetchData();
    } catch (error: any) {
      message.error(error.message || '创建失败');
    }
  };

  // 根据物流类型渲染不同的物流字段
  const renderLogisticsFields = () => {
    const logisticsType = form.getFieldValue('logisticsType');
    
    // 我方物流
    if (logisticsType === 'own') {
      return (
        <React.Fragment>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="vehicleId"
                label="物流车辆"
                rules={[{ required: true, message: '请选择物流车辆' }]}
              >
                <Select
                  placeholder="请选择车辆（车牌号）"
                  showSearch
                  optionFilterProp="children"
                >
                  {vehicles.map(v => (
                    <Select.Option key={v.id} value={v.id}>
                      {v.plateNumber}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="driverId"
                label="司机姓名/电话"
                rules={[{ required: true, message: '请选择司机' }]}
              >
                <Select
                  placeholder="请选择司机"
                  showSearch
                  optionFilterProp="children"
                >
                  {drivers.map(d => (
                    <Select.Option key={d.id} value={d.id}>
                      {`${d.name} / ${d.phone}`}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </React.Fragment>
      );
    }
    
    // 第三方物流
    if (logisticsType === 'third') {
      return (
        <React.Fragment>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="companyId"
                label="物流公司"
                rules={[{ required: true, message: '请选择物流公司' }]}
              >
                <Select
                  placeholder="请选择物流公司"
                  onChange={handleCompanyChange}
                  showSearch
                  optionFilterProp="children"
                >
                  {companies.map(c => (
                    <Select.Option key={c.id} value={c.id}>
                      {c.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="联系人姓名/电话">
                <Space.Compact style={{ width: '100%' }}>
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
        </React.Fragment>
      );
    }
    
    return null;
  };

  // 导出数据
  const handleExport = () => {
    const getRecordTypeText = (type: string) => {
      const typeMap: Record<string, string> = {
        entry: '进场',
        exit: '退场',
        warehouse_transfer: '仓库调拨',
      };
      return typeMap[type] || type;
    };

    const csvContent = [
      ['台账编号', '订单编号', '记录类型', '物流类型', '物流费用', '记录日期', '门店', '备注'].join(','),
      ...dataSource.map(record => [
        record.ledgerNumber || '',
        record.orderNumber || '',
        getRecordTypeText(record.recordType),
        record.logisticsType === 'own' ? '自有物流' : record.logisticsType === 'third' ? '三方物流' : '客户自提',
        (record.logisticsCost || 0).toFixed(2),
        record.recordDate ? dayjs(record.recordDate).format('YYYY-MM-DD') : '',
        record.storeName || '',
        record.remark || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `物流台账_${dayjs().format('YYYYMMDD')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('导出成功');
  };

  // 表格列定义
  const columns: ColumnsType<LogisticsLedgerRecord> = [
    {
      title: '台账编号',
      dataIndex: 'ledgerNumber',
      key: 'ledgerNumber',
      width: 150,
      fixed: 'left',
      render: (text) => <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '合同名称',
      key: 'contractName',
      width: 200,
      render: (_, record) => {
        const contractName = record.customerName && record.projectName 
          ? `${record.customerName}/${record.projectName}` 
          : record.orderNumber;
        return <a>{contractName}</a>;
      },
    },
    {
      title: '记录类型',
      dataIndex: 'recordType',
      key: 'recordType',
      width: 100,
      align: 'center',
      render: (type: string) => {
        const typeConfig: Record<string, { color: string; text: string }> = {
          entry: { color: 'blue', text: '进场' },
          exit: { color: 'green', text: '退场' },
          warehouse_transfer: { color: 'purple', text: '仓库调拨' },
        };
        const config = typeConfig[type] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '物流类型',
      dataIndex: 'logisticsType',
      key: 'logisticsType',
      width: 120,
      align: 'center',
      render: (type: string) => {
        const config: Record<string, { text: string; color: string; icon: any }> = {
          own: { text: '自有物流', color: 'cyan', icon: <CarOutlined /> },
          third: { text: '三方物流', color: 'orange', icon: <ShopOutlined /> },
          customer: { text: '客户自提', color: 'purple', icon: <FileTextOutlined /> },
          '自有物流': { text: '自有物流', color: 'cyan', icon: <CarOutlined /> },
          '我方物流': { text: '自有物流', color: 'cyan', icon: <CarOutlined /> },
          '第三方物流': { text: '三方物流', color: 'orange', icon: <ShopOutlined /> },
          '三方物流': { text: '三方物流', color: 'orange', icon: <ShopOutlined /> },
        };
        const configItem = config[type] || config['own'];
        return (
          <Tag color={configItem.color} icon={configItem.icon}>
            {configItem.text}
          </Tag>
        );
      },
    },
    {
      title: '物流费用',
      dataIndex: 'logisticsCost',
      key: 'logisticsCost',
      width: 120,
      align: 'right',
      render: (cost: number) => (
        <span style={{ color: '#ff4d4f', fontWeight: 500 }}>
          ¥{(cost || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: '记录日期',
      dataIndex: 'recordDate',
      key: 'recordDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '门店',
      dataIndex: 'storeName',
      key: 'storeName',
      width: 120,
    },
    {
      title: '物流信息',
      key: 'logisticsInfo',
      width: 200,
      render: (_, record) => {
        if (record.logisticsType === 'own') {
          return (
            <div style={{ fontSize: 12 }}>
              <div>车辆：{record.vehiclePlate || '—'}</div>
              <div style={{ color: '#8c8c8c' }}>司机：{record.driverName || '—'}</div>
            </div>
          );
        } else if (record.logisticsType === 'third') {
          return (
            <div style={{ fontSize: 12 }}>
              <div>{record.companyName || '—'}</div>
              <div style={{ color: '#8c8c8c' }}>联系人：{record.companyContactName || '—'}</div>
            </div>
          );
        }
        return <span style={{ color: '#8c8c8c' }}>—</span>;
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
      ellipsis: true,
      render: (text) => text || <span style={{ color: '#d9d9d9' }}>—</span>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>物流台账</h2>
        <p style={{ margin: '8px 0 0 0', color: '#8c8c8c' }}>
          自动记录进退场物流信息，支持手动创建和数据导出
        </p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总记录数"
              value={statistics.totalCount}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总物流费用"
              value={statistics.totalCost}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="进场记录"
              value={statistics.entryCount}
              suffix={
                <span style={{ fontSize: 14, color: '#8c8c8c' }}>
                  / 退场 {statistics.exitCount}
                </span>
              }
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="自有物流"
              value={statistics.ownLogisticsCount}
              suffix={
                <span style={{ fontSize: 14, color: '#8c8c8c' }}>
                  / 三方 {statistics.thirdLogisticsCount}
                </span>
              }
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选和操作区 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
              value={filters.dateRange}
              onChange={(dates) => setFilters({ ...filters, dateRange: dates as [Dayjs, Dayjs] | null })}
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="记录类型"
              allowClear
              value={filters.recordType}
              onChange={(value) => setFilters({ ...filters, recordType: value })}
            >
              <Option value="entry">进场</Option>
              <Option value="exit">退场</Option>
              <Option value="warehouse_transfer">仓库调拨</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="物流类型"
              allowClear
              value={filters.logisticsType}
              onChange={(value) => setFilters({ ...filters, logisticsType: value })}
            >
              <Option value="own">自有物流</Option>
              <Option value="third">三方物流</Option>
              <Option value="customer">客户自提</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Input
              placeholder="搜索订单编号"
              prefix={<SearchOutlined />}
              allowClear
              value={filters.orderNumber}
              onChange={(e) => setFilters({ ...filters, orderNumber: e.target.value })}
            />
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={fetchData}
              >
                查询
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setFilters({
                    dateRange: null,
                    logisticsType: undefined,
                    recordType: undefined,
                    orderNumber: '',
                    ledgerNumber: '',
                  });
                  fetchData();
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>
        <Row style={{ marginTop: 16 }}>
          <Col span={24}>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateVisible(true)}
              >
                手动创建台账
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={handleExport}
                disabled={dataSource.length === 0}
              >
                导出数据
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 数据表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            defaultPageSize: 20,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>台账详情</span>
          </Space>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedRecord && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="台账编号" span={2}>
              <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                {selectedRecord.ledgerNumber}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="订单编号">
              {selectedRecord.orderNumber}
            </Descriptions.Item>
            <Descriptions.Item label="记录类型">
              <Tag color={selectedRecord.recordType === 'entry' ? 'blue' : 'green'}>
                {selectedRecord.recordType === 'entry' ? '进场' : '退场'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="物流类型">
              <Tag color={
                selectedRecord.logisticsType === 'own' ? 'cyan' :
                selectedRecord.logisticsType === 'third' ? 'orange' : 'purple'
              }>
                {selectedRecord.logisticsType === 'own' ? '自有物流' :
                 selectedRecord.logisticsType === 'third' ? '三方物流' : '客户自提'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="物流费用">
              <span style={{ color: '#ff4d4f', fontWeight: 500, fontSize: 16 }}>
                ¥{(selectedRecord.logisticsCost || 0).toFixed(2)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="记录日期">
              {dayjs(selectedRecord.recordDate).format('YYYY-MM-DD')}
            </Descriptions.Item>
            <Descriptions.Item label="门店" span={2}>
              {selectedRecord.storeName}
            </Descriptions.Item>
            
            {selectedRecord.logisticsType === 'own' && (
              <>
                <Descriptions.Item label="车牌号">
                  {selectedRecord.vehiclePlate || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="司机姓名">
                  {selectedRecord.driverName || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="司机电话" span={2}>
                  {selectedRecord.driverPhone || '—'}
                </Descriptions.Item>
              </>
            )}
            
            {selectedRecord.logisticsType === 'third' && (
              <>
                <Descriptions.Item label="物流公司" span={2}>
                  {selectedRecord.companyName || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="联系人">
                  {selectedRecord.companyContactName || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="联系电话">
                  {selectedRecord.companyContactPhone || '—'}
                </Descriptions.Item>
              </>
            )}
            
            <Descriptions.Item label="备注" span={2}>
              {selectedRecord.remark || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(selectedRecord.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {dayjs(selectedRecord.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 手动创建弹窗 */}
      <Modal
        title="手动创建物流台账"
        open={createVisible}
        onCancel={() => {
          setCreateVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            label="合同名称"
            name="orderId"
            rules={[{ required: true, message: '请选择合同' }]}
          >
            <Select
              placeholder="请选择合同"
              showSearch
              loading={loadingOrders}
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              options={orderList.map(order => ({
                value: String(order.id),
                label: order.customerName && order.projectName 
                  ? `${order.customerName}/${order.projectName}` 
                  : order.contractNumber,
              }))}
            />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="记录类型"
                name="recordType"
                rules={[{ required: true, message: '请选择记录类型' }]}
              >
                <Select placeholder="请选择">
                  <Option value="entry">进场</Option>
                  <Option value="exit">退场</Option>
                  <Option value="warehouse_transfer">仓库调拨</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="物流类型"
                name="logisticsType"
                rules={[{ required: true, message: '请选择物流类型' }]}
              >
                <Select placeholder="请选择" onChange={() => form.validateFields()}>
                  <Option value="own">自有物流</Option>
                  <Option value="third">三方物流</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="服务门店"
                name="storeId"
                rules={[{ required: true, message: '请选择服务门店' }]}
              >
                <Select placeholder="请选择门店" showSearch optionFilterProp="children">
                  {stores.map(s => (
                    <Option key={s.id} value={s.id}>{s.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          {/* 物流属性字段（根据物流类型动态显示） */}
          <Form.Item shouldUpdate={(prev, curr) => prev.logisticsType !== curr.logisticsType} noStyle>
            {() => renderLogisticsFields()}
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="物流费用"
                name="logisticsCost"
                rules={[{ required: true, message: '请输入物流费用' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  placeholder="0.00"
                  prefix="¥"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="记录日期"
                name="recordDate"
                rules={[{ required: true, message: '请选择记录日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            label="备注"
            name="remark"
          >
            <Input.TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LogisticsLedgerPage;

