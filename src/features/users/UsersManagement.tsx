import React, { useEffect, useState } from 'react';
import { Table, Button, Space, message, Modal, Form, Input, Select, Card, Tag, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UnlockOutlined, ExportOutlined, SearchOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  unlockUser,
  batchDeleteUsers,
  clearError,
} from './usersSlice';
import { fetchCompanies } from '../companies/companiesSlice';
import type { UserDetail, UserFormData } from './types';

const { Column } = Table;

export default function UsersManagement() {
  const dispatch = useAppDispatch();
  const { users, loading, error, total, page, pageSize } = useAppSelector((state) => state.users);
  const { companies } = useAppSelector((state) => state.companies);
  const currentUser = useAppSelector((state) => state.auth.user);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDetail | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [form] = Form.useForm();

  // 检查是否是管理员
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin' || currentUser?.role === 'super_admin';
  const isSuperAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'super_admin';

  useEffect(() => {
    if (isAdmin) {
      dispatch(fetchUsers({ page, pageSize, search: searchText, companyId: selectedCompanyId }));
      if (isSuperAdmin) {
        dispatch(fetchCompanies({ page: 1, pageSize: 100 }));
      }
    }
  }, [dispatch, page, pageSize, searchText, selectedCompanyId, isAdmin, isSuperAdmin]);

  useEffect(() => {
    if (error) {
      message.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // 显示错误提示
  if (!isAdmin) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <h2>权限不足</h2>
          <p>只有管理员可以访问用户管理功能</p>
        </div>
      </Card>
    );
  }

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ 
      role: 'user',
      is_active: true,
      is_locked: false,
      ...(isSuperAdmin && { company_id: currentUser?.company_id })
    });
    setIsModalVisible(true);
  };

  const handleEdit = (user: UserDetail) => {
    setEditingUser(user);
    form.setFieldsValue({
      ...user,
      password: '', // 不显示密码
    });
    setIsModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个用户吗？此操作不可撤销。',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await dispatch(deleteUser(id)).unwrap();
          message.success('删除成功');
          dispatch(fetchUsers({ page, pageSize, search: searchText, companyId: selectedCompanyId }));
        } catch (err: any) {
          message.error(err.message || '删除失败');
        }
      },
    });
  };

  const handleUnlock = async (id: string) => {
    try {
      await dispatch(unlockUser(id)).unwrap();
      message.success('解锁成功');
      dispatch(fetchUsers({ page, pageSize, search: searchText, companyId: selectedCompanyId }));
    } catch (err: any) {
      message.error(err.message || '解锁失败');
    }
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的用户');
      return;
    }

    Modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个用户吗？此操作不可撤销。`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await dispatch(batchDeleteUsers(selectedRowKeys as string[])).unwrap();
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          dispatch(fetchUsers({ page, pageSize, search: searchText, companyId: selectedCompanyId }));
        } catch (err: any) {
          message.error(err.message || '批量删除失败');
        }
      },
    });
  };

  const handleExport = () => {
    // 导出为 CSV
    const headers = ['用户名', '姓名', '角色', '邮箱', '手机号', '所属公司', '状态'];
    const rows = users.map(user => [
      user.username,
      user.name || '',
      getRoleLabel(user.role),
      user.email || '',
      user.phone || '',
      user.company_name || '',
      user.is_active ? '启用' : '禁用',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    message.success('导出成功');
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      // 如果没有输入密码且是编辑模式，删除密码字段
      const formData: UserFormData = {
        ...values,
      };
      
      if (!values.password && editingUser) {
        delete formData.password;
      }

      if (editingUser) {
        await dispatch(updateUser({ id: editingUser.id, data: formData })).unwrap();
        message.success('更新成功');
      } else {
        if (!values.password) {
          message.error('创建用户时密码为必填项');
          return;
        }
        await dispatch(createUser(formData)).unwrap();
        message.success('创建成功');
      }

      setIsModalVisible(false);
      form.resetFields();
      dispatch(fetchUsers({ page, pageSize, search: searchText, companyId: selectedCompanyId }));
    } catch (err: any) {
      if (err.errorFields) {
        return;
      }
      message.error(err.message || '操作失败');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleCompanyFilter = (companyId: number | undefined) => {
    setSelectedCompanyId(companyId);
  };

  const handleTableChange = (pagination: any) => {
    dispatch(fetchUsers({ 
      page: pagination.current, 
      pageSize: pagination.pageSize,
      search: searchText,
      companyId: selectedCompanyId
    }));
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin':
      case 'super_admin':
        return '超级管理员';
      case 'admin':
        return '管理员';
      default:
        return '普通用户';
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="用户管理"
        extra={
          <Space>
            {isSuperAdmin && (
              <Select
                placeholder="筛选公司"
                style={{ width: 200 }}
                allowClear
                onChange={handleCompanyFilter}
              >
                {companies.map(company => (
                  <Select.Option key={company.id} value={company.id}>
                    {company.name}
                  </Select.Option>
                ))}
              </Select>
            )}
            <Space.Compact>
              <Input
                placeholder="搜索用户名/姓名/邮箱"
                style={{ width: 250 }}
                allowClear
                onPressEnter={(e) => handleSearch((e.target as HTMLInputElement).value)}
              />
              <Button icon={<SearchOutlined />} onClick={(e) => {
                const input = document.querySelector('input[placeholder="搜索用户名/姓名/邮箱"]') as HTMLInputElement;
                if (input) handleSearch(input.value);
              }} />
            </Space.Compact>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出
            </Button>
            {selectedRowKeys.length > 0 && (
              <Button danger onClick={handleBatchDelete}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增用户
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={users}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (record) => ({
              disabled: record.id === currentUser?.id, // 不能选择自己
            }),
          }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={handleTableChange}
        >
          <Column title="用户名" dataIndex="username" key="username" />
          <Column title="姓名" dataIndex="name" key="name" />
          <Column
            title="角色"
            dataIndex="role"
            key="role"
            render={(role: string) => (
              <Tag color={role.includes('admin') ? 'red' : 'blue'}>{getRoleLabel(role)}</Tag>
            )}
          />
          <Column title="邮箱" dataIndex="email" key="email" />
          <Column title="手机号" dataIndex="phone" key="phone" />
          {isSuperAdmin && <Column title="所属公司" dataIndex="company_name" key="company_name" />}
          <Column
            title="状态"
            key="status"
            render={(_, record: UserDetail) => (
              <Space>
                {record.is_active ? (
                  <Tag color="green">启用</Tag>
                ) : (
                  <Tag color="red">禁用</Tag>
                )}
                {record.is_locked && <Tag color="orange">锁定</Tag>}
              </Space>
            )}
          />
          <Column
            title="操作"
            key="action"
            render={(_, record: UserDetail) => (
              <Space size="small">
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                >
                  编辑
                </Button>
                {record.is_locked && (
                  <Button
                    type="link"
                    size="small"
                    icon={<UnlockOutlined />}
                    onClick={() => handleUnlock(record.id)}
                  >
                    解锁
                  </Button>
                )}
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record.id)}
                  disabled={record.id === currentUser?.id}
                >
                  删除
                </Button>
              </Space>
            )}
          />
        </Table>
      </Card>

      {/* 新增/编辑用户模态框 */}
      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" disabled={!!editingUser} />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={editingUser ? [] : [{ required: true, message: '请输入密码' }]}
            extra={editingUser ? '留空表示不修改密码' : ''}
          >
            <Input.Password placeholder={editingUser ? '留空表示不修改' : '请输入密码'} />
          </Form.Item>

          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select>
              {isSuperAdmin && <Select.Option value="superadmin">超级管理员</Select.Option>}
              <Select.Option value="admin">管理员</Select.Option>
              <Select.Option value="user">普通用户</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="姓名" name="name">
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item label="手机号" name="phone">
            <Input placeholder="请输入手机号" />
          </Form.Item>

          {isSuperAdmin && (
            <Form.Item
              label="所属公司"
              name="company_id"
              rules={[{ required: true, message: '请选择所属公司' }]}
            >
              <Select placeholder="请选择所属公司">
                {companies.map(company => (
                  <Select.Option key={company.id} value={company.id}>
                    {company.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item label="启用状态" name="is_active" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item label="锁定状态" name="is_locked" valuePropName="checked">
            <Switch checkedChildren="锁定" unCheckedChildren="正常" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
