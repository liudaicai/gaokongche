import React, { useEffect, useState } from 'react';
import { Table, Tag, Empty, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { apiGet } from '../../../api/client';

interface HistoryRecord {
  order_id: number;
  contract_number: string;
  project_name: string;
  customer_name: string;
  entry_date: string;
  exit_date: string | null;
  order_status: string;
}

interface EquipmentHistoryProps {
  equipmentId: number;
}

const EquipmentHistory: React.FC<EquipmentHistoryProps> = ({ equipmentId }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    if (equipmentId) {
      loadHistory();
    }
  }, [equipmentId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await apiGet<HistoryRecord[]>(`/equipments/${equipmentId}/history`);
      if (res) {
        setData(res);
      }
    } catch (error) {
      console.error('Load history error:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<HistoryRecord> = [
    {
      title: '合同编号',
      dataIndex: 'contract_number',
      key: 'contract_number',
    },
    {
      title: '项目名称',
      dataIndex: 'project_name',
      key: 'project_name',
    },
    {
      title: '客户名称',
      dataIndex: 'customer_name',
      key: 'customer_name',
    },
    {
      title: '进场时间',
      dataIndex: 'entry_date',
      key: 'entry_date',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
      sorter: (a, b) => dayjs(a.entry_date).unix() - dayjs(b.entry_date).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: '退场时间',
      dataIndex: 'exit_date',
      key: 'exit_date',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : <Tag color="blue">租赁中</Tag>,
    },
    {
      title: '租赁天数',
      key: 'duration',
      render: (_, record) => {
        if (!record.entry_date) return '-';
        const start = dayjs(record.entry_date);
        const end = record.exit_date ? dayjs(record.exit_date) : dayjs();
        const days = end.diff(start, 'day') + 1;
        return `${days}天`;
      }
    }
  ];

  if (loading) return <Spin />;
  if (data.length === 0) return <Empty description="暂无履历记录" />;

  return (
    <Table 
      columns={columns} 
      dataSource={data} 
      rowKey={(record) => `${record.order_id}-${record.entry_date}`}
      pagination={false}
      size="small"
    />
  );
};

export default EquipmentHistory;


