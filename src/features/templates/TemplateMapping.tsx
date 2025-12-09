import React, { useMemo, useState } from 'react';
import { Card, Select, Space, Button, Table, Tag, Typography, Form, Input, message } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { ColumnsType } from 'antd/es/table';
import type { AppDispatch, RootState } from '../../app/store';
import { TEMPLATE_TYPE_OPTIONS, TemplateType } from './types';
import { selectTemplates, setTemplateMapping } from './templatesSlice';

const { Option } = Select;
const { Text } = Typography;

type MappingRow = { key: string; example?: string };

// 从模板内容中提取占位符（包含循环内部）
const extractPlaceholders = (content: string): string[] => {
  const vars: Set<string> = new Set();
  // 1) 提取普通变量 {{ var }} 或 {{ a.b | filter }}
  const varRegex = /{{\s*([\w\.]+)(?:\|[\w]+)?\s*}}/g;
  let vm;
  while ((vm = varRegex.exec(content)) !== null) {
    vars.add(vm[1]);
  }
  // 2) 提取 each 块内部变量 {{#each items}}...{{/each}}
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

const TemplateMapping: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const templates = useSelector((state: RootState) => selectTemplates(state));
  const [filterType, setFilterType] = useState<TemplateType | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [form] = Form.useForm();

  const data = useMemo(() => (filterType ? templates.filter(t => t.type === filterType) : templates), [templates, filterType]);
  const selected = useMemo(() => data.find(t => t.id === selectedId), [data, selectedId]);
  const placeholders = useMemo(() => extractPlaceholders(selected?.content || ''), [selected]);

  const columns: ColumnsType<MappingRow> = [
    { title: '占位符', dataIndex: 'key', key: 'key', render: (k) => <Tag color="blue">{k}</Tag> },
    { title: '映射源（示例/数据路径）', dataIndex: 'example', key: 'example', render: (_v, record) => (
      <Form.Item name={[record.key]} style={{ margin: 0 }}>
        <Input placeholder="例如：order.customerName 或 form.contactPhone" />
      </Form.Item>
    )},
  ];

  const rows: MappingRow[] = placeholders.map(k => ({ key: k }));

  const handleSave = () => {
    if (!selected) {
      message.warning('请先选择模板');
      return;
    }
    const values = form.getFieldsValue();
    dispatch(setTemplateMapping({ id: selected.id, mapping: values }));
    message.success('模板占位符映射已保存');
  };

  return (
    <div style={{ padding: 16 }}>
      <Card
        title="模板映射设置"
        extra={(
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
            <Select
              placeholder="选择一个模板"
              style={{ width: 220 }}
              value={selectedId}
              onChange={(val) => setSelectedId(val)}
              options={data.map(t => ({ label: `${t.name}（${t.type}）`, value: t.id }))}
            />
            <Button type="primary" onClick={handleSave}>保存映射</Button>
          </Space>
        )}
      >
        {!selected ? (
          <Text type="secondary">请选择一个模板以配置占位符映射</Text>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
            <Card size="small" title="模板摘要" style={{ height: '100%' }}>
              <div style={{ fontSize: 12, color: '#666' }}>
                <div>模板名称：{selected.name}</div>
                <div>模板类型：{selected.type}</div>
                <div>版本数量：{(selected.versions || []).length}</div>
                <div style={{ marginTop: 8 }}>占位符数量：{placeholders.length}</div>
              </div>
            </Card>
            <Card size="small" title="占位符与映射" style={{ height: '100%' }}>
              <Form form={form} layout="vertical" initialValues={{}}>
                <Table
                  columns={columns}
                  dataSource={rows}
                  rowKey="key"
                  pagination={{ pageSize: 8 }}
                />
              </Form>
              <div style={{ marginTop: 12, color: '#888', fontSize: 12 }}>
                提示：映射值作为数据来源描述，用于统一团队对占位符意义的理解，后续可用于自动生成预览数据。
              </div>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TemplateMapping;