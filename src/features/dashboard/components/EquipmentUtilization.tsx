import React, { useMemo } from 'react';
import { Card, Row, Col, Progress, Statistic, Alert, Spin, Tooltip } from 'antd';
import { DollarOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../app/store';

const EquipmentUtilization: React.FC = () => {
  const { utilization, kpi, alerts, loading } = useSelector((state: RootState) => state.dashboard);

  const stats = useMemo(() => {
    if (!utilization || utilization.length === 0) {
      return { 
        assetUtilizationRate: 0,
        totalPurchaseValue: 0,
        rentingPurchaseValue: 0,
        availablePurchaseValue: 0,
        equipmentWithPrice: 0,
        equipmentWithoutPrice: 0,
      };
    }
    
    const data = utilization[0] || {};
    return {
      assetUtilizationRate: data.utilizationRate || 0,
      totalPurchaseValue: data.totalPurchaseValue || 0,
      rentingPurchaseValue: data.rentingPurchaseValue || 0,
      availablePurchaseValue: data.availablePurchaseValue || 0,
      equipmentWithPrice: data.equipmentWithPrice || 0,
      equipmentWithoutPrice: data.equipmentWithoutPrice || 0,
    };
  }, [utilization]);

  // 格式化金额显示
  const formatAmount = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}万`;
    }
    return `${amount.toFixed(0)}`;
  };

  // 获取相关的警告信息 (如待维修设备)
  const relatedAlert = useMemo(() => {
    return alerts.find(a => a.message.includes('维修') || a.message.includes('闲置'));
  }, [alerts]);

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DollarOutlined />
          <span>资产利用率监控</span>
          <Tooltip title="资产利用率 = 出租中设备的采购额 / 自有设备总采购额">
            <InfoCircleOutlined style={{ fontSize: 14, color: '#999' }} />
          </Tooltip>
        </div>
      }
      style={{ height: '100%' }}
    >
      <Spin spinning={loading}>
        <Row gutter={[16, 16]} align="middle">
          <Col span={12} style={{ display: 'flex', justifyContent: 'center' }}>
            <Progress 
              type="dashboard" 
              percent={stats.assetUtilizationRate} 
              strokeColor={{
                '0%': '#ff4d4f',
                '50%': '#faad14',
                '100%': '#52c41a',
              }}
              format={(percent) => `${percent?.toFixed(1)}%`}
            />
          </Col>
          <Col span={12}>
            <Statistic 
              title="出租中资产价值" 
              value={formatAmount(stats.rentingPurchaseValue)} 
              prefix="¥"
              valueStyle={{ fontSize: 20, color: '#52c41a' }}
            />
            <div style={{ marginTop: 16 }}>
               <Statistic 
                 title="总资产价值" 
                 value={formatAmount(stats.totalPurchaseValue)} 
                 prefix="¥"
                 valueStyle={{ fontSize: 16, color: '#1890ff' }} 
               />
            </div>
          </Col>
          <Col span={24}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '12px', 
              background: '#f5f5f5', 
              borderRadius: 4 
            }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 12, color: '#999' }}>未出租资产</div>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#faad14' }}>
                  ¥{formatAmount(stats.availablePurchaseValue)}
                </div>
              </div>
              <div style={{ textAlign: 'center', flex: 1, borderLeft: '1px solid #d9d9d9' }}>
                <div style={{ fontSize: 12, color: '#999' }}>
                  有价格设备
                  <Tooltip title="已匹配到采购记录的设备">
                    <InfoCircleOutlined style={{ marginLeft: 4, fontSize: 12 }} />
                  </Tooltip>
                </div>
                <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                  {stats.equipmentWithPrice} 台
                </div>
              </div>
              <div style={{ textAlign: 'center', flex: 1, borderLeft: '1px solid #d9d9d9' }}>
                <div style={{ fontSize: 12, color: '#999' }}>
                  无价格设备
                  <Tooltip title="未匹配到采购记录，不计入统计">
                    <InfoCircleOutlined style={{ marginLeft: 4, fontSize: 12 }} />
                  </Tooltip>
                </div>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#ff4d4f' }}>
                  {stats.equipmentWithoutPrice} 台
                </div>
              </div>
            </div>
          </Col>
          {relatedAlert && (
            <Col span={24}>
              <Alert
                message={relatedAlert.title}
                description={relatedAlert.message}
                type={relatedAlert.type}
                showIcon
                icon={<WarningOutlined />}
              />
            </Col>
          )}
        </Row>
      </Spin>
    </Card>
  );
};

export default EquipmentUtilization;
