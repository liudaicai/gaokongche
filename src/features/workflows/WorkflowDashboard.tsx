import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Row, Col, Statistic, Table, Tag, Progress, Timeline, Empty } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Column, Pie } from '@ant-design/plots';
import type { AppDispatch, RootState } from '../../app/store';
import { fetchWorkflowStats, fetchPendingTasks, fetchWorkflowInstances } from './workflowsSlice';
import type { WorkflowTask, WorkflowInstance } from './types';

const WorkflowDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { stats, pendingTasks, instances, loading } = useSelector(
    (state: RootState) => state.workflows
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    dispatch(fetchWorkflowStats());
    dispatch(fetchPendingTasks());
    dispatch(fetchWorkflowInstances({ page: 1, pageSize: 10, status: 'running' }));
  };

  // 计算流程完成率
  const getCompletionRate = () => {
    if (!stats || !stats.monthlyStats.length) return 0;
    const total = stats.monthlyStats.reduce((sum, s) => sum + s.count, 0);
    const completed = stats.monthlyStats.find(s => s.status === 'completed')?.count || 0;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  // 流程状态分布数据
  const getStatusDistribution = () => {
    if (!stats || !stats.monthlyStats.length) return [];
    return stats.monthlyStats.map(s => ({
      status: s.status,
      count: s.count,
    }));
  };

  // 待办任务紧急程度
  const taskPriorityColumns: ColumnsType<any> = [
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority) => {
        const config = {
          urgent: { color: 'red', text: '紧急' },
          high: { color: 'orange', text: '高' },
          normal: { color: 'blue', text: '普通' },
          low: { color: 'default', text: '低' },
        };
        return <Tag color={config[priority].color}>{config[priority].text}</Tag>;
      },
    },
    {
      title: '数量',
      dataIndex: 'count',
      key: 'count',
    },
  ];

  const getPriorityData = () => {
    const priorityCount: Record<string, number> = {
      urgent: 0,
      high: 0,
      normal: 0,
      low: 0,
    };

    pendingTasks.forEach(task => {
      priorityCount[task.priority]++;
    });

    return Object.entries(priorityCount)
      .filter(([_, count]) => count > 0)
      .map(([priority, count]) => ({ priority, count }));
  };

  // 近期流程时间线
  const recentInstancesColumns: ColumnsType<WorkflowInstance> = [
    {
      title: '流程标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const config = {
          running: { color: 'processing', text: '进行中' },
          completed: { color: 'success', text: '已完成' },
          rejected: { color: 'error', text: '已拒绝' },
        };
        const conf = config[status as keyof typeof config] || { color: 'default', text: status };
        return <Tag color={conf.color}>{conf.text}</Tag>;
      },
    },
    {
      title: '开始时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 150,
      render: (date) => (date ? dayjs(date).format('MM-DD HH:mm') : '-'),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 顶部统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="待办任务"
              value={stats?.pendingTasks || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="进行中流程"
              value={stats?.runningInstances || 0}
              prefix={<SyncOutlined spin />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日已完成"
              value={stats?.todayCompleted || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月流程"
              value={stats?.monthlyStats.reduce((sum, s) => sum + s.count, 0) || 0}
              suffix={`/ ${stats?.monthlyStats.length || 0}类`}
            />
          </Card>
        </Col>
      </Row>

      {/* 第二行：完成率和流程分布 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card title="本月流程完成率">
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Progress
                type="circle"
                percent={getCompletionRate()}
                format={percent => `${percent}%`}
                width={150}
              />
              <div style={{ marginTop: 16, fontSize: 14, color: '#666' }}>
                已完成 {stats?.monthlyStats.find(s => s.status === 'completed')?.count || 0} /{' '}
                {stats?.monthlyStats.reduce((sum, s) => sum + s.count, 0) || 0} 个流程
              </div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="流程状态分布">
            {getStatusDistribution().length > 0 ? (
              <Pie
                data={getStatusDistribution()}
                angleField="count"
                colorField="status"
                radius={0.8}
                label={{
                  type: 'outer',
                  content: '{name} {percentage}',
                }}
                interactions={[{ type: 'element-active' }]}
                height={250}
              />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
        <Col span={8}>
          <Card title="待办任务优先级">
            {getPriorityData().length > 0 ? (
              <Table
                columns={taskPriorityColumns}
                dataSource={getPriorityData()}
                rowKey="priority"
                size="small"
                pagination={false}
              />
            ) : (
              <Empty description="暂无待办任务" />
            )}
          </Card>
        </Col>
      </Row>

      {/* 第三行：进行中的流程 */}
      <Row gutter={16}>
        <Col span={24}>
          <Card title="进行中的流程">
            {instances.length > 0 ? (
              <Table
                columns={recentInstancesColumns}
                dataSource={instances}
                rowKey="id"
                loading={loading}
                size="small"
                pagination={false}
              />
            ) : (
              <Empty description="暂无进行中的流程" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default WorkflowDashboard;
