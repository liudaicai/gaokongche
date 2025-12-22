import React, { useState, useEffect } from 'react';
import {
  Card,
  Space,
  Table,
  Radio,
  DatePicker,
  Button,
  Statistic,
  Row,
  Col,
  Spin,
  Typography,
  Select,
  App
} from 'antd';
import {
  DownloadOutlined,
  DollarOutlined,
  CalendarOutlined,
  FileTextOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { apiGet } from '../../api/client';

const { RangePicker } = DatePicker;
const { Title } = Typography;

interface EquipmentInfo {
  category: string;
  type: string;
  brand: string;
  model: string;
  height: string;
}

interface OrderDetail {
  orderId: number;
  contractNumber: string;
  billingMethod: string;
  entryDate: string;
  exitDate: string | null;
  days: number;
  dailyRate: number;
  monthlyRate: number;
  rent: number;
}

interface EquipmentStatItem {
  equipmentId: number;
  equipmentCode: string;
  equipmentInfo: EquipmentInfo;
  statistics: {
    totalRent: number;
    rentDays: number;
    orderCount: number;
    averageDailyRent: number;
  };
  orders: OrderDetail[];
}

interface Summary {
  totalRent: number;
  totalDays: number;
  totalOrders: number;
  equipmentCount: number;
  averageDailyRent: number;
}

interface RentStatsData {
  summary: Summary;
  list: EquipmentStatItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  query: {
    mode: string;
    dateStart: string;
    dateEnd: string;
  };
}

const EquipmentRentStatsPage: React.FC = () => {
  const { message } = App.useApp();
  const [mode, setMode] = useState<'year' | 'custom'>('year');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('year'),
    dayjs()
  ]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RentStatsData | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  // 加载统计数据
  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {
        mode,
        page,
        pageSize
      };

      if (mode === 'year') {
        params.year = year;
      } else {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      console.log('[EquipmentRentStats] 查询参数:', params);

      const response = await apiGet('/equipment-rent-stats/statistics', params);
      
      if (response.ok) {
        setData(response.data);
        console.log('[EquipmentRentStats] 数据加载成功:', response.data);
      } else {
        message.error(response.error || '加载失败');
      }
    } catch (error: any) {
      console.error('[EquipmentRentStats] 加载失败:', error);
      message.error('加载失败: ' + (error?.message || '网络错误'));
    } finally {
      setLoading(false);
    }
  };

  // 导出CSV
  const handleExport = async () => {
    try {
      const params: any = { mode };
      if (mode === 'year') {
        params.year = year;
      } else {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const queryString = new URLSearchParams(params).toString();
      const url = `${import.meta.env.VITE_API_BASE_URL || ''}/api/equipment-rent-stats/export?${queryString}`;
      
      // 创建临时链接并下载
      const link = document.createElement('a');
      link.href = url;
      link.download = `equipment_rent_stats_${params.year || params.startDate}_${params.endDate || ''}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success('导出成功');
    } catch (error: any) {
      console.error('[EquipmentRentStats] 导出失败:', error);
      message.error('导出失败');
    }
  };

  // 初始加载
  useEffect(() => {
    loadData();
  }, [mode, year, dateRange, page, pageSize]);

  // 表格列定义
  const columns = [
    {
      title: '设备编号',
      dataIndex: 'equipmentCode',
      key: 'equipmentCode',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: '设备信息',
      key: 'equipmentInfo',
      width: 200,
      render: (_: any, record: EquipmentStatItem) => (
        <Space direction="vertical" size="small">
          <span>{record.equipmentInfo.category} - {record.equipmentInfo.type}</span>
          <span style={{ color: '#888', fontSize: '12px' }}>
            {record.equipmentInfo.brand} {record.equipmentInfo.model} {record.equipmentInfo.height}
          </span>
        </Space>
      ),
    },
    {
      title: '租金总额(元)',
      dataIndex: ['statistics', 'totalRent'],
      key: 'totalRent',
      width: 120,
      align: 'right' as const,
      render: (value: number) => `¥${value.toFixed(2)}`,
      sorter: (a: EquipmentStatItem, b: EquipmentStatItem) => 
        a.statistics.totalRent - b.statistics.totalRent,
    },
    {
      title: '租赁天数',
      dataIndex: ['statistics', 'rentDays'],
      key: 'rentDays',
      width: 100,
      align: 'right' as const,
      sorter: (a: EquipmentStatItem, b: EquipmentStatItem) => 
        a.statistics.rentDays - b.statistics.rentDays,
    },
    {
      title: '订单数量',
      dataIndex: ['statistics', 'orderCount'],
      key: 'orderCount',
      width: 100,
      align: 'right' as const,
      sorter: (a: EquipmentStatItem, b: EquipmentStatItem) => 
        a.statistics.orderCount - b.statistics.orderCount,
    },
    {
      title: '日均租金(元)',
      dataIndex: ['statistics', 'averageDailyRent'],
      key: 'averageDailyRent',
      width: 120,
      align: 'right' as const,
      render: (value: number) => `¥${value.toFixed(2)}`,
      sorter: (a: EquipmentStatItem, b: EquipmentStatItem) => 
        a.statistics.averageDailyRent - b.statistics.averageDailyRent,
    },
  ];

  // 图表数据
  const chartData = data?.list.slice(0, 10).map(item => ({
    name: item.equipmentCode,
    租金: item.statistics.totalRent,
    天数: item.statistics.rentDays,
  })) || [];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <BarChartOutlined /> 设备租金统计
      </Title>

      {/* 筛选器 */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space size="large" wrap>
            <span>统计模式:</span>
            <Radio.Group value={mode} onChange={e => {
              setMode(e.target.value);
              setPage(1);
            }}>
              <Radio.Button value="year">按年度</Radio.Button>
              <Radio.Button value="custom">自定义时间段</Radio.Button>
            </Radio.Group>

            {mode === 'year' ? (
              <DatePicker
                picker="year"
                value={dayjs().year(year)}
                onChange={(date) => {
                  if (date) {
                    setYear(date.year());
                    setPage(1);
                  }
                }}
                style={{ width: 120 }}
              />
            ) : (
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([dates[0], dates[1]]);
                    setPage(1);
                  }
                }}
                format="YYYY-MM-DD"
                style={{ width: 260 }}
              />
            )}

            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={loading}
            >
              导出CSV
            </Button>

            <Select
              value={chartType}
              onChange={setChartType}
              style={{ width: 120 }}
              options={[
                { label: '柱状图', value: 'bar' },
                { label: '折线图', value: 'line' }
              ]}
            />
          </Space>

          <div style={{ color: '#888', fontSize: '14px' }}>
            <CalendarOutlined /> 统计时间段: {data?.query.dateStart} 至 {data?.query.dateEnd}
          </div>
        </Space>
      </Card>

      {/* 汇总统计 */}
      {data?.summary && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="租金总额"
                value={data.summary.totalRent}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="元"
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="租赁总天数"
                value={data.summary.totalDays}
                suffix="天"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="订单总数"
                value={data.summary.totalOrders}
                suffix="个"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="设备数量"
                value={data.summary.equipmentCount}
                suffix="台"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 图表 */}
      {chartData.length > 0 && (
        <Card
          title="Top 10 设备租金排行"
          style={{ marginBottom: 24 }}
        >
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'bar' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="租金" fill="#1890ff" />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="租金" stroke="#1890ff" strokeWidth={2} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </Card>
      )}

      {/* 数据表格 */}
      <Card title={<><FileTextOutlined /> 设备租金明细</>}>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={data?.list || []}
            rowKey="equipmentId"
            pagination={{
              current: page,
              pageSize: pageSize,
              total: data?.pagination.total || 0,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 台设备`,
              onChange: (newPage, newPageSize) => {
                setPage(newPage);
                if (newPageSize !== pageSize) {
                  setPageSize(newPageSize);
                  setPage(1);
                }
              },
            }}
            scroll={{ x: 1200 }}
            expandable={{
              expandedRowRender: (record: EquipmentStatItem) => (
                <Table
                  columns={[
                    { title: '订单编号', dataIndex: 'contractNumber', key: 'contractNumber' },
                    { title: '进场日期', dataIndex: 'entryDate', key: 'entryDate', width: 120 },
                    { title: '退场日期', dataIndex: 'exitDate', key: 'exitDate', width: 120, render: (val) => val || '未退场' },
                    { title: '租赁天数', dataIndex: 'days', key: 'days', width: 100, align: 'right' },
                    { title: '日租价', dataIndex: 'dailyRate', key: 'dailyRate', width: 100, align: 'right', render: (val) => `¥${val.toFixed(2)}` },
                    { title: '月租价', dataIndex: 'monthlyRate', key: 'monthlyRate', width: 100, align: 'right', render: (val) => `¥${val.toFixed(2)}` },
                    { title: '租金', dataIndex: 'rent', key: 'rent', width: 120, align: 'right', render: (val) => `¥${val.toFixed(2)}` },
                  ]}
                  dataSource={record.orders}
                  rowKey="orderId"
                  pagination={false}
                  size="small"
                />
              ),
            }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default EquipmentRentStatsPage;
