import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Radio, Space, Typography, Spin } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../../app/store';
import { fetchDashboardTrends } from '../dashboardSlice';

const { RangePicker } = DatePicker;

const RevenueStats: React.FC = () => {
  const dispatch = useDispatch();
  const [timeMode, setTimeMode] = useState<'day' | 'month'>('month'); // 默认按月显示
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('year'), // 默认显示今年（1月1日到今天）
    dayjs()
  ]);
  
  // 从Redux获取真实数据
  const { kpi, trends, loading } = useSelector((state: RootState) => state.dashboard);

  // 当日期范围改变时，重新获取数据
  useEffect(() => {
    const days = dateRange[1].diff(dateRange[0], 'days') + 1;
    dispatch(fetchDashboardTrends(days) as any);
  }, [dateRange, dispatch]);

  // 处理和聚合趋势数据
  const chartData = useMemo(() => {
    if (timeMode === 'day') {
      // 按日显示
      if (!trends?.orders || trends.orders.length === 0) return [];
      return trends.orders.map(item => ({
        name: dayjs(item.date).format('MM-DD'),
        revenue: item.revenue,
        received: (item as any).received || 0,
      }));
    } else {
      // 按月聚合 - 生成完整的月份列表
      const monthlyData = new Map<string, { revenue: number; received: number }>();
      
      // 1. 生成日期范围内的所有月份（确保显示完整月份）
      const startMonth = dateRange[0].startOf('month');
      const endMonth = dateRange[1].startOf('month');
      let currentMonth = startMonth;
      
      while (currentMonth.isBefore(endMonth) || currentMonth.isSame(endMonth, 'month')) {
        const monthKey = currentMonth.format('YYYY-MM');
        monthlyData.set(monthKey, { revenue: 0, received: 0 });
        currentMonth = currentMonth.add(1, 'month');
      }
      
      console.log('[营收图表] 生成的月份列表:', Array.from(monthlyData.keys()));
      
      // 2. 填充实际数据
      if (trends?.orders && trends.orders.length > 0) {
        trends.orders.forEach(item => {
          const monthKey = dayjs(item.date).format('YYYY-MM');
          if (monthlyData.has(monthKey)) {
            const existing = monthlyData.get(monthKey)!;
            existing.revenue += item.revenue;
            existing.received += (item as any).received || 0;
          }
        });
      }
      
      // 3. 转换为数组并排序
      const result = Array.from(monthlyData.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, data]) => ({
          name: dayjs(month).format('MM月'),  // 简化显示为 "01月", "02月"
          revenue: data.revenue,
          received: data.received,
        }));
      
      return result;
    }
  }, [trends, timeMode, dateRange]);

  // 计算Y轴的最大值（用于动态调整）
  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 10000;
    const allValues = chartData.flatMap(item => [item.revenue, item.received]);
    const max = Math.max(...allValues, 0);
    // 向上取整到合适的值
    const magnitude = Math.pow(10, Math.floor(Math.log10(max || 1)));
    const result = Math.ceil((max * 1.2) / magnitude) * magnitude; // 留20%的空间
    return result;
  }, [chartData]);

  // Y轴格式化函数（大金额显示为"万"）
  const formatYAxis = (value: number) => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(0)}万`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  // Tooltip格式化函数
  const formatTooltip = (value: number) => {
    return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 计算营收数据
  const currentMonthRevenue = kpi?.revenue.currentMonth || 0;  // 创收金额（合同额）
  const lastMonthRevenue = kpi?.revenue.lastMonth || 0;
  const currentMonthReceived = kpi?.revenue.currentMonthReceived || 0;  // 实收金额（已到账）
  const currentMonthReceivable = currentMonthRevenue - currentMonthReceived;  // 应收金额（待收）
  const growthRate = lastMonthRevenue ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  return (
    <Card 
      title={<Space><DollarOutlined /><span>营收统计</span></Space>}
      extra={
        <Space>
          <Radio.Group value={timeMode} onChange={e => setTimeMode(e.target.value)} buttonStyle="solid">
            <Radio.Button value="day">按日</Radio.Button>
            <Radio.Button value="month">按月</Radio.Button>
          </Radio.Group>
          <RangePicker 
            style={{ width: 250 }} 
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]]);
              }
            }}
            presets={[
              { label: '近30天', value: [dayjs().subtract(30, 'days'), dayjs()] },
              { label: '近3个月', value: [dayjs().subtract(3, 'months'), dayjs()] },
              { label: '近6个月', value: [dayjs().subtract(6, 'months'), dayjs()] },
              { label: '近1年', value: [dayjs().subtract(1, 'year'), dayjs()] },
              { label: '今年', value: [dayjs().startOf('year'), dayjs()] },
            ]}
          />
        </Space>
      }
      style={{ height: '100%' }}
    >
      <Spin spinning={loading && !kpi}>
        <div>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Statistic 
                title="实收金额 (本月已到账)" 
                value={currentMonthReceived}
                precision={2}
                prefix="¥" 
                valueStyle={{ color: '#52c41a' }} 
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title="创收金额 (本月合同额)" 
                value={currentMonthRevenue} 
                precision={2}
                prefix="¥" 
                valueStyle={{ color: '#1890ff' }} 
                suffix={
                  <small style={{ fontSize: 12, color: growthRate >= 0 ? '#52c41a' : '#ff4d4f' }}>
                    环比 {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
                  </small>
                }
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title="应收金额 (本月待收)" 
                value={currentMonthReceivable}
                precision={2}
                prefix="¥" 
                valueStyle={{ color: '#faad14' }} 
              />
            </Col>
          </Row>
          
          <div style={{ width: '100%', height: 280 }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    domain={[0, maxValue]}
                    tickFormatter={formatYAxis}
                    allowDataOverflow={false}
                  />
                  <Tooltip formatter={formatTooltip} />
                  <Legend />
                  <Bar dataKey="revenue" name="创收金额" fill="#1890ff" />
                  <Bar dataKey="received" name="实收金额" fill="#52c41a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
                暂无数据
              </div>
            )}
          </div>
        </div>
      </Spin>
    </Card>
  );
};

export default RevenueStats;
