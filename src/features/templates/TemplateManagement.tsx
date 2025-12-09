import React, { useMemo, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Button, Table, Modal, Form, Input, Select, Space, Tag, message, Popconfirm, Upload, Segmented, Row, Col, Statistic, Tooltip, Divider, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AppstoreOutlined,
  BarsOutlined,
  PlusOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
  EditOutlined,
  CopyOutlined,
  HistoryOutlined,
  DeleteOutlined,
  EyeOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  ImportOutlined,
  RocketOutlined,
  StarFilled
} from '@ant-design/icons';
import type { AppDispatch, RootState } from '../../app/store';
import { TEMPLATE_TYPE_OPTIONS, Template, TemplateType } from './types';
import {
  fetchTemplates,
  createTemplate,
  updateTemplateAsync,
  deleteTemplateAsync,
  selectTemplates,
  copyTemplateAsync,
  rollbackTemplateAsync
} from './templatesSlice';
import TemplateWizard from './components/TemplateWizard';
import QuickReferenceCard from './components/QuickReferenceCard';
import TemplateCardSelector from './components/TemplateCardSelector';

const { Option } = Select;
const { Title } = Typography;

const TemplateManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const templates = useSelector((state: RootState) => selectTemplates(state));
  const loading = useSelector((state: RootState) => state.templates.loading);

  // 组件加载时获取模板列表
  useEffect(() => {
    dispatch(fetchTemplates({}));
  }, [dispatch]);

  // 过滤与UI状态
  const [filterType, setFilterType] = useState<TemplateType | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const [versionTpl, setVersionTpl] = useState<Template | null>(null);
  const [form] = Form.useForm();
  const [isImportVisible, setIsImportVisible] = useState(false);
  const [importName, setImportName] = useState<string>('');
  const [importType, setImportType] = useState<TemplateType | undefined>(undefined);
  const [importHtml, setImportHtml] = useState<string>('');
  const [importIsDefault, setImportIsDefault] = useState<boolean | undefined>(undefined);
  // 编辑器表单的预填充数据（确保在 Modal 打开且 Form 挂载后再设置字段）
  const [editorSeed, setEditorSeed] = useState<{ name?: string; type?: TemplateType; content?: string; isDefault?: boolean } | null>(null);

  // 向导模式
  const [isWizardVisible, setIsWizardVisible] = useState(false);

  // 快速参考
  const [isReferenceVisible, setIsReferenceVisible] = useState(false);

  // 提取占位符（包含 each 内部）
  const extractPlaceholders = (content: string): string[] => {
    const vars: Set<string> = new Set();
    const varRegex = /{{\s*([\w\.]+)(?:\|[\w]+)?\s*}}/g;
    let vm;
    while ((vm = varRegex.exec(content)) !== null) {
      vars.add(vm[1]);
    }
    const eachRegex = /{{#each\s+[\w\.]+\s*}}([\s\S]*?){{\/each}}/g;
    let em;
    while ((em = eachRegex.exec(content)) !== null) {
      const inner = em[1];
      let im;
      varRegex.lastIndex = 0;
      while ((im = varRegex.exec(inner)) !== null) {
        vars.add(im[1]);
      }
    }
    return Array.from(vars);
  };

  // 提取 each 的列表变量名（如 items）
  const extractListPaths = (content: string): string[] => {
    const paths: Set<string> = new Set();
    const eachRegex = /{{#each\s+([\w\.]+)\s*}}/g;
    let m;
    while ((m = eachRegex.exec(content)) !== null) {
      paths.add(m[1]);
    }
    return Array.from(paths);
  };

  const data = useMemo(() => {
    return filterType ? templates.filter(t => t.type === filterType) : templates;
  }, [templates, filterType]);

  const stats = useMemo(() => {
    return {
      total: templates.length,
      enabled: templates.filter(t => t.status === 'enabled').length,
      types: new Set(templates.map(t => t.type)).size
    };
  }, [templates]);

  const openAdd = () => {
    setEditing(null);
    setEditorSeed(null);
    setIsEditorVisible(true);
  };

  const openEdit = (tpl: Template) => {
    setEditing(tpl);
    setEditorSeed({ name: tpl.name, type: tpl.type, content: tpl.content, isDefault: tpl.isDefault });
    setIsEditorVisible(true);
  };

  const openPreview = (tpl: Template) => {
    setPreviewContent(tpl.content);
    setIsPreviewVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name as string,
        type: values.type as TemplateType,
        content: values.content as string,
        description: values.description as string || '',
        isDefault: !!values.isDefault,
      };

      if (editing) {
        await dispatch(updateTemplateAsync({ id: editing.id, changes: payload })).unwrap();
        message.success('模板已更新');
        dispatch(fetchTemplates({}));
      } else {
        await dispatch(createTemplate(payload)).unwrap();
        message.success('模板已新增');
        dispatch(fetchTemplates({}));
      }
      setIsEditorVisible(false);
    } catch (err: any) {
      message.error(err.message || '操作失败');
    }
  };

  const handleDelete = async (tpl: Template) => {
    try {
      await dispatch(deleteTemplateAsync(tpl.id)).unwrap();
      message.success('模板已删除');
    } catch (err: any) {
      message.error(err.message || '删除失败');
    }
  };

  const handleSetDefault = async (tpl: Template) => {
    try {
      await dispatch(updateTemplateAsync({
        id: tpl.id,
        changes: { isDefault: true }
      })).unwrap();
      message.success(`已将「${tpl.name}」设为${tpl.type}默认模板`);
      dispatch(fetchTemplates({}));
    } catch (err: any) {
      message.error(err.message || '设置失败');
    }
  };

  const handleToggleStatus = async (tpl: Template) => {
    const next = (tpl.status === 'enabled') ? 'disabled' : 'enabled';
    try {
      await dispatch(updateTemplateAsync({
        id: tpl.id,
        changes: { status: next }
      })).unwrap();
      message.success(`模板「${tpl.name}」已${next === 'enabled' ? '启用' : '停用'}`);
      dispatch(fetchTemplates({}));
    } catch (err: any) {
      message.error(err.message || '操作失败');
    }
  };

  const handleCopy = async (tpl: Template) => {
    try {
      await dispatch(copyTemplateAsync(tpl.id)).unwrap();
      message.success(`已复制模板「${tpl.name}」`);
      dispatch(fetchTemplates({}));
    } catch (err: any) {
      message.error(err.message || '复制失败');
    }
  };

  const openVersions = (tpl: Template) => {
    setVersionTpl(tpl);
    setVersionModalVisible(true);
  };

  const handleRollback = async (versionId: string) => {
    if (!versionTpl) return;
    try {
      await dispatch(rollbackTemplateAsync({ id: versionTpl.id, versionId })).unwrap();
      message.success('模板内容已回滚到所选版本');
      setVersionModalVisible(false);
      dispatch(fetchTemplates({}));
    } catch (err: any) {
      message.error(err.message || '回滚失败');
    }
  };

  const columns: ColumnsType<Template> = [
    { title: '序号', key: 'index', width: 60, render: (_, _r, i) => i + 1 },
    {
      title: '模板名称', dataIndex: 'name', key: 'name', render: (text, record) => (
        <Space>
          {text}
          {record.isDefault && <Tag color="blue">默认</Tag>}
        </Space>
      )
    },
    { title: '单据类型', dataIndex: 'type', key: 'type', filters: TEMPLATE_TYPE_OPTIONS.map(t => ({ text: t, value: t })), onFilter: (value, record) => record.type === value },
    { title: '状态', key: 'status', width: 100, render: (_, r) => (r.status === 'enabled' ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>) },
    { title: '版本', key: 'versions', width: 80, render: (_, r) => <span>{(r.versions || []).length}</span> },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 160, render: (val) => new Date(val).toLocaleDateString() },
    {
      title: '操作', key: 'action', width: 300, render: (_, record) => (
        <Space>
          <Tooltip title="预览"><Button type="text" icon={<EyeOutlined />} onClick={() => openPreview(record)} /></Tooltip>
          <Tooltip title="编辑"><Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} /></Tooltip>
          <Tooltip title="复制"><Button type="text" icon={<CopyOutlined />} onClick={() => handleCopy(record)} /></Tooltip>
          <Tooltip title={record.status === 'enabled' ? '停用' : '启用'}>
            <Button type="text" onClick={() => handleToggleStatus(record)}>{record.status === 'enabled' ? <Tag color="error">停</Tag> : <Tag color="success">启</Tag>}</Button>
          </Tooltip>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 头部统计与操作区 */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>模板管理系统</Title>
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<RocketOutlined />} onClick={() => setIsWizardVisible(true)} size="large">
                向导模式创建
              </Button>
              <Button icon={<ImportOutlined />} onClick={() => setIsImportVisible(true)}>导入模板</Button>
              <Button icon={<QuestionCircleOutlined />} onClick={() => setIsReferenceVisible(true)}>使用帮助</Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Card bordered={false} hoverable>
              <Statistic title="总模板数" value={stats.total} prefix={<FileTextOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false} hoverable>
              <Statistic title="启用中" value={stats.enabled} valueStyle={{ color: '#3f8600' }} prefix={<CheckCircleOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false} hoverable>
              <Statistic title="覆盖单据类型" value={stats.types} suffix="/ 6" prefix={<GlobalOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false} hoverable onClick={openAdd} style={{ cursor: 'pointer', borderColor: '#1677ff', borderStyle: 'dashed' }}>
              <Statistic title="快速操作" value="新增模板" prefix={<PlusOutlined />} valueStyle={{ fontSize: 18, color: '#1677ff' }} />
            </Card>
          </Col>
        </Row>
      </div>

      <Card
        bordered={false}
        title={
          <Segmented
            options={[
              { label: '卡片视图', value: 'card', icon: <AppstoreOutlined /> },
              { label: '列表视图', value: 'list', icon: <BarsOutlined /> }
            ]}
            value={viewMode}
            onChange={(val) => setViewMode(val as 'list' | 'card')}
          />
        }
        extra={
          <Space>
            <Select
              placeholder="按类型筛选"
              allowClear
              style={{ width: 160 }}
              value={filterType}
              onChange={(val) => setFilterType(val as TemplateType | undefined)}
            >
              {TEMPLATE_TYPE_OPTIONS.map(opt => (
                <Option key={opt} value={opt}>{opt}</Option>
              ))}
            </Select>
            <Button onClick={openAdd} icon={<PlusOutlined />}>高级模式</Button>
          </Space>
        }
      >
        {viewMode === 'list' ? (
          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
          />
        ) : (
          <TemplateCardSelector
            templates={data}
            onSelect={(t) => openEdit(t)}
            showPreview={true}
            onPreview={openPreview}
            renderActions={(t) => [
              <Tooltip title="预览"><EyeOutlined key="preview" onClick={(e) => { e.stopPropagation(); openPreview(t); }} /></Tooltip>,
              <Tooltip title="编辑"><EditOutlined key="edit" onClick={(e) => { e.stopPropagation(); openEdit(t); }} /></Tooltip>,
              <Tooltip title="设为默认" key="default">
                {t.isDefault ? <StarFilled style={{ color: '#faad14' }} /> : <StarFilled onClick={(e) => { e.stopPropagation(); handleSetDefault(t); }} />}
              </Tooltip>,
              <Tooltip title="更多">
                <Popconfirm title="确认删除？" onConfirm={(e) => { e?.stopPropagation(); handleDelete(t); }} okText="删除" cancelText="取消">
                  <DeleteOutlined key="delete" style={{ color: '#ff4d4f' }} onClick={(e) => e.stopPropagation()} />
                </Popconfirm>
              </Tooltip>
            ]}
          />
        )}
      </Card>

      {/* 新增/维护模板 */}
      <Modal
        title={editing ? '维护模板' : '新增模板'}
        open={isEditorVisible}
        onCancel={() => setIsEditorVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsEditorVisible(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={handleSave}>保存</Button>,
        ]}
        width={900}
        afterOpenChange={(open) => {
          if (open) {
            if (editorSeed) {
              form.setFieldsValue(editorSeed);
              setEditorSeed(null);
            } else {
              form.resetFields();
            }
          }
        }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
                <Input placeholder="例如：标准结算模板（含税）" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="单据类型" rules={[{ required: true, message: '请选择单据类型' }]}>
                <Select placeholder="请选择类型">
                  {TEMPLATE_TYPE_OPTIONS.map(opt => (
                    <Option key={opt} value={opt}>{opt}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="content" label={
            <Space>
              <span>模板内容（HTML）</span>
              <Tooltip title="支持 Handlebars 语法，如 {{customer_name}}">
                <QuestionCircleOutlined />
              </Tooltip>
            </Space>
          } rules={[{ required: true, message: '请输入模板HTML内容' }]}>
            <Input.TextArea rows={16} placeholder="粘贴或编写HTML模板..." style={{ fontFamily: 'monospace' }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="isDefault" label="设为默认" initialValue={false}>
                <Select>
                  <Option value={true}>是</Option>
                  <Option value={false}>否</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label="备注说明">
                <Input placeholder="版本说明等" />
              </Form.Item>
            </Col>
          </Row>

          {editing && (
            <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
              <Space>
                <Button icon={<HistoryOutlined />} onClick={() => openVersions(editing)}>查看历史版本</Button>
                <Button icon={<CopyOutlined />} onClick={() => handleCopy(editing)}>复制此模板</Button>
              </Space>
            </div>
          )}
        </Form>
      </Modal>

      {/* 预览 */}
      <Modal
        title="模板预览"
        open={isPreviewVisible}
        onCancel={() => setIsPreviewVisible(false)}
        footer={<Button onClick={() => setIsPreviewVisible(false)}>关闭</Button>}
        width={980}
      >
        <div style={{ background: '#f5f5f5', padding: 24, overflow: 'auto', maxHeight: '70vh' }}>
          <div style={{
            background: '#fff',
            padding: '40px',
            minHeight: 800,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            width: '210mm', // A4 width
            margin: '0 auto'
          }} dangerouslySetInnerHTML={{ __html: previewContent }} />
        </div>
      </Modal>

      {/* 导入HTML模板 */}
      <Modal
        title="导入模板（HTML / Word）"
        open={isImportVisible}
        onCancel={() => setIsImportVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsImportVisible(false)}>取消</Button>,
          <Button
            key="import"
            type="primary"
            onClick={() => {
              if (!importHtml) {
                message.warning('请先选择并读取模板（Word或HTML）');
                return;
              }
              // 预填充编辑器表单（在 Modal 打开后执行）
              setEditorSeed({ name: importName || '导入模板', type: importType, content: importHtml });
              setIsImportVisible(false);
              setIsEditorVisible(true);
            }}
          >
            导入到编辑器
          </Button>,
          <Button
            key="save-map"
            onClick={async () => {
              if (!importHtml || !importType) {
                message.warning('请先选择文件并填写类型');
                return;
              }
              const placeholders = extractPlaceholders(importHtml);
              const listPaths = extractListPaths(importHtml);
              const mappings: any[] = [];
              // 针对常见合同占位符的建议映射
              if (importType === '合同') {
                const suggest: Record<string, string> = {
                  lessor_name: 'order.vendorName',
                  lessee_name: 'order.customerName',
                  project_name: 'order.projectName',
                  delivery_location: 'order.deliveryLocation',
                  payment_agreement: 'order.paymentAgreement',
                  month_calc_method: 'order.monthCalculationMethod',
                  contract_number: 'order.contractNumber',
                  print_date: 'system.printDate',
                };
                placeholders.forEach(k => {
                  if (suggest[k]) {
                    mappings.push({ placeholder: k, dataPath: suggest[k] });
                  }
                });
              }
              // each 列表变量名映射（例如 items -> order.equipmentItems）
              if (listPaths.includes('items')) {
                mappings.push({ placeholder: 'items', dataPath: 'order.equipmentItems' });
              }

              try {
                await dispatch(createTemplate({
                  name: importName || '导入模板',
                  type: importType,
                  content: importHtml,
                  isDefault: !!importIsDefault,
                  mappings,
                })).unwrap();
                message.success('模板已导入并保存映射');
                setIsImportVisible(false);
                dispatch(fetchTemplates({}));
              } catch (err: any) {
                message.error(err.message || '导入失败');
              }
            }}
          >
            导入并保存（含映射）
          </Button>
        ]}
        width={600}
      >
        <Form layout="vertical">
          <Form.Item label="模板名称">
            <Input value={importName} onChange={(e) => setImportName(e.target.value)} placeholder="例如：公司合同模板V1" />
          </Form.Item>
          <Form.Item label="单据类型" required>
            <Select placeholder="请选择类型" value={importType} onChange={(v) => setImportType(v as TemplateType)}>
              {TEMPLATE_TYPE_OPTIONS.map(opt => (
                <Option key={opt} value={opt}>{opt}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="设为默认">
            <Select placeholder="是否设为默认模板" value={importIsDefault} onChange={(v) => setImportIsDefault(v as any)} allowClear>
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>
          <Form.Item label="选择HTML文件（.html/.htm）">
            <Upload
              beforeUpload={() => false}
              accept=".html,.htm"
              maxCount={1}
              onChange={({ file }) => {
                const f = file.originFileObj as File | undefined;
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const text = String(reader.result || '')
                    .replace(/<!DOCTYPE[\s\S]*?<body[^>]*>/i, '')
                    .replace(/<\/body>[\s\S]*$/i, '');
                  setImportHtml(text);
                  setImportName(importName || f.name.replace(/\.(html|htm)$/i, ''));
                  message.success('HTML文件读取成功');
                };
                reader.onerror = () => message.error('读取文件失败');
                reader.readAsText(f, 'utf-8');
              }}
            >
              <Button icon={<ImportOutlined />}>选择HTML文件</Button>
            </Upload>
          </Form.Item>
          <Form.Item label="选择Word文档（.docx）">
            <Upload
              beforeUpload={() => false}
              accept=".docx"
              maxCount={1}
              onChange={async (info) => {
                const f = (info.file as any)?.originFileObj as File | undefined || (info.fileList?.[0] as any)?.originFileObj as File | undefined;
                if (!f) {
                  return;
                }
                try {
                  const arrayBuf = await f.arrayBuffer();
                  const mammoth = await import('mammoth/mammoth.browser');
                  const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuf });
                  const html = (result && (result as any).value) ? (result as any).value : '';
                  if (!html) {
                    message.warning('未从Word中解析出内容，请检查文档');
                  }
                  setImportHtml(html);
                  setImportName(importName || f.name.replace(/\.(docx)$/i, ''));
                  message.success('Word转换为HTML成功');
                } catch (e) {
                  console.error(e);
                  message.error('Word转换失败，请确认文件格式');
                }
              }}
            >
              <Button icon={<FileTextOutlined />}>选择Word文件</Button>
            </Upload>
          </Form.Item>
          <Form.Item label="预览（读取后）">
            <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #eee', padding: 8 }}>
              {importHtml ? (
                <div dangerouslySetInnerHTML={{ __html: importHtml }} />
              ) : (
                <Tag>未加载文件</Tag>
              )}
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 版本历史 */}
      <Modal
        title="版本历史"
        open={versionModalVisible}
        onCancel={() => setVersionModalVisible(false)}
        footer={<Button onClick={() => setVersionModalVisible(false)}>关闭</Button>}
        width={720}
      >
        <div>
          {versionTpl && (versionTpl.versions || []).length > 0 ? (
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              columns={[
                { title: '版本ID', dataIndex: 'id', key: 'id', width: 100, ellipsis: true },
                { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: val => new Date(val).toLocaleString() },
                { title: '备注', dataIndex: 'note', key: 'note' },
                {
                  title: '操作', key: 'action', render: (_: any, r: any) => (
                    <Space>
                      <Popconfirm title="确认回滚到该版本？" onConfirm={() => handleRollback(r.id)} okText="回滚" cancelText="取消">
                        <Button type="link" size="small">回滚到此版本</Button>
                      </Popconfirm>
                    </Space>
                  )
                }
              ]}
              dataSource={versionTpl.versions}
            />
          ) : (
            <div style={{ padding: 16, color: '#888', textAlign: 'center' }}>暂无历史版本</div>
          )}
        </div>
      </Modal>

      {/* 向导模式创建 */}
      <TemplateWizard
        visible={isWizardVisible}
        onCancel={() => setIsWizardVisible(false)}
        onFinish={async (values) => {
          try {
            await dispatch(createTemplate(values)).unwrap();
            message.success('模板创建成功！');
            setIsWizardVisible(false);
            dispatch(fetchTemplates({}));
          } catch (err: any) {
            message.error(err.message || '创建失败');
          }
        }}
      />

      {/* 快速参考 */}
      <Modal
        title="📖 模板系统使用帮助"
        open={isReferenceVisible}
        onCancel={() => setIsReferenceVisible(false)}
        footer={<Button type="primary" onClick={() => setIsReferenceVisible(false)}>关闭</Button>}
        width={900}
      >
        <QuickReferenceCard />
      </Modal>
    </div>
  );
};

export default TemplateManagement;
