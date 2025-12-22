import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Form,
  Select,
  DatePicker,
  Button,
  Space,
  Tag,
  Drawer,
  Descriptions,
  Typography,
} from 'antd';
import { SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import apiClient from '../../api/client';
import type { OperationLog } from './types';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const OperationLogList: React.FC = () => {
  const [form] = Form.useForm();
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
  });
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<OperationLog | null>(null);

  useEffect(() => {
    loadData();
  }, [pagination.page, pagination.pageSize]);

  const loadData = async (searchParams = {}) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/workflows/logs/operation', {
        params: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          ...searchParams,
        },
      });

      if (response.data.ok) {
        setLogs(response.data.data);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      }
    } catch (error) {
      console.error('获取操作日志失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const values = form.getFieldsValue();
    const params: any = {
      module: values.module,
      userId: values.userId,
    };

    if (values.dateRange) {
      params.startDate = dayjs(values.dateRange[0]).format('YYYY-MM-DD HH:mm:ss');
      params.endDate = dayjs(values.dateRange[1]).format('YYYY-MM-DD HH:mm:ss');
    }

    loadData(params);
  };

  const handleReset = () => {
    form.resetFields();
    loadData();
  };

  const handleViewDetail = (record: OperationLog) => {
    setSelectedLog(record);
    setDrawerVisible(true);
  };

  const getSuccessTag = (success: boolean) => {
    return success ? (
      <Tag color="success">成功</Tag>
    ) : (
      <Tag color="error">失败</Tag>
    );
  };

  const columns: ColumnsType<OperationLog> = [
    {
      title: '操作时间',
      dataIndex: 'operatedAt',
      key: 'operatedAt',
      width: 160,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
    },
    {
      title: '资源类型',
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 120,
    },
    {
      title: '资源ID',
      dataIndex: 'resourceId',
      key: 'resourceId',
      width: 100,
    },
    {
      title: '操作人',
      dataIndex: 'userName',
      key: 'userName',
      width: 120,
      render: (name, record) => name || record.username,
    },
    {
      title: '角色',
      dataIndex: 'userRole',
      key: 'userRole',
      width: 100,
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
    },
    {
      title: '响应时间',
      dataIndex: 'responseTime',
      key: 'responseTime',
      width: 100,
      render: (time) => (time ? `${time}ms` : '-'),
    },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      width: 80,
      render: (success) => getSuccessTag(success),
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
          详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title="操作日志">
        {/* 搜索栏 */}
        <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item name="module" label="模块">
            <Select placeholder="请选择" style={{ width: 150 }} allowClear>
              <Select.Option value="workflow">工作流</Select.Option>
              <Select.Option value="order">订单</Select.Option>
              <Select.Option value="purchase">采购</Select.Option>
              <Select.Option value="finance">财务</Select.Option>
              <Select.Option value="equipment">设备</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="时间范围">
            <RangePicker showTime />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
              <Button icon={<ReloadOutlined />} onClick={() => loadData()}>
                刷新
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={logs}
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
              setPagination({ ...pagination, page, pageSize });
            },
          }}
        />
      </Card>

      {/* 详情抽屉 */}
      <Drawer
        title="操作日志详情"
        placement="right"
        width={720}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedLog && (
          <>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="操作时间">
                {dayjs(selectedLog.operatedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="模块">{selectedLog.module}</Descriptions.Item>
              <Descriptions.Item label="操作">{selectedLog.action}</Descriptions.Item>
              <Descriptions.Item label="资源类型">
                {selectedLog.resourceType || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="资源ID">
                {selectedLog.resourceId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="描述">
                {selectedLog.description || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="操作人">
                {selectedLog.userName || selectedLog.username}
              </Descriptions.Item>
              <Descriptions.Item label="角色">
                {selectedLog.userRole || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="部门">
                {selectedLog.department || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="IP地址">{selectedLog.ipAddress}</Descriptions.Item>
              <Descriptions.Item label="请求方法">
                {selectedLog.requestMethod}
              </Descriptions.Item>
              <Descriptions.Item label="请求URL">
                <Text ellipsis style={{ maxWidth: 500 }}>
                  {selectedLog.requestUrl}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="响应状态">
                {selectedLog.responseStatus}
              </Descriptions.Item>
              <Descriptions.Item label="响应时间">
                {selectedLog.responseTime}ms
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getSuccessTag(selectedLog.success)}
              </Descriptions.Item>
              {selectedLog.errorMessage && (
                <Descriptions.Item label="错误信息">
                  <Text type="danger">{selectedLog.errorMessage}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedLog.requestParams && (
              <>
                <h4 style={{ marginTop: 24 }}>请求参数</h4>
                <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, overflow: 'auto' }}>
                  {JSON.stringify(selectedLog.requestParams, null, 2)}
                </pre>
              </>
            )}

            {selectedLog.oldValue && Object.keys(selectedLog.oldValue).length > 0 && (
              <>
                <h4 style={{ marginTop: 24 }}>原值</h4>
                <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, overflow: 'auto' }}>
                  {JSON.stringify(selectedLog.oldValue, null, 2)}
                </pre>
              </>
            )}

            {selectedLog.newValue && Object.keys(selectedLog.newValue).length > 0 && (
              <>
                <h4 style={{ marginTop: 24 }}>新值</h4>
                <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, overflow: 'auto' }}>
                  {JSON.stringify(selectedLog.newValue, null, 2)}
                </pre>
              </>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
};

export default OperationLogList;
