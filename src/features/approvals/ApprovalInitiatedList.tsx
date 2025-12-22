/**
 * 我发起的审批列表
 */

import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Card, Select, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { apiGet } from '../../api/client';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

interface ApprovalItem {
  id: number;
  instance_number: string;
  title: string;
  business_type: string;
  business_number: string;
  status: string;
  priority: string;
  started_at: string;
  finished_at: string | null;
  current_node_key: string;
}

export const ApprovalInitiatedList: React.FC = () => {
  const [initiatedList, setInitiatedList] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ businessType: '', status: '' });
  const navigate = useNavigate();

  const loadInitiatedList = async (page = 1) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: pagination.pageSize,
      };

      if (filters.businessType) {
        params.businessType = filters.businessType;
      }
      if (filters.status) {
        params.status = filters.status;
      }

      const response = await apiGet('/approvals/initiated', params);
      setInitiatedList(response.items || []);
      setPagination({
        ...pagination,
        current: page,
        total: response.total || 0,
      });
    } catch (error: any) {
      console.error('加载发起的审批失败:', error);
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitiatedList();
  }, [filters]);

  const businessTypeMap: Record<string, string> = {
    equipment_replacement: '设备换机',
    order: '订单',
    purchase: '采购',
    repair: '维修',
    refund: '退款',
  };

  const statusMap: Record<string, { text: string; color: string }> = {
    pending: { text: '审批中', color: 'orange' },
    approved: { text: '已通过', color: 'green' },
    rejected: { text: '已拒绝', color: 'red' },
    withdrawn: { text: '已撤回', color: 'default' },
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
      title: '审批状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const s = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '发起时间',
      dataIndex: 'started_at',
      key: 'started_at',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '完成时间',
      dataIndex: 'finished_at',
      key: 'finished_at',
      width: 180,
      render: (time: string | null) =>
        time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as 'right',
      width: 100,
      render: (_, record: ApprovalItem) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/approvals/${record.id}`)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="我发起的审批"
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
            placeholder="审批状态"
            allowClear
            value={filters.status || undefined}
            onChange={(value) => setFilters({ ...filters, status: value || '' })}
          >
            <Select.Option value="pending">审批中</Select.Option>
            <Select.Option value="approved">已通过</Select.Option>
            <Select.Option value="rejected">已拒绝</Select.Option>
            <Select.Option value="withdrawn">已撤回</Select.Option>
          </Select>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={initiatedList}
        loading={loading}
        rowKey="id"
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPagination({ ...pagination, pageSize: pageSize || 20 });
            loadInitiatedList(page);
          },
        }}
        scroll={{ x: 1200 }}
      />
    </Card>
  );
};

export default ApprovalInitiatedList;
