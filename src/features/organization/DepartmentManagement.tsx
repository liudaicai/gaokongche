/**
 * 部门管理页面
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  TreeSelect,
  InputNumber,
  Switch,
  App,
  Tag,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  ShopOutlined,
  BankOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';

interface Department {
  id: number;
  name: string;
  code: string;
  parent_id: number | null;
  type: string;
  manager_id: number | null;
  manager_name: string;
  phone: string;
  email: string;
  address: string;
  sort_order: number;
  is_active: boolean;
  description: string;
  employee_count: number;
  children_count: number;
}

export const DepartmentManagement: React.FC = () => {
  const { message } = App.useApp();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const [form] = Form.useForm();

  // 加载部门列表
  const loadDepartments = async () => {
    setLoading(true);
    try {
      const data = await apiGet('/departments');
      setDepartments(data);
    } catch (error: any) {
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载用户列表（用于选择负责人）
  const loadUsers = async () => {
    try {
      const data = await apiGet('/approval-config/users');
      setUsers(data);
    } catch (error: any) {
      console.error('加载用户失败:', error);
    }
  };

  useEffect(() => {
    loadDepartments();
    loadUsers();
  }, []);

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingDept(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 打开编辑弹窗
  const handleEdit = (record: Department) => {
    setEditingDept(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  // 保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (editingDept) {
        // 更新
        await apiPut(`/departments/${editingDept.id}`, values);
        message.success('部门更新成功');
      } else {
        // 新增
        await apiPost('/departments', values);
        message.success('部门创建成功');
      }

      setModalVisible(false);
      loadDepartments();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  // 删除
  const handleDelete = async (id: number) => {
    try {
      await apiDelete(`/departments/${id}`);
      message.success('部门删除成功');
      loadDepartments();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  // 部门类型映射
  const typeMap: Record<string, { text: string; icon: any; color: string }> = {
    headquarters: { text: '总部', icon: <BankOutlined />, color: 'red' },
    branch: { text: '分公司', icon: <BankOutlined />, color: 'orange' },
    store: { text: '门店', icon: <ShopOutlined />, color: 'blue' },
    department: { text: '部门', icon: <TeamOutlined />, color: 'green' },
  };

  const columns: ColumnsType<Department> = [
    {
      title: '部门名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '部门编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const info = typeMap[type] || { text: type, icon: null, color: 'default' };
        return (
          <Tag icon={info.icon} color={info.color}>
            {info.text}
          </Tag>
        );
      },
    },
    {
      title: '负责人',
      dataIndex: 'manager_name',
      key: 'manager_name',
      width: 120,
      render: (name: string) => name || '-',
    },
    {
      title: '人员数量',
      dataIndex: 'employee_count',
      key: 'employee_count',
      width: 100,
      align: 'center',
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>{count}人</Tag>
      ),
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      render: (phone: string) => phone || '-',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      align: 'center',
      render: (active: boolean) =>
        active ? (
          <Tag color="success">启用</Tag>
        ) : (
          <Tag color="default">禁用</Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as 'right',
      width: 150,
      render: (_, record: Department) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个部门吗？"
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
        </Space>
      ),
    },
  ];

  // 构建上级部门选项
  const parentDeptOptions = departments
    .filter((d) => !editingDept || d.id !== editingDept.id)
    .map((d) => ({
      label: d.name,
      value: d.id,
    }));

  return (
    <Card
      title={
        <Space>
          <TeamOutlined />
          部门管理
        </Space>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增部门
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={departments}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1200 }}
      />

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingDept ? '编辑部门' : '新增部门'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="部门名称"
            name="name"
            rules={[{ required: true, message: '请输入部门名称' }]}
          >
            <Input placeholder="如：业务部" />
          </Form.Item>

          <Form.Item label="部门编码" name="code">
            <Input placeholder="如：SALES" />
          </Form.Item>

          <Form.Item label="部门类型" name="type">
            <Select
              options={[
                { label: '🏢 总部', value: 'headquarters' },
                { label: '🏢 分公司', value: 'branch' },
                { label: '🏪 门店', value: 'store' },
                { label: '👥 部门', value: 'department' },
              ]}
            />
          </Form.Item>

          <Form.Item label="上级部门" name="parent_id">
            <Select
              allowClear
              placeholder="选择上级部门（可选）"
              options={parentDeptOptions}
            />
          </Form.Item>

          <Form.Item label="部门负责人" name="manager_id">
            <Select
              allowClear
              showSearch
              placeholder="选择负责人（可选）"
              filterOption={(input, option: any) =>
                option?.label?.toLowerCase().includes(input.toLowerCase())
              }
              options={users.map((u) => ({
                label: `${u.name} (${u.username})`,
                value: u.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="联系电话" name="phone">
            <Input placeholder="部门电话" />
          </Form.Item>

          <Form.Item label="邮箱" name="email">
            <Input type="email" placeholder="部门邮箱" />
          </Form.Item>

          <Form.Item label="地址" name="address">
            <Input.TextArea rows={2} placeholder="部门地址" />
          </Form.Item>

          <Form.Item label="排序号" name="sort_order">
            <InputNumber min={0} placeholder="数字越小越靠前" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="部门描述" name="description">
            <Input.TextArea rows={3} placeholder="部门职责和描述" />
          </Form.Item>

          <Form.Item label="状态" name="is_active" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default DepartmentManagement;
