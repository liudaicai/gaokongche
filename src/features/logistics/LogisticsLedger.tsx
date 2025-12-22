import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Card, Row, Col, Statistic, Input, Select, DatePicker, Space, message, Modal } from 'antd';
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { RangePickerProps } from 'antd/es/date-picker';
import type { AppDispatch, RootState } from '../../app/store';
import {
  fetchLedgerDataStart,
  fetchLedgerDataSuccess,
  fetchLedgerDataFailure,
  LogisticsLedgerItem,
  LogisticsType,
  RecordType,
  fetchStoresStart,
  fetchStoresSuccess,
  fetchStoresFailure
} from './logisticsSlice';
import type { Dayjs } from 'dayjs';
import { apiGet, apiDelete } from '../../api/client';
import { Store } from '../stores/types';

const LogisticsLedger: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  // 从Redux获取数据
  const ledgerData = useSelector((state: RootState) => state.logistics.ledgerData);
  const stores = useSelector((state: RootState) => state.logistics.stores);
  const loading = useSelector((state: RootState) => state.logistics.loading);
  
  // 状态管理
  const [searchParams, setSearchParams] = useState({
    orderNumber: '',
    logisticsType: undefined as LogisticsType | undefined,
    recordType: undefined as RecordType | undefined,
    store: undefined as string | undefined,
    dateRange: undefined as [Dayjs, Dayjs] | undefined
  });
  
  // 统计数据
  const [statistics, setStatistics] = useState({
    totalOrders: 0,
    totalAmount: 0,
    ownLogisticsAmount: 0,
    thirdLogisticsAmount: 0
  });
  
  // 数据加载
  useEffect(() => {
    const fetchData = async () => {
      // 加载台账数据
      dispatch(fetchLedgerDataStart());
      try {
        const response = await apiGet<any>('/logistics/ledger?page=1&pageSize=100');
        const ledgerData = response?.data || [];
        dispatch(fetchLedgerDataSuccess(ledgerData as LogisticsLedgerItem[]));
      } catch (err: any) {
        dispatch(fetchLedgerDataFailure(err?.message || '获取台账数据失败'));
        message.error(err?.message || '获取台账数据失败');
      }

      // 加载门店数据
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
        dispatch(fetchStoresFailure(err?.message || '获取门店数据失败'));
        message.error(err?.message || '获取门店数据失败');
      }
    };

    fetchData();
  }, [dispatch]);
  
  // 当台账数据变化时，加载统计数据
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const params = new URLSearchParams();
        if (searchParams.dateRange && searchParams.dateRange.length === 2) {
          params.append('startDate', searchParams.dateRange[0].format('YYYY-MM-DD'));
          params.append('endDate', searchParams.dateRange[1].format('YYYY-MM-DD'));
        }
        if (searchParams.store) {
          params.append('storeId', searchParams.store);
        }
        
        const statsResponse = await apiGet<any>(`/logistics/ledger/statistics?${params.toString()}`);
        const stats = statsResponse?.data || {};
        setStatistics({
          totalOrders: stats.totalOrders || 0,
          totalAmount: stats.totalAmount || 0,
          ownLogisticsAmount: stats.ownLogisticsAmount || 0,
          thirdLogisticsAmount: stats.thirdLogisticsAmount || 0
        });
      } catch (err: any) {
        console.error('获取统计数据失败:', err);
      }
    };
    
    fetchStatistics();
  }, [ledgerData, searchParams.dateRange, searchParams.store]);
  
  
  // 表格列配置
  const columns: ColumnsType<LogisticsLedgerItem> = [
    {
      title: '序号',
      key: 'index',
      render: (_, __, index) => index + 1
    },
    {
      title: '合同名称',
      key: 'contractName',
      render: (_, record: LogisticsLedgerItem) => {
        const contractName = record.customerName && record.projectName 
          ? `${record.customerName}/${record.projectName}` 
          : record.orderNumber;
        return (
          <Button 
            type="link" 
            onClick={() => {
              if (record.orderId) {
                navigate(`/orders/${record.orderId}`);
              }
            }}
            style={{ padding: 0 }}
          >
            {contractName}
          </Button>
        );
      }
    },
    {
      title: '物流类型',
      dataIndex: 'logisticsType',
      key: 'logisticsType',
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          'own': '自有物流',
          'third': '三方物流',
          'customer': '客户自提',
          '自有物流': '自有物流',
          '我方物流': '自有物流',
          '第三方物流': '三方物流',
          '三方物流': '三方物流',
        };
        return typeMap[type] || type || '—';
      }
    },
    {
      title: '记录类型',
      dataIndex: 'recordType',
      key: 'recordType',
      render: (type: RecordType) => {
        switch (type) {
          case 'entry':
            return '进场';
          case 'exit':
            return '退场';
          case 'warehouse_transfer':
            return '仓库调拨';
          default:
            return type;
        }
      }
    },
    {
      title: '门店',
      key: 'store',
      render: (_, record: LogisticsLedgerItem) => {
        // 根据记录类型显示不同的门店
        if (record.recordType === 'entry') {
          // 进场：显示出库门店
          return record.sourceStoreName || record.storeName || '—';
        } else if (record.recordType === 'exit') {
          // 退场：显示入库门店
          return record.targetStoreName || record.storeName || '—';
        } else if (record.recordType === 'warehouse_transfer') {
          // 调拨：显示"出库门店-入库门店"
          const source = record.sourceStoreName || '—';
          const target = record.targetStoreName || '—';
          return `${source} → ${target}`;
        }
        return record.storeName || '—';
      }
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date'
    },
    {
      title: '物流费用',
      key: 'logisticsCost',
      render: (_, record: LogisticsLedgerItem) => {
        const cost = record.logisticsCost || record.amount || 0;
        return (
          <span style={{ color: '#ff4d4f', fontWeight: 500 }}>
            ¥{cost.toFixed(2)}
          </span>
        );
      }
    },
    {
      title: '车辆信息',
      dataIndex: 'vehicleInfo',
      key: 'vehicleInfo',
      render: (info: string | undefined) => info || '-'
    },
    {
      title: '司机信息',
      dataIndex: 'driverInfo',
      key: 'driverInfo',
      render: (info: string | undefined) => info || '-'
    },
    {
      title: '物流公司',
      dataIndex: 'companyInfo',
      key: 'companyInfo',
      render: (info: string | undefined) => info || '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record: LogisticsLedgerItem) => (
        <Button
          type="link"
          size="small"
          danger
          onClick={() => handleDelete(record)}
        >
          删除
        </Button>
      )
    }
  ];
  
  // 删除台账记录
  const handleDelete = (record: LogisticsLedgerItem) => {
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
          handleSearch(); // 重新加载数据
        } catch (error: any) {
          message.error(error.message || '删除失败');
        }
      },
    });
  };

  // 处理搜索
  const handleSearch = async () => {
    dispatch(fetchLedgerDataStart());
    try {
      // 构建查询参数
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('pageSize', '100');
      
      if (searchParams.orderNumber) {
        params.append('orderNumber', searchParams.orderNumber);
      }
      if (searchParams.logisticsType) {
        params.append('logisticsType', searchParams.logisticsType);
      }
      if (searchParams.recordType) {
        params.append('recordType', searchParams.recordType);
      }
      if (searchParams.store) {
        params.append('storeId', searchParams.store);
      }
      if (searchParams.dateRange && searchParams.dateRange.length === 2) {
        params.append('startDate', searchParams.dateRange[0].format('YYYY-MM-DD'));
        params.append('endDate', searchParams.dateRange[1].format('YYYY-MM-DD'));
      }
      
      const response = await apiGet<any>(`/logistics/ledger?${params.toString()}`);
      const ledgerData = response?.data || [];
      dispatch(fetchLedgerDataSuccess(ledgerData as LogisticsLedgerItem[]));
      message.success('搜索完成');
    } catch (err: any) {
      dispatch(fetchLedgerDataFailure(err?.message || '搜索失败'));
      message.error(err?.message || '搜索失败');
    }
  };
  
  // 重置搜索条件
  const handleReset = async () => {
    setSearchParams({
      orderNumber: '',
      logisticsType: undefined,
      recordType: undefined,
      store: undefined,
      dateRange: undefined
    });
    
    // 重新加载数据
    dispatch(fetchLedgerDataStart());
    try {
      const response = await apiGet<any>('/logistics/ledger?page=1&pageSize=100');
      const ledgerData = response?.data || [];
      dispatch(fetchLedgerDataSuccess(ledgerData as LogisticsLedgerItem[]));
      message.success('已重置搜索条件');
    } catch (err: any) {
      dispatch(fetchLedgerDataFailure(err?.message || '加载数据失败'));
      message.error(err?.message || '加载数据失败');
    }
  };
  
  // 导出报表
  const handleExport = () => {
    // 在实际应用中，这里应该调用API导出报表
    message.success('报表导出功能已触发，在实际应用中将生成并下载报表文件');
  };
  
  // 日期范围变化处理
  const handleDateRangeChange: RangePickerProps['onChange'] = (dates) => {
    setSearchParams(prev => ({
      ...prev,
      dateRange: dates as [Dayjs, Dayjs] | undefined
    }));
  };
  
  // 筛选条件变化处理
  const handleFilterChange = (field: string, value: any) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>物流台账</h2>
      </div>
      
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="总订单数" 
              value={statistics.totalOrders} 
              suffix="单"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="总费用" 
              value={statistics.totalAmount} 
              precision={2}
              valueStyle={{ color: '#3f8600' }}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="自有物流费用" 
              value={statistics.ownLogisticsAmount} 
              precision={2}
              valueStyle={{ color: '#1890ff' }}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="三方物流费用" 
              value={statistics.thirdLogisticsAmount} 
              precision={2}
              valueStyle={{ color: '#fa8c16' }}
              prefix="¥"
            />
          </Card>
        </Col>
      </Row>
      
      {/* 搜索和筛选区域 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="bottom">
          <Col span={6}>
            <div style={{ marginBottom: '12px' }}>订单编号</div>
            <Input
              placeholder="请输入订单编号"
              value={searchParams.orderNumber}
              onChange={(e) => handleFilterChange('orderNumber', e.target.value)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: '12px' }}>物流类型</div>
            <Select
              placeholder="请选择物流类型"
              style={{ width: '100%' }}
              value={searchParams.logisticsType}
              onChange={(value) => handleFilterChange('logisticsType', value)}
              allowClear
            >
              <Select.Option value="own">自有物流</Select.Option>
              <Select.Option value="third">三方物流</Select.Option>
            </Select>
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: '12px' }}>记录类型</div>
            <Select
              placeholder="请选择记录类型"
              style={{ width: '100%' }}
              value={searchParams.recordType}
              onChange={(value) => handleFilterChange('recordType', value)}
              allowClear
            >
              <Select.Option value="entry">进场</Select.Option>
              <Select.Option value="exit">退场</Select.Option>
              <Select.Option value="warehouse_transfer">仓库调拨</Select.Option>
            </Select>
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: '12px' }}>服务门店</div>
            <Select
              placeholder="请选择服务门店"
              style={{ width: '100%' }}
              value={searchParams.store}
              onChange={(value) => handleFilterChange('store', value)}
              allowClear
            >
              {stores.map(store => (
                <Select.Option key={store.id} value={store.id}>{store.name}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: '12px' }}>日期范围</div>
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              onChange={handleDateRangeChange}
            />
          </Col>
          <Col span={12}>
            <Space style={{ float: 'right' }}>
              <Button onClick={handleReset}>重置</Button>
              <Button onClick={handleSearch} icon={<SearchOutlined />}>搜索</Button>
              <Button type="primary" onClick={handleExport} icon={<DownloadOutlined />}>
                导出报表
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
      
      {/* 物流台账表格 */}
      <Table
        columns={columns}
        dataSource={ledgerData}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条数据`
        }}
      />
    </div>
  );
};

export default LogisticsLedger;