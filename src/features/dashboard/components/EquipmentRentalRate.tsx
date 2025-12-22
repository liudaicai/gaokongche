import React, { useContext, useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Progress, Space, Typography, Spin } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChartOutlined, ShopOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../app/store';
import { fetchEquipmentInventory } from '../dashboardSlice';
import { WarehouseContext } from '../context/WarehouseContext';

const { Text } = Typography;

const COLORS = ['#1890ff', '#52c41a', '#ff4d4f'];

const EquipmentRentalRate: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { equipmentInventory, loading } = useSelector((state: RootState) => state.dashboard);
  const { selectedWarehouse } = useContext(WarehouseContext); // 使用全局仓库筛选器

  useEffect(() => {
    dispatch(fetchEquipmentInventory());
  }, [dispatch]);

  // 根据全局选择的仓库过滤数据并计算统计信息
  const stats = useMemo(() => {
    const filteredData = selectedWarehouse === 'all' 
      ? equipmentInventory 
      : equipmentInventory.filter(item => (item.area || '默认区域') === selectedWarehouse);

    const total = filteredData.reduce((sum, item) => sum + item.totalCount, 0);
    const renting = filteredData.reduce((sum, item) => sum + item.rentingCount, 0);
    const waiting = filteredData.reduce((sum, item) => sum + item.waitingCount, 0);
    const repairing = filteredData.reduce((sum, item) => sum + item.repairingCount, 0);

    const rentalRate = total > 0 ? Math.round((renting / total) * 100) : 0;
    
    // 这里简单假设自有设备占大多数，实际可能需要后端区分自有/转租
    // 为了演示，我们假设所有设备都是自有设备
    const selfOwnedRate = rentalRate;
    const subLeasedRate = 0; 

    return {
      total,
      renting,
      waiting,
      repairing,
      rentalRate,
      selfOwnedRate,
      subLeasedRate,
      chartData: [
        { name: '出租中', value: renting },
        { name: '待租', value: waiting },
        { name: '维修中', value: repairing },
      ].filter(item => item.value > 0)
    };
  }, [equipmentInventory, selectedWarehouse]);

  // 获取当前仓库的显示名称
  const warehouseName = selectedWarehouse === 'all' ? '总仓库 (所有)' : selectedWarehouse;

  return (
    <Card 
      title={<Space><PieChartOutlined /><span>设备出租率分析</span></Space>}
      style={{ height: '100%' }}
    >
      <Spin spinning={loading}>
        <div>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Statistic title="设备总数" value={stats.total} suffix="台" />
                <Statistic title="出租中" value={stats.renting} suffix="台" valueStyle={{ fontSize: 16, color: '#1890ff' }} />
                <Statistic title="待租" value={stats.waiting} suffix="台" valueStyle={{ fontSize: 16, color: '#52c41a' }} />
              </div>
            </Col>
            
            <Col span={12} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100%', height: 200 }}>
                {stats.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={stats.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label
                      >
                        {stats.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
                    暂无数据
                  </div>
                )}
              </div>
            </Col>
            
            <Col span={12} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {/* 库存信息展示区域 */}
              <div style={{ 
                background: '#f5f7fa', 
                padding: '12px', 
                borderRadius: '8px', 
                marginBottom: '16px',
                border: '1px solid #e8e8e8'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, color: '#1890ff' }}>
                  <ShopOutlined style={{ marginRight: 6 }} />
                  <Text strong>当前可用库存</Text>
                </div>
                <div style={{ fontSize: '14px', color: '#595959' }}>
                  {warehouseName}
                  <br/>
                  库存：<Text strong style={{ color: '#52c41a', fontSize: '16px' }}>{stats.waiting}</Text> 台
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div>综合出租率</div>
                <Progress percent={stats.rentalRate} strokeColor="#1890ff" />
              </div>
              {/* 暂时隐藏未实现的分类出租率
              <div style={{ marginBottom: 16 }}>
                <div>自有出租率</div>
                <Progress percent={stats.selfOwnedRate} strokeColor="#52c41a" />
              </div>
              <div>
                <div>转租出租率</div>
                <Progress percent={stats.subLeasedRate} strokeColor="#faad14" />
              </div>
              */}
            </Col>
          </Row>
        </div>
      </Spin>
    </Card>
  );
};

export default EquipmentRentalRate;
