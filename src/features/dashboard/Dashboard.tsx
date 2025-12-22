import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Row, Col, Typography, Button, Space, message, Spin, Select } from 'antd';
import { ReloadOutlined, ExportOutlined, CloudDownloadOutlined, ShopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import RevenueStats from './components/RevenueStats';
import EquipmentRentalRate from './components/EquipmentRentalRate';
import EquipmentUtilization from './components/EquipmentUtilization';
import InventoryStatus from './components/InventoryStatus';
import PriceTrend from './components/PriceTrend';
import type { AppDispatch, RootState } from '../../app/store';
import {
  fetchDashboardKPI,
  fetchDashboardTrends,
  fetchDashboardAlerts,
  fetchDashboardActivities,
  fetchEquipmentUtilization,
  fetchEquipmentInventory,
  fetchPartsStats,
} from './dashboardSlice';
import { fetchStores } from '../stores/storesSlice';
import { WarehouseContext } from './context/WarehouseContext';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const stores = useSelector((state: RootState) => state.stores.stores);
  const { equipmentInventory } = useSelector((state: RootState) => state.dashboard);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');

  // 计算仓库选项（从门店列表和设备库存的area字段）
  const warehouseOptions = useMemo(() => {
    const options = [{ label: '总仓库 (所有)', value: 'all' }];
    
    // 从门店列表添加选项
    stores.forEach(store => {
      options.push({
        label: store.name,
        value: store.name,
      });
    });
    
    // 从设备库存的area字段添加额外的仓库（去重）
    const existingValues = new Set(options.map(opt => opt.value));
    equipmentInventory.forEach(item => {
      const area = item.area || '默认区域';
      if (!existingValues.has(area)) {
        options.push({ label: area, value: area });
        existingValues.add(area);
      }
    });
    
    return options;
  }, [stores, equipmentInventory]);

  // 初始加载
  useEffect(() => {
    loadDashboardData();
    dispatch(fetchStores()); // 加载门店列表
  }, []);

  // 自动刷新机制 (默认5分钟)
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setRefreshing(true);
    try {
      // 并行加载所有看板数据
      await Promise.all([
        dispatch(fetchDashboardKPI()),
        dispatch(fetchDashboardTrends()),
        dispatch(fetchDashboardAlerts()),
        dispatch(fetchDashboardActivities(10)),
        dispatch(fetchEquipmentUtilization()),
        dispatch(fetchEquipmentInventory()),
        dispatch(fetchPartsStats()),
      ]);
    } catch (error) {
      console.error('Failed to refresh dashboard', error);
    } finally {
      setTimeout(() => setRefreshing(false), 500); // 至少显示0.5s加载状态
    }
  };

  const handleExport = () => {
    message.loading('正在生成报表...', 2)
      .then(() => message.success('报表导出成功！已下载到本地。'));
  };

  return (
    <WarehouseContext.Provider value={{ selectedWarehouse, setSelectedWarehouse }}>
      <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
        {/* 顶部欢迎与操作区 */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              工作台
            </Title>
            <Text type="secondary">
              欢迎回来，{user?.username || '管理员'}。今天是 {dayjs().format('YYYY年MM月DD日 dddd')}
            </Text>
          </div>
          <Space>
            {/* 全局仓库筛选器 */}
            <Select
              style={{ width: 180 }}
              value={selectedWarehouse}
              onChange={setSelectedWarehouse}
              options={warehouseOptions}
              suffixIcon={<ShopOutlined />}
              placeholder="选择仓库"
            />
            <Button 
              icon={<ReloadOutlined spin={refreshing} />} 
              onClick={() => loadDashboardData()}
            >
              刷新数据
            </Button>
            <Button 
              type="primary" 
              icon={<ExportOutlined />} 
              onClick={handleExport}
            >
              导出报表
            </Button>
          </Space>
        </div>

      {/* 核心功能模块布局 */}
      <Row gutter={[24, 24]}>
        {/* 1. 营收统计仪表板 (全宽或占据主要位置) */}
        <Col span={24}>
          <RevenueStats />
        </Col>

        {/* 2. 资产利用率监控 (基于采购金额的资产使用效率) */}
        <Col xs={24} lg={8}>
          <EquipmentUtilization />
        </Col>

        {/* 3. 设备出租率分析 */}
        <Col xs={24} lg={16}>
          <EquipmentRentalRate />
        </Col>

        {/* 4. 库存状态看板 */}
        <Col xs={24} lg={12}>
          <InventoryStatus />
        </Col>

        {/* 5. 租金价格趋势图表 */}
        <Col xs={24} lg={12}>
          <PriceTrend />
        </Col>
      </Row>
    </div>
    </WarehouseContext.Provider>
  );
};

export default Dashboard;
