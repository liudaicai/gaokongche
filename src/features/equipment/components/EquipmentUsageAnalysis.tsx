/**
 * 设备使用率分析组件（简化版）
 */

import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, Progress, Empty, Spin, Button, DatePicker, Table } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { EquipmentUsageStatistics, UsageSummary } from '../types/usage';

const { RangePicker } = DatePicker;

interface EquipmentUsageAnalysisProps {
  equipmentId: number;
  equipmentCode?: string;
}

const EquipmentUsageAnalysis: React.FC<EquipmentUsageAnalysisProps> = ({ equipmentId, equipmentCode }) => {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<EquipmentUsageStatistics[]>([]);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(5, 'month').startOf('month'),
    dayjs().endOf('month')
  ]);

  useEffect(() => {
    loadData();
  }, [equipmentId, dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const startMonth = dateRange[0].format('YYYY-MM-01');
      const endMonth = dateRange[1].format('YYYY-MM-01');
      
      const response = await fetch(
        `/api/equipment-usage/${equipmentId}?startMonth=${startMonth}&endMonth=${endMonth}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );
      
      const result = await response.json();
      if (result.ok) {
        setStatistics(result.data.statistics);
        setSummary(result.data.summary);
      }
    } catch (error) {
      console.error('Load usage data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const month = dayjs().subtract(1, 'month').format('YYYY-MM-01');
      const response = await fetch(`/api/equipment-usage/${equipmentId}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ month })
      });
      const result = await response.json();
      if (result.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Calculate error:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '月份',
      dataIndex: 'month',
      key: 'month',
      render: (text: string) => dayjs(text).format('YYYY年MM月')
    },
    {
      title: '利用率',
      dataIndex: 'utilizationRate',
      key: 'utilizationRate',
      render: (value: number) => <Progress percent={parseFloat(value.toFixed(1))} size="small" />
    },
    {
      title: '出租天数',
      dataIndex: 'rentalDays',
      key: 'rentalDays'
    },
    {
      title: '闲置天数',
      dataIndex: 'idleDays',
      key: 'idleDays'
    },
    {
      title: '租金收入',
      dataIndex: 'rentalIncome',
      key: 'rentalIncome',
      render: (value: number) => `¥${value.toLocaleString()}`
    },
    {
      title: '净利润',
      dataIndex: 'netProfit',
      key: 'netProfit',
      render: (value: number) => (
        <span style={{ color: value >= 0 ? '#52c41a' : '#f5222d' }}>
          ¥{value.toLocaleString()}
        </span>
      )
    }
  ];

  return (
    <div style={{ padding: '16px' }}>
      <Card 
        title={`设备使用率分析${equipmentCode ? ` - ${equipmentCode}` : ''}`}
        extra={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
              picker="month"
            />
            <Button 
              icon={<SyncOutlined />} 
              onClick={handleCalculate}
              loading={loading}
            >
              重新计算
            </Button>
          </div>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin />
          </div>
        ) : !summary ? (
          <Empty description="暂无数据" />
        ) : (
          <>
            {/* 汇总指标 */}
            <Row gutter={16} style={{ marginBottom: '24px' }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="平均利用率"
                    value={summary.avgUtilizationRate.toFixed(1)}
                    suffix="%"
                    valueStyle={{ color: summary.avgUtilizationRate >= 70 ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="累计出租天数"
                    value={summary.totalRentalDays}
                    suffix="天"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总收入"
                    value={summary.totalIncome}
                    prefix="¥"
                    precision={0}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="净利润"
                    value={summary.totalProfit}
                    prefix="¥"
                    precision={0}
                    valueStyle={{ color: summary.totalProfit >= 0 ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 月度明细表 */}
            <Table
              columns={columns}
              dataSource={statistics}
              rowKey="month"
              pagination={false}
              size="small"
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default EquipmentUsageAnalysis;

