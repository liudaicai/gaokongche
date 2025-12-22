import React, { useEffect, useState } from 'react';
import { Card, Timeline, Tag, Typography, Empty, Skeleton, Space } from 'antd';
import { ClockCircleOutlined, UserOutlined, CheckCircleOutlined, CloseCircleOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiGet } from '../../../api/client';

const { Text, Paragraph } = Typography;

interface OrderLog {
  id: string;
  userId?: string;
  username?: string;
  userName?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: any;
  createdAt: string;
}

interface OrderLogsProps {
  orderId: string;
}

const OrderLogs: React.FC<OrderLogsProps> = ({ orderId }) => {
  const [logs, setLogs] = useState<OrderLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const data = await apiGet<OrderLog[]>(`/orders/${orderId}/logs`);
        setLogs(Array.isArray(data) ? data : []);
      } catch (error: any) {
        console.error('[OrderLogs] Fetch error:', error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchLogs();
    }
  }, [orderId]);

  // 操作类型映射
  const actionMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    'order_created': { label: '创建订单', color: 'blue', icon: <PlusOutlined /> },
    'order_updated': { label: '更新订单', color: 'cyan', icon: <EditOutlined /> },
    'order_deleted': { label: '删除订单', color: 'red', icon: <DeleteOutlined /> },
    'entry_created': { label: '创建进场记录', color: 'green', icon: <CheckCircleOutlined /> },
    'entry_updated': { label: '更新进场记录', color: 'lime', icon: <EditOutlined /> },
    'entry_deleted': { label: '删除进场记录', color: 'red', icon: <DeleteOutlined /> },
    'exit_created': { label: '创建退场记录', color: 'orange', icon: <CheckCircleOutlined /> },
    'exit_updated': { label: '更新退场记录', color: 'gold', icon: <EditOutlined /> },
    'exit_deleted': { label: '删除退场记录', color: 'red', icon: <DeleteOutlined /> },
    'receipt_created': { label: '创建收款记录', color: 'green', icon: <CheckCircleOutlined /> },
    'receipt_deleted': { label: '删除收款记录', color: 'red', icon: <DeleteOutlined /> },
    'refund_created': { label: '创建退款记录', color: 'orange', icon: <CheckCircleOutlined /> },
    'refund_deleted': { label: '删除退款记录', color: 'red', icon: <DeleteOutlined /> },
    'suspension_created': { label: '创建报停记录', color: 'purple', icon: <CheckCircleOutlined /> },
    'suspension_approved': { label: '批准报停', color: 'green', icon: <CheckCircleOutlined /> },
    'suspension_rejected': { label: '驳回报停', color: 'red', icon: <CloseCircleOutlined /> },
    'claim_created': { label: '创建索赔记录', color: 'magenta', icon: <CheckCircleOutlined /> },
    'settlement_created': { label: '创建结算记录', color: 'blue', icon: <CheckCircleOutlined /> },
    'settlement_deleted': { label: '删除结算记录', color: 'red', icon: <DeleteOutlined /> },
    'clearance_created': { label: '创建清款记录', color: 'cyan', icon: <CheckCircleOutlined /> },
    'clearance_deleted': { label: '删除清款记录', color: 'red', icon: <DeleteOutlined /> }
  };

  // 格式化操作详情
  const formatDetails = (details: any): string => {
    if (!details || typeof details !== 'object') {
      return '';
    }

    const parts: string[] = [];
    
    // 处理常见字段
    if (details.contractNumber) {
      parts.push(`合同编号: ${details.contractNumber}`);
    }
    if (details.entryNumber) {
      parts.push(`进场单号: ${details.entryNumber}`);
    }
    if (details.exitNumber) {
      parts.push(`退场单号: ${details.exitNumber}`);
    }
    if (details.receiptNumber) {
      parts.push(`收款单号: ${details.receiptNumber}`);
    }
    if (details.refundNumber) {
      parts.push(`退款单号: ${details.refundNumber}`);
    }
    if (details.suspensionId) {
      parts.push(`报停ID: ${details.suspensionId}`);
    }
    if (details.suspensionType) {
      parts.push(`报停类型: ${details.suspensionType}`);
    }
    if (details.claimId) {
      parts.push(`索赔ID: ${details.claimId}`);
    }
    if (details.settlementId) {
      parts.push(`结算ID: ${details.settlementId}`);
    }
    if (details.clearanceId) {
      parts.push(`清款ID: ${details.clearanceId}`);
    }
    if (details.startDate) {
      parts.push(`开始日期: ${dayjs(details.startDate).format('YYYY-MM-DD')}`);
    }
    if (details.amount !== undefined) {
      parts.push(`金额: ¥${Number(details.amount).toLocaleString()}`);
    }

    return parts.join(' | ');
  };

  if (loading) {
    return <Skeleton active />;
  }

  if (logs.length === 0) {
    return (
      <Card size="small" title="订单日志">
        <Empty description="暂无操作日志" />
      </Card>
    );
  }

  return (
    <Card size="small" title="订单日志" style={{ marginTop: 16 }}>
      <Timeline
        mode="left"
        items={logs.map((log) => {
          const actionConfig = actionMap[log.action] || {
            label: log.action,
            color: 'default',
            icon: <ClockCircleOutlined />
          };

          const detailsText = formatDetails(log.details);
          const userName = log.userName || log.username || '系统';

          return {
            color: actionConfig.color,
            dot: actionConfig.icon,
            children: (
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space>
                  <Tag color={actionConfig.color}>{actionConfig.label}</Tag>
                  <Text type="secondary">
                    <UserOutlined /> {userName}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  </Text>
                </Space>
                {detailsText && (
                  <Paragraph
                    style={{ margin: 0, fontSize: 12, color: '#666' }}
                    ellipsis={{ rows: 2, expandable: true }}
                  >
                    {detailsText}
                  </Paragraph>
                )}
              </Space>
            )
          };
        })}
      />
    </Card>
  );
};

export default OrderLogs;

