import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  App,
  Tag,
  Select,
  Switch,
  Alert,
} from 'antd';
import { KeyOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '../../api/client';
import PermissionTree from './PermissionTree';
import type { Permission } from './types';

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  email?: string;
}

interface UserWithPermission extends User {
  hasCustomPermission: boolean;
  permissionCount: number;
  isOverride: boolean;
}

const UserPermissionManager: React.FC = () => {
  const { message } = App.useApp();
  const [users, setUsers] = useState<UserWithPermission[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserWithPermission | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [isOverride, setIsOverride] = useState(false);

  useEffect(() => {
    loadData();
    loadPermissions();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // 获取用户列表
      const usersResponse = await apiClient.get('/users');
      
      console.log('[UserPermissionManager] API 响应:', usersResponse.data);
      
      if (!usersResponse.data.ok) {
        throw new Error(usersResponse.data.error || '获取用户列表失败');
      }

      const usersList = usersResponse.data.data;
      
      // 验证数据格式
      if (!Array.isArray(usersList)) {
        console.error('[UserPermissionManager] usersList 不是数组:', usersList);
        throw new Error('用户列表数据格式错误');
      }

      // 为每个用户获取权限信息
      const usersWithPermissions = await Promise.all(
        usersList.map(async (user: User) => {
          try {
            const permResponse = await apiClient.get(`/permissions/users/${user.id}`);
            const userPerm = permResponse.data.data;
            
            return {
              ...user,
              hasCustomPermission: !!userPerm,
              permissionCount: userPerm?.permissionIds?.length || 0,
              isOverride: userPerm?.isOverride || false,
            };
          } catch (error) {
            return {
              ...user,
              hasCustomPermission: false,
              permissionCount: 0,
              isOverride: false,
            };
          }
        })
      );

      setUsers(usersWithPermissions);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await apiClient.get('/permissions/definitions');
      if (response.data.ok) {
        setPermissions(response.data.data);
      }
    } catch (error) {
      console.error('获取权限定义失败:', error);
    }
  };

  const handleSetPermissions = async (user: UserWithPermission) => {
    try {
      setCurrentUser(user);
      
      // 获取用户当前权限
      const response = await apiClient.get(`/permissions/users/${user.id}`);
      if (response.data.ok && response.data.data) {
        setSelectedPermissions(response.data.data.permissionIds || []);
        setIsOverride(response.data.data.isOverride || false);
      } else {
        // 如果没有个人权限，获取角色权限作为默认值
        const effectiveResponse = await apiClient.get(
          `/permissions/users/${user.id}/effective`
        );
        if (effectiveResponse.data.ok) {
          setSelectedPermissions(effectiveResponse.data.data.permissionIds || []);
          setIsOverride(false);
        }
      }
      
      setPermissionModalVisible(true);
    } catch (error) {
      message.error('获取用户权限失败');
    }
  };

  const handleDeletePermissions = async (userId: number) => {
    try {
      const response = await apiClient.delete(`/permissions/users/${userId}`);
      if (response.data.ok) {
        message.success('已删除个人权限设置，恢复使用角色权限');
        loadData();
      } else {
        message.error(response.data.error || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSavePermissions = async (checkedKeys: number[]) => {
    if (!currentUser) return;

    const response = await apiClient.post(
      `/permissions/users/${currentUser.id}`,
      {
        permissionIds: checkedKeys,
        isOverride,
      }
    );

    if (!response.data.ok) {
      throw new Error(response.data.error || '保存失败');
    }

    await loadData();
  };

  const columns: ColumnsType<UserWithPermission> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 150,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role) => {
        const roleMap: Record<string, { text: string; color: string }> = {
          admin: { text: '管理员', color: 'red' },
          manager: { text: '经理', color: 'orange' },
          sales: { text: '业务员', color: 'blue' },
          finance: { text: '财务', color: 'green' },
          service: { text: '客服', color: 'cyan' },
        };
        const config = roleMap[role] || { text: role, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '权限设置',
      key: 'permissionStatus',
      width: 150,
      render: (_, record) => {
        if (!record.hasCustomPermission) {
          return <Tag color="default">使用角色权限</Tag>;
        }
        if (record.isOverride) {
          return <Tag color="orange">个人权限（覆盖）</Tag>;
        }
        return <Tag color="blue">个人权限（合并）</Tag>;
      },
    },
    {
      title: '权限数量',
      dataIndex: 'permissionCount',
      key: 'permissionCount',
      width: 120,
      render: (count, record) => {
        if (!record.hasCustomPermission) {
          return <span style={{ color: '#999' }}>-</span>;
        }
        return <Tag color="blue">{count} 项</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 200,
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
          {record.hasCustomPermission && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: '确定要删除个人权限设置吗？',
                  content: '删除后该用户将使用角色默认权限',
                  onOk: () => handleDeletePermissions(record.id),
                });
              }}
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card title="用户权限管理">
        <Alert
          message="说明"
          description={
            <div>
              <p>• 默认情况下，用户使用其角色的权限</p>
              <p>• 可以为特定用户设置个人权限</p>
              <p>• 覆盖模式：个人权限完全替代角色权限</p>
              <p>• 合并模式：个人权限与角色权限合并（取并集）</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 设置权限对话框 */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            <span>设置权限 - {currentUser?.name}</span>
          </Space>
        }
        open={permissionModalVisible}
        onCancel={() => setPermissionModalVisible(false)}
        footer={null}
        width={900}
        styles={{ body: { height: '70vh', padding: 0 } }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
          <Space align="center">
            <span>权限模式：</span>
            <Switch
              checked={isOverride}
              onChange={setIsOverride}
              checkedChildren="覆盖"
              unCheckedChildren="合并"
            />
            <span style={{ color: '#999', fontSize: 12 }}>
              {isOverride
                ? '（使用个人权限，忽略角色权限）'
                : '（个人权限与角色权限合并）'}
            </span>
          </Space>
        </div>
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

export default UserPermissionManager;
