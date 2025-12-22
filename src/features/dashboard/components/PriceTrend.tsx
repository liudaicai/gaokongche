import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Space, Spin, Empty, Select } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChartOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../app/store';
import { fetchDashboardTrends } from '../dashboardSlice';
import { apiGet } from '../../../api/client';
import dayjs from 'dayjs';

interface EquipmentPriceTrend {
  month: string; // 月份，如 "2024-01"
  height: string;
  avgDailyPrice: number; // 天租平均价格
  avgMonthlyPrice: number; // 月租平均价格
  dailyOrderCount: number;
  monthlyOrderCount: number;
  totalOrderCount: number;
}

const PriceTrend: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { trends, loading } = useSelector((state: RootState) => state.dashboard);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear); // 选中的年份
  const [selectedHeight, setSelectedHeight] = useState<string>(''); // 选中的设备高度（初始为空，等待加载）
  const [selectedPriceType, setSelectedPriceType] = useState<'daily' | 'monthly'>('daily'); // 天租/月租切换
  const [heightsList, setHeightsList] = useState<string[]>([]); // 可用的设备高度列表
  const [priceTrends, setPriceTrends] = useState<EquipmentPriceTrend[]>([]); // 价格趋势数据
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  
  // 生成年份选项（最近5年）
  const yearOptions = useMemo(() => {
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push({ label: `${currentYear - i}年`, value: currentYear - i });
    }
    return years;
  }, [currentYear]);

  // 初始加载高度列表
  useEffect(() => {
    const fetchHeightsList = async () => {
      try {
        setIsLoadingPrices(true);
        // 先获取高度列表（查询全部）
        const response = await apiGet<any>(`/dashboard/equipment-price-trends?year=${currentYear}&height=all`);
        
        console.log('[PriceTrend] 初始加载响应:', response);
        
        // 处理响应数据（可能在data字段中）
        const data = response.data || response;
        
        if (data.heights && data.heights.length > 0) {
          setHeightsList(data.heights);
          // 默认选择第一个高度
          const firstHeight = data.heights[0];
          setSelectedHeight(firstHeight);
          
          // 如果有趋势数据，直接使用
          if (data.trends && data.trends.length > 0) {
            setPriceTrends(data.trends);
          }
        } else {
          console.warn('[PriceTrend] 未获取到高度列表');
        }
      } catch (error) {
        console.error('Failed to fetch heights list:', error);
      } finally {
        setIsLoadingPrices(false);
      }
    };

    fetchHeightsList();
  }, [currentYear]);

  // 切换年份
  const handleYearChange = async (value: number) => {
    setSelectedYear(value);
    if (!selectedHeight) return;
    
    try {
      setIsLoadingPrices(true);
      const response = await apiGet<any>(`/dashboard/equipment-price-trends?year=${value}&height=${selectedHeight}`);
      
      console.log('[PriceTrend] 切换年份响应:', response);
      
      // 处理响应数据（可能在data字段中）
      const data = response.data || response;
      
      setPriceTrends(data.trends || []);
    } catch (error) {
      console.error('Failed to fetch equipment price trends:', error);
      setPriceTrends([]);
    } finally {
      setIsLoadingPrices(false);
    }
  };

  // 切换设备高度
  const handleHeightChange = async (value: string) => {
    setSelectedHeight(value);
    if (!value) return;
    
    try {
      setIsLoadingPrices(true);
      const response = await apiGet<any>(`/dashboard/equipment-price-trends?year=${selectedYear}&height=${value}`);
      
      console.log('[PriceTrend] 切换高度响应:', response);
      
      // 处理响应数据（可能在data字段中）
      const data = response.data || response;
      
      setPriceTrends(data.trends || []);
    } catch (error) {
      console.error('Failed to fetch equipment price trends:', error);
      setPriceTrends([]);
    } finally {
      setIsLoadingPrices(false);
    }
  };

  // 处理数据：按月聚合（确保显示12个月，根据选择的租赁类型显示对应价格）
  const chartData = useMemo(() => {
    // 初始化12个月的数据
    const monthsData = [];
    for (let i = 1; i <= 12; i++) {
      monthsData.push({
        month: i,
        monthLabel: `${i}月`,
        avgPrice: 0, // 统一的价格字段
        avgDailyPrice: 0,
        avgMonthlyPrice: 0,
        dailyOrderCount: 0,
        monthlyOrderCount: 0,
        totalOrderCount: 0,
        orderCount: 0 // 当前类型的订单数
      });
    }
    
    if (!priceTrends || priceTrends.length === 0) return monthsData;
    
    // 填充实际数据
    priceTrends.forEach(item => {
      const month = parseInt(item.month.split('-')[1]); // 从 "2024-01" 提取月份
      if (month >= 1 && month <= 12) {
        monthsData[month - 1].avgDailyPrice = Math.round(item.avgDailyPrice);
        monthsData[month - 1].avgMonthlyPrice = Math.round(item.avgMonthlyPrice);
        monthsData[month - 1].dailyOrderCount = item.dailyOrderCount;
        monthsData[month - 1].monthlyOrderCount = item.monthlyOrderCount;
        monthsData[month - 1].totalOrderCount = item.totalOrderCount;
        
        // 根据选择的类型设置显示价格
        if (selectedPriceType === 'daily') {
          monthsData[month - 1].avgPrice = Math.round(item.avgDailyPrice);
          monthsData[month - 1].orderCount = item.dailyOrderCount;
        } else {
          monthsData[month - 1].avgPrice = Math.round(item.avgMonthlyPrice);
          monthsData[month - 1].orderCount = item.monthlyOrderCount;
        }
      }
    });
    
    return monthsData;
  }, [priceTrends, selectedYear, selectedPriceType]);

  // 计算趋势（根据选择的类型）
  const trendStats = useMemo(() => {
    if (chartData.length < 2) return { 
      currentPrice: 0, 
      percent: 0, 
      isUp: true
    };
    
    const currentPrice = chartData[chartData.length - 1].avgPrice;
    const prevPrice = chartData[chartData.length - 2].avgPrice;
    
    const isUp = currentPrice >= prevPrice;
    const percent = prevPrice > 0 ? Math.abs(((currentPrice - prevPrice) / prevPrice) * 100).toFixed(1) : '0.0';
    
    return { currentPrice, percent, isUp };
  }, [chartData]);

  // 根据高度决定显示模式
  const renderChart = () => {
    if (!selectedHeight || heightsList.length === 0) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />;
    }

    if (chartData.length === 0) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无订单数据" />;
    }

    const priceTypeLabel = selectedPriceType === 'daily' ? '天租' : '月租';
    const priceColor = selectedPriceType === 'daily' ? '#1890ff' : '#52c41a';
    
    return (
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="monthLabel" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: '价格（元）', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                return [`¥${value}`, name];
              }}
              labelFormatter={(label) => `${label}`}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend 
              iconType="rect"
            />
            
            <Bar 
              dataKey="avgPrice" 
              name={`${priceTypeLabel}均价`}
              fill={priceColor}
              radius={[8, 8, 0, 0]}
              maxBarSize={50}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <Card 
      title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BarChartOutlined /><span>设备价格趋势</span></div>}
      extra={
        <Space>
          <Select
            value={selectedPriceType}
            onChange={(value) => setSelectedPriceType(value)}
            size="small"
            style={{ width: 90 }}
            disabled={isLoadingPrices}
            options={[
              { label: '天租', value: 'daily' },
              { label: '月租', value: 'monthly' }
            ]}
          />
          <Select
            value={selectedHeight}
            onChange={handleHeightChange}
            size="small"
            style={{ width: 120 }}
            disabled={isLoadingPrices || heightsList.length === 0}
            placeholder="选择高度"
            options={heightsList.map(h => ({ label: h, value: h }))}
          />
          <Select
            value={selectedYear}
            onChange={handleYearChange}
            size="small"
            style={{ width: 100 }}
            disabled={isLoadingPrices}
            options={yearOptions}
          />
        </Space>
      }
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { flex: 1, padding: '12px', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
    >
      <Spin spinning={isLoadingPrices}>
        <div style={{ width: '100%', height: 350 }}>
          {renderChart()}
        </div>
      </Spin>
    </Card>
  );
};

export default PriceTrend;
