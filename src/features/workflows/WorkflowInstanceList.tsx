import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Form,
  Select,
  Modal,
  Descriptions,
  Timeline,
} from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { AppDispatch, RootState } from '../../app/store';
import {
  fetchWorkflowInstances,
  fetchWorkflowInstance,
  clearCurrentInstance,
} from './workflowsSlice';
import type { WorkflowInstance, WorkflowStatus } from './types';

const WorkflowInstanceList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { instances, currentInstance, history, pagination, loading } = useSelector(
    (state: RootState) => state.workflows
  );

  const [searchForm] = Form.useForm();
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [searchParams, setSearchParams] = useState<any>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    dispatch(
      fetchWorkflowInstances({
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...searchParams,
      })
    );
  };

  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    setSearchParams(values);
    dispatch(
      fetchWorkflowInstances({
        page: 1,
        pageSize: pagination.pageSize,
        ...values,
      })
    );
  };

  const handleReset = () => {
    searchForm.resetFields();
    setSearchParams({});
    dispatch(
      fetchWorkflowInstances({
        page: 1,
        pageSize: pagination.pageSize,
      })
    );
  };

  const handleViewDetail = async (record: WorkflowInstance) => {
    await dispatch(fetchWorkflowInstance(record.id));
    setDetailModalVisible(true);
  };

  const getStatusTag = (status: WorkflowStatus) => {
    const config = {
      pending: { color: 'default', text: '待启动' },
      running: { color: 'processing', text: '进行中' },
      completed: { color: 'success', text: '已完成' },
      rejected: { color: 'error', text: '已拒绝' },
      cancelled: { color: 'default', text: '已取消' },
      suspended: { color: 'warning', text: '已暂停' },
    };
    return <Tag color={config[status].color}>{config[status].text}</Tag>;
  };

  const columns: ColumnsType<WorkflowInstance> = [
    {
      title: '流程编号',
      dataIndex: 'instanceNo',
      key: 'instanceNo',
      width: 150,
      fixed: 'left',
    },
    {
      title: '流程标题',
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
      title: '发起人',
      dataIndex: 'initiatorName',
      key: 'initiatorName',
      width: 120,
    },
    {
      title: '当前处理人',
      dataIndex: 'currentAssigneeName',
      key: 'currentAssigneeName',
      width: 120,
      render: (name) => name || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: '开始时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 160,
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '完成时间',
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 160,
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        {/* 搜索栏 */}
        <Form form={searchForm} layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item name="status" label="流程状态">
            <Select placeholder="请选择" style={{ width: 150 }} allowClear>
              <Select.Option value="pending">待启动</Select.Option>
              <Select.Option value="running">进行中</Select.Option>
              <Select.Option value="completed">已完成</Select.Option>
              <Select.Option value="rejected">已拒绝</Select.Option>
              <Select.Option value="cancelled">已取消</Select.Option>
              <Select.Option value="suspended">已暂停</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="businessType" label="业务类型">
            <Select placeholder="请选择" style={{ width: 150 }} allowClear>
              <Select.Option value="order">订单</Select.Option>
              <Select.Option value="purchase">采购</Select.Option>
              <Select.Option value="repair">维修</Select.Option>
              <Select.Option value="customer_service">客服</Select.Option>
              <Select.Option value="payment">付款</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={handleSearch}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
              <Button icon={<ReloadOutlined />} onClick={loadData}>
                刷新
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={instances}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1600 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              dispatch(
                fetchWorkflowInstances({
                  page,
                  pageSize,
                  ...searchParams,
                })
              );
            },
          }}
        />
      </Card>

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
              <Descriptions.Item label="分类">{currentInstance.category}</Descriptions.Item>
              <Descriptions.Item label="业务单号">
                {currentInstance.businessNo || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="业务类型">
                {currentInstance.businessType || '-'}
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
              <Descriptions.Item label="当前节点">
                {currentInstance.currentNode || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="完成时间">
                {currentInstance.completedAt
                  ? dayjs(currentInstance.completedAt).format('YYYY-MM-DD HH:mm')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(currentInstance.status)}
              </Descriptions.Item>
            </Descriptions>

            {history.length > 0 && (
              <>
                <h3 style={{ marginTop: 24 }}>流程历史</h3>
                <Timeline
                  items={history.map((h) => ({
                    color:
                      h.action === 'approved'
                        ? 'green'
                        : h.action === 'rejected'
                        ? 'red'
                        : h.action === 'start'
                        ? 'blue'
                        : 'gray',
                    children: (
                      <div>
                        <div>
                          <strong>{h.operatorName}</strong> {h.action}
                          {h.toNode && ` → ${h.toNode}`}
                        </div>
                        {h.comment && (
                          <div style={{ color: '#666', marginTop: 4 }}>{h.comment}</div>
                        )}
                        <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                          {dayjs(h.operatedAt).format('YYYY-MM-DD HH:mm:ss')}
                          {h.duration && ` (耗时: ${Math.floor(h.duration / 60)}分钟)`}
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

export default WorkflowInstanceList;
