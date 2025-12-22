/**
 * Word模板管理组件
 * 支持上传、列表、生成Word文档
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Upload,
  Space,
  Popconfirm,
  message,
  Tag,
  Tooltip,
  Modal,
  Form,
  Select,
  Typography,
  Divider,
  App
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FileWordOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiGet, apiPost, apiDelete } from '../../api/client';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface WordTemplate {
  filename: string;
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
}

interface GenerateModalProps {
  visible: boolean;
  templateName: string;
  onCancel: () => void;
  onSuccess: () => void;
}

// 生成文档模态框
const GenerateModal: React.FC<GenerateModalProps> = ({
  visible,
  templateName,
  onCancel,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      // 加载订单列表
      loadOrders();
    }
  }, [visible]);

  const loadOrders = async () => {
    try {
      const res = await apiGet('/api/orders');
      if (res.ok) {
        setOrders(res.data || []);
      }
    } catch (error) {
      console.error('加载订单列表失败:', error);
    }
  };

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const response = await fetch('/api/word-templates/generate-order/' + values.orderId, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          templateType: values.templateType,
          templateName
        })
      });

      if (!response.ok) {
        throw new Error('生成失败');
      }

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateName}_${Date.now()}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success('文档生成成功！');
      onSuccess();
      form.resetFields();
    } catch (error: any) {
      message.error('生成失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`使用模板：${templateName}`}
      open={visible}
      onCancel={onCancel}
      onOk={handleGenerate}
      confirmLoading={loading}
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="选择订单"
          name="orderId"
          rules={[{ required: true, message: '请选择订单' }]}
        >
          <Select
            showSearch
            placeholder="请选择订单"
            optionFilterProp="children"
            filterOption={(input, option: any) =>
              (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {orders.map(order => (
              <Option key={order.id} value={order.id}>
                {order.order_number} - {order.project_name || '未命名项目'}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="文档类型"
          name="templateType"
          initialValue="contract"
        >
          <Select>
            <Option value="contract">租赁合同</Option>
            <Option value="entry">进场单</Option>
            <Option value="exit">退场单</Option>
            <Option value="settlement">结算单</Option>
          </Select>
        </Form.Item>

        <Divider />

        <Paragraph type="secondary">
          <ExclamationCircleOutlined /> 提示：系统将自动填充订单相关数据到模板中
        </Paragraph>
      </Form>
    </Modal>
  );
};

const WordTemplateManagement: React.FC = () => {
  const { message } = App.useApp();
  const [templates, setTemplates] = useState<WordTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await apiGet('/api/word-templates');
      if (res.ok) {
        setTemplates(res.data || []);
      }
    } catch (error) {
      message.error('加载模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/word-templates/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.ok) {
        message.success('模板上传成功！');
        loadTemplates();
      } else {
        message.error(result.error || '上传失败');
      }
    } catch (error: any) {
      message.error('上传失败：' + error.message);
    } finally {
      setUploading(false);
    }

    return false; // 阻止自动上传
  };

  const handleDelete = async (name: string) => {
    try {
      const res = await apiDelete(`/api/word-templates/${name}`);
      if (res.ok) {
        message.success('模板已删除');
        loadTemplates();
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleGenerate = (templateName: string) => {
    setSelectedTemplate(templateName);
    setGenerateModalVisible(true);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const columns: ColumnsType<WordTemplate> = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <FileWordOutlined style={{ color: '#2b579a' }} />
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      render: (text) => <Text type="secondary">{text}</Text>
    },
    {
      title: '文件大小',
      dataIndex: 'size',
      key: 'size',
      render: (size) => formatFileSize(size)
    },
    {
      title: '修改时间',
      dataIndex: 'modifiedAt',
      key: 'modifiedAt',
      render: (date) => new Date(date).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="生成文档">
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => handleGenerate(record.name)}
            >
              生成
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定删除此模板？"
            onConfirm={() => handleDelete(record.name)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <FileWordOutlined style={{ fontSize: 24, color: '#2b579a' }} />
            <Title level={4} style={{ margin: 0 }}>Word模板管理</Title>
          </Space>
        }
        extra={
          <Upload
            beforeUpload={handleUpload}
            accept=".docx"
            showUploadList={false}
          >
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploading}
            >
              上传Word模板
            </Button>
          </Upload>
        }
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Paragraph>
              <CheckCircleOutlined style={{ color: '#52c41a' }} /> 
              {' '}支持上传 .docx 格式的Word文档作为模板
            </Paragraph>
            <Paragraph>
              <CheckCircleOutlined style={{ color: '#52c41a' }} /> 
              {' '}在Word中使用 <Tag color="blue">{'{{变量名}}'}</Tag> 标记动态数据
            </Paragraph>
            <Paragraph>
              <CheckCircleOutlined style={{ color: '#52c41a' }} /> 
              {' '}支持循环：<Tag color="blue">{'{{#each 列表名}}...{{/each}}'}</Tag>
            </Paragraph>
            <Paragraph type="secondary">
              示例：<Text code>{'{{customerName}}'}</Text>, <Text code>{'{{totalAmount}}'}</Text>, 
              <Text code>{'{{#each equipments}}{{code}}{{/each}}'}</Text>
            </Paragraph>
          </div>

          <Divider />

          <Table
            columns={columns}
            dataSource={templates}
            rowKey="filename"
            loading={loading}
            pagination={false}
          />
        </Space>
      </Card>

      <GenerateModal
        visible={generateModalVisible}
        templateName={selectedTemplate}
        onCancel={() => setGenerateModalVisible(false)}
        onSuccess={() => {
          setGenerateModalVisible(false);
          loadTemplates();
        }}
      />
    </div>
  );
};

export default WordTemplateManagement;
