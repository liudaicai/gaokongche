/**
 * 提醒中心 - 主界面
 */
import React, { useEffect, useState, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TabsContext } from '../../common/TabsContext';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Badge,
  Select,
  DatePicker,
  Row,
  Col,
  Statistic,
  Tooltip,
  App,
  Input,
  Drawer,
  Form,
  Divider
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  SettingOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ScheduleOutlined
} from '@ant-design/icons';
import { AppDispatch } from '../../../app/store';
import {
  fetchReminders,
  fetchUnreadCount,
  markAsRead,
  markAsHandled,
  deleteReminder,
  batchMarkAsRead,
  selectReminders,
  selectRemindersLoading,
  selectUnreadCount,
  selectRemindersPagination
} from '../remindersSlice';
import type { ReminderRecord, ReminderStatus, Priority } from '../types';
import {
  RULE_TYPE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS
} from '../types';

const { RangePicker } = DatePicker;

const ReminderCenter: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { message, modal } = App.useApp();
  const { openTab } = useContext(TabsContext);

  const reminders = useSelector(selectReminders);
  const loading = useSelector(selectRemindersLoading);
  const unreadCount = useSelector(selectUnreadCount);
  const pagination = useSelector(selectRemindersPagination);

  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [currentReminder, setCurrentReminder] = useState<ReminderRecord | null>(null);
  const [handleNote, setHandleNote] = useState('');

  useEffect(() => {
    loadData();
    loadUnreadCount();
  }, []);

  const loadData = (page = 1) => {
    const params: any = { page, pageSize: 20 };
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;
    if (dateRange) {
      params.startDate = dateRange[0];
      params.endDate = dateRange[1];
    }
    dispatch(fetchReminders(params));
  };

  const loadUnreadCount = () => {
    dispatch(fetchUnreadCount());
  };

  const handleRead = async (id: number) => {
    try {
      await dispatch(markAsRead(id)).unwrap();
      message.success('已标记为已读');
      loadUnreadCount();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleBatchRead = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要标记的提醒');
      return;
    }

    try {
      await dispatch(batchMarkAsRead(selectedRowKeys)).unwrap();
      message.success(`已标记${selectedRowKeys.length}条提醒为已读`);
      setSelectedRowKeys([]);
      loadUnreadCount();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleDelete = (record: ReminderRecord) => {
    modal.confirm({
      title: '确认删除',
      content: '确定要删除这条提醒吗？',
      onOk: async () => {
        try {
          await dispatch(deleteReminder(record.id)).unwrap();
          message.success('删除成功');
        } catch (error: any) {
          message.error(error.message || '删除失败');
        }
      }
    });
  };

  const showDetail = (record: ReminderRecord) => {
    setCurrentReminder(record);
    setDetailDrawerVisible(true);
    
    // 如果未读，自动标记为已读
    if (record.status === 'pending' || record.status === 'sent') {
      handleRead(record.id);
    }
  };

  const handleMarkAsHandled = async () => {
    if (!currentReminder) return;

    try {
      await dispatch(markAsHandled({ id: currentReminder.id, note: handleNote })).unwrap();
      message.success('已标记为已处理');
      setDetailDrawerVisible(false);
      setHandleNote('');
      loadData(pagination.page);
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  // 样式定义
  const styles = {
    pageContainer: {
      padding: '24px',
      background: '#f5f7fa',
      minHeight: '100vh',
    },
    statCard: {
      borderRadius: '12px',
      border: 'none',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      height: '100%',
      transition: 'all 0.3s ease',
      cursor: 'default',
    },
    filterCard: {
      marginBottom: '16px',
      borderRadius: '12px',
      border: 'none',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    tableCard: {
      borderRadius: '12px',
      border: 'none',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    titleSection: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px',
    },
    pageTitle: {
      fontSize: '24px',
      fontWeight: 600,
      color: '#1f1f1f',
      margin: 0,
    },
    unreadBadge: {
      backgroundColor: '#ff4d4f',
      color: '#fff',
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '12px',
      marginLeft: '8px',
      fontWeight: 'normal',
      verticalAlign: 'middle',
    }
  };

  const columns = [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ReminderStatus) => {
        const config = {
          pending: { color: 'default', text: '待发送', icon: <ClockCircleOutlined /> },
          sent: { color: 'processing', text: '未读', icon: <BellOutlined /> },
          read: { color: 'success', text: '已读', icon: <EyeOutlined /> },
          handled: { color: 'purple', text: '已处理', icon: <CheckOutlined /> },
          expired: { color: 'error', text: '已过期', icon: <StopOutlined /> },
        }[status] || { color: 'default', text: status, icon: null };
        
        return (
          <Tag color={config.color} icon={config.icon} style={{ borderRadius: '4px', border: 'none', padding: '2px 8px' }}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: Priority) => {
        const color = PRIORITY_COLORS[priority];
        const label = PRIORITY_LABELS[priority];
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              backgroundColor: color, 
              marginRight: 8 
            }} />
            {label}
          </div>
        );
      }
    },
    {
      title: '消息内容',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: ReminderRecord) => {
        const isUnread = record.status === 'sent' || record.status === 'pending';
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <a 
              onClick={() => showDetail(record)}
              style={{ 
                fontWeight: isUnread ? 600 : 400,
                color: isUnread ? '#1890ff' : '#595959',
                fontSize: '15px',
                marginBottom: '4px'
              }}
            >
              {title}
            </a>
            <Space size="small" style={{ fontSize: '12px', color: '#8c8c8c' }}>
              <Tag bordered={false} style={{ margin: 0, fontSize: '12px' }}>
                {RULE_TYPE_LABELS[record.businessType as keyof typeof RULE_TYPE_LABELS] || record.businessType}
              </Tag>
              <span>{new Date(record.createdAt).toLocaleString('zh-CN')}</span>
            </Space>
          </div>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: ReminderRecord) => (
        <Space size="middle">
          <Tooltip title="查看详情">
            <Button
              type="text"
              shape="circle"
              icon={<EyeOutlined style={{ color: '#1890ff' }} />}
              onClick={() => showDetail(record)}
            />
          </Tooltip>
          {(record.status === 'pending' || record.status === 'sent') && (
            <Tooltip title="标记已读">
              <Button
                type="text"
                shape="circle"
                icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                onClick={() => handleRead(record.id)}
              />
            </Tooltip>
          )}
          <Tooltip title="删除">
            <Button
              type="text"
              shape="circle"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      setSelectedRowKeys(keys as number[]);
    },
    getCheckboxProps: (record: ReminderRecord) => ({
      disabled: record.status === 'read' || record.status === 'handled'
    })
  };

  return (
    <div style={styles.pageContainer}>
      {/* 顶部标题栏 */}
      <div style={styles.titleSection}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1 style={styles.pageTitle}>提醒中心</h1>
          {unreadCount > 0 && (
            <span style={styles.unreadBadge}>{unreadCount}条未读</span>
          )}
        </div>
        <Space size="middle">
          <Button 
            icon={<SettingOutlined />}
            onClick={() => {
              const UserSettingsPage = React.lazy(() => import('./UserSettingsPage'));
              openTab({
                key: 'reminderSettings',
                label: '提醒设置',
                content: <React.Suspense fallback={<div>加载中...</div>}><UserSettingsPage /></React.Suspense>
              });
            }}
          >
            设置
          </Button>
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => loadData()}>刷新</Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={styles.statCard} hoverable>
            <Statistic
              title={<span style={{ color: '#8c8c8c' }}>未读消息</span>}
              value={unreadCount}
              valueStyle={{ color: '#ff4d4f', fontSize: '28px', fontWeight: 600 }}
              prefix={<BellOutlined style={{ fontSize: '24px', marginRight: '8px', opacity: 0.8 }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={styles.statCard} hoverable>
            <Statistic
              title={<span style={{ color: '#8c8c8c' }}>今日提醒</span>}
              value={reminders.filter(r => {
                const today = new Date().toDateString();
                return new Date(r.createdAt).toDateString() === today;
              }).length}
              valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: 600 }}
              prefix={<ClockCircleOutlined style={{ fontSize: '24px', marginRight: '8px', opacity: 0.8 }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={styles.statCard} hoverable>
            <Statistic
              title={<span style={{ color: '#8c8c8c' }}>待处理</span>}
              value={reminders.filter(r => r.status === 'sent' || r.status === 'read').length}
              valueStyle={{ color: '#faad14', fontSize: '28px', fontWeight: 600 }}
              prefix={<ScheduleOutlined style={{ fontSize: '24px', marginRight: '8px', opacity: 0.8 }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={styles.statCard} hoverable>
            <Statistic
              title={<span style={{ color: '#8c8c8c' }}>已处理</span>}
              value={reminders.filter(r => r.status === 'handled').length}
              valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 600 }}
              prefix={<CheckCircleOutlined style={{ fontSize: '24px', marginRight: '8px', opacity: 0.8 }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选和列表区域 */}
      <Card style={styles.tableCard} bordered={false} styles={{ body: { padding: '0 24px 24px' } }}>
        {/* 筛选工具栏 */}
        <div style={{ padding: '24px 0', borderBottom: '1px solid #f0f0f0', marginBottom: '16px' }}>
          <Row gutter={[16, 16]} align="middle" justify="space-between">
            <Col flex="1">
              <Space size="middle" wrap>
                <Select
                  placeholder="状态"
                  allowClear
                  style={{ width: 140 }}
                  value={statusFilter || undefined}
                  onChange={(value) => {
                    setStatusFilter(value || '');
                    setTimeout(() => loadData(1), 0);
                  }}
                  options={[
                    { value: 'pending', label: '待发送' },
                    { value: 'sent', label: '未读' },
                    { value: 'read', label: '已读' },
                    { value: 'handled', label: '已处理' },
                    { value: 'expired', label: '已过期' }
                  ]}
                />
                <Select
                  placeholder="优先级"
                  allowClear
                  style={{ width: 140 }}
                  value={priorityFilter || undefined}
                  onChange={(value) => {
                    setPriorityFilter(value || '');
                    setTimeout(() => loadData(1), 0);
                  }}
                  options={[
                    { value: 'urgent', label: '紧急' },
                    { value: 'high', label: '高' },
                    { value: 'medium', label: '中' },
                    { value: 'low', label: '低' }
                  ]}
                />
                <RangePicker
                  style={{ width: 260 }}
                  onChange={(dates, dateStrings) => {
                    if (dates && dates[0] && dates[1]) {
                      setDateRange([dateStrings[0], dateStrings[1]]);
                    } else {
                      setDateRange(null);
                    }
                    setTimeout(() => loadData(1), 0);
                  }}
                />
              </Space>
            </Col>
            <Col>
              {selectedRowKeys.length > 0 && (
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleBatchRead}
                  style={{ borderRadius: '6px' }}
                >
                  批量已读 ({selectedRowKeys.length})
                </Button>
              )}
            </Col>
          </Row>
        </div>

        {/* 提醒列表 */}
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={reminders}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              loadData(page);
            }
          }}
        />
      </Card>

      {/* 提醒详情抽屉 */}
      <Drawer
        title="提醒详情"
        placement="right"
        width={500}
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setCurrentReminder(null);
          setHandleNote('');
        }}
        styles={{ body: { padding: '24px' } }}
      >
        {currentReminder && (
          <div>
            <Divider orientation="left">基本信息</Divider>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ color: '#666' }}>优先级</div>
                <Tag color={PRIORITY_COLORS[currentReminder.priority]}>
                  {PRIORITY_LABELS[currentReminder.priority]}
                </Tag>
              </Col>
              <Col span={12}>
                <div style={{ color: '#666' }}>状态</div>
                <Tag color={STATUS_COLORS[currentReminder.status]}>
                  {STATUS_LABELS[currentReminder.status]}
                </Tag>
              </Col>
              <Col span={24}>
                <div style={{ color: '#666', marginBottom: 8 }}>标题</div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{currentReminder.title}</div>
              </Col>
              <Col span={24}>
                <div style={{ color: '#666', marginBottom: 8 }}>内容</div>
                <div style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 12, borderRadius: 4 }}>
                  {currentReminder.content || '无'}
                </div>
              </Col>
            </Row>

            <Divider orientation="left">业务信息</Divider>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ color: '#666' }}>业务类型</div>
                <div>{RULE_TYPE_LABELS[currentReminder.businessType as keyof typeof RULE_TYPE_LABELS] || currentReminder.businessType}</div>
              </Col>
              <Col span={12}>
                <div style={{ color: '#666' }}>业务ID</div>
                <div>{currentReminder.businessId}</div>
              </Col>
            </Row>

            <Divider orientation="left">时间信息</Divider>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ color: '#666' }}>创建时间</div>
                <div>{new Date(currentReminder.createdAt).toLocaleString('zh-CN')}</div>
              </Col>
              {currentReminder.readAt && (
                <Col span={12}>
                  <div style={{ color: '#666' }}>阅读时间</div>
                  <div>{new Date(currentReminder.readAt).toLocaleString('zh-CN')}</div>
                </Col>
              )}
              {currentReminder.handledAt && (
                <Col span={12}>
                  <div style={{ color: '#666' }}>处理时间</div>
                  <div>{new Date(currentReminder.handledAt).toLocaleString('zh-CN')}</div>
                </Col>
              )}
            </Row>

            {currentReminder.status !== 'handled' && (
              <>
                <Divider orientation="left">处理操作</Divider>
                <Form layout="vertical">
                  <Form.Item label="处理备注">
                    <Input.TextArea
                      rows={3}
                      placeholder="请输入处理备注..."
                      value={handleNote}
                      onChange={(e) => setHandleNote(e.target.value)}
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={handleMarkAsHandled}
                      block
                    >
                      标记为已处理
                    </Button>
                  </Form.Item>
                </Form>
              </>
            )}

            {currentReminder.status === 'handled' && currentReminder.handleNote && (
              <>
                <Divider orientation="left">处理记录</Divider>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <div style={{ color: '#666' }}>处理人</div>
                    <div>{currentReminder.handlerName || '-'}</div>
                  </Col>
                  <Col span={24}>
                    <div style={{ color: '#666', marginBottom: 8 }}>处理备注</div>
                    <div style={{ background: '#fafafa', padding: 12, borderRadius: 4 }}>
                      {currentReminder.handleNote}
                    </div>
                  </Col>
                </Row>
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ReminderCenter;

