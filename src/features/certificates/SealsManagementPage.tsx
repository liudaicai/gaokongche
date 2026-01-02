import React, { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, message, Space,
  Card, Statistic, Row, Col, Tag, Upload, Image, Switch, Tooltip
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined,
  SafetyOutlined, EyeOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { apiGet, apiPost, apiPut, apiDelete, API_BASE, getAuthHeaders } from '../../api/client';

const { Option } = Select;
const { TextArea } = Input;

const SealsManagementPage: React.FC = () => {
  const [seals, setSeals] = useState([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({ search: '', type: '', isActive: '' });
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]); // 公司列表

  // 获取完整图片URL
  const getImageUrl = (url: string) => {
    if (!url) return '';
    // 如果URL已经是以 /uploads 开头，直接返回（静态文件服务器路径）
    if (url.startsWith('/uploads')) {
      return url;
    }
    // 否则拼接 API_BASE
    return `${API_BASE}${url}`;
  };

  // 加载印章列表
  const loadSeals = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...filters
      });
      const response = await apiGet<any>(`/seals?${params}`);
      setSeals(response.data || []);
      setPagination({
        current: page,
        pageSize,
        total: response.pagination?.total || 0
      });
    } catch (err: any) {
      message.error(err?.message || '加载印章列表失败');
      setSeals([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载统计信息
  const loadStats = async () => {
    try {
      const response = await apiGet<any>('/seals/stats');
      setStats(response.data || {});
    } catch (err: any) {
      console.error('加载统计失败:', err);
      setStats({ total: 0, activeCount: 0, inactiveCount: 0, totalUsage: 0 });
    }
  };

  // 加载印章类型
  const loadTypes = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ea6be235-0d47-4460-9a53-426650f4adda',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SealsManagementPage.tsx:78',message:'[A] loadTypes函数开始执行',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      const response = await apiGet<any>('/seals/types');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ea6be235-0d47-4460-9a53-426650f4adda',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SealsManagementPage.tsx:80',message:'[A][D] /seals/types API响应',data:{response:response,isArray:Array.isArray(response),length:response?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,D'})}).catch(()=>{});
      // #endregion
      setTypes(response || []);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ea6be235-0d47-4460-9a53-426650f4adda',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SealsManagementPage.tsx:81',message:'[C] setTypes执行后',data:{typesSet:response||[],count:(response||[]).length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ea6be235-0d47-4460-9a53-426650f4adda',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SealsManagementPage.tsx:83',message:'[A] loadTypes失败',data:{error:err?.message,fullError:String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error('加载类型失败:', err);
      setTypes([]);
    }
  };

  // 加载公司主体列表（租户自己的公司）
  const loadCompanies = async () => {
    try {
      const response = await apiGet<any>('/tenant-companies');
      console.log('[印章管理] 加载公司主体列表:', response);
      
      // 处理响应数据格式（可能是数组或 { data: [] }）
      const companies = Array.isArray(response) ? response : (response?.data || []);
      setCompanies(companies);
      
      if (companies.length === 0) {
        message.warning('暂无公司主体数据，请先在"门店管理 > 公司认证"中添加');
      }
    } catch (err: any) {
      console.error('[印章管理] 加载公司主体列表失败:', err);
      message.error('加载公司主体列表失败: ' + (err?.message || '未知错误'));
      setCompanies([]);
    }
  };

  useEffect(() => {
    loadSeals(1, 10);
    loadStats();
    loadTypes();
    loadCompanies();
  }, []);

  // 打开新增/编辑模态框
  const showModal = (record?: any) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue({
        name: record.name,
        companyId: record.company_id,
        type: record.type,
        description: record.description,
        isActive: record.isActive
      });
      if (record.image_url) {
        setFileList([{
          uid: '-1',
          name: 'current-seal.png',
          status: 'done',
          url: getImageUrl(record.image_url)
        } as UploadFile]);
      }
    } else {
      setEditingId(null);
      form.resetFields();
      form.setFieldsValue({
        type: 'official',
        isActive: true
      });
      setFileList([]);
    }
    setModalVisible(true);
  };

  // 处理文件上传
  const handleUploadChange = (info: any) => {
    let newFileList = [...info.fileList];
    newFileList = newFileList.slice(-1); // 只保留最后一个文件
    
    // 处理响应数据格式
    if (newFileList[0]?.response?.ok) {
      newFileList[0].response = newFileList[0].response.data;
    }
    
    setFileList(newFileList);

    if (info.file.status === 'done') {
      message.success('上传成功');
    } else if (info.file.status === 'error') {
      message.error(info.file.response?.error || '上传失败');
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 检查是否上传了图片
      if (fileList.length === 0 || fileList[0].status !== 'done') {
        message.error('请上传印章图片');
        return;
      }

      // 获取图片URL（如果是上传返回的response，直接用；如果是已有的URL，需要处理）
      let imageUrl = fileList[0].response?.url;
      if (!imageUrl && fileList[0].url) {
        // 处理已有URL：移除可能的域名和API_BASE前缀
        imageUrl = fileList[0].url.replace(/^https?:\/\/[^\/]+/, '').replace(API_BASE, '');
      }
      const payload = {
        ...values,
        imageUrl,
        imageWidth: fileList[0].response?.width,
        imageHeight: fileList[0].response?.height,
        fileSize: fileList[0].size,
        format: fileList[0].response?.mimetype?.split('/')[1]?.toUpperCase() || 'PNG'
      };

      if (editingId) {
        await apiPut(`/seals/${editingId}`, payload);
        message.success('更新成功');
      } else {
        await apiPost('/seals', payload);
        message.success('创建成功');
      }

      setModalVisible(false);
      loadSeals(pagination.current, pagination.pageSize);
      loadStats();
    } catch (err: any) {
      if (err.errorFields) {
        return; // 表单验证错误
      }
      message.error(err?.message || '操作失败');
    }
  };

  // 删除印章
  const handleDelete = async (id: number) => {
    try {
      await apiDelete(`/seals/${id}`);
      message.success('删除成功');
      loadSeals(pagination.current, pagination.pageSize);
      loadStats();
    } catch (err: any) {
      message.error(err?.message || '删除失败');
    }
  };

  // 切换启用状态
  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await apiPut(`/seals/${id}`, { isActive: !isActive });
      message.success(isActive ? '已禁用' : '已启用');
      loadSeals(pagination.current, pagination.pageSize);
      loadStats();
    } catch (err: any) {
      message.error(err?.message || '操作失败');
    }
  };

  // 预览图片
  const handlePreview = (imageUrl: string) => {
    setPreviewImage(getImageUrl(imageUrl));
    setPreviewVisible(true);
  };

  // 印章类型标签颜色
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      official: 'red',
      finance: 'blue',
      hr: 'green',
      equipment: 'orange'
    };
    return colors[type] || 'default';
  };

  // 印章类型名称
  const getTypeName = (type: string) => {
    const typeObj = types.find(t => t.value === type);
    return typeObj?.label || type;
  };

  // 表格列定义
  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: '印章预览',
      dataIndex: 'image_url',
      key: 'image_url',
      width: 100,
      render: (url: string) => (
        <Image
          src={getImageUrl(url)}
          width={60}
          height={60}
          style={{ objectFit: 'contain', cursor: 'pointer' }}
          preview={{
            mask: <EyeOutlined />
          }}
        />
      ),
    },
    {
      title: '印章名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '所属公司',
      dataIndex: 'company_name',
      key: 'company_name',
      width: 150,
      render: (text: string) => text || '-',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>{getTypeName(type)}</Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      width: 80,
    },
    {
      title: '使用次数',
      dataIndex: 'usage_count',
      key: 'usage_count',
      width: 100,
      sorter: (a: any, b: any) => a.usage_count - b.usage_count,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean, record: any) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleActive(record.id, isActive)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="预览">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record.image_url)}
            />
          </Tooltip>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: '确定删除此印章？',
                icon: <ExclamationCircleOutlined />,
                content: '删除后将无法恢复',
                okText: '确定',
                cancelText: '取消',
                onOk: () => handleDelete(record.id)
              });
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ display: 'inline-block', marginBottom: 8 }}>
          <SafetyOutlined /> 印章管理
        </h1>
        <div style={{ color: '#666', fontSize: 14 }}>
          印章按公司区分管理，每个公司只能查看和使用自己的印章
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="印章总数" value={stats.total || 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="启用中" value={stats.activeCount || 0} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已禁用" value={stats.inactiveCount || 0} valueStyle={{ color: '#999' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总使用次数" value={stats.totalUsage || 0} />
          </Card>
        </Col>
      </Row>

      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
            新增印章
          </Button>
          <Input
            placeholder="搜索印章名称"
            style={{ width: 200 }}
            onPressEnter={(e) => {
              const value = (e.target as HTMLInputElement).value;
              setFilters({ ...filters, search: value });
              loadSeals(1, pagination.pageSize);
            }}
            allowClear
          />
          <Select
            placeholder="筛选类型"
            style={{ width: 120 }}
            allowClear
            onChange={(value) => {
              setFilters({ ...filters, type: value || '' });
              loadSeals(1, pagination.pageSize);
            }}
          >
            {types.map(type => (
              <Option key={type.value} value={type.value}>{type.label}</Option>
            ))}
          </Select>
          <Select
            placeholder="筛选状态"
            style={{ width: 120 }}
            allowClear
            onChange={(value) => {
              setFilters({ ...filters, isActive: value || '' });
              loadSeals(1, pagination.pageSize);
            }}
          >
            <Option value="true">启用</Option>
            <Option value="false">禁用</Option>
          </Select>
        </Space>
      </Card>

      {/* 印章列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={seals}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={(newPagination) => {
            loadSeals(newPagination.current || 1, newPagination.pageSize || 10);
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingId ? '编辑印章' : '新增印章'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText="确认"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="印章名称"
            rules={[{ required: true, message: '请输入印章名称' }]}
          >
            <Input placeholder="请输入印章名称" />
          </Form.Item>

          <Form.Item
            name="companyId"
            label="所属公司"
            rules={[{ required: true, message: '请选择所属公司' }]}
          >
            <Select 
              placeholder="请选择所属公司"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {companies.map(company => (
                <Option key={company.id} value={company.id}>
                  {company.companyName || company.company_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="type"
            label="印章类型"
            rules={[{ required: true, message: '请选择印章类型' }]}
          >
            <Select 
              placeholder="请选择印章类型"
              showSearch
              optionFilterProp="children"
            >
              {types.map(type => (
                <Option key={type.value} value={type.value}>{type.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入印章描述或用途说明" />
          </Form.Item>

          <Form.Item label="印章图片" required>
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={handleUploadChange}
              customRequest={async (options: any) => {
                const { file, onSuccess, onError, onProgress } = options;
                
                const formData = new FormData();
                formData.append('file', file);
                
                try {
                  const authHeaders = getAuthHeaders();
                  const response = await fetch(`${API_BASE}/seals/upload`, {
                    method: 'POST',
                    headers: authHeaders,
                    body: formData
                  });
                  
                  const result = await response.json();
                  
                  if (response.ok && result.ok) {
                    onSuccess(result.data, file);
                  } else {
                    onError(new Error(result.error || '上传失败'));
                  }
                } catch (err: any) {
                  onError(err);
                }
              }}
              accept="image/*"
              maxCount={1}
              name="file"
              beforeUpload={(file) => {
                const isImage = file.type.startsWith('image/');
                if (!isImage) {
                  message.error('只能上传图片文件！');
                  return false;
                }
                const isLt5M = file.size / 1024 / 1024 < 5;
                if (!isLt5M) {
                  message.error('图片大小不能超过 5MB！');
                  return false;
                }
                return true;
              }}
            >
              {fileList.length === 0 && (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>上传印章</div>
                </div>
              )}
            </Upload>
            <div style={{ color: '#999', marginTop: 8 }}>
              支持 PNG、JPG、GIF、SVG 格式，文件大小不超过 5MB<br />
              <span style={{ color: '#52c41a' }}>✓ 系统会自动将白色背景转换为透明背景</span>
            </div>
          </Form.Item>

          <Form.Item name="isActive" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 预览模态框 */}
      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
      >
        <img src={previewImage} style={{ width: '100%' }} alt="印章预览" />
      </Modal>
    </div>
  );
};

export default SealsManagementPage;
