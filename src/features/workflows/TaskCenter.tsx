import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  message,
  Badge,
  Descriptions,
  Timeline,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { AppDispatch, RootState } from '../../app/store';
import {
  fetchPendingTasks,
  completeTask,
  fetchWorkflowInstance,
  fetchWorkflowStats,
  clearCurrentInstance,
} from './workflowsSlice';
import type { WorkflowTask, Priority, TaskStatus } from './types';

const { TextArea } = Input;

const TaskCenter: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { pendingTasks, currentInstance, history, stats, loading } = useSelector(
    (state: RootState) => state.workflows
  );

  const [form] = Form.useForm();
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null);

  useEffect(() => {
    loadData();
    dispatch(fetchWorkflowStats());
  }, []);

  const loadData = () => {
    dispatch(fetchPendingTasks());
  };

  const handleApprove = (task: WorkflowTask) => {
    setSelectedTask(task);
    form.resetFields();
    form.setFieldsValue({ result: 'approved' });
    setApprovalModalVisible(true);
  };

  const handleReject = (task: WorkflowTask) => {
    setSelectedTask(task);
    form.resetFields();
    form.setFieldsValue({ result: 'rejected' });
    setApprovalModalVisible(true);
  };

  const handleViewDetail = async (task: WorkflowTask) => {
    setSelectedTask(task);
    await dispatch(fetchWorkflowInstance(task.workflowInstanceId));
    setDetailModalVisible(true);
  };

  const handleSubmitApproval = async () => {
    try {
      const values = await form.validateFields();
      if (!selectedTask) return;

      await dispatch(
        completeTask({
          taskId: selectedTask.id,
          data: values,
        })
      ).unwrap();

      message.success('处理成功');
      setApprovalModalVisible(false);
      loadData();
      dispatch(fetchWorkflowStats());
    } catch (error: any) {
      message.error(error || '处理失败');
    }
  };

  const getPriorityTag = (priority: Priority) => {
    const config = {
      urgent: { color: 'red', text: '紧急' },
      high: { color: 'orange', text: '高' },
      normal: { color: 'blue', text: '普通' },
      low: { color: 'default', text: '低' },
    };
    return <Tag color={config[priority].color}>{config[priority].text}</Tag>;
  };

  const getStatusTag = (status: TaskStatus) => {
    const config = {
      pending: { color: 'default', text: '待处理' },
      claimed: { color: 'processing', text: '已认领' },
      in_progress: { color: 'processing', text: '处理中' },
      completed: { color: 'success', text: '已完成' },
      rejected: { color: 'error', text: '已拒绝' },
      cancelled: { color: 'default', text: '已取消' },
    };
    return <Tag color={config[status].color}>{config[status].text}</Tag>;
  };

  const columns: ColumnsType<WorkflowTask> = [
    {
      title: '任务编号',
      dataIndex: 'taskNo',
      key: 'taskNo',
      width: 150,
      fixed: 'left',
    },
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      ellipsis: true,
    },
    {
      title: '流程名称',
      dataIndex: 'workflowName',
      key: 'workflowName',
      width: 150,
    },
    {
      title: '业务单号',
      dataIndex: 'businessNo',
      key: 'businessNo',
      width: 150,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority) => getPriorityTag(priority),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '截止时间',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 160,
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 250,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          {record.status === 'pending' || record.status === 'claimed' ? (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprove(record)}
              >
                通过
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleReject(record)}
              >
                拒绝
              </Button>
            </>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="待办任务"
                value={stats.pendingTasks}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="进行中流程"
                value={stats.runningInstances}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日已完成"
                value={stats.todayCompleted}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="本月流程"
                value={stats.monthlyStats.reduce((sum, s) => sum + s.count, 0)}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 任务列表 */}
      <Card title="我的待办任务" extra={<Badge count={pendingTasks.length} />}>
        <Table
          columns={columns}
          dataSource={pendingTasks}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 审批对话框 */}
      <Modal
        title={form.getFieldValue('result') === 'approved' ? '审批通过' : '审批拒绝'}
        open={approvalModalVisible}
        onOk={handleSubmitApproval}
        onCancel={() => setApprovalModalVisible(false)}
        width={600}
      >
        {selectedTask && (
          <>
            <Descriptions column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="任务标题">{selectedTask.title}</Descriptions.Item>
              <Descriptions.Item label="业务单号">{selectedTask.businessNo}</Descriptions.Item>
              <Descriptions.Item label="描述">{selectedTask.description}</Descriptions.Item>
            </Descriptions>

            <Form form={form} layout="vertical">
              <Form.Item name="result" hidden>
                <Input />
              </Form.Item>
              <Form.Item
                name="comment"
                label="审批意见"
                rules={[{ required: true, message: '请输入审批意见' }]}
              >
                <TextArea rows={4} placeholder="请输入审批意见" />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* 详情对话框 */}
      <Modal
        title="流程详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          dispatch(clearCurrentInstance());
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDetailModalVisible(false);
              dispatch(clearCurrentInstance());
            }}
          >
            关闭
          </Button>,
        ]}
        width={900}
      >
        {currentInstance && (
          <>
            <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="流程编号" span={2}>
                {currentInstance.instanceNo}
              </Descriptions.Item>
              <Descriptions.Item label="流程标题" span={2}>
                {currentInstance.title}
              </Descriptions.Item>
              <Descriptions.Item label="流程名称">
                {currentInstance.workflowName}
              </Descriptions.Item>
              <Descriptions.Item label="业务单号">
                {currentInstance.businessNo || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="发起人">
                {currentInstance.initiatorName}
              </Descriptions.Item>
              <Descriptions.Item label="开始时间">
                {currentInstance.startedAt
                  ? dayjs(currentInstance.startedAt).format('YYYY-MM-DD HH:mm')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="当前处理人">
                {currentInstance.currentAssigneeName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={currentInstance.status === 'completed' ? 'success' : 'processing'}>
                  {currentInstance.status}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {history.length > 0 && (
              <>
                <h3>流程历史</h3>
                <Timeline
                  items={history.map((h) => ({
                    color:
                      h.action === 'approved'
                        ? 'green'
                        : h.action === 'rejected'
                        ? 'red'
                        : 'blue',
                    children: (
                      <div>
                        <div>
                          <strong>{h.operatorName}</strong> {h.action}
                        </div>
                        {h.comment && <div style={{ color: '#666' }}>{h.comment}</div>}
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          {dayjs(h.operatedAt).format('YYYY-MM-DD HH:mm:ss')}
                        </div>
                      </div>
                    ),
                  }))}
                />
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default TaskCenter;
