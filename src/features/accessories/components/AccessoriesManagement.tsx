/**
 * 配件管理列表 - 主界面
 * 支持配件CRUD、库存管理、统计看板
 */
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Tooltip,
  Modal,
  message,
  Row,
  Col,
  Statistic,
  Badge,
  Dropdown,
  Form,
  InputNumber,
  Divider,
  Alert,
  Progress,
  Rate
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ExportOutlined,
  ImportOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  ReloadOutlined,
  DownOutlined
} from '@ant-design/icons';
import { AppDispatch } from '../../../app/store';
import {
  fetchAccessories,
  fetchAccessoriesStats,
  deleteAccessory,
  performTransaction,
  selectAccessoriesList,
  selectAccessoriesStats,
  selectAccessoriesLoading,
  selectAccessoriesPagination,
  clearError
} from '../accessoriesSlice';
import type { Accessory, AccessorySearchParams, TransactionType } from '../types';
import AccessoryFormModal from './AccessoryFormModal';
import AccessoryDetailDrawer from './AccessoryDetailDrawer';
import TransactionModal from './TransactionModal';

const { Search } = Input;

const AccessoriesManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  const list = useSelector(selectAccessoriesList);
  const stats = useSelector(selectAccessoriesStats);
  const loading = useSelector(selectAccessoriesLoading);
  const pagination = useSelector(selectAccessoriesPagination);

  const [searchParams, setSearchParams] = useState<AccessorySearchParams>({
    page: 1,
    pageSize: 20,
    status: 'active'
  });
  
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [currentAccessory, setCurrentAccessory] = useState<Accessory | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>('purchase');

  // 初始加载数据
  useEffect(() => {
    loadData();
    loadStats();
  }, []);

  // 加载配件列表
  const loadData = (params?: AccessorySearchParams) => {
    const finalParams = params || searchParams;
    dispatch(fetchAccessories(finalParams));
  };

  // 加载统计数据
  const loadStats = () => {
    dispatch(fetchAccessoriesStats());
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    const newParams = { ...searchParams, search: value, page: 1 };
    setSearchParams(newParams);
    loadData(newParams);
  };

  // 处理筛选变化
  const handleFilterChange = (key: string, value: any) => {
    const newParams = { ...searchParams, [key]: value, page: 1 };
    setSearchParams(newParams);
    loadData(newParams);
  };

  // 处理分页变化
  const handleTableChange = (page: number, pageSize: number) => {
    const newParams = { ...searchParams, page, pageSize };
    setSearchParams(newParams);
    loadData(newParams);
  };

  // 新增配件
  const handleAdd = () => {
    setCurrentAccessory(null);
    setFormModalVisible(true);
  };

  // 编辑配件
  const handleEdit = (record: Accessory) => {
    setCurrentAccessory(record);
    setFormModalVisible(true);
  };

  // 查看详情
  const handleView = (record: Accessory) => {
    setCurrentAccessory(record);
    setDetailDrawerVisible(true);
  };

  // 删除配件
  const handleDelete = (record: Accessory) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除配件"${record.name}"吗？此操作不可恢复。`,
      okText: '确认',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await dispatch(deleteAccessory(record.id)).unwrap();
          message.success('删除成功');
          loadData();
          loadStats();
        } catch (error: any) {
          message.error(error.message || '删除失败');
        }
      }
    });
  };

  // 出入库操作
  const handleTransaction = (record: Accessory, type: TransactionType) => {
    setCurrentAccessory(record);
    setTransactionType(type);
    setTransactionModalVisible(true);
  };

  // 表单提交成功
  const handleFormSuccess = () => {
    setFormModalVisible(false);
    setCurrentAccessory(null);
    loadData();
    loadStats();
  };

  // 出入库成功
  const handleTransactionSuccess = () => {
    setTransactionModalVisible(false);
    setCurrentAccessory(null);
    loadData();
    loadStats();
  };

  // 获取库存状态
  const getStockStatus = (accessory: Accessory) => {
    if (accessory.availableQuantity === 0) {
      return { color: 'error', text: '缺货', icon: <WarningOutlined /> };
    } else if (accessory.availableQuantity <= accessory.minStock) {
      return { color: 'warning', text: '低库存', icon: <WarningOutlined /> };
    } else if (accessory.availableQuantity <= accessory.reorderPoint) {
      return { color: 'processing', text: '建议补货', icon: <CheckCircleOutlined /> };
    } else {
      return { color: 'success', text: '库存充足', icon: <CheckCircleOutlined /> };
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '物料编号',
      dataIndex: 'materialNumber',
      key: 'materialNumber',
      width: 150,
      fixed: 'left' as const,
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: '配件名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      filters: [
        { text: '液压件', value: '液压件' },
        { text: '电气件', value: '电气件' },
        { text: '易损件', value: '易损件' },
        { text: '滤芯类', value: '滤芯类' },
        { text: '机械件', value: '机械件' }
      ],
      onFilter: (value: string | number | boolean, record: Accessory) => record.category === value,
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '品牌/型号',
      key: 'brandModel',
      width: 180,
      render: (_: any, record: Accessory) => (
        <Space direction="vertical" size="small">
          {record.brand && <span>{record.brand}</span>}
          {record.modelSpec && (
            <span style={{ fontSize: '12px', color: '#999' }}>{record.modelSpec}</span>
          )}
        </Space>
      )
    },
    {
      title: '配件类型',
      dataIndex: 'partType',
      key: 'partType',
      width: 100,
      filters: [
        { text: '原厂件', value: 'original' },
        { text: '品牌副厂', value: 'oem' },
        { text: '售后市场', value: 'aftermarket' },
        { text: '通用件', value: 'generic' }
      ],
      onFilter: (value: string | number | boolean, record: Accessory) => record.partType === value,
      render: (text: string) => {
        const colors = {
          original: 'gold',
          oem: 'green',
          aftermarket: 'blue',
          generic: 'default'
        };
        const labels = {
          original: '原厂',
          oem: '副厂',
          aftermarket: '售后',
          generic: '通用'
        };
        return <Tag color={colors[text as keyof typeof colors]}>{labels[text as keyof typeof labels]}</Tag>;
      }
    },
    {
      title: '库存状态',
      key: 'stockStatus',
      width: 120,
      filters: [
        { text: '缺货', value: 'out' },
        { text: '低库存', value: 'low' },
        { text: '正常', value: 'normal' }
      ],
      onFilter: (value: string | number | boolean, record: Accessory) => {
        if (value === 'out') return record.availableQuantity === 0;
        if (value === 'low') return record.availableQuantity > 0 && record.availableQuantity <= record.minStock;
        return record.availableQuantity > record.minStock;
      },
      render: (_: any, record: Accessory) => {
        const status = getStockStatus(record);
        return (
          <Badge status={status.color as any} text={status.text} />
        );
      }
    },
    {
      title: '可用库存',
      key: 'stock',
      width: 120,
      sorter: (a: Accessory, b: Accessory) => a.availableQuantity - b.availableQuantity,
      render: (_: any, record: Accessory) => {
        const percent = record.totalQuantity > 0 
          ? (record.availableQuantity / record.totalQuantity) * 100 
          : 0;
        return (
          <Tooltip title={`总库存: ${record.totalQuantity}, 预留: ${record.reservedQuantity}`}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <span style={{ 
                fontSize: '16px', 
                fontWeight: 'bold',
                color: record.availableQuantity <= record.minStock ? '#ff4d4f' : '#52c41a'
              }}>
                {record.availableQuantity}
              </span>
              <Progress 
                percent={percent} 
                size="small" 
                showInfo={false}
                strokeColor={percent > 50 ? '#52c41a' : percent > 20 ? '#faad14' : '#ff4d4f'}
              />
            </Space>
          </Tooltip>
        );
      }
    },
    {
      title: '价格',
      key: 'price',
      width: 120,
      sorter: (a: Accessory, b: Accessory) => a.sellingPrice - b.sellingPrice,
      render: (_: any, record: Accessory) => (
        <Space direction="vertical" size="small">
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}>
            ¥{record.sellingPrice.toFixed(2)}
          </span>
          <span style={{ fontSize: '12px', color: '#999' }}>
            成本: ¥{record.costPrice.toFixed(2)}
          </span>
        </Space>
      )
    },
    {
      title: '智能评分',
      key: 'scores',
      width: 150,
      render: (_: any, record: Accessory) => (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Tooltip title="适配评分">
            <Space size="small">
              <span style={{ fontSize: '12px' }}>适配:</span>
              <Rate disabled value={record.compatibilityScore} count={5} style={{ fontSize: '12px' }} />
            </Space>
          </Tooltip>
          <Tooltip title="可靠性评分">
            <Space size="small">
              <span style={{ fontSize: '12px' }}>可靠:</span>
              <Rate disabled value={record.reliabilityScore} count={5} style={{ fontSize: '12px' }} />
            </Space>
          </Tooltip>
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right' as const,
      render: (_: any, record: Accessory) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'purchase',
                  label: '采购入库',
                  icon: <ImportOutlined />,
                  onClick: () => handleTransaction(record, 'purchase')
                },
                {
                  key: 'issue',
                  label: '领用出库',
                  icon: <ExportOutlined />,
                  onClick: () => handleTransaction(record, 'issue')
                },
                {
                  key: 'return',
                  label: '退库',
                  icon: <ReloadOutlined />,
                  onClick: () => handleTransaction(record, 'return')
                },
                {
                  key: 'adjust',
                  label: '盘点调整',
                  icon: <BarChartOutlined />,
                  onClick: () => handleTransaction(record, 'adjust')
                }
              ]
            }}
          >
            <Button size="small">
              出入库 <DownOutlined />
            </Button>
          </Dropdown>
          <Tooltip title="删除">
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="配件总数"
                value={stats.totalCount}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="低库存预警"
                value={stats.lowStockCount}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="缺货配件"
                value={stats.outOfStockCount}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="库存总价值"
                value={stats.totalValue}
                prefix="¥"
                precision={2}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 主内容卡片 */}
      <Card
        title={<span style={{ fontSize: '18px', fontWeight: 'bold' }}>配件管理</span>}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              新增配件
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadData();
                loadStats();
              }}
            >
              刷新
            </Button>
          </Space>
        }
      >
        {/* 筛选栏 */}
        <Space style={{ marginBottom: 16, width: '100%' }} wrap>
          <Search
            placeholder="搜索物料编号、名称、型号"
            allowClear
            style={{ width: 300 }}
            onSearch={handleSearch}
            enterButton={<SearchOutlined />}
          />
          <Select
            placeholder="配件类别"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => handleFilterChange('category', value)}
            options={[
              { value: '液压件', label: '液压件' },
              { value: '电气件', label: '电气件' },
              { value: '易损件', label: '易损件' },
              { value: '滤芯类', label: '滤芯类' },
              { value: '机械件', label: '机械件' }
            ]}
          />
          <Select
            placeholder="配件类型"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => handleFilterChange('partType', value)}
            options={[
              { value: 'original', label: '原厂件' },
              { value: 'oem', label: '品牌副厂' },
              { value: 'aftermarket', label: '售后市场' },
              { value: 'generic', label: '通用件' }
            ]}
          />
          <Select
            placeholder="库存状态"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => handleFilterChange('lowStock', value === 'low')}
            options={[
              { value: 'low', label: '低库存预警' },
              { value: 'normal', label: '库存正常' }
            ]}
          />
          <Select
            placeholder="状态"
            style={{ width: 120 }}
            value={searchParams.status}
            onChange={(value) => handleFilterChange('status', value)}
            options={[
              { value: 'active', label: '在用' },
              { value: 'discontinued', label: '停产' },
              { value: 'obsolete', label: '淘汰' }
            ]}
          />
        </Space>

        {/* 低库存警告 */}
        {stats && stats.lowStockCount > 0 && (
          <Alert
            message={`当前有 ${stats.lowStockCount} 个配件库存不足，建议及时补货`}
            type="warning"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 配件列表表格 */}
        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1800 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: handleTableChange
          }}
        />
      </Card>

      {/* 配件表单模态框 */}
      <AccessoryFormModal
        visible={formModalVisible}
        accessory={currentAccessory}
        onSuccess={handleFormSuccess}
        onCancel={() => {
          setFormModalVisible(false);
          setCurrentAccessory(null);
        }}
      />

      {/* 配件详情抽屉 */}
      <AccessoryDetailDrawer
        visible={detailDrawerVisible}
        accessory={currentAccessory}
        onClose={() => {
          setDetailDrawerVisible(false);
          setCurrentAccessory(null);
        }}
      />

      {/* 出入库模态框 */}
      <TransactionModal
        visible={transactionModalVisible}
        accessory={currentAccessory}
        transactionType={transactionType}
        onSuccess={handleTransactionSuccess}
        onCancel={() => {
          setTransactionModalVisible(false);
          setCurrentAccessory(null);
        }}
      />
    </div>
  );
};

export default AccessoriesManagement;

