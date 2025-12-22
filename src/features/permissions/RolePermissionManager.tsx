import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Tag,
  Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '../../api/client';
import PermissionTree from './PermissionTree';
import type { RolePermission, Permission } from './types';

const RolePermissionManager: React.FC = () => {
  const [form] = Form.useForm();
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRole, setCurrentRole] = useState<RolePermission | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  useEffect(() => {
    loadData();
    loadPermissions();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/permissions/roles');
      if (response.data.ok) {
        setRoles(response.data.data);
      }
    } catch (error) {
      console.error('获取角色列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await apiClient.get('/api/permissions/definitions');
      if (response.data.ok) {
        setPermissions(response.data.data);
      }
    } catch (error) {
      console.error('获取权限定义失败:', error);
    }
  };

  const handleAdd = () => {
    setIsEditing(false);
    setCurrentRole(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: RolePermission) => {
    setIsEditing(true);
    setCurrentRole(record);
    form.setFieldsValue({
      roleCode: record.roleCode,
      roleName: record.roleName,
    });
    setModalVisible(true);
  };

  const handleSetPermissions = (record: RolePermission) => {
    setCurrentRole(record);
    setSelectedPermissions(record.permissionIds || []);
    setPermissionModalVisible(true);
  };

  const handleDelete = async (roleCode: string) => {
    try {
      const response = await apiClient.delete(`/api/permissions/roles/${roleCode}`);
      if (response.data.ok) {
        message.success('删除成功');
        loadData();
      } else {
        message.error(response.data.error || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (!isEditing && roles.some(r => r.roleCode === values.roleCode)) {
        message.error('角色编码已存在');
        return;
      }

      const roleCode = isEditing ? currentRole!.roleCode : values.roleCode;
      const response = await apiClient.post(`/api/permissions/roles/${roleCode}`, {
        roleName: values.roleName,
        permissionIds: isEditing ? currentRole!.permissionIds : [],
      });

      if (response.data.ok) {
        message.success(isEditing ? '更新成功' : '创建成功');
        setModalVisible(false);
        loadData();
      } else {
        message.error(response.data.error || '操作失败');
      }
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('操作失败');
    }
  };

  const handleSavePermissions = async (checkedKeys: number[]) => {
    if (!currentRole) return;

    const response = await apiClient.post(
      `/api/permissions/roles/${currentRole.roleCode}`,
      {
        roleName: currentRole.roleName,
        permissionIds: checkedKeys,
      }
    );

    if (!response.data.ok) {
      throw new Error(response.data.error || '保存失败');
    }

    await loadData();
  };

  const columns: ColumnsType<RolePermission> = [
    {
      title: '角色编码',
      dataIndex: 'roleCode',
      key: 'roleCode',
      width: 150,
    },
    {
      title: '角色名称',
      dataIndex: 'roleName',
      key: 'roleName',
      width: 200,
    },
    {
      title: '权限数量',
      dataIndex: 'permissionIds',
      key: 'permissionIds',
      width: 120,
      render: (ids: number[]) => (
        <Tag color="blue">{ids?.length || 0} 项</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 250,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<KeyOutlined />}
            onClick={() => handleSetPermissions(record)}
          >
            设置权限
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此角色吗？"
            onConfirm={() => handleDelete(record.roleCode)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="角色权限管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增角色
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={roles}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 新增/编辑角色对话框 */}
      <Modal
        title={isEditing ? '编辑角色' : '新增角色'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="roleCode"
            label="角色编码"
            rules={[
              { required: true, message: '请输入角色编码' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字和下划线' },
            ]}
          >
            <Input placeholder="如：sales, finance, manager" disabled={isEditing} />
          </Form.Item>
          <Form.Item
            name="roleName"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="如：业务员、财务、经理" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 设置权限对话框 */}
      <Modal
        title={`设置权限 - ${currentRole?.roleName}`}
        open={permissionModalVisible}
        onCancel={() => setPermissionModalVisible(false)}
        footer={null}
        width={900}
        bodyStyle={{ height: '70vh', padding: 0 }}
      >
        <PermissionTree
          permissions={permissions}
          checkedKeys={selectedPermissions}
          onChange={setSelectedPermissions}
          onSave={handleSavePermissions}
          onClose={() => setPermissionModalVisible(false)}
        />
      </Modal>
    </div>
  );
};

export default RolePermissionManager;
