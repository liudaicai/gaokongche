import React, { useEffect, useState } from 'react';
import { Table, Tag, Space, message, Button, Popconfirm, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { apiGet, apiPost } from '../../../api/client';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

interface EquipmentReplacementHistoryProps {
  orderId: string;
  onReplacementComplete?: () => void;
}

interface ReplacementRecord {
  id: number;
  order_number: string;
  old_equipment_code: string;
  old_equipment_custom_code?: string;
  old_equipment_model: string;
  old_equipment_brand: string;
  old_equipment_height: number;
  new_equipment_code: string;
  new_equipment_custom_code?: string;
  new_equipment_model: string;
  new_equipment_brand: string;
  new_equipment_height: number;
  reason: string;
  responsibility_party: 'customer' | 'company';
  transport_fee: number;
  transport_fee_payer: 'customer' | 'company';
  original_daily_rate: number;
  original_monthly_rate: number;
  replacement_date: string;
  operator_name: string;
  remarks: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approved_at: string;
  approver_name: string;
  created_at: string;
}

const EquipmentReplacementHistory: React.FC<EquipmentReplacementHistoryProps> = ({
  orderId,
  onReplacementComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<ReplacementRecord[]>([]);

  useEffect(() => {
    loadReplacementHistory();
  }, [orderId]);

  const loadReplacementHistory = async () => {
    try {
      setLoading(true);
      const response: any = await apiGet(`/equipment-replacements?order_id=${orderId}`);

      // apiGet 已自动提取 data，response 就是 { items, total, page, limit }
      setRecords(response.items || []);
    } catch (error: any) {
      message.error(error.message || '加载换机记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await apiPost(`/equipment-replacements/${id}/approve`, {
        approved: true,
      });

      message.success('换机申请已通过，设备已更换');
      loadReplacementHistory();
      onReplacementComplete?.();
    } catch (error: any) {
      message.error(error.message || '审核失败');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await apiPost(`/equipment-replacements/${id}/approve`, {
        approved: false,
      });

      message.success('换机申请已拒绝');
      loadReplacementHistory();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const statusMap = {
    pending: { text: '待审核', color: 'orange' },
    approved: { text: '已审核', color: 'blue' },
    rejected: { text: '已拒绝', color: 'red' },
    completed: { text: '已完成', color: 'green' },
  };

  const responsibilityMap = {
    customer: '客户',
    company: '我方',
  };

  const columns: ColumnsType<ReplacementRecord> = [
    {
      title: '更换时间',
      dataIndex: 'replacement_date',
      key: 'replacement_date',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '原设备',
      key: 'old_equipment',
      width: 200,
      render: (_: any, record: ReplacementRecord) => (
        <div>
          <div>{record.old_equipment_custom_code || record.old_equipment_code}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {record.old_equipment_brand} - {record.old_equipment_model} - {record.old_equipment_height}米
          </div>
        </div>
      ),
    },
    {
      title: '新设备',
      key: 'new_equipment',
      width: 200,
      render: (_: any, record: ReplacementRecord) => (
        <div>
          <div>{record.new_equipment_custom_code || record.new_equipment_code}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {record.new_equipment_brand} - {record.new_equipment_model} - {record.new_equipment_height}米
          </div>
        </div>
      ),
    },
    {
      title: '更换原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: { showTitle: false },
      render: (text: string) => (
        <Tooltip placement="topLeft" title={text}>
          {text}
        </Tooltip>
      ),
    },
    {
      title: '责任方',
      dataIndex: 'responsibility_party',
      key: 'responsibility_party',
      width: 80,
      render: (party: 'customer' | 'company') => responsibilityMap[party],
    },
    {
      title: '运输费用',
      key: 'transport',
      width: 120,
      render: (_: any, record: ReplacementRecord) => (
        <div>
          <div>¥{Number(record.transport_fee || 0).toFixed(2)}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {responsibilityMap[record.transport_fee_payer]}承担
          </div>
        </div>
      ),
    },
    {
      title: '租金',
      key: 'rates',
      width: 150,
      render: (_: any, record: ReplacementRecord) => (
        <div style={{ fontSize: 12 }}>
          <div>日租：¥{record.original_daily_rate}</div>
          <div>月租：¥{record.original_monthly_rate}</div>
          <div style={{ color: '#999' }}>（保持原价）</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: keyof typeof statusMap) => (
        <Tag color={statusMap[status].color}>{statusMap[status].text}</Tag>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'operator_name',
      key: 'operator_name',
      width: 100,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right' as 'right',
      width: 150,
      render: (_: any, record: ReplacementRecord) => {
        if (record.status === 'pending') {
          return (
            <Space>
              <Popconfirm
                title="确认通过换机申请？"
                description="通过后将自动完成设备更换"
                onConfirm={() => handleApprove(record.id)}
              >
                <Button type="link" size="small" icon={<CheckCircleOutlined />}>
                  通过
                </Button>
              </Popconfirm>
              <Popconfirm
                title="确认拒绝换机申请？"
                onConfirm={() => handleReject(record.id)}
              >
                <Button type="link" size="small" danger icon={<CloseCircleOutlined />}>
                  拒绝
                </Button>
              </Popconfirm>
            </Space>
          );
        }
        
        if (record.status === 'completed' && record.approved_at) {
          return (
            <span style={{ fontSize: 12, color: '#999' }}>
              {dayjs(record.approved_at).format('MM-DD HH:mm')} 完成
            </span>
          );
        }

        return '-';
      },
    },
  ];

  return (
    <Table
      size="small"
      rowKey="id"
      columns={columns}
      dataSource={records}
      loading={loading}
      pagination={false}
      scroll={{ x: 'max-content' }}
    />
  );
};

export default EquipmentReplacementHistory;
