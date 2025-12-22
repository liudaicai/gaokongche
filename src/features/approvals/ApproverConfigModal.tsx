/**
 * 审批人配置弹窗
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Select,
  Radio,
  Space,
  Button,
  Tag,
  Alert,
  Divider,
  Tooltip,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  ShopOutlined,
  PlusOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { apiGet } from '../../api/client';

interface Approver {
  type: 'user' | 'role' | 'department';
  value: string | number;
  name: string;
}

interface ApproverConfig {
  type: string;
  approvers: Approver[];
  approval_mode: 'single' | 'and' | 'or' | 'sequential';
  description?: string;
}

interface ApproverConfigModalProps {
  visible: boolean;
  initialConfig?: ApproverConfig | null;
  onOk: (config: ApproverConfig) => void;
  onCancel: () => void;
}

export const ApproverConfigModal: React.FC<ApproverConfigModalProps> = ({
  visible,
  initialConfig,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [users, setUsers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [currentApprover, setCurrentApprover] = useState<Partial<Approver>>({});

  // 加载用户列表
  const loadUsers = async () => {
    try {
      const data = await apiGet('/approval-config/users');
      setUsers(data);
    } catch (error: any) {
      console.error('加载用户失败:', error);
    }
  };

  // 加载部门列表
  const loadStores = async () => {
    try {
      const data = await apiGet('/departments');
      setStores(data);
    } catch (error: any) {
      console.error('加载部门失败:', error);
    }
  };

  useEffect(() => {
    if (visible) {
      loadUsers();
      loadStores();

      // 初始化表单
      if (initialConfig) {
        form.setFieldsValue({
          approval_mode: initialConfig.approval_mode || 'single',
        });
        setApprovers(initialConfig.approvers || []);
      } else {
        form.setFieldsValue({
          approval_mode: 'single',
        });
        setApprovers([]);
      }
    }
  }, [visible, initialConfig]);

  // 添加审批人
  const handleAddApprover = () => {
    if (!currentApprover.type || !currentApprover.value) {
      return;
    }

    let name = '';
    if (currentApprover.type === 'user') {
      const user = users.find((u) => u.id === currentApprover.value);
      name = user?.name || user?.username || '';
    } else if (currentApprover.type === 'role') {
      const roleMap: Record<string, string> = {
        admin: '管理员',
        manager: '经理',
        operator: '操作员',
        viewer: '查看者',
      };
      name = roleMap[currentApprover.value as string] || currentApprover.value as string;
    } else if (currentApprover.type === 'department') {
      const store = stores.find((s) => s.id === currentApprover.value);
      name = store?.name || '';
    }

    setApprovers([
      ...approvers,
      {
        type: currentApprover.type,
        value: currentApprover.value,
        name,
      } as Approver,
    ]);

    setCurrentApprover({});
  };

  // 删除审批人
  const handleRemoveApprover = (index: number) => {
    setApprovers(approvers.filter((_, i) => i !== index));
  };

  // 提交配置
  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      if (approvers.length === 0) {
        Modal.warning({
          title: '提示',
          content: '请至少添加一个审批人',
        });
        return;
      }

      const config: ApproverConfig = {
        type: approvers.length === 1 ? approvers[0].type : 'mixed',
        approvers,
        approval_mode: values.approval_mode,
        description: `${approvers.length}个审批人，${
          values.approval_mode === 'single'
            ? '任意一人审批即可'
            : values.approval_mode === 'and'
            ? '所有人都需要审批'
            : values.approval_mode === 'or'
            ? '任意一人审批即可'
            : '按顺序审批'
        }`,
      };

      onOk(config);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 审批人类型图标
  const getApproverIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <UserOutlined />;
      case 'role':
        return <TeamOutlined />;
      case 'department':
        return <ShopOutlined />;
      default:
        return <UserOutlined />;
    }
  };

  // 审批人类型颜色
  const getApproverColor = (type: string) => {
    switch (type) {
      case 'user':
        return 'blue';
      case 'role':
        return 'green';
      case 'department':
        return 'orange';
      default:
        return 'default';
    }
  };

  return (
    <Modal
      title="配置审批人"
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      width={700}
      okText="确定"
      cancelText="取消"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 说明 */}
        <Alert
          message="审批人配置说明"
          description={
            <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
              <li>可以添加具体用户、角色或部门作为审批人</li>
              <li>支持多个审批人，可以设置审批模式（任意/全部/顺序）</li>
              <li>审批流程将按照此配置自动分配审批人</li>
            </ul>
          }
          type="info"
          showIcon
        />

        {/* 添加审批人 */}
        <div>
          <h4>
            添加审批人
            <Tooltip title="选择审批人类型和具体审批人后，点击添加按钮">
              <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
            </Tooltip>
          </h4>
          <Space.Compact style={{ width: '100%' }}>
            <Select
              style={{ width: 120 }}
              placeholder="类型"
              value={currentApprover.type}
              onChange={(type) => setCurrentApprover({ type, value: undefined })}
              options={[
                { label: '👤 用户', value: 'user' },
                { label: '👥 角色', value: 'role' },
                { label: '🏪 部门', value: 'department' },
              ]}
            />

            {currentApprover.type === 'user' && (
              <Select
                style={{ flex: 1 }}
                placeholder="选择用户"
                showSearch
                filterOption={(input, option: any) =>
                  option?.label?.toLowerCase().includes(input.toLowerCase())
                }
                value={currentApprover.value}
                onChange={(value) =>
                  setCurrentApprover({ ...currentApprover, value })
                }
                options={users.map((user) => ({
                  label: `${user.name} (${user.username})`,
                  value: user.id,
                }))}
              />
            )}

            {currentApprover.type === 'role' && (
              <Select
                style={{ flex: 1 }}
                placeholder="选择角色"
                value={currentApprover.value}
                onChange={(value) =>
                  setCurrentApprover({ ...currentApprover, value })
                }
                options={[
                  { label: '管理员', value: 'admin' },
                  { label: '经理', value: 'manager' },
                  { label: '操作员', value: 'operator' },
                  { label: '查看者', value: 'viewer' },
                ]}
              />
            )}

            {currentApprover.type === 'department' && (
              <Select
                style={{ flex: 1 }}
                placeholder="选择部门/门店"
                showSearch
                filterOption={(input, option: any) =>
                  option?.label?.toLowerCase().includes(input.toLowerCase())
                }
                value={currentApprover.value}
                onChange={(value) =>
                  setCurrentApprover({ ...currentApprover, value })
                }
                options={stores.map((store) => ({
                  label: store.name,
                  value: store.id,
                }))}
              />
            )}

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddApprover}
              disabled={!currentApprover.type || !currentApprover.value}
            >
              添加
            </Button>
          </Space.Compact>
        </div>

        {/* 已添加的审批人 */}
        <div>
          <h4>审批人列表 ({approvers.length}人)</h4>
          {approvers.length === 0 ? (
            <Alert message="暂无审批人，请添加" type="warning" showIcon />
          ) : (
            <Space wrap>
              {approvers.map((approver, index) => (
                <Tag
                  key={index}
                  color={getApproverColor(approver.type)}
                  closable
                  onClose={() => handleRemoveApprover(index)}
                  icon={getApproverIcon(approver.type)}
                  style={{ padding: '4px 12px', fontSize: 14 }}
                >
                  {approver.name}
                </Tag>
              ))}
            </Space>
          )}
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* 审批模式 */}
        <Form form={form} layout="vertical">
          <Form.Item
            label={
              <span>
                审批模式
                <Tooltip title="设置多人时如何审批">
                  <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
                </Tooltip>
              </span>
            }
            name="approval_mode"
            rules={[{ required: true, message: '请选择审批模式' }]}
          >
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="single">
                  <strong>任意一人</strong> - 任意一人审批即可通过
                </Radio>
                <Radio value="and">
                  <strong>全部审批</strong> - 所有人都需要审批（会签）
                </Radio>
                <Radio value="sequential">
                  <strong>顺序审批</strong> - 按添加顺序依次审批（串行）
                </Radio>
                <Radio value="or">
                  <strong>或签审批</strong> - 任意一人审批或拒绝即可（或签）
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
        </Form>

        {/* 预览 */}
        {approvers.length > 0 && (
          <Alert
            message="配置预览"
            description={
              <div>
                <p style={{ marginBottom: 8 }}>
                  <strong>审批人：</strong>
                  {approvers.map((a) => a.name).join(' → ')}
                </p>
                <p style={{ marginBottom: 0 }}>
                  <strong>审批模式：</strong>
                  {form.getFieldValue('approval_mode') === 'single' && '任意一人审批即可'}
                  {form.getFieldValue('approval_mode') === 'and' && '所有人都需要审批'}
                  {form.getFieldValue('approval_mode') === 'sequential' && '按顺序依次审批'}
                  {form.getFieldValue('approval_mode') === 'or' && '任意一人审批或拒绝即可'}
                </p>
              </div>
            }
            type="success"
            showIcon
          />
        )}
      </Space>
    </Modal>
  );
};

export default ApproverConfigModal;
