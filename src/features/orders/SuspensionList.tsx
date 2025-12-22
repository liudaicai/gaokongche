import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  message,
  Modal,
  Descriptions,
  Statistic,
  Row,
  Col,
  Card,
  // Tooltip
} from 'antd';
import {
  PlusOutlined,
  CheckOutlined,
  // CloseOutlined,
  StopOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiGet, apiDelete } from '../../api/client';
import type { OrderSuspension, SuspensionStats } from './types';
import CreateSuspensionModal from './CreateSuspensionModal';
import ApproveSuspensionModal from './ApproveSuspensionModal';
import EndSuspensionModal from './EndSuspensionModal';

interface SuspensionListProps {
  orderId: string;
}

const SuspensionList: React.FC<SuspensionListProps> = ({ orderId }) => {
  const [loading, setLoading] = useState(false);
  const [suspensions, setSuspensions] = useState<OrderSuspension[]>([]);
  const [stats, setStats] = useState<SuspensionStats | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [selectedSuspension, setSelectedSuspension] = useState<OrderSuspension | null>(null);

  useEffect(() => {
    fetchSuspensions();
    fetchStats();
  }, [orderId]);

  const fetchSuspensions = async () => {
    setLoading(true);
    try {
      const data = await apiGet<OrderSuspension[]>(`/orders/${orderId}/suspensions`);
      setSuspensions(data);
    } catch (error: any) {
      message.error(error.message || '获取报停记录失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiGet<SuspensionStats>(`/orders/${orderId}/suspensions/stats`);
      setStats(data);
    } catch (error: any) {
      console.error('获取报停统计失败:', error);
    }
  };

  const handleDelete = (suspension: OrderSuspension) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条报停记录吗？',
      onOk: async () => {
        try {
          await apiDelete(`/orders/${orderId}/suspensions/${suspension.id}`);
          message.success('删除成功');
          fetchSuspensions();
          fetchStats();
        } catch (error: any) {
          message.error(error.message || '删除失败');
        }
      }
    });
  };

  const handleApprove = (suspension: OrderSuspension) => {
    setSelectedSuspension(suspension);
    setApproveModalVisible(true);
  };

  const handleEnd = (suspension: OrderSuspension) => {
    setSelectedSuspension(suspension);
    setEndModalVisible(true);
  };

  const getSuspensionTypeText = (type: string) => {
    const types: Record<string, string> = {
      weather: '天气原因',
      site_stop: '工地停工',
      maintenance: '设备维修',
      customer_request: '客户要求'
    };
    return types[type] || type;
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'orange', text: '待审批' },
      approved: { color: 'green', text: '已批准' },
      rejected: { color: 'red', text: '已拒绝' },
      ended: { color: 'default', text: '已结束' }
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: '报停类型',
      dataIndex: 'suspensionType',
      key: 'suspensionType',
      render: (type: string) => getSuspensionTypeText(type)
    },
    {
      title: '设备',
      dataIndex: 'equipmentCode',
      key: 'equipmentCode',
      render: (code: string) => code || <Tag>整个订单</Tag>
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '结束日期',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: '天数',
      dataIndex: 'suspensionDays',
      key: 'suspensionDays',
      render: (days: number) => days ? `${days}天` : '-'
    },
    {
      title: '计费',
      key: 'charging',
      render: (_: any, record: OrderSuspension) => {
        if (record.isChargeFree) {
          return <Tag color="green">免费</Tag>;
        } else if (record.discountRate > 0) {
          return <Tag color="blue">{record.discountRate}%折扣</Tag>;
        } else {
          return <Tag>正常计费</Tag>;
        }
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '审批人',
      dataIndex: 'approverName',
      key: 'approverName',
      render: (name: string) => name || '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: OrderSuspension) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleApprove(record)}
              >
                审批
              </Button>
              <Button
                type="link"
                size="small"
                danger
                onClick={() => handleDelete(record)}
              >
                删除
              </Button>
            </>
          )}
          {record.status === 'approved' && !record.endDate && (
            <Button
              type="link"
              size="small"
              icon={<StopOutlined />}
              onClick={() => handleEnd(record)}
            >
              结束报停
            </Button>
          )}
          {['rejected', 'ended'].includes(record.status) && (
            <Button
              type="link"
              size="small"
              disabled
            >
              -
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总报停次数"
                value={stats.totalSuspensions}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="待审批"
                value={stats.pendingCount}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总报停天数"
                value={stats.totalSuspensionDays}
                suffix="天"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="免费报停天数"
                value={stats.freeSuspensionDays}
                suffix="天"
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 操作按钮 */}
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          创建报停
        </Button>
      </div>

      {/* 报停列表 */}
      <Table
        loading={loading}
        columns={columns}
        dataSource={suspensions}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`
        }}
        expandable={{
          expandedRowRender: (record) => (
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="报停原因" span={2}>
                {record.reason || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建人">
                {record.creatorName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              {record.notes && (
                <Descriptions.Item label="备注" span={2}>
                  {record.notes}
                </Descriptions.Item>
              )}
              {record.attachments && record.attachments.length > 0 && (
                <Descriptions.Item label="附件" span={2}>
                  {record.attachments.map((file, index) => (
                    <a key={index} href={file} target="_blank" rel="noopener noreferrer">
                      附件{index + 1}{' '}
                    </a>
                  ))}
                </Descriptions.Item>
              )}
            </Descriptions>
          )
        }}
      />

      {/* 创建报停模态框 */}
      <CreateSuspensionModal
        visible={createModalVisible}
        orderId={orderId}
        onSuccess={() => {
          setCreateModalVisible(false);
          fetchSuspensions();
          fetchStats();
        }}
        onCancel={() => setCreateModalVisible(false)}
      />

      {/* 审批模态框 */}
      {selectedSuspension && (
        <ApproveSuspensionModal
          visible={approveModalVisible}
          suspension={selectedSuspension}
          orderId={orderId}
          onSuccess={() => {
            setApproveModalVisible(false);
            setSelectedSuspension(null);
            fetchSuspensions();
            fetchStats();
          }}
          onCancel={() => {
            setApproveModalVisible(false);
            setSelectedSuspension(null);
          }}
        />
      )}

      {/* 结束报停模态框 */}
      {selectedSuspension && (
        <EndSuspensionModal
          visible={endModalVisible}
          suspension={selectedSuspension}
          orderId={orderId}
          onSuccess={() => {
            setEndModalVisible(false);
            setSelectedSuspension(null);
            fetchSuspensions();
            fetchStats();
          }}
          onCancel={() => {
            setEndModalVisible(false);
            setSelectedSuspension(null);
          }}
        />
      )}
    </div>
  );
};

export default SuspensionList;

