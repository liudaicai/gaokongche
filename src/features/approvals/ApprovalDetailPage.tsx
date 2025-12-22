/**
 * 审批详情页面
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Timeline,
  Button,
  Input,
  message,
  Space,
  Tag,
  Divider,
  Modal,
  Upload,
  Steps,
  Row,
  Col,
  Alert,
  Spin,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  RollbackOutlined,
  SwapOutlined,
  ClockCircleOutlined,
  UserOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { apiGet, apiPost } from '../../api/client';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface ApprovalInstance {
  id: number;
  instance_number: string;
  title: string;
  business_type: string;
  business_number: string;
  business_data: any;
  applicant_name: string;
  department_name: string;
  status: string;
  priority: string;
  started_at: string;
  finished_at: string | null;
  current_node_key: string;
}

interface ApprovalNode {
  id: number;
  node_key: string;
  node_name: string;
  node_type: string;
  status: string;
  actual_approvers: any[];
  started_at: string | null;
  finished_at: string | null;
  timeout_at: string | null;
  is_timeout: boolean;
}

interface ApprovalRecord {
  id: number;
  node_id: number;
  approver_id: number;
  approver_name: string;
  action: string;
  result: string | null;
  comment: string;
  created_at: string;
}

export const ApprovalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [instance, setInstance] = useState<ApprovalInstance | null>(null);
  const [nodes, setNodes] = useState<ApprovalNode[]>([]);
  const [records, setRecords] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [comment, setComment] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);

  // 转交相关状态
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferReason, setTransferReason] = useState('');

  const loadDetail = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const data = await apiGet(`/approvals/${id}`);
      setInstance(data.instance);
      setNodes(data.nodes || []);
      setRecords(data.records || []);
    } catch (error: any) {
      message.error(error.message || '加载详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleApprove = async (approved: boolean) => {
    if (!instance) return;

    setSubmitting(true);
    try {
      await apiPost(`/approvals/${instance.id}/approve`, {
        approved,
        comment,
        attachments,
      });

      message.success(approved ? '审批已通过' : '审批已拒绝');
      
      // 刷新详情
      await loadDetail();

      // 如果审批完成，延迟跳转回列表
      setTimeout(() => {
        navigate('/approvals/todo');
      }, 1500);
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!instance) return;

    Modal.confirm({
      title: '确认撤回',
      content: '撤回后审批将终止，是否确认？',
      onOk: async () => {
        try {
          await apiPost(`/approvals/${instance.id}/withdraw`, {
            reason: '申请人撤回',
          });
          message.success('已撤回');
          await loadDetail();
        } catch (error: any) {
          message.error(error.message || '撤回失败');
        }
      },
    });
  };

  if (loading || !instance) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  // 状态映射
  const statusMap: Record<string, { text: string; color: string }> = {
    pending: { text: '待审批', color: 'orange' },
    approved: { text: '已通过', color: 'green' },
    rejected: { text: '已拒绝', color: 'red' },
    withdrawn: { text: '已撤回', color: 'default' },
  };

  const status = statusMap[instance.status] || { text: instance.status, color: 'default' };

  // 判断当前用户是否可以审批
  const currentUserId = (window as any).currentUser?.id;
  const currentNode = nodes.find(n => n.node_key === instance.current_node_key);
  const canApprove =
    instance.status === 'pending' &&
    currentNode &&
    currentNode.actual_approvers?.some(
      (a: any) => a.id === currentUserId && a.status === 'pending'
    );

  // 判断当前用户是否是申请人
  const isApplicant = instance.applicant_name === (window as any).currentUser?.name;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* 页面标题 */}
      <Card>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button icon={<RollbackOutlined />} onClick={() => navigate(-1)}>
                返回
              </Button>
              <Divider type="vertical" />
              <h2 style={{ margin: 0 }}>{instance.title}</h2>
              <Tag color={status.color}>{status.text}</Tag>
            </Space>
          </Col>
          <Col>
            <Space>
              {instance.status === 'pending' && isApplicant && (
                <Button
                  danger
                  icon={<RollbackOutlined />}
                  onClick={handleWithdraw}
                >
                  撤回
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 基本信息 */}
      <Card title="审批信息">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="审批编号">{instance.instance_number}</Descriptions.Item>
          <Descriptions.Item label="业务编号">{instance.business_number}</Descriptions.Item>
          <Descriptions.Item label="申请人">{instance.applicant_name}</Descriptions.Item>
          <Descriptions.Item label="申请部门">{instance.department_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="申请时间">
            {dayjs(instance.started_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="完成时间">
            {instance.finished_at
              ? dayjs(instance.finished_at).format('YYYY-MM-DD HH:mm:ss')
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="审批状态">
            <Tag color={status.color}>{status.text}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="当前节点">
            {currentNode?.node_name || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 业务数据 */}
      <Card title="业务数据">
        <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
          {JSON.stringify(instance.business_data, null, 2)}
        </pre>
      </Card>

      {/* 审批流程 */}
      <Card title="审批流程">
        <Steps
          current={nodes.findIndex(n => n.status === 'processing')}
          status={instance.status === 'rejected' ? 'error' : undefined}
        >
          {nodes
            .filter(n => n.node_type !== 'start' && n.node_type !== 'end')
            .map(node => (
              <Steps.Step
                key={node.id}
                title={node.node_name}
                description={
                  node.status === 'approved' ? (
                    <Tag color="green">已通过</Tag>
                  ) : node.status === 'rejected' ? (
                    <Tag color="red">已拒绝</Tag>
                  ) : node.status === 'processing' ? (
                    <Tag color="orange">审批中</Tag>
                  ) : (
                    <Tag color="default">等待中</Tag>
                  )
                }
                icon={
                  node.status === 'approved' ? (
                    <CheckOutlined />
                  ) : node.status === 'rejected' ? (
                    <CloseOutlined />
                  ) : node.status === 'processing' ? (
                    <ClockCircleOutlined />
                  ) : (
                    <UserOutlined />
                  )
                }
              />
            ))}
        </Steps>
      </Card>

      {/* 审批历史 */}
      <Card title="审批历史">
        <Timeline>
          {records.map(record => (
            <Timeline.Item
              key={record.id}
              color={
                record.action === 'approve'
                  ? 'green'
                  : record.action === 'reject'
                  ? 'red'
                  : 'blue'
              }
            >
              <div>
                <strong>
                  {record.action === 'submit' && '提交申请'}
                  {record.action === 'approve' && '同意'}
                  {record.action === 'reject' && '拒绝'}
                  {record.action === 'withdraw' && '撤回'}
                  {record.action === 'transfer' && '转交'}
                </strong>{' '}
                - {record.approver_name}
              </div>
              {record.comment && (
                <div style={{ color: '#666', marginTop: 4 }}>意见：{record.comment}</div>
              )}
              <div style={{ color: '#999', fontSize: '12px', marginTop: 4 }}>
                {dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>

      {/* 审批操作 */}
      {canApprove && (
        <Card title="审批操作">
          {currentNode?.is_timeout && (
            <Alert
              message="该审批已超时，请尽快处理"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <div style={{ marginBottom: 8 }}>审批意见：</div>
              <TextArea
                rows={4}
                placeholder="请填写审批意见"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div>
              <div style={{ marginBottom: 8 }}>附件：</div>
              <Upload
                fileList={attachments}
                onChange={({ fileList }) => setAttachments(fileList)}
                beforeUpload={() => false}
              >
                <Button icon={<UploadOutlined />}>上传附件</Button>
              </Upload>
            </div>

            <Divider />

            <Space size="large">
              <Button
                type="primary"
                size="large"
                icon={<CheckOutlined />}
                loading={submitting}
                onClick={() => handleApprove(true)}
              >
                同意
              </Button>
              <Button
                danger
                size="large"
                icon={<CloseOutlined />}
                loading={submitting}
                onClick={() => handleApprove(false)}
              >
                拒绝
              </Button>
              <Button
                icon={<SwapOutlined />}
                onClick={() => setTransferModalVisible(true)}
              >
                转交
              </Button>
            </Space>
          </Space>
        </Card>
      )}

      {/* 转交Modal */}
      <Modal
        title="转交审批"
        open={transferModalVisible}
        onCancel={() => setTransferModalVisible(false)}
        onOk={async () => {
          // TODO: 实现转交逻辑
          message.info('转交功能开发中');
          setTransferModalVisible(false);
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>转交原因：</div>
          <TextArea
            rows={3}
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value)}
          />
        </Space>
      </Modal>
    </Space>
  );
};

export default ApprovalDetailPage;
