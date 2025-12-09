import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Button, Table, Modal, Form, Input, Select, Space, Tag, message, Popconfirm, Upload } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AppDispatch, RootState } from '../../app/store';
import { TEMPLATE_TYPE_OPTIONS, Template, TemplateType } from './types';
import { addTemplate, addTemplateWithMapping, updateTemplate, deleteTemplate, setDefaultTemplate, selectTemplates, toggleTemplateStatus, copyTemplate, rollbackTemplate } from './templatesSlice';

const { Option } = Select;

const TemplateManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const templates = useSelector((state: RootState) => selectTemplates(state));

  // 过滤与UI状态
  const [filterType, setFilterType] = useState<TemplateType | undefined>(undefined);
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
        isDefault: !!values.isDefault,
      };

      if (editing) {
        dispatch(updateTemplate({ id: editing.id, changes: payload }));
        message.success('模板已更新');
      } else {
        dispatch(addTemplate(payload));
        message.success('模板已新增');
      }
      setIsEditorVisible(false);
    } catch (err) {
      // 校验错误由表单控件提示
    }
  };

  const handleDelete = (tpl: Template) => {
    dispatch(deleteTemplate(tpl.id));
    message.success('模板已删除');
  };

  const handleSetDefault = (tpl: Template) => {
    dispatch(setDefaultTemplate({ type: tpl.type, id: tpl.id }));
    message.success(`已将「${tpl.name}」设为${tpl.type}默认模板`);
  };

  const handleToggleStatus = (tpl: Template) => {
    const next = (tpl.status === 'enabled') ? 'disabled' : 'enabled';
    dispatch(toggleTemplateStatus({ id: tpl.id, status: next }));
    message.success(`模板「${tpl.name}」已${next === 'enabled' ? '启用' : '停用'}`);
  };

  const handleCopy = (tpl: Template) => {
    dispatch(copyTemplate(tpl.id));
    message.success(`已复制模板「${tpl.name}」`);
  };

  const openVersions = (tpl: Template) => {
    setVersionTpl(tpl);
    setVersionModalVisible(true);
  };

  const handleRollback = (versionId: string) => {
    if (!versionTpl) return;
    dispatch(rollbackTemplate({ id: versionTpl.id, versionId }));
    message.success('模板内容已回滚到所选版本');
    setVersionModalVisible(false);
  };

  const columns: ColumnsType<Template> = [
    { title: '序号', key: 'index', width: 80, render: (_,_r, i) => i + 1 },
    { title: '模板名称', dataIndex: 'name', key: 'name' },
    { title: '单据类型', dataIndex: 'type', key: 'type', filters: TEMPLATE_TYPE_OPTIONS.map(t => ({ text: t, value: t })), onFilter: (value, record) => record.type === value },
    { title: '默认模板', key: 'isDefault', render: (_, r) => r.isDefault ? <Tag color="blue">默认</Tag> : <Tag>否</Tag> },
    { title: '状态', key: 'status', render: (_, r) => (r.status === 'enabled' ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>) },
    { title: '版本数', key: 'versions', render: (_, r) => <span>{(r.versions || []).length}</span> },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt' },
    { title: '操作', key: 'action', width: 420, render: (_, record) => (
      <Space wrap>
        <Button type="link" onClick={() => openPreview(record)}>预览</Button>
        <Button type="link" onClick={() => handleToggleStatus(record)}>{record.status === 'enabled' ? '停用' : '启用'}</Button>
        <Button type="link" onClick={() => handleCopy(record)}>复制</Button>
        <Button type="link" onClick={() => openVersions(record)}>版本历史</Button>
        {!record.isDefault && (
          <Button type="link" onClick={() => handleSetDefault(record)}>设为默认</Button>
        )}
        <Button type="link" onClick={() => openEdit(record)}>维护</Button>
        <Popconfirm title="确认删除该模板？" onConfirm={() => handleDelete(record)} okText="删除" cancelText="取消">
          <Button type="link" danger>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <div style={{ padding: 16 }}>
      <Card
        title="模板管理"
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
            <Button type="primary" onClick={openAdd}>新增模板</Button>
            <Button onClick={() => setIsImportVisible(true)}>导入模板</Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
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
          <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
            <Input placeholder="例如：标准结算模板（含税）" />
          </Form.Item>
          <Form.Item name="type" label="单据类型" rules={[{ required: true, message: '请选择单据类型' }]}>
            <Select placeholder="请选择类型">
              {TEMPLATE_TYPE_OPTIONS.map(opt => (
                <Option key={opt} value={opt}>{opt}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="content" label="模板内容（HTML）" rules={[{ required: true, message: '请输入模板HTML内容' }]}>
            <Input.TextArea rows={16} placeholder="粘贴或编写HTML模板，支持占位符，如 {{customer_name}}、{{period_start}} 等" />
          </Form.Item>
          <Form.Item name="isDefault" label="设为默认">
            <Select placeholder="是否设为默认模板" allowClear>
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>
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
        <div style={{ background: '#fff', padding: 16 }}>
          <div style={{ border: '1px solid #e8e8e8', padding: 8 }} dangerouslySetInnerHTML={{ __html: previewContent }} />
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
            onClick={() => {
              if (!importHtml || !importType) {
                message.warning('请先选择文件并填写类型');
                return;
              }
              const placeholders = extractPlaceholders(importHtml);
              const listPaths = extractListPaths(importHtml);
              const mapping: Record<string, string> = {};
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
                  if (suggest[k]) mapping[k] = suggest[k];
                });
              }
              // each 列表变量名映射（例如 items -> order.equipmentItems）
              if (listPaths.includes('items')) {
                mapping['items'] = 'order.equipmentItems';
              }
              const payload = {
                name: importName || '导入模板',
                type: importType,
                content: importHtml,
                isDefault: !!importIsDefault,
                mapping,
              } as any;
              dispatch(addTemplateWithMapping(payload));
              message.success('模板已导入并保存映射');
              setIsImportVisible(false);
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
                    // 简单清理：去除可能的meta/doctype（可选）
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
              <Button>选择文件</Button>
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
                  message.warning('请选择有效的Word文件');
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
              <Button>选择Word文件</Button>
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
                { title: '版本ID', dataIndex: 'id', key: 'id' },
                { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
                { title: '备注', dataIndex: 'note', key: 'note' },
                { title: '操作', key: 'action', render: (_: any, r: any) => (
                  <Space>
                    <Popconfirm title="确认回滚到该版本？" onConfirm={() => handleRollback(r.id)} okText="回滚" cancelText="取消">
                      <Button type="link">回滚到此版本</Button>
                    </Popconfirm>
                  </Space>
                ) }
              ]}
              dataSource={versionTpl.versions}
            />
          ) : (
            <div style={{ padding: 16, color: '#888' }}>暂无历史版本</div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default TemplateManagement;