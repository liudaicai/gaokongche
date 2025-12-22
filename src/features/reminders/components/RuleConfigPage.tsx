/**
 * 提醒规则配置页面
 */
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Switch,
  App,
  Select,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { AppDispatch } from '../../../app/store';
import {
  fetchReminderRules,
  deleteReminderRule,
  toggleReminderRule,
  selectReminderRules,
  selectRulesLoading,
  selectRulesPagination
} from '../remindersSlice';
import type { ReminderRule, RuleType } from '../types';
import {
  RULE_TYPE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  CHANNEL_LABELS
} from '../types';

const RuleConfigPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { message, modal } = App.useApp();

  const rules = useSelector(selectReminderRules);
  const loading = useSelector(selectRulesLoading);
  const pagination = useSelector(selectRulesPagination);

  const [ruleTypeFilter, setRuleTypeFilter] = useState<string>('');
  const [enabledFilter, setEnabledFilter] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = (page = 1) => {
    const params: any = { page, pageSize: 20 };
    if (ruleTypeFilter) params.ruleType = ruleTypeFilter;
    if (enabledFilter !== undefined) params.isEnabled = enabledFilter;
    dispatch(fetchReminderRules(params));
  };

  const handleToggle = async (record: ReminderRule) => {
    try {
      await dispatch(toggleReminderRule({ id: record.id, isEnabled: !record.isEnabled })).unwrap();
      message.success(record.isEnabled ? '规则已禁用' : '规则已启用');
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleDelete = (record: ReminderRule) => {
    if (record.isSystem) {
      message.warning('系统规则不可删除');
      return;
    }

    modal.confirm({
      title: '确认删除',
      content: `确定要删除规则"${record.ruleName}"吗？`,
      onOk: async () => {
        try {
          await dispatch(deleteReminderRule(record.id)).unwrap();
          message.success('删除成功');
        } catch (error: any) {
          message.error(error.message || '删除失败');
        }
      }
    });
  };

  const columns = [
    {
      title: '规则名称',
      dataIndex: 'ruleName',
      key: 'ruleName',
      width: 200,
      render: (name: string, record: ReminderRule) => (
        <Space>
          {record.isSystem && <Tag color="blue">系统</Tag>}
          <span>{name}</span>
        </Space>
      )
    },
    {
      title: '规则类型',
      dataIndex: 'ruleType',
      key: 'ruleType',
      width: 120,
      render: (type: RuleType) => RULE_TYPE_LABELS[type]
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => (
        <Tag color={PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS]}>
          {PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS]}
        </Tag>
      )
    },
    {
      title: '提前天数',
      dataIndex: 'advanceDays',
      key: 'advanceDays',
      width: 100,
      render: (days: number) => `${days}天`
    },
    {
      title: '推送渠道',
      dataIndex: 'notificationChannels',
      key: 'notificationChannels',
      width: 150,
      render: (channels: string[]) => (
        <Space size="small">
          {channels.map(ch => (
            <Tag key={ch}>{CHANNEL_LABELS[ch as keyof typeof CHANNEL_LABELS]}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 100,
      render: (isEnabled: boolean, record: ReminderRule) => (
        <Switch
          checked={isEnabled}
          onChange={() => handleToggle(record)}
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: ReminderRule) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => message.info('编辑功能待实现')}
          >
            编辑
          </Button>
          {!record.isSystem && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            >
              删除
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="规则总数"
              value={rules.length}
              prefix={<SettingOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="已启用"
              value={rules.filter(r => r.isEnabled).length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="系统规则"
              value={rules.filter(r => r.isSystem).length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 规则列表 */}
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>提醒规则配置</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => message.info('新增规则功能待实现')}
            >
              新增规则
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => loadData()}>
              刷新
            </Button>
          </Space>
        }
      >
        {/* 筛选区域 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Select
              placeholder="规则类型筛选"
              allowClear
              style={{ width: '100%' }}
              value={ruleTypeFilter || undefined}
              onChange={(value) => {
                setRuleTypeFilter(value || '');
                setTimeout(() => loadData(1), 0);
              }}
              options={Object.entries(RULE_TYPE_LABELS).map(([value, label]) => ({
                value,
                label
              }))}
            />
          </Col>
          <Col span={8}>
            <Select
              placeholder="状态筛选"
              allowClear
              style={{ width: '100%' }}
              value={enabledFilter}
              onChange={(value) => {
                setEnabledFilter(value);
                setTimeout(() => loadData(1), 0);
              }}
              options={[
                { value: true, label: '已启用' },
                { value: false, label: '已禁用' }
              ]}
            />
          </Col>
        </Row>

        {/* 规则表格 */}
        <Table
          columns={columns}
          dataSource={rules}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page) => loadData(page)
          }}
        />
      </Card>
    </div>
  );
};

export default RuleConfigPage;

