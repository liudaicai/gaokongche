/**
 * 租户管理页面
 * 仅超级管理员可访问
 * 功能：查看/创建/编辑/删除租户（公司）
 */
import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Space,
  Tag,
  Popconfirm,
  Typography,
  Dropdown,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  BankOutlined,
  MoreOutlined,
  KeyOutlined,
  UnlockOutlined,
  StopOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Tenant {
  id: string;
  companyName: string;
  companyAddress?: string;
  creditCode?: string;
  bankAccount?: string;
  bankName?: string;
  contactName?: string;
  contactPhone?: string;
  idCardNumber?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const TenantManagementPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [form] = Form.useForm();

  // 加载租户列表
  const loadTenants = async () => {
    setLoading(true);
    try {
      const data = await apiGet<Tenant[]>('/stores/company-verifications');
      setTenants(data || []);
    } catch (error: any) {
      message.error('加载租户列表失败: ' + (error?.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  // 打开新增/编辑对话框
  const showModal = (tenant?: Tenant) => {
    if (tenant) {
      setEditingTenant(tenant);
      form.setFieldsValue({
        companyName: tenant.companyName,
        companyAddress: tenant.companyAddress,
        creditCode: tenant.creditCode,
        bankAccount: tenant.bankAccount,
        bankName: tenant.bankName,
        contactName: tenant.contactName,
        contactPhone: tenant.contactPhone,
        idCardNumber: tenant.idCardNumber,
      });
    } else {
      setEditingTenant(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingTenant) {
        // 更新
        await apiPut(`/stores/company-verifications/${editingTenant.id}`, values);
        message.success('更新租户成功');
      } else {
        // 创建（返回包含管理员账号信息）
        const result = await apiPost<any>('/stores/company-verifications', values);
        
        // 显示管理员账号信息
        Modal.success({
          title: '租户创建成功',
          content: (
            <div>
              <p>租户 <strong>{values.companyName}</strong> 已创建成功！</p>
              <p style={{ marginTop: 12, padding: 12, background: '#f0f5ff', borderRadius: 4 }}>
                <strong>管理员账号信息：</strong><br/>
                账号：<strong>{result.adminUsername}</strong><br/>
                密码：<strong>{result.defaultPassword}</strong><br/>
                <span style={{ color: '#faad14' }}>⚠️ 请妥善保管账号密码！</span>
              </p>
            </div>
          ),
          width: 500,
        });
      }

      setModalVisible(false);
      loadTenants();
    } catch (error: any) {
      message.error('操作失败: ' + (error?.message || '未知错误'));
    }
  };

  // 删除租户
  const handleDelete = async (id: string) => {
    try {
      await apiDelete(`/stores/company-verifications/${id}`);
      message.success('删除租户成功');
      loadTenants();
    } catch (error: any) {
      message.error('删除失败: ' + (error?.message || '未知错误'));
    }
  };

  // 重置密码
  const handleResetPassword = async (id: string, companyName: string) => {
    Modal.confirm({
      title: '重置密码',
      content: `确定要重置 ${companyName} 的管理员密码吗？密码将重置为 123456`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await apiPut<any>(`/stores/company-verifications/${id}/reset-password`, {});
          Modal.success({
            title: '密码重置成功',
            content: (
              <div>
                <p>管理员账号：<strong>{result.username}</strong></p>
                <p>新密码：<strong>{result.newPassword}</strong></p>
                <p style={{ color: '#faad14' }}>⚠️ 请通知管理员尽快修改密码</p>
              </div>
            ),
          });
          loadTenants();
        } catch (error: any) {
          message.error('重置密码失败: ' + (error?.message || '未知错误'));
        }
      },
    });
  };

  // 解除登录限制
  const handleUnlock = async (id: string, companyName: string) => {
    try {
      await apiPut(`/stores/company-verifications/${id}/unlock`, {});
      message.success(`${companyName} 的管理员账号已解锁`);
      loadTenants();
    } catch (error: any) {
      message.error('解锁失败: ' + (error?.message || '未知错误'));
    }
  };

  // 启用/停用租户
  const handleToggleStatus = async (id: string, companyName: string, currentStatus?: boolean) => {
    const action = currentStatus ? '停用' : '启用';
    Modal.confirm({
      title: `${action}租户`,
      content: `确定要${action} ${companyName} 吗？${currentStatus ? '停用后该租户将无法登录系统。' : ''}`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await apiPut<any>(`/stores/company-verifications/${id}/toggle-status`, {});
          message.success(result.message || `租户已${action}`);
          loadTenants();
        } catch (error: any) {
          message.error(`${action}失败: ` + (error?.message || '未知错误'));
        }
      },
    });
  };

  // 表格列定义
  const columns: ColumnsType<Tenant> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '公司名称',
      dataIndex: 'companyName',
      key: 'companyName',
      width: 200,
      render: (text) => (
        <Space>
          <BankOutlined style={{ color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '联系人',
      dataIndex: 'contactName',
      key: 'contactName',
      width: 100,
      render: (text) => text || <Text type="secondary">-</Text>,
    },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      key: 'contactPhone',
      width: 120,
      render: (text) => text ? (
        <Tag color="green">{text}</Tag>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: '身份证号',
      dataIndex: 'idCardNumber',
      key: 'idCardNumber',
      width: 160,
      render: (text) => text ? (
        <Text code>{text.replace(/^(.{6})(.{8})(.{4})$/, '$1****$3')}</Text>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: '统一社会信用代码',
      dataIndex: 'creditCode',
      key: 'creditCode',
      width: 180,
      render: (text) => text || <Text type="secondary">-</Text>,
    },
    {
      title: '公司地址',
      dataIndex: 'companyAddress',
      key: 'companyAddress',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">-</Text>,
    },
    {
      title: '开户行',
      dataIndex: 'bankName',
      key: 'bankName',
      width: 150,
      render: (text) => text || <Text type="secondary">-</Text>,
    },
    {
      title: '银行账号',
      dataIndex: 'bankAccount',
      key: 'bankAccount',
      width: 180,
      render: (text) => text || <Text type="secondary">-</Text>,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'error'}>
          {isActive ? '已启用' : '已停用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (text) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 80,
      render: (_, record) => {
        const items: MenuProps['items'] = [
          {
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            onClick: () => showModal(record),
          },
          {
            key: 'reset-password',
            label: '密码重置',
            icon: <KeyOutlined />,
            onClick: () => handleResetPassword(record.id, record.companyName),
          },
          {
            key: 'unlock',
            label: '登录限制解除',
            icon: <UnlockOutlined />,
            onClick: () => handleUnlock(record.id, record.companyName),
          },
          {
            key: 'toggle-status',
            label: record.isActive ? '停用租户' : '启用租户',
            icon: record.isActive ? <StopOutlined /> : <CheckCircleOutlined />,
            onClick: () => handleToggleStatus(record.id, record.companyName, record.isActive),
          },
          {
            type: 'divider',
          },
          {
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: '确定要删除这个租户吗？',
                content: '删除后该公司的所有数据将无法访问！',
                okText: '确定',
                cancelText: '取消',
                okButtonProps: { danger: true },
                onOk: () => handleDelete(record.id),
              });
            },
          },
        ];

        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="link" icon={<MoreOutlined />}>
              操作
            </Button>
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 页头 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <TeamOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={3} style={{ margin: 0 }}>租户管理</Title>
              <Tag color="blue">{tenants.length} 个租户</Tag>
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showModal()}
            >
              新增租户
            </Button>
          </div>

          {/* 表格 */}
          <Table
            columns={columns}
            dataSource={tenants}
            loading={loading}
            rowKey="id"
            scroll={{ x: 1700 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </Space>
      </Card>

      {/* 新增/编辑对话框 */}
      <Modal
        title={editingTenant ? '编辑租户' : '新增租户'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="companyName"
            label="公司名称"
            rules={[{ required: true, message: '请输入公司名称' }]}
          >
            <Input placeholder="请输入公司名称" />
          </Form.Item>

          <Form.Item
            name="creditCode"
            label="统一社会信用代码"
            rules={[{ required: true, message: '请输入统一社会信用代码' }]}
          >
            <Input placeholder="请输入统一社会信用代码（18位）" maxLength={18} />
          </Form.Item>

          <Form.Item
            name="companyAddress"
            label="公司地址"
          >
            <TextArea rows={2} placeholder="请输入公司地址" />
          </Form.Item>

          <Typography.Title level={5} style={{ marginTop: 16, marginBottom: 16 }}>
            联系人信息 {!editingTenant && <Text type="warning">（电话将作为管理员登录账号，初始密码：123456）</Text>}
          </Typography.Title>

          <Form.Item
            name="contactName"
            label="联系人姓名"
            rules={[{ required: true, message: '请输入联系人姓名' }]}
          >
            <Input placeholder="请输入联系人姓名" />
          </Form.Item>

          <Form.Item
            name="contactPhone"
            label="联系电话"
            rules={[
              { required: true, message: '请输入联系电话' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
            ]}
          >
            <Input 
              placeholder="请输入11位手机号码" 
              maxLength={11}
              disabled={!!editingTenant}
              addonBefore={!editingTenant ? "📱" : undefined}
            />
          </Form.Item>
          {!editingTenant && (
            <Text type="secondary" style={{ marginTop: -16, marginBottom: 16, display: 'block', fontSize: 12 }}>
              此电话号码将作为管理员登录账号，创建后不可修改
            </Text>
          )}

          <Form.Item
            name="idCardNumber"
            label="身份证号码"
            rules={[
              { pattern: /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/, message: '请输入有效的身份证号码' }
            ]}
          >
            <Input placeholder="请输入18位身份证号码" maxLength={18} />
          </Form.Item>

          <Typography.Title level={5} style={{ marginTop: 16, marginBottom: 16 }}>
            银行信息
          </Typography.Title>

          <Form.Item
            name="bankName"
            label="开户行"
          >
            <Input placeholder="请输入开户行名称" />
          </Form.Item>

          <Form.Item
            name="bankAccount"
            label="银行账号"
          >
            <Input placeholder="请输入银行账号" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TenantManagementPage;
