import React, { useEffect, useState } from 'react';
import { Modal, Table, Input, Select, Tag, Space, App, Row, Col } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { apiGet } from '../../api/client';
import dayjs from 'dayjs';

const { Search } = Input;

// 维修单据接口
interface EquipmentRepair {
  id: number;
  repairNumber: string;
  equipmentCode: string;
  equipmentId?: number;
  damageType?: string;
  damageDescription?: string;
  repairPerson?: string;
  repairCost?: number;
  repairStartDate?: string;
  repairEndDate?: string;
  status: string;
  remark?: string;
  createdAt: string;
}

interface RepairSelectModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (repair: EquipmentRepair) => void;
}

const RepairSelectModal: React.FC<RepairSelectModalProps> = ({ open, onClose, onSelect }) => {
  const { message: messageApi } = App.useApp();
  const [repairs, setRepairs] = useState<EquipmentRepair[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // 加载维修单据列表
  useEffect(() => {
    if (open) {
      fetchRepairs();
    }
  }, [open]);

  const fetchRepairs = async () => {
    setLoading(true);
    try {
      // apiGet 已移除 /api 前缀，并自动提取 data
      const response: any = await apiGet('/equipment-repairs?pageSize=100');
      setRepairs(response.items || []);
    } catch (error: any) {
      messageApi.error(error.message || '加载维修单据失败');
    } finally {
      setLoading(false);
    }
  };

  // 筛选维修单据
  const filteredRepairs = repairs.filter((repair) => {
    const matchStatus = !statusFilter || repair.status === statusFilter;
    const matchSearch = !searchText || 
      repair.repairNumber?.toLowerCase().includes(searchText.toLowerCase()) ||
      repair.equipmentCode?.toLowerCase().includes(searchText.toLowerCase()) ||
      repair.damageDescription?.toLowerCase().includes(searchText.toLowerCase()) ||
      repair.repairPerson?.toLowerCase().includes(searchText.toLowerCase());
    return matchStatus && matchSearch;
  });

  // 渲染状态标签
  const renderStatus = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      pending: { text: '待维修', color: 'orange' },
      repairing: { text: '维修中', color: 'blue' },
      completed: { text: '已完成', color: 'green' },
      cancelled: { text: '已取消', color: 'default' },
    };
    const config = statusMap[status] || { text: status, color: 'default' };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: '维修单号',
      dataIndex: 'repairNumber',
      key: 'repairNumber',
      width: 140,
      fixed: 'left' as const,
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: '设备编号',
      dataIndex: 'equipmentCode',
      key: 'equipmentCode',
      width: 120,
    },
    {
      title: '损坏类型',
      dataIndex: 'damageType',
      key: 'damageType',
      width: 100,
      render: (v: string) => v || '-',
    },
    {
      title: '损坏描述',
      dataIndex: 'damageDescription',
      key: 'damageDescription',
      width: 200,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '维修人员',
      dataIndex: 'repairPerson',
      key: 'repairPerson',
      width: 100,
      render: (v: string) => v || '-',
    },
    {
      title: '维修费用',
      dataIndex: 'repairCost',
      key: 'repairCost',
      width: 100,
      align: 'right' as const,
      render: (v: number) => v ? `¥${v.toFixed(2)}` : '-',
    },
    {
      title: '维修日期',
      key: 'repairDate',
      width: 180,
      render: (_: any, record: EquipmentRepair) => {
        const start = record.repairStartDate ? dayjs(record.repairStartDate).format('YYYY-MM-DD') : '-';
        const end = record.repairEndDate ? dayjs(record.repairEndDate).format('YYYY-MM-DD') : '-';
        return `${start} ~ ${end}`;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      fixed: 'right' as const,
      render: renderStatus,
    },
  ];

  const handleSelect = (record: EquipmentRepair) => {
    onSelect(record);
    onClose();
  };

  return (
    <Modal
      title="选择维修单据"
      open={open}
      onCancel={onClose}
      width={1200}
      footer={null}
      styles={{ body: { padding: '16px 24px' } }}
    >
      {/* 搜索和筛选 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={16}>
          <Search
            placeholder="搜索维修单号、设备编号、损坏描述、维修人员"
            allowClear
            enterButton={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col span={8}>
          <Select
            placeholder="筛选维修状态"
            allowClear
            style={{ width: '100%' }}
            value={statusFilter || undefined}
            onChange={(value) => setStatusFilter(value || '')}
            options={[
              { label: '待维修', value: 'pending' },
              { label: '维修中', value: 'repairing' },
              { label: '已完成', value: 'completed' },
              { label: '已取消', value: 'cancelled' },
            ]}
          />
        </Col>
      </Row>

      {/* 维修单据列表 */}
      <Table
        columns={columns}
        dataSource={filteredRepairs}
        rowKey="id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条维修单据`,
          defaultPageSize: 10,
          pageSizeOptions: ['10', '20', '50'],
        }}
        scroll={{ x: 1100, y: 400 }}
        onRow={(record) => ({
          onClick: () => handleSelect(record),
          style: { cursor: 'pointer' },
        })}
        locale={{
          emptyText: '暂无维修单据',
        }}
      />

      <div style={{ marginTop: 12, color: '#666', fontSize: 13 }}>
        💡 点击表格行即可选择该维修单据
      </div>
    </Modal>
  );
};

export default RepairSelectModal;
