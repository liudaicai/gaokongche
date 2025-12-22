/**
 * 审批配置页面 - 支持开关和规则配置
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Switch,
  Table,
  Button,
  Space,
  Modal,
  Form,
  InputNumber,
  Select,
  message,
  Tag,
  Tooltip,
  Alert,
  Descriptions,
  Divider,
  Row,
  Col,
} from 'antd';
import {
  SettingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  TeamOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiGet, apiPut, apiPost } from '../../api/client';
import ApproverConfigModal from './ApproverConfigModal';

interface ApprovalConfig {
  approval_system_enabled: boolean;
  approval_auto_approve_enabled: boolean;
  approval_notification_enabled: boolean;
  approval_timeout_hours_default: number;
}

interface ApprovalRule {
  id: number;
  business_type: string;
  rule_name: string;
  rule_code: string;
  trigger_condition: any;
  template_code: string | null;
  description: string;
  priority: number;
  is_enabled: boolean;
}

export const ApprovalConfigPage: React.FC = () => {
  const [config, setConfig] = useState<ApprovalConfig | null>(null);
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [approverModalVisible, setApproverModalVisible] = useState(false);
  const [currentRuleForApprover, setCurrentRuleForApprover] = useState<ApprovalRule | null>(null);

  const [form] = Form.useForm();

  // 加载配置
  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await apiGet('/approval-config');
      setConfig(data);
    } catch (error: any) {
      message.error(error.message || '加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载规则
  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await apiGet('/approval-config/rules');
      setRules(data);
    } catch (error: any) {
      message.error(error.message || '加载规则失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadRules();
  }, []);

  // 切换审批系统总开关
  const handleToggleSystem = async (enabled: boolean) => {
    try {
      await apiPost('/approval-config/toggle', { enabled });
      message.success(enabled ? '审批系统已开启' : '审批系统已关闭');
      await loadConfig();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  // 更新配置
  const handleUpdateConfig = async (key: string, value: any) => {
    try {
      await apiPut(`/approval-config/${key}`, { value });
      message.success('配置更新成功');
      await loadConfig();
    } catch (error: any) {
      message.error(error.message || '更新失败');
    }
  };

  // 编辑规则
  const handleEditRule = (rule: ApprovalRule) => {
    setEditingRule(rule);
    form.setFieldsValue({
      is_enabled: rule.is_enabled,
      threshold_value:
        rule.trigger_condition.type === 'threshold'
          ? rule.trigger_condition.value
          : null,
    });
    setEditModalVisible(true);
  };

  // 保存规则
  const handleSaveRule = async () => {
    if (!editingRule) return;

    try {
      const values = await form.validateFields();
      const updatedRule = {
        ...editingRule,
        is_enabled: values.is_enabled,
      };

      // 更新阈值
      if (
        editingRule.trigger_condition.type === 'threshold' &&
        values.threshold_value !== null
      ) {
        updatedRule.trigger_condition = {
          ...editingRule.trigger_condition,
          value: values.threshold_value,
        };
      }

      await apiPut(`/approval-config/rules/${editingRule.id}`, updatedRule);

      message.success('规则更新成功');
      setEditModalVisible(false);
      await loadRules();
    } catch (error: any) {
      message.error(error.message || '更新失败');
    }
  };

  // 配置审批人
  const handleConfigApprover = (rule: ApprovalRule) => {
    setCurrentRuleForApprover(rule);
    setApproverModalVisible(true);
  };

  // 保存审批人配置
  const handleSaveApproverConfig = async (approverConfig: any) => {
    if (!currentRuleForApprover) return;

    try {
      await apiPut(`/approval-config/rules/${currentRuleForApprover.id}`, {
        ...currentRuleForApprover,
        approver_config: approverConfig,
      });

      message.success('审批人配置成功');
      setApproverModalVisible(false);
      setCurrentRuleForApprover(null);
      await loadRules();
    } catch (error: any) {
      message.error(error.message || '配置失败');
    }
  };

  // 业务类型映射
  const businessTypeMap: Record<string, string> = {
    order_create: '订单创建',
    order_refund: '订单退款',
    order_receipt: '订单收款',
    equipment_repair: '设备维修',
    equipment_replacement: '设备换机',
  };

  // 规则类型映射
  const ruleTypeMap: Record<string, { text: string; color: string }> = {
    always: { text: '总是触发', color: 'red' },
    never: { text: '永不触发', color: 'default' },
    threshold: { text: '阈值判断', color: 'orange' },
    condition: { text: '条件判断', color: 'blue' },
    expression: { text: '表达式', color: 'purple' },
  };

  const columns: ColumnsType<ApprovalRule> = [
    {
      title: '业务类型',
      dataIndex: 'business_type',
      key: 'business_type',
      width: 120,
      render: (type: string) => businessTypeMap[type] || type,
    },
    {
      title: '规则名称',
      dataIndex: 'rule_name',
      key: 'rule_name',
      width: 180,
    },
    {
      title: '触发条件',
      key: 'condition',
      width: 250,
      render: (_, record: ApprovalRule) => {
        const cond = record.trigger_condition;
        const typeInfo = ruleTypeMap[cond.type] || { text: cond.type, color: 'default' };

        return (
          <Space direction="vertical" size="small">
            <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
            {cond.type === 'threshold' && (
              <div>
                <span style={{ color: '#666' }}>
                  {cond.field} {cond.operator} {cond.value}
                </span>
              </div>
            )}
            {cond.type === 'condition' && (
              <div>
                <span style={{ color: '#666' }}>
                  {cond.field} {cond.operator} {String(cond.value)}
                </span>
              </div>
            )}
          </Space>
        );
      },
    },
    {
      title: '审批人',
      key: 'approver',
      width: 200,
      render: (_, record: ApprovalRule) => {
        const approverConfig = record.approver_config;
        if (!approverConfig || !approverConfig.approvers || approverConfig.approvers.length === 0) {
          return <Tag color="warning">未配置</Tag>;
        }

        const getIcon = (type: string) => {
          switch (type) {
            case 'user': return <UserOutlined />;
            case 'role': return <TeamOutlined />;
            case 'department': return <ShopOutlined />;
            default: return <UserOutlined />;
          }
        };

        return (
          <Space wrap size="small">
            {approverConfig.approvers.slice(0, 2).map((approver: any, index: number) => (
              <Tag key={index} icon={getIcon(approver.type)} color="blue">
                {approver.name}
              </Tag>
            ))}
            {approverConfig.approvers.length > 2 && (
              <Tag>+{approverConfig.approvers.length - 2}人</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      align: 'center',
    },
    {
      title: '状态',
      dataIndex: 'is_enabled',
      key: 'is_enabled',
      width: 80,
      align: 'center',
      render: (enabled: boolean) =>
        enabled ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            启用
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="default">
            禁用
          </Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as 'right',
      width: 180,
      render: (_, record: ApprovalRule) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<UserOutlined />}
            onClick={() => handleConfigApprover(record)}
          >
            审批人
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditRule(record)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  if (!config) {
    return <div style={{ padding: 24 }}>加载中...</div>;
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* 系统状态卡片 */}
      <Card>
        <Row gutter={24} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size="small">
              <Space>
                <SettingOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                <h2 style={{ margin: 0 }}>审批系统配置</h2>
              </Space>
              <p style={{ color: '#666', margin: 0 }}>
                适用于一人公司或夫妻店：可以完全关闭审批功能，所有操作无需审批
              </p>
            </Space>
          </Col>
          <Col>
            <Space direction="vertical" align="end">
              <Space>
                <span style={{ fontSize: 16, fontWeight: 500 }}>审批系统总开关：</span>
                <Switch
                  checked={config.approval_system_enabled}
                  onChange={handleToggleSystem}
                  checkedChildren="开启"
                  unCheckedChildren="关闭"
                  size="default"
                  loading={loading}
                />
              </Space>
              {!config.approval_system_enabled && (
                <Tag color="warning" style={{ fontSize: 14 }}>
                  审批系统已关闭，所有操作无需审批
                </Tag>
              )}
            </Space>
          </Col>
        </Row>

        {config.approval_system_enabled && (
          <>
            <Divider />
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="自动审批">
                <Switch
                  checked={config.approval_auto_approve_enabled}
                  onChange={(checked) =>
                    handleUpdateConfig('approval_auto_approve_enabled', checked)
                  }
                  size="small"
                />
                <Tooltip title="符合条件时自动通过审批">
                  <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
                </Tooltip>
              </Descriptions.Item>

              <Descriptions.Item label="审批通知">
                <Switch
                  checked={config.approval_notification_enabled}
                  onChange={(checked) =>
                    handleUpdateConfig('approval_notification_enabled', checked)
                  }
                  size="small"
                />
                <Tooltip title="发送审批通知消息">
                  <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
                </Tooltip>
              </Descriptions.Item>

              <Descriptions.Item label="默认超时时间" span={2}>
                <Space>
                  <InputNumber
                    value={config.approval_timeout_hours_default}
                    onChange={(value) =>
                      handleUpdateConfig('approval_timeout_hours_default', value)
                    }
                    min={1}
                    max={168}
                    addonAfter="小时"
                    style={{ width: 150 }}
                  />
                  <span style={{ color: '#999' }}>审批超时后将标记为超时状态</span>
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Card>

      {/* 审批规则配置 */}
      {config.approval_system_enabled && (
        <Card title="审批规则配置">
          <Alert
            message="规则说明"
            description={
              <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
                <li>规则按优先级从高到低匹配，匹配到第一个规则后停止</li>
                <li>
                  <strong>订单创建：</strong>价格低于红线需要审批（防止低价亏损）
                </li>
                <li>
                  <strong>订单退款：</strong>所有退款都需要审批（涉及资金流出）
                </li>
                <li>
                  <strong>订单收款：</strong>无需审批（资金流入，直接记录）
                </li>
                <li>
                  <strong>设备维修：</strong>更换配件或成本过高时需要审批
                </li>
                <li>
                  <strong>设备换机：</strong>所有换机都需要审批（影响客户体验）
                </li>
              </ul>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Table
            columns={columns}
            dataSource={rules}
            loading={loading}
            rowKey="id"
            pagination={false}
            scroll={{ x: 1000 }}
          />
        </Card>
      )}

      {/* 编辑规则Modal */}
      <Modal
        title={`编辑规则：${editingRule?.rule_name}`}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleSaveRule}
        width={600}
      >
        {editingRule && (
          <Form form={form} layout="vertical">
            <Form.Item label="规则描述">
              <Alert message={editingRule.description} type="info" showIcon />
            </Form.Item>

            <Form.Item
              label="启用状态"
              name="is_enabled"
              valuePropName="checked"
            >
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>

            {editingRule.trigger_condition.type === 'threshold' && (
              <Form.Item
                label={`阈值设置（${editingRule.trigger_condition.field}）`}
                name="threshold_value"
                rules={[{ required: true, message: '请设置阈值' }]}
              >
                <InputNumber
                  min={0}
                  max={1000000}
                  style={{ width: '100%' }}
                  placeholder={`当前值: ${editingRule.trigger_condition.value}`}
                  addonBefore={editingRule.trigger_condition.operator}
                />
              </Form.Item>
            )}

            <Alert
              message="提示"
              description="修改后立即生效，影响后续所有操作的审批判断"
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          </Form>
        )}
      </Modal>

      {/* 审批人配置弹窗 */}
      <ApproverConfigModal
        visible={approverModalVisible}
        initialConfig={currentRuleForApprover?.approver_config}
        onOk={handleSaveApproverConfig}
        onCancel={() => {
          setApproverModalVisible(false);
          setCurrentRuleForApprover(null);
        }}
      />
    </Space>
  );
};

export default ApprovalConfigPage;
