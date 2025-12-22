import React, { useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Progress, Badge, List, Tag, Spin, Empty } from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../app/store';
import { fetchPartsStats } from '../dashboardSlice';

const InventoryStatus: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { parts, loading } = useSelector((state: RootState) => state.dashboard);

  useEffect(() => {
    dispatch(fetchPartsStats());
  }, [dispatch]);

  const stats = useMemo(() => {
    if (!parts || parts.length === 0) {
      return {
        totalItems: 0,
        sufficient: 0,
        lowStock: 0,
        outOfStock: 0,
        satisfactionRate: 0,
        warningList: []
      };
    }

    let sufficient = 0;
    let lowStock = 0;
    let outOfStock = 0;
    const warningList: any[] = [];

    parts.forEach(part => {
      // 默认最低库存为 5，如果后端未返回 minStock
      const minStock = part.minStock || 5;
      const quantity = part.totalQuantity || 0;

      if (quantity <= 0) {
        outOfStock++;
        warningList.push({ ...part, status: 'outOfStock', min: minStock });
      } else if (quantity < minStock) {
        lowStock++;
        warningList.push({ ...part, status: 'lowStock', min: minStock });
      } else {
        sufficient++;
      }
    });

    const totalItems = parts.length;
    const satisfactionRate = totalItems > 0 
      ? Math.round(((totalItems - outOfStock) / totalItems) * 100) 
      : 0;

    // 排序：先缺货，再低库存
    warningList.sort((a, b) => {
      if (a.status === 'outOfStock' && b.status !== 'outOfStock') return -1;
      if (a.status !== 'outOfStock' && b.status === 'outOfStock') return 1;
      return (a.totalQuantity / a.min) - (b.totalQuantity / b.min);
    });

    return {
      totalItems,
      sufficient,
      lowStock,
      outOfStock,
      satisfactionRate,
      warningList: warningList.slice(0, 5) // 只显示前5条预警
    };
  }, [parts]);

  return (
    <Card 
      title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ToolOutlined /><span>配件库存看板</span></div>}
      style={{ height: '100%' }}
    >
      <Spin spinning={loading}>
        <Row gutter={[16, 24]}>
          <Col span={6}>
            <Statistic title="配件总数" value={stats.totalItems} suffix="种" />
          </Col>
          <Col span={6}>
            <Statistic title="库存充足" value={stats.sufficient} valueStyle={{ color: '#52c41a' }} suffix="种" />
          </Col>
          <Col span={6}>
            <Statistic title="即将耗尽" value={stats.lowStock} valueStyle={{ color: '#faad14' }} suffix="种" />
          </Col>
          <Col span={6}>
            <Statistic title="缺货" value={stats.outOfStock} valueStyle={{ color: '#ff4d4f' }} suffix="种" />
          </Col>
          
          <Col span={24}>
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span>配件满足率</span>
              <span>{stats.satisfactionRate}%</span>
            </div>
            <Progress percent={stats.satisfactionRate} showInfo={false} strokeColor="#1890ff" />
          </Col>

          <Col span={24}>
             <div style={{ fontWeight: 500, marginBottom: 12 }}>紧缺配件预警</div>
             {stats.warningList.length > 0 ? (
               <List
                 size="small"
                 dataSource={stats.warningList}
                 renderItem={item => (
                   <List.Item>
                     <List.Item.Meta
                       title={item.name}
                       description={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                         <Progress 
                           percent={Math.min(100, Math.round((item.totalQuantity / item.min) * 100))} 
                           size="small" 
                           status={item.status === 'outOfStock' ? "exception" : "active"} 
                           strokeColor={item.status === 'outOfStock' ? '#ff4d4f' : '#faad14'}
                           showInfo={false} 
                           style={{ width: 100 }} 
                         />
                         <span style={{ fontSize: 12, color: item.status === 'outOfStock' ? '#ff4d4f' : '#faad14' }}>
                           {item.status === 'outOfStock' ? '缺货' : '低于阈值'} ({item.totalQuantity}/{item.min})
                         </span>
                       </div>}
                     />
                     <Tag color={item.status === 'outOfStock' ? "red" : "orange"}>
                       {item.status === 'outOfStock' ? '补货' : '预警'}
                     </Tag>
                   </List.Item>
                 )}
               />
             ) : (
               <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无库存预警" />
             )}
          </Col>
        </Row>
      </Spin>
    </Card>
  );
};

export default InventoryStatus;
