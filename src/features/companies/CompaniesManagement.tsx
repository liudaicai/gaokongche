import React, { useEffect, useMemo, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Switch, Card, Statistic, Row, Col, Tag, App, Dropdown, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, UserAddOutlined, MoreOutlined, KeyOutlined, UnlockOutlined, DatabaseOutlined, SyncOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import type { RootState } from '../../app/store';
import {
  fetchCompanies,
  createCompany,
  provisionCompanyDb,
  updateCompany,
  deleteCompany,
  fetchCompanyStats,
  clearError,
  clearCurrentCompany,
} from './companiesSlice';
import type { Company, CompanyFormData } from './types';

const { Column } = Table;

export default function CompaniesManagement() {
  const dispatch = useAppDispatch();
  const { message } = App.useApp();
  const { companies, loading, error, total, page, pageSize, stats } = useAppSelector(
    (state: RootState) => state.companies
  );
  const currentUser = useAppSelector((state: RootState) => state.auth.user);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isStatsModalVisible, setIsStatsModalVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isAdminModalVisible, setIsAdminModalVisible] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [adminForm] = Form.useForm();

  // 租户库初始化状态（仅用于当前页面会话展示）
  const [provisionState, setProvisionState] = useState<Record<number, { status: 'idle' | 'pending' | 'success' | 'failed'; error?: string }>>({});

  const provisionStatusFor = (companyId: number) => provisionState[companyId]?.status || 'idle';
  const provisionErrorFor = (companyId: number) => provisionState[companyId]?.error;

  const doProvision = async (companyId: number) => {
    setProvisionState(prev => ({ ...prev, [companyId]: { status: 'pending' } }));
    const msgKey = `provision-${companyId}`;
    message.loading({ content: `正在初始化租户库（公司ID: ${companyId}）...`, key: msgKey, duration: 0 });
    try {
      await dispatch(provisionCompanyDb(companyId)).unwrap();
      setProvisionState(prev => ({ ...prev, [companyId]: { status: 'success' } }));
      message.success({ content: `租户库初始化成功（公司ID: ${companyId}）`, key: msgKey });
    } catch (err: any) {
      const errMsg = err?.message || err?.error || '租户库初始化失败';
      setProvisionState(prev => ({ ...prev, [companyId]: { status: 'failed', error: errMsg } }));
      message.error({ content: `租户库初始化失败（公司ID: ${companyId}）：${errMsg}`, key: msgKey, duration: 6 });
    }
  };

  // 检查是否是超级管理员
  const isSuperAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) {
      dispatch(fetchCompanies({ page, pageSize, search: searchText }));
    }
  }, [dispatch, page, pageSize, searchText, isSuperAdmin]);

  useEffect(() => {
    if (error) {
      message.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // 显示错误提示
  if (!isSuperAdmin) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <h2>权限不足</h2>
          <p>只有超级管理员可以访问公司管理功能</p>
        </div>
      </Card>
    );
  }

  const handleAdd = () => {
    setEditingCompany(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    form.setFieldsValue(company);
    setIsModalVisible(true);
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个公司吗？此操作不可撤销。',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await dispatch(deleteCompany(id)).unwrap();
          message.success('删除成功');
          dispatch(fetchCompanies({ page, pageSize, search: searchText }));
        } catch (err: any) {
          message.error(err.message || '删除失败');
        }
      },
    });
  };

  const handleViewStats = async (company: Company) => {
    try {
      await dispatch(fetchCompanyStats(company.id)).unwrap();
      setIsStatsModalVisible(true);
    } catch (err: any) {
      message.error(err.message || '获取统计信息失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const formData: CompanyFormData = {
        name: values.name,
        code: values.code,
        contactPerson: values.contactPerson,
        contactPhone: values.contactPhone,
        address: values.address,
        isActive: values.isActive !== false,
        adminUsername: values.adminUsername,
        adminPassword: values.adminPassword,
      };

      if (editingCompany) {
        await dispatch(updateCompany({ id: editingCompany.id, data: formData })).unwrap();
        message.success('更新成功');
      } else {
        const created = await dispatch(createCompany(formData)).unwrap() as any;
        message.success('创建成功');

        // ✅ 前端自动触发：初始化租户库（失败不影响创建，可在列表中重试）
        const newCompanyId = Number(created?.id || created?.data?.id);
        if (Number.isFinite(newCompanyId) && newCompanyId > 0) {
          // 不阻塞弹窗关闭体验
          void doProvision(newCompanyId);
        }
      }

      setIsModalVisible(false);
      form.resetFields();
      dispatch(fetchCompanies({ page, pageSize, search: searchText }));
    } catch (err: any) {
      if (err.errorFields) {
        // 表单验证错误
        return;
      }
      message.error(err.message || '操作失败');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleCreateAdmin = (company: Company) => {
    setSelectedCompanyId(company.id);
    adminForm.resetFields();
    setIsAdminModalVisible(true);
  };

  const handleAdminModalOk = async () => {
    try {
      const values = await adminForm.validateFields();
      const response = await fetch(`/api/companies/${selectedCompanyId}/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (result.ok) {
        message.success('管理员创建成功');
        setIsAdminModalVisible(false);
        adminForm.resetFields();
      } else {
        message.error(result.error || '创建失败');
      }
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(err.message || '操作失败');
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleTableChange = (pagination: any) => {
    dispatch(fetchCompanies({ 
      page: pagination.current, 
      pageSize: pagination.pageSize,
      search: searchText 
    }));
  };

  // 重置管理员密码
  const handleResetPassword = (company: Company) => {
    Modal.confirm({
      title: '确认重置密码',
      content: `确定要将 ${company.name} 的管理员密码重置为默认密码 12345678 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const token = sessionStorage.getItem('token') || sessionStorage.getItem('auth_token');
          const response = await fetch(`/api/companies/${company.id}/reset-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });
          const result = await response.json();
          if (result.ok) {
            Modal.success({
              title: '密码重置成功',
              content: `管理员账号: ${result.data.username}\n新密码: ${result.data.newPassword}`,
            });
          } else {
            message.error(result.error || '重置失败');
          }
        } catch (err: any) {
          message.error(err.message || '操作失败');
        }
      },
    });
  };

  // 解除登录限制
  const handleUnlock = (company: Company) => {
    Modal.confirm({
      title: '确认解除登录限制',
      content: `确定要解除 ${company.name} 的管理员登录限制吗？这将重置登录失败次数并解锁账号。`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const token = sessionStorage.getItem('token') || sessionStorage.getItem('auth_token');
          const response = await fetch(`/api/companies/${company.id}/unlock`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });
          const result = await response.json();
          if (result.ok) {
            message.success(result.message || '解除限制成功');
          } else {
            message.error(result.error || '解除失败');
          }
        } catch (err: any) {
          message.error(err.message || '操作失败');
        }
      },
    });
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="公司管理"
        extra={
          <Space>
            <Space.Compact>
              <Input
                placeholder="搜索公司名称/编码/联系人"
                style={{ width: 300 }}
                allowClear
                onPressEnter={(e) => handleSearch((e.target as HTMLInputElement).value)}
              />
              <Button icon={<SearchOutlined />} onClick={(e) => {
                const input = document.querySelector('input[placeholder="搜索公司名称/编码/联系人"]') as HTMLInputElement;
                if (input) handleSearch(input.value);
              }} />
            </Space.Compact>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增公司
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={companies}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={handleTableChange}
        >
          <Column title="ID" dataIndex="id" key="id" width={80} />
          <Column title="公司名称" dataIndex="name" key="name" />
          <Column title="公司编码" dataIndex="code" key="code" />
          <Column title="联系人" dataIndex="contactPerson" key="contactPerson" />
          <Column title="联系电话" dataIndex="contactPhone" key="contactPhone" />
          <Column
            title="状态"
            dataIndex="isActive"
            key="isActive"
            render={(isActive: boolean) => (
              <Tag color={isActive ? 'green' : 'red'}>
                {isActive ? '启用' : '禁用'}
              </Tag>
            )}
          />
          <Column
            title="租户库"
            key="tenantDb"
            render={(_, record: Company) => {
              const st = provisionStatusFor(record.id);
              if (st === 'pending') return <Tag color="processing" icon={<SyncOutlined spin />}>初始化中</Tag>;
              if (st === 'success') return <Tag color="green" icon={<DatabaseOutlined />}>已初始化</Tag>;
              if (st === 'failed') {
                const tip = provisionErrorFor(record.id) || '初始化失败';
                return (
                  <Tooltip title={tip}>
                    <Tag color="red" icon={<DatabaseOutlined />}>初始化失败</Tag>
                  </Tooltip>
                );
              }
              return <Tag color="default">未操作</Tag>;
            }}
          />
          <Column
            title="操作"
            key="action"
            render={(_, record: Company) => {
              const prov = provisionStatusFor(record.id);
              const menuItems = [
                {
                  key: 'edit',
                  icon: <EditOutlined />,
                  label: '编辑',
                  onClick: () => handleEdit(record),
                },
                {
                  key: 'stats',
                  icon: <EyeOutlined />,
                  label: '统计信息',
                  onClick: () => handleViewStats(record),
                },
                {
                  key: 'provision',
                  icon: <DatabaseOutlined />,
                  label: prov === 'failed' ? '初始化租户库（重试）' : '初始化租户库',
                  disabled: prov === 'pending',
                  onClick: () => doProvision(record.id),
                },
                {
                  key: 'addAdmin',
                  icon: <UserAddOutlined />,
                  label: '添加管理员',
                  onClick: () => handleCreateAdmin(record),
                },
                {
                  type: 'divider' as const,
                },
                {
                  key: 'resetPassword',
                  icon: <KeyOutlined />,
                  label: '密码重置',
                  onClick: () => handleResetPassword(record),
                },
                {
                  key: 'unlock',
                  icon: <UnlockOutlined />,
                  label: '登录限制解除',
                  onClick: () => handleUnlock(record),
                },
              ];

              // 如果不是默认公司（id=1），添加删除选项
              if (record.id !== 1) {
                menuItems.push(
                  {
                    type: 'divider' as const,
                  },
                  {
                    key: 'delete',
                    icon: <DeleteOutlined />,
                    label: '删除',
                    danger: true,
                    onClick: () => handleDelete(record.id),
                  }
                );
              }

              return (
                <Dropdown
                  menu={{ items: menuItems }}
                  trigger={['click']}
                >
                  <Button type="primary" icon={<MoreOutlined />}>
                    操作
                  </Button>
                </Dropdown>
              );
            }}
          />
        </Table>
      </Card>

      {/* 新增/编辑公司模态框 */}
      <Modal
        title={editingCompany ? '编辑公司' : '新增公司'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="公司名称"
            name="name"
            rules={[{ required: true, message: '请输入公司名称' }]}
          >
            <Input placeholder="请输入公司名称" />
          </Form.Item>

          <Form.Item
            label="公司编码"
            name="code"
            rules={[
              { required: true, message: '请输入公司编码' },
              { pattern: /^[A-Z0-9_]+$/, message: '编码只能包含大写字母、数字和下划线' },
            ]}
          >
            <Input placeholder="请输入公司编码（大写字母、数字和下划线）" disabled={!!editingCompany} />
          </Form.Item>

          <Form.Item label="联系人" name="contactPerson">
            <Input placeholder="请输入联系人姓名" />
          </Form.Item>

          <Form.Item label="联系电话" name="contactPhone">
            <Input placeholder="请输入联系电话" />
          </Form.Item>

          <Form.Item label="公司地址" name="address">
            <Input.TextArea rows={3} placeholder="请输入公司地址" />
          </Form.Item>

          <Form.Item label="状态" name="isActive" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          {!editingCompany && (
            <>
              <Form.Item
                label="管理员用户名"
                name="adminUsername"
                rules={[{ required: true, message: '请输入管理员用户名' }]}
              >
                <Input placeholder="请输入管理员用户名" />
              </Form.Item>
              <Form.Item
                label="管理员密码"
                name="adminPassword"
                rules={[
                  { required: true, message: '请输入管理员密码' },
                  { min: 8, message: '密码至少8位' },
                ]}
              >
                <Input.Password placeholder="请输入管理员密码（至少8位）" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* 统计信息模态框 */}
      <Modal
        title="公司统计信息"
        open={isStatsModalVisible}
        onCancel={() => {
          setIsStatsModalVisible(false);
          dispatch(clearCurrentCompany());
        }}
        footer={[
          <Button key="close" onClick={() => {
            setIsStatsModalVisible(false);
            dispatch(clearCurrentCompany());
          }}>
            关闭
          </Button>,
        ]}
      >
        {stats && (
          <Row gutter={16}>
            <Col span={12}>
              <Card>
                <Statistic title="用户数" value={stats.userCount} />
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <Statistic title="客户数" value={stats.customerCount} />
              </Card>
            </Col>
            <Col span={12} style={{ marginTop: 16 }}>
              <Card>
                <Statistic title="设备数" value={stats.equipmentCount} />
              </Card>
            </Col>
            <Col span={12} style={{ marginTop: 16 }}>
              <Card>
                <Statistic title="订单数" value={stats.orderCount} />
              </Card>
            </Col>
          </Row>
        )}
      </Modal>

      {/* 添加管理员模态框 */}
      <Modal
        title="添加公司管理员"
        open={isAdminModalVisible}
        onOk={handleAdminModalOk}
        onCancel={() => {
          setIsAdminModalVisible(false);
          adminForm.resetFields();
        }}
        okText="确定"
        cancelText="取消"
      >
        <Form form={adminForm} layout="vertical">
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码至少8位' },
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item label="姓名" name="name">
            <Input placeholder="请输入姓名" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
