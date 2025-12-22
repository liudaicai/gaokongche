/**
 * 已办审批列表
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
  applicant_name: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  action: string;
  comment: string;
  approval_time: string;
}

export const ApprovalDoneList: React.FC = () => {
  const [doneList, setDoneList] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ businessType: '', status: '' });
  const navigate = useNavigate();

  const loadDoneList = async (page = 1) => {
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

      const response = await apiGet('/approvals/done', params);
      setDoneList(response.items || []);
      setPagination({
        ...pagination,
        current: page,
        total: response.total || 0,
      });
    } catch (error: any) {
      console.error('加载已办失败:', error);
      message.error(error.message || '加载已办失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoneList();
  }, [filters]);

  const businessTypeMap: Record<string, string> = {
    equipment_replacement: '设备换机',
    order: '订单',
    purchase: '采购',
    repair: '维修',
    refund: '退款',
  };

  const statusMap: Record<string, { text: string; color: string }> = {
    pending: { text: '待审批', color: 'orange' },
    approved: { text: '已通过', color: 'green' },
    rejected: { text: '已拒绝', color: 'red' },
    withdrawn: { text: '已撤回', color: 'default' },
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
      title: '申请人',
      dataIndex: 'applicant_name',
      key: 'applicant_name',
      width: 100,
    },
    {
      title: '我的操作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: string) => (
        <Tag color={action === 'approve' ? 'green' : 'red'}>
          {action === 'approve' ? '同意' : '拒绝'}
        </Tag>
      ),
    },
    {
      title: '审批意见',
      dataIndex: 'comment',
      key: 'comment',
      width: 200,
      ellipsis: true,
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
      title: '审批时间',
      dataIndex: 'approval_time',
      key: 'approval_time',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action_btn',
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
      title="已办审批"
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
            <Select.Option value="approved">已通过</Select.Option>
            <Select.Option value="rejected">已拒绝</Select.Option>
          </Select>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={doneList}
        loading={loading}
        rowKey="id"
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPagination({ ...pagination, pageSize: pageSize || 20 });
            loadDoneList(page);
          },
        }}
        scroll={{ x: 1200 }}
      />
    </Card>
  );
};

export default ApprovalDoneList;
