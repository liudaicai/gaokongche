/**
 * 审批待办列表
 */

import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Card, Tabs, Badge, Select, message } from 'antd';
import { ClockCircleOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiGet } from '../../api/client';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

interface ApprovalItem {
  instance_id: number;
  instance_number: string;
  title: string;
  business_type: string;
  business_number: string;
  applicant_id: number;
  applicant_name: string;
  started_at: string;
  priority: string;
  node_id: number;
  node_name: string;
  timeout_at: string | null;
  is_timeout: boolean;
  pending_hours: number;
}

export const ApprovalTodoList: React.FC = () => {
  const [todoList, setTodoList] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ businessType: '', priority: '' });
  const navigate = useNavigate();

  const loadTodoList = async (page = 1) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: pagination.pageSize,
      };

      if (filters.businessType) {
        params.businessType = filters.businessType;
      }
      if (filters.priority) {
        params.priority = filters.priority;
      }

      const response = await apiGet('/approvals/todo', params);
      setTodoList(response.items || []);
      setPagination({
        ...pagination,
        current: page,
        total: response.total || 0,
      });
    } catch (error: any) {
      console.error('加载待办失败:', error);
      message.error(error.message || '加载待办失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodoList();
  }, [filters]);

  const businessTypeMap: Record<string, string> = {
    equipment_replacement: '设备换机',
    order: '订单',
    purchase: '采购',
    repair: '维修',
    refund: '退款',
  };

  const priorityMap: Record<string, { text: string; color: string }> = {
    low: { text: '低', color: 'default' },
    normal: { text: '普通', color: 'blue' },
    high: { text: '高', color: 'orange' },
    urgent: { text: '紧急', color: 'red' },
  };

  const columns: ColumnsType<ApprovalItem> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      render: (title: string, record: ApprovalItem) => (
        <div>
          <div style={{ fontWeight: 500 }}>{title}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            {record.business_number}
          </div>
        </div>
      ),
    },
    {
      title: '业务类型',
      dataIndex: 'business_type',
      key: 'business_type',
      width: 100,
      render: (type: string) => businessTypeMap[type] || type,
    },
    {
      title: '当前节点',
      dataIndex: 'node_name',
      key: 'node_name',
      width: 120,
    },
    {
      title: '申请人',
      dataIndex: 'applicant_name',
      key: 'applicant_name',
      width: 100,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => {
        const p = priorityMap[priority] || priorityMap.normal;
        return <Tag color={p.color}>{p.text}</Tag>;
      },
    },
    {
      title: '等待时长',
      dataIndex: 'pending_hours',
      key: 'pending_hours',
      width: 120,
      render: (hours: number, record: ApprovalItem) => (
        <div>
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          {hours < 24
            ? `${Math.floor(hours)}小时`
            : `${Math.floor(hours / 24)}天`}
          {record.is_timeout && (
            <Tag color="red" style={{ marginLeft: 8 }}>
              超时
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '申请时间',
      dataIndex: 'started_at',
      key: 'started_at',
      width: 180,
      render: (time: string) => (
        <div>
          <div>{dayjs(time).format('YYYY-MM-DD HH:mm')}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            {dayjs(time).fromNow()}
          </div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as 'right',
      width: 200,
      render: (_, record: ApprovalItem) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/approvals/${record.instance_id}`)}
          >
            查看详情
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => navigate(`/approvals/${record.instance_id}?action=approve`)}
          >
            审批
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <span>待办审批</span>
          <Badge count={pagination.total} showZero style={{ backgroundColor: '#ff4d4f' }} />
        </Space>
      }
      extra={
        <Space>
          <Select
            style={{ width: 120 }}
            placeholder="业务类型"
            allowClear
            value={filters.businessType || undefined}
            onChange={(value) => setFilters({ ...filters, businessType: value || '' })}
          >
            <Select.Option value="equipment_replacement">设备换机</Select.Option>
            <Select.Option value="order">订单</Select.Option>
            <Select.Option value="purchase">采购</Select.Option>
            <Select.Option value="repair">维修</Select.Option>
          </Select>
          <Select
            style={{ width: 100 }}
            placeholder="优先级"
            allowClear
            value={filters.priority || undefined}
            onChange={(value) => setFilters({ ...filters, priority: value || '' })}
          >
            <Select.Option value="urgent">紧急</Select.Option>
            <Select.Option value="high">高</Select.Option>
            <Select.Option value="normal">普通</Select.Option>
            <Select.Option value="low">低</Select.Option>
          </Select>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={todoList}
        loading={loading}
        rowKey="instance_id"
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPagination({ ...pagination, pageSize: pageSize || 20 });
            loadTodoList(page);
          },
        }}
        scroll={{ x: 1200 }}
      />
    </Card>
  );
};

export default ApprovalTodoList;
