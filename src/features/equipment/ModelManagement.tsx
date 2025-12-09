import React, { useEffect, useState } from 'react';
import { Button, Card, Table, Modal, Form, Input, Select, Row, Col, message, Typography, InputNumber } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

// 型号数据结构
interface EquipmentModel {
  id: string;
  category: string; // 设备类别
  brand: string;    // 品牌
  model: string;    // 型号
  type: string;     // 设备类型
  height: number;   // 高度（米）
  driveType: string; // 驱动类型
  createdAt: string;
  updatedAt: string;
}

// 下拉选项配置
const EQUIPMENT_CATEGORIES = [
  '高空车',
  '叉车',
  '吊车',
  '车载高空车',
];

const EQUIPMENT_TYPES = [
  '剪叉车',
  '曲臂车',
  '直臂车',
  '履带剪叉',
  '套筒车',
  '蜘蛛车',
  '吸盘车',
];

const DRIVE_TYPES = [
  '电驱',
  '油动',
  '液驱',
];

const ModelManagement: React.FC = () => {
  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  // 新增：编辑状态与当前记录
  const [isEditing, setIsEditing] = useState(false);
  const [currentModel, setCurrentModel] = useState<EquipmentModel | null>(null);

  const columns: ColumnsType<EquipmentModel> = [
    { title: '设备类别', dataIndex: 'category', key: 'category', width: 120 },
    { title: '品牌', dataIndex: 'brand', key: 'brand', width: 120 },
    { title: '型号', dataIndex: 'model', key: 'model', width: 140 },
    { title: '设备类型', dataIndex: 'type', key: 'type', width: 140 },
    { title: '高度(米)', dataIndex: 'height', key: 'height', width: 120 },
    { title: '驱动类型', dataIndex: 'driveType', key: 'driveType', width: 120 },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 180 },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 12 }}>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => confirmDelete(record.id)}>删除</Button>
        </div>
      ),
    },
  ];

  // 加载数据函数保持不变
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiGet<EquipmentModel[]>('/models');
      setModels(data);
    } catch (err: any) {
      message.error(err?.message || '加载型号列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    // 打开新增弹窗
    setIsEditing(false);
    setCurrentModel(null);
    setIsModalOpen(true);
  };

  // 新增：打开编辑弹窗
  const openEditModal = (record: EquipmentModel) => {
    setIsEditing(true);
    setCurrentModel(record);
    setIsModalOpen(true);
  };

  // 新增：保存（新增或更新）
  const handleSaveModel = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        category: values.category,
        brand: values.brand.trim(),
        model: values.model.trim(),
        type: values.type,
        height: Number(values.height),
        driveType: values.driveType,
      };

      if (isEditing && currentModel?.id) {
        await apiPut(`/models/${currentModel.id}`, payload);
        message.success('更新型号成功');
      } else {
        await apiPost('/models', payload);
        message.success('新增型号成功');
      }

      setIsModalOpen(false);
      setIsEditing(false);
      setCurrentModel(null);
      loadData();
    } catch (e: any) {
      if (e?.message) message.error(e.message);
    }
  };

  // 新增：删除型号
  const confirmDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除该型号？',
      content: '删除后不可恢复，请谨慎操作。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await apiDelete(`/models/${id}`);
          message.success('删除成功');
          loadData();
        } catch (e: any) {
          message.error(e?.message || '删除失败');
        }
      },
    });
  };

  return (
    <div style={{ padding: 16 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>型号管理</Title>
          <Button type="primary" onClick={openAddModal}>新增型号</Button>
        </div>
        <Table
          style={{ marginTop: 16 }}
          rowKey="id"
          columns={columns}
          dataSource={models}
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1100 }}
        />
      </Card>

      <Modal
        title={isEditing ? '编辑型号' : '新增型号'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSaveModel}
        okText="保存"
        cancelText="取消"
        width={720}
        destroyOnHidden
        afterOpenChange={(open) => {
          if (open) {
            if (isEditing && currentModel) {
              form.setFieldsValue({
                category: currentModel.category,
                brand: currentModel.brand,
                model: currentModel.model,
                type: currentModel.type,
                height: currentModel.height,
                driveType: currentModel.driveType,
              });
            } else {
              form.resetFields();
            }
          }
        }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{}}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="设备类别"
                rules={[{ required: true, message: '请选择设备类别' }]}
              >
                <Select placeholder="请选择设备类别" allowClear>
                  {EQUIPMENT_CATEGORIES.map(c => (
                    <Option key={c} value={c}>{c}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="brand"
                label="品牌"
                rules={[
                  { required: true, message: '请输入品牌' },
                  { whitespace: true, message: '品牌不能仅为空格' },
                  { max: 50, message: '品牌长度不应超过50字符' },
                ]}
              >
                <Input placeholder="请输入品牌" allowClear />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="model"
                label="型号"
                rules={[
                  { required: true, message: '请输入型号' },
                  { whitespace: true, message: '型号不能仅为空格' },
                  { max: 50, message: '型号长度不应超过50字符' },
                ]}
              >
                <Input placeholder="请输入型号" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="设备类型"
                rules={[{ required: true, message: '请选择设备类型' }]}
              >
                <Select placeholder="请选择设备类型" allowClear>
                  {EQUIPMENT_TYPES.map(t => (
                    <Option key={t} value={t}>{t}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="height"
                label="高度（米）"
                rules={[
                  { required: true, message: '请输入高度' },
                  {
                    validator: (_rule, value) => {
                      const n = Number(value);
                      if (!Number.isFinite(n)) return Promise.reject('高度必须为数字');
                      if (n <= 0) return Promise.reject('高度必须为正数');
                      if (n > 200) return Promise.reject('高度不应超过200米');
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={1} max={200} precision={0} placeholder="请输入高度（米）" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="driveType"
                label="驱动类型"
                rules={[{ required: true, message: '请选择驱动类型' }]}
              >
                <Select placeholder="请选择驱动类型" allowClear>
                  {DRIVE_TYPES.map(d => (
                    <Option key={d} value={d}>{d}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default ModelManagement;