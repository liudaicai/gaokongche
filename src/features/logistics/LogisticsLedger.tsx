import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Table, Card, Row, Col, Statistic, Input, Select, DatePicker, Space, message } from 'antd';
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
  OrderType,
  fetchStoresStart,
  fetchStoresSuccess,
  fetchStoresFailure
} from './logisticsSlice';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { apiGet } from '../../api/client';
import { Store } from '../stores/types';

const LogisticsLedger: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // 从Redux获取数据
  const ledgerData = useSelector((state: RootState) => state.logistics.ledgerData);
  const stores = useSelector((state: RootState) => state.logistics.stores);
  const loading = useSelector((state: RootState) => state.logistics.loading);
  
  // 状态管理
  const [searchParams, setSearchParams] = useState({
    orderNumber: '',
    logisticsType: undefined as LogisticsType | undefined,
    orderType: undefined as OrderType | undefined,
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
  
  // 模拟数据加载
  useEffect(() => {
    const fetchData = async () => {
      dispatch(fetchLedgerDataStart());
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 150));
        // 使用mock数据生成台账
        dispatch(fetchLedgerDataSuccess(generateMockLedgerData()));
      } catch (err) {
        dispatch(fetchLedgerDataFailure('获取台账数据失败'));
        message.error('获取台账数据失败');
      }

      dispatch(fetchStoresStart());
      try {
        const apiStores = await apiGet<any[]>('/stores');
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
  
  // 当台账数据变化时，重新计算统计数据
  useEffect(() => {
    if (ledgerData && ledgerData.length > 0) {
      const totalOrders = ledgerData.length;
      const totalAmount = ledgerData.reduce((sum, item) => sum + item.amount, 0);
      const ownLogisticsAmount = ledgerData
        .filter(item => item.logisticsType === 'own')
        .reduce((sum, item) => sum + item.amount, 0);
      const thirdLogisticsAmount = ledgerData
        .filter((item: LogisticsLedgerItem) => item.logisticsType === 'third')
          .reduce((sum: number, item: LogisticsLedgerItem) => sum + item.amount, 0);
      
      setStatistics({
        totalOrders,
        totalAmount,
        ownLogisticsAmount,
        thirdLogisticsAmount
      });
    }
  }, [ledgerData]);
  
  // 模拟生成门店数据（暂时注释掉未使用的函数）
  // const generateMockStores = (): Store[] => {
  //   return [
  //     { 
  //       id: 'store1', 
  //       name: '北京门店',
  //       address: '北京市朝阳区',
  //       managerId: 'manager1',
  //       managerName: '张三',
  //       managerPhone: '13800138001',
  //       createdAt: new Date().toISOString(),
  //       updatedAt: new Date().toISOString()
  //     },
  //     { 
  //       id: 'store2', 
  //       name: '上海门店',
  //       address: '上海市浦东新区',
  //       managerId: 'manager2',
  //       managerName: '李四',
  //       managerPhone: '13800138002',
  //       createdAt: new Date().toISOString(),
  //       updatedAt: new Date().toISOString()
  //     },
  //     { 
  //       id: 'store3', 
  //       name: '广州门店',
  //       address: '广州市天河区',
  //       managerId: 'manager3',
  //       managerName: '王五',
  //       managerPhone: '13800138003',
  //       createdAt: new Date().toISOString(),
  //       updatedAt: new Date().toISOString()
  //     },
  //     { 
  //       id: 'store4', 
  //       name: '深圳门店',
  //       address: '深圳市南山区',
  //       managerId: 'manager4',
  //       managerName: '赵六',
  //       managerPhone: '13800138004',
  //       createdAt: new Date().toISOString(),
  //       updatedAt: new Date().toISOString()
  //     }
  //   ];
  // };
  
  // 模拟生成物流台账数据
  const generateMockLedgerData = (): LogisticsLedgerItem[] => {
    const mockData: LogisticsLedgerItem[] = [];
    const logisticsTypes: LogisticsType[] = ['own', 'third'];
    const orderTypes: OrderType[] = ['inbound', 'outbound', 'transfer'];
    const storeIds = ['store1', 'store2', 'store3', 'store4'];
    const storeNames = ['北京门店', '上海门店', '广州门店', '深圳门店'];
    
    for (let i = 1; i <= 50; i++) {
      const logisticsType = logisticsTypes[Math.floor(Math.random() * logisticsTypes.length)];
      const orderType = orderTypes[Math.floor(Math.random() * orderTypes.length)];
      const storeIndex = Math.floor(Math.random() * storeIds.length);
      const storeId = storeIds[storeIndex];
      const storeName = storeNames[storeIndex];
      const date = dayjs().subtract(Math.floor(Math.random() * 30), 'day');
      const amount = Math.floor(Math.random() * 5000) + 1000;
      
      mockData.push({
        id: `LEDGER${i}`,
        orderNumber: `ORDER${Math.floor(Math.random() * 10000)}`,
        logisticsType,
        orderType,
        storeId,
        storeName,
        date: date.format('YYYY-MM-DD'),
        amount,
        vehicleInfo: logisticsType === 'own' ? `京A1234${i % 10}` : undefined,
        driverInfo: logisticsType === 'own' ? `司机${i}` : undefined,
        companyInfo: logisticsType === 'third' ? `第三方物流${i}` : undefined
      });
    }
    
    return mockData.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
  };
  
  // 表格列配置
  const columns: ColumnsType<LogisticsLedgerItem> = [
    {
      title: '序号',
      key: 'index',
      render: (_, __, index) => index + 1
    },
    {
      title: '订单编号',
      dataIndex: 'orderNumber',
      key: 'orderNumber'
    },
    {
      title: '物流类型',
      dataIndex: 'logisticsType',
      key: 'logisticsType',
      render: (type: LogisticsType) => type === 'own' ? '自有物流' : '三方物流'
    },
    {
      title: '订单类型',
      dataIndex: 'orderType',
      key: 'orderType',
      render: (type: OrderType) => {
        switch (type) {
          case 'inbound':
            return '入库';
          case 'outbound':
            return '出库';
          case 'transfer':
            return '调拨';
          default:
            return type;
        }
      }
    },
    {
      title: '服务门店',
      dataIndex: 'storeName',
      key: 'storeName'
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date'
    },
    {
      title: '费用',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `¥${amount.toFixed(2)}`
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
    }
  ];
  
  // 处理搜索
  const handleSearch = () => {
    // 在实际应用中，这里应该调用API进行搜索
    message.info('搜索功能已触发，在实际应用中将调用API查询数据');
    // 模拟API调用
    dispatch(fetchLedgerDataStart());
    setTimeout(() => {
      // 生成符合搜索条件的mock数据
      let filteredData = generateMockLedgerData();
      
      // 根据搜索条件过滤数据
      if (searchParams.orderNumber) {
        filteredData = filteredData.filter(item => 
          item.orderNumber.includes(searchParams.orderNumber)
        );
      }
      if (searchParams.logisticsType) {
        filteredData = filteredData.filter(item => 
          item.logisticsType === searchParams.logisticsType
        );
      }
      if (searchParams.orderType) {
        filteredData = filteredData.filter(item => 
          item.orderType === searchParams.orderType
        );
      }
      if (searchParams.store) {
        filteredData = filteredData.filter(item => 
          item.storeId === searchParams.store
        );
      }
      if (searchParams.dateRange && searchParams.dateRange.length === 2) {
        const [startDate, endDate] = searchParams.dateRange;
        filteredData = filteredData.filter(item => {
          const itemDate = dayjs(item.date);
          return itemDate.isAfter(startDate.subtract(1, 'day')) && 
                 itemDate.isBefore(endDate.add(1, 'day'));
        });
      }
      
      dispatch(fetchLedgerDataSuccess(filteredData));
    }, 300);
  };
  
  // 重置搜索条件
  const handleReset = () => {
    setSearchParams({
      orderNumber: '',
      logisticsType: undefined,
      orderType: undefined,
      store: undefined,
      dateRange: undefined
    });
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
            <div style={{ marginBottom: '12px' }}>订单类型</div>
            <Select
              placeholder="请选择订单类型"
              style={{ width: '100%' }}
              value={searchParams.orderType}
              onChange={(value) => handleFilterChange('orderType', value)}
              allowClear
            >
              <Select.Option value="inbound">入库</Select.Option>
              <Select.Option value="outbound">出库</Select.Option>
              <Select.Option value="transfer">调拨</Select.Option>
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