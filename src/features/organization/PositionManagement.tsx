/**
 * 职务管理页面
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
  InputNumber,
  Switch,
  App,
  Tag,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';

interface Position {
  id: number;
  name: string;
  code: string;
  level: number;
  category: string;
  department_id: number | null;
  can_approve: boolean;
  approval_level: number;
  description: string;
  responsibilities: string;
  sort_order: number;
  is_active: boolean;
  employee_count: number;
}

export const PositionManagement: React.FC = () => {
  const { message } = App.useApp();
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);

  const [form] = Form.useForm();

  // 加载职务列表
  const loadPositions = async () => {
    setLoading(true);
    try {
      const data = await apiGet('/positions');
      setPositions(data);
    } catch (error: any) {
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载部门列表
  const loadDepartments = async () => {
    try {
      const data = await apiGet('/departments');
      setDepartments(data);
    } catch (error: any) {
      console.error('加载部门失败:', error);
    }
  };

  useEffect(() => {
    loadPositions();
    loadDepartments();
  }, []);

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingPosition(null);
    form.resetFields();
    form.setFieldsValue({
      level: 3,
      category: 'staff',
      can_approve: false,
      approval_level: 0,
      sort_order: 0,
      is_active: true,
    });
    setModalVisible(true);
  };

  // 打开编辑弹窗
  const handleEdit = (record: Position) => {
    setEditingPosition(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  // 保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (editingPosition) {
        // 更新
        await apiPut(`/positions/${editingPosition.id}`, values);
        message.success('职务更新成功');
      } else {
        // 新增
        await apiPost('/positions', values);
        message.success('职务创建成功');
      }

      setModalVisible(false);
      loadPositions();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  // 删除
  const handleDelete = async (id: number) => {
    try {
      await apiDelete(`/positions/${id}`);
      message.success('职务删除成功');
      loadPositions();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  // 职务类别映射
  const categoryMap: Record<string, { text: string; color: string }> = {
    leadership: { text: '领导', color: 'red' },
    management: { text: '管理', color: 'orange' },
    staff: { text: '员工', color: 'blue' },
    other: { text: '其他', color: 'default' },
  };

  const columns: ColumnsType<Position> = [
    {
      title: '职务名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '职务编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '职级',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      align: 'center',
      render: (level: number) => (
        <Tag color="blue" style={{ fontSize: 14, fontWeight: 'bold' }}>
          Lv.{level}
        </Tag>
      ),
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => {
        const info = categoryMap[category] || { text: category, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '审批权限',
      key: 'approve',
      width: 120,
      render: (_, record: Position) =>
        record.can_approve ? (
          <Tooltip title={`审批级别: ${record.approval_level}`}>
            <Tag icon={<SafetyCertificateOutlined />} color="green">
              有审批权
            </Tag>
          </Tooltip>
        ) : (
          <Tag color="default">无审批权</Tag>
        ),
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
      render: (_, record: Position) => (
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
            title="确定删除这个职务吗？"
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

  return (
    <Card
      title={
        <Space>
          <UserOutlined />
          职务管理
        </Space>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增职务
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={positions}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1200 }}
      />

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingPosition ? '编辑职务' : '新增职务'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="职务名称"
            name="name"
            rules={[{ required: true, message: '请输入职务名称' }]}
          >
            <Input placeholder="如：部门经理" />
          </Form.Item>

          <Form.Item label="职务编码" name="code">
            <Input placeholder="如：MANAGER" />
          </Form.Item>

          <Form.Item
            label="职级（1-10）"
            name="level"
            rules={[{ required: true, message: '请设置职级' }]}
            tooltip="数字越大职级越高，用于审批流程判断"
          >
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="职务类别"
            name="category"
            rules={[{ required: true, message: '请选择职务类别' }]}
          >
            <Select
              options={[
                { label: '🔴 领导', value: 'leadership' },
                { label: '🟠 管理', value: 'management' },
                { label: '🔵 员工', value: 'staff' },
                { label: '⚪ 其他', value: 'other' },
              ]}
            />
          </Form.Item>

          <Form.Item label="所属部门" name="department_id" tooltip="留空表示通用职务">
            <Select
              allowClear
              placeholder="选择部门（可选）"
              options={departments.map((d) => ({
                label: d.name,
                value: d.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="审批权限" name="can_approve" valuePropName="checked">
            <Switch checkedChildren="有审批权" unCheckedChildren="无审批权" />
          </Form.Item>

          <Form.Item
            label="审批级别"
            name="approval_level"
            tooltip="数字越大，审批权限越高"
          >
            <InputNumber min={0} max={10} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="职务描述" name="description">
            <Input.TextArea rows={2} placeholder="职务说明" />
          </Form.Item>

          <Form.Item label="岗位职责" name="responsibilities">
            <Input.TextArea rows={3} placeholder="具体职责描述" />
          </Form.Item>

          <Form.Item label="排序号" name="sort_order">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="状态" name="is_active" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default PositionManagement;
