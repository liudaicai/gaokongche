/**
 * 黑名单管理页面
 * 所有租户可查询、上传
 * 超级管理员拥有所有权限
 */
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Button, 
  Table, 
  Tag, 
  Space, 
  Input, 
  Select, 
  Modal, 
  message, 
  Card, 
  Row, 
  Col, 
  Statistic,
  Popconfirm,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../app/store';
import {
  fetchBlacklist,
  fetchBlacklistStats,
  deleteBlacklistRecord,
  verifyBlacklistRecord,
  removeBlacklistRecord,
  setPage,
  setPageSize,
} from './blacklistSlice';
import type { BlacklistRecord } from './types';
import AddBlacklistModal from './AddBlacklistModal';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const BlacklistManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { records, stats, loading, page, pageSize, total } = useSelector(
    (state: RootState) => state.blacklist
  );
  const user = useSelector((state: RootState) => state.auth.user);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<BlacklistRecord | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'superadmin';

  // 加载数据
  useEffect(() => {
    loadData();
    dispatch(fetchBlacklistStats());
  }, [page, pageSize, searchText, statusFilter, severityFilter]);

  const loadData = () => {
    dispatch(
      fetchBlacklist({
        page,
        pageSize,
        search: searchText,
        status: statusFilter,
        severity: severityFilter,
      })
    );
  };

  // 严重程度标签颜色
  const getSeverityTag = (severity: string) => {
    const config = {
      low: { color: 'blue', text: '低风险' },
      medium: { color: 'orange', text: '中风险' },
      high: { color: 'red', text: '高风险' },
      critical: { color: 'purple', text: '极高风险' },
    };
    const { color, text } = config[severity as keyof typeof config] || config.medium;
    return <Tag color={color}>{text}</Tag>;
  };

  // 状态标签
  const getStatusTag = (status: string) => {
    return status === 'active' ? (
      <Tag color="green">生效中</Tag>
    ) : (
      <Tag color="default">已移除</Tag>
    );
  };

  // 审核黑名单记录
  const handleVerify = (record: BlacklistRecord) => {
    Modal.confirm({
      title: '审核黑名单记录',
      content: (
        <div>
          <p><strong>客户名称：</strong>{record.customerName}</p>
          <p><strong>原因：</strong>{record.reason}</p>
          <TextArea 
            id="verifyNote" 
            placeholder="请输入审核备注（可选）" 
            rows={3} 
          />
        </div>
      ),
      onOk: async () => {
        const verifyNote = (document.getElementById('verifyNote') as HTMLTextAreaElement)?.value || '';
        try {
          await dispatch(verifyBlacklistRecord({ id: record.id, verifyNote })).unwrap();
          message.success('审核成功');
          loadData();
        } catch (error: any) {
          message.error(error?.message || '审核失败');
        }
      },
    });
  };

  // 移除黑名单记录
  const handleRemove = (record: BlacklistRecord) => {
    Modal.confirm({
      title: '移除黑名单记录',
      content: (
        <div>
          <p><strong>客户名称：</strong>{record.customerName}</p>
          <p style={{ color: 'red' }}>移除后该客户将不再受黑名单限制</p>
          <TextArea 
            id="removeReason" 
            placeholder="请输入移除原因（必填）" 
            rows={3} 
          />
        </div>
      ),
      onOk: async () => {
        const removeReason = (document.getElementById('removeReason') as HTMLTextAreaElement)?.value || '';
        if (!removeReason.trim()) {
          message.error('请输入移除原因');
          return Promise.reject();
        }
        try {
          await dispatch(removeBlacklistRecord({ id: record.id, removeReason })).unwrap();
          message.success('移除成功');
          loadData();
        } catch (error: any) {
          message.error(error?.message || '移除失败');
        }
      },
    });
  };

  // 删除黑名单记录
  const handleDelete = async (id: number) => {
    try {
      await dispatch(deleteBlacklistRecord(id)).unwrap();
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error?.message || '删除失败');
    }
  };

  // 打开编辑模态框
  const handleEdit = (record: BlacklistRecord) => {
    setEditRecord(record);
    setAddModalVisible(true);
  };

  // 表格列配置
  const columns: any[] = [
    {
      title: '客户信息',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 200,
      render: (_: string, record: BlacklistRecord) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.customerName}</div>
          {record.customerPhone && (
            <div style={{ fontSize: 12, color: '#666' }}>
              电话: {record.customerPhone}
            </div>
          )}
          {record.customerIdCard && (
            <div style={{ fontSize: 12, color: '#666' }}>
              身份证: {record.customerIdCard}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => getSeverityTag(severity),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: {
        showTitle: false,
      },
      render: (reason: string) => (
        <Tooltip title={reason}>
          <span>{reason}</span>
        </Tooltip>
      ),
    },
    {
      title: '上传者',
      dataIndex: 'uploaderName',
      key: 'uploaderName',
      width: 120,
      render: (_: string, record: BlacklistRecord) => (
        <div>
          <div>{record.uploaderName}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {dayjs(record.uploadTime).format('YYYY-MM-DD')}
          </div>
        </div>
      ),
    },
    // ✅ 已取消审核功能，隐藏审核状态列
    // {
    //   title: '审核状态',
    //   dataIndex: 'verified',
    //   key: 'verified',
    //   width: 100,
    //   render: (verified: boolean, record: BlacklistRecord) => (
    //     <div>
    //       {verified ? (
    //         <Tag icon={<CheckCircleOutlined />} color="success">
    //           已审核
    //         </Tag>
    //       ) : (
    //         <Tag icon={<ExclamationCircleOutlined />} color="warning">
    //           待审核
    //         </Tag>
    //       )}
    //       {verified && record.verifyTime && (
    //         <div style={{ fontSize: 12, color: '#666' }}>
    //           {dayjs(record.verifyTime).format('YYYY-MM-DD')}
    //         </div>
    //       )}
    //     </div>
    //   ),
    // },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: BlacklistRecord) => (
        <Space size="small">
          {isSuperAdmin && (
            <>
              {/* ✅ 已取消审核功能，隐藏审核按钮 */}
              {/* {!record.verified && (
                <Button
                  type="link"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleVerify(record)}
                >
                  审核
                </Button>
              )} */}
              {record.status === 'active' && (
                <Button
                  type="link"
                  size="small"
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleRemove(record)}
                >
                  移除
                </Button>
              )}
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定要删除这条记录吗？"
                onConfirm={() => handleDelete(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                >
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
          {!isSuperAdmin && <span style={{ color: '#999' }}>查看</span>}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <h2 style={{ marginBottom: 24 }}>黑名单管理</h2>

      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card>
              <Statistic title="总记录数" value={stats.total} />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic 
                title="生效中" 
                value={stats.active} 
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          {/* ✅ 已取消审核功能，隐藏"已审核"统计 */}
          {/* <Col span={6}>
            <Card>
              <Statistic 
                title="已审核" 
                value={stats.verified} 
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col> */}
          <Col span={8}>
            <Card>
              <Statistic 
                title="高危客户" 
                value={stats.critical + stats.high} 
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="搜索客户名称、电话、身份证号"
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={loadData}
            />
            <Select
              placeholder="状态"
              style={{ width: 120 }}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Option value="">全部</Option>
              <Option value="active">生效中</Option>
              <Option value="removed">已移除</Option>
            </Select>
            <Select
              placeholder="严重程度"
              style={{ width: 120 }}
              value={severityFilter}
              onChange={setSeverityFilter}
              allowClear
            >
              <Option value="">全部</Option>
              <Option value="critical">极高风险</Option>
              <Option value="high">高风险</Option>
              <Option value="medium">中风险</Option>
              <Option value="low">低风险</Option>
            </Select>
            <Button type="primary" icon={<SearchOutlined />} onClick={loadData}>
              搜索
            </Button>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditRecord(null);
              setAddModalVisible(true);
            }}
          >
            添加黑名单
          </Button>
        </Space>
      </Card>

      {/* 表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={records}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              dispatch(setPage(page));
              dispatch(setPageSize(pageSize));
            },
          }}
        />
      </Card>

      {/* 添加/编辑模态框 */}
      <AddBlacklistModal
        visible={addModalVisible}
        onClose={() => {
          setAddModalVisible(false);
          setEditRecord(null);
        }}
        record={editRecord}
        onSuccess={loadData}
      />
    </div>
  );
};

export default BlacklistManagement;

