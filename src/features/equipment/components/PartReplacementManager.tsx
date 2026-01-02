/**
 * 高价值配件更换记录管理组件
 */

import React, { useState, useEffect } from 'react';
import { Card, Timeline, Tag, Button, Modal, Form, Input, InputNumber, DatePicker, Select, message, Empty, Spin, Descriptions, Space, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ToolOutlined, ThunderboltOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { PartCategory, PartReplacementRecord, PartReplacementFormData, PartReplacementSummary } from '../types/parts';

const { TextArea } = Input;
const { Option } = Select;

interface PartReplacementManagerProps {
  equipmentId: number;
  equipmentCode?: string;
}

const PartReplacementManager: React.FC<PartReplacementManagerProps> = ({ equipmentId, equipmentCode }) => {
  const [loading, setLoading] = useState(false);
  const [replacements, setReplacements] = useState<PartReplacementRecord[]>([]);
  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [summary, setSummary] = useState<PartReplacementSummary | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PartReplacementRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PartReplacementRecord | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
    loadCategories();
    loadSummary();
  }, [equipmentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/part-replacements/equipment/${equipmentId}`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}`
        }
      });
      const result = await response.json();
      if (result.ok) {
        setReplacements(result.data);
      }
    } catch (error) {
      console.error('Load replacements error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/part-replacements/categories', {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}`
        }
      });
      const result = await response.json();
      if (result.ok) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Load categories error:', error);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await fetch(`/api/part-replacements/summary/equipment/${equipmentId}`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}`
        }
      });
      const result = await response.json();
      if (result.ok) {
        setSummary(result.data);
      }
    } catch (error) {
      console.error('Load summary error:', error);
    }
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      equipmentId,
      replacementDate: dayjs(),
      replacementReason: '故障',
      warrantyMonths: 12,
      laborCost: 0
    });
    setShowForm(true);
  };

  const handleEdit = (record: PartReplacementRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      partCategoryId: record.partCategory.id,
      replacementDate: dayjs(record.replacementDate),
      partCost: record.financial.partCost,
      laborCost: record.financial.laborCost,
      warrantyMonths: record.warranty?.months,
      warrantyStartDate: record.warranty?.startDate ? dayjs(record.warranty.startDate) : undefined,
      supplierName: record.supplier?.name,
      supplierContact: record.supplier?.contact,
      purchaseOrderNo: record.supplier?.purchaseOrderNo,
      technicianName: record.technician?.name,
      workHours: record.technician?.workHours,
      oldPartSerialNumber: record.oldPart?.serialNumber,
      oldPartUsageDays: record.oldPart?.usageDays,
      oldPartUsageHours: record.oldPart?.usageHours
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条配件更换记录吗？',
      onOk: async () => {
        try {
          const response = await fetch(`/api/part-replacements/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}`
            }
          });
          const result = await response.json();
          if (result.ok) {
            message.success('删除成功');
            loadData();
            loadSummary();
          } else {
            message.error(result.error || '删除失败');
          }
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const formData: PartReplacementFormData = {
        equipmentId,
        ...values,
        replacementDate: values.replacementDate.format('YYYY-MM-DD'),
        warrantyStartDate: values.warrantyStartDate ? values.warrantyStartDate.format('YYYY-MM-DD') : undefined
      };

      const url = editingRecord 
        ? `/api/part-replacements/${editingRecord.id}`
        : '/api/part-replacements';
      
      const method = editingRecord ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      if (result.ok) {
        message.success(editingRecord ? '更新成功' : '添加成功');
        setShowForm(false);
        loadData();
        loadSummary();
      } else {
        message.error(result.error || '操作失败');
      }
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const getWarrantyStatusTag = (status?: string) => {
    const statusMap = {
      '在保': { color: 'success', text: '在保' },
      '即将过保': { color: 'warning', text: '即将过保' },
      '已过保': { color: 'default', text: '已过保' }
    };
    const config = statusMap[status as keyof typeof statusMap] || statusMap['已过保'];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getCategoryIcon = (code: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'BATTERY': <ThunderboltOutlined style={{ fontSize: '20px', color: '#52c41a' }} />,
      'MOTOR': <ThunderboltOutlined style={{ fontSize: '20px', color: '#1890ff' }} />,
      'HYDRAULIC': <ToolOutlined style={{ fontSize: '20px', color: '#ff7a45' }} />,
      'ECU': <ThunderboltOutlined style={{ fontSize: '20px', color: '#722ed1' }} />
    };
    return iconMap[code] || <ToolOutlined style={{ fontSize: '20px' }} />;
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* 汇总卡片 */}
      {summary && (
        <Card style={{ marginBottom: '16px' }} size="small">
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                ¥{summary.totalReplacementCost.toLocaleString()}
              </div>
              <div style={{ color: '#666', marginTop: '4px' }}>配件总投入</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                {summary.partsUnderWarranty}
              </div>
              <div style={{ color: '#666', marginTop: '4px' }}>在保配件</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>
                {summary.partsExpiringSoon}
              </div>
              <div style={{ color: '#666', marginTop: '4px' }}>即将过保</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {summary.totalReplacements}
              </div>
              <div style={{ color: '#666', marginTop: '4px' }}>更换次数</div>
            </div>
          </div>
        </Card>
      )}

      <Card 
        title={`高价值配件更换记录${equipmentCode ? ` - ${equipmentCode}` : ''}`}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加更换记录
          </Button>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin />
          </div>
        ) : replacements.length === 0 ? (
          <Empty description="暂无配件更换记录" />
        ) : (
          <Timeline mode="left" style={{ marginTop: '20px' }}>
            {replacements.map((record) => (
              <Timeline.Item
                key={record.id}
                color={record.warranty?.status === '在保' ? 'green' : 'gray'}
                label={
                  <span style={{ fontWeight: 'bold' }}>
                    {dayjs(record.replacementDate).format('YYYY-MM-DD')}
                  </span>
                }
              >
                <Card size="small" style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <div style={{ marginRight: '16px' }}>
                      {getCategoryIcon(record.partCategory.code)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '16px' }}>{record.partCategory.name}</strong>
                          <span style={{ marginLeft: '8px', color: '#666' }}>{record.partName}</span>
                        </div>
                        <Space>
                          {record.warranty?.status && getWarrantyStatusTag(record.warranty.status)}
                          {record.warranty?.daysUntilExpires !== undefined && record.warranty.daysUntilExpires > 0 && (
                            <Tag>剩{record.warranty.daysUntilExpires}天</Tag>
                          )}
                        </Space>
                      </div>
                      
                      <div style={{ marginTop: '8px', color: '#666' }}>
                        {record.partModel && <span>型号: {record.partModel} | </span>}
                        {record.partBrand && <span>品牌: {record.partBrand} | </span>}
                        <span style={{ color: '#f5222d', fontWeight: 'bold' }}>
                          ¥{record.financial.totalCost.toLocaleString()}
                        </span>
                      </div>
                      
                      {record.partSerialNumber && (
                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#999' }}>
                          SN: {record.partSerialNumber}
                        </div>
                      )}
                      
                      <div style={{ marginTop: '4px', fontSize: '12px', color: '#999' }}>
                        原因: {record.replacementReason}
                        {record.technician?.name && ` | 技师: ${record.technician.name}`}
                      </div>
                      
                      <div style={{ marginTop: '8px' }}>
                        <Button size="small" icon={<EyeOutlined />} onClick={() => {
                          setSelectedRecord(record);
                          setShowDetail(true);
                        }}>详情</Button>
                        <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ marginLeft: '8px' }}>编辑</Button>
                        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} style={{ marginLeft: '8px' }}>删除</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Card>

      {/* 添加/编辑表单 */}
      <Modal
        title={editingRecord ? '编辑配件更换记录' : '添加配件更换记录'}
        open={showForm}
        onOk={handleSubmit}
        onCancel={() => setShowForm(false)}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Divider orientation="left">配件信息</Divider>
          <Form.Item name="partCategoryId" label="配件类别" rules={[{ required: true, message: '请选择配件类别' }]}>
            <Select placeholder="请选择配件类别">
              {categories.map(cat => (
                <Option key={cat.id} value={cat.id}>
                  {cat.categoryName} ({cat.typicalPriceRange})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="partName" label="配件名称" rules={[{ required: true, message: '请输入配件名称' }]}>
            <Input placeholder="例如: 锂电池组 48V 400Ah" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="partModel" label="配件型号">
              <Input placeholder="例如: LFP-48-400" />
            </Form.Item>
            <Form.Item name="partBrand" label="配件品牌">
              <Input placeholder="例如: 宁德时代" />
            </Form.Item>
          </div>

          <Form.Item name="partSerialNumber" label="配件序列号">
            <Input placeholder="例如: CATL20240101001" />
          </Form.Item>

          <Divider orientation="left">更换信息</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="replacementDate" label="更换日期" rules={[{ required: true, message: '请选择更换日期' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="replacementReason" label="更换原因">
              <Select>
                <Option value="故障">故障</Option>
                <Option value="损坏">损坏</Option>
                <Option value="老化">老化</Option>
                <Option value="升级">升级</Option>
                <Option value="保养">保养</Option>
                <Option value="其他">其他</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="failureDescription" label="故障描述">
            <TextArea rows={2} placeholder="描述故障情况" />
          </Form.Item>

          <Divider orientation="left">旧件信息（选填）</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <Form.Item name="oldPartSerialNumber" label="旧件序列号">
              <Input />
            </Form.Item>
            <Form.Item name="oldPartUsageDays" label="使用天数">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="oldPartUsageHours" label="使用小时数">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </div>

          <Divider orientation="left">费用信息</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="partCost" label="配件费用" rules={[{ required: true, message: '请输入配件费用' }]}>
              <InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="¥" />
            </Form.Item>
            <Form.Item name="laborCost" label="人工费用">
              <InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="¥" />
            </Form.Item>
          </div>

          <Divider orientation="left">保修信息</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="warrantyMonths" label="保修月数">
              <InputNumber style={{ width: '100%' }} min={0} max={60} addonAfter="月" />
            </Form.Item>
            <Form.Item name="warrantyStartDate" label="保修开始日期">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Divider orientation="left">其他信息（选填）</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="supplierName" label="供应商名称">
              <Input />
            </Form.Item>
            <Form.Item name="supplierContact" label="供应商联系方式">
              <Input />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item name="technicianName" label="更换技师">
              <Input />
            </Form.Item>
            <Form.Item name="workHours" label="工时">
              <InputNumber style={{ width: '100%' }} min={0} precision={1} addonAfter="小时" />
            </Form.Item>
          </div>

          <Form.Item name="notes" label="备注">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="配件更换详情"
        open={showDetail}
        onCancel={() => setShowDetail(false)}
        footer={[
          <Button key="close" onClick={() => setShowDetail(false)}>关闭</Button>
        ]}
        width={800}
      >
        {selectedRecord && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="配件类别">{selectedRecord.partCategory.name}</Descriptions.Item>
            <Descriptions.Item label="配件名称">{selectedRecord.partName}</Descriptions.Item>
            <Descriptions.Item label="配件型号">{selectedRecord.partModel || '-'}</Descriptions.Item>
            <Descriptions.Item label="配件品牌">{selectedRecord.partBrand || '-'}</Descriptions.Item>
            <Descriptions.Item label="序列号" span={2}>{selectedRecord.partSerialNumber || '-'}</Descriptions.Item>
            
            <Descriptions.Item label="更换日期">{dayjs(selectedRecord.replacementDate).format('YYYY-MM-DD')}</Descriptions.Item>
            <Descriptions.Item label="更换原因">{selectedRecord.replacementReason}</Descriptions.Item>
            {selectedRecord.failureDescription && (
              <Descriptions.Item label="故障描述" span={2}>{selectedRecord.failureDescription}</Descriptions.Item>
            )}
            
            {selectedRecord.oldPart?.serialNumber && (
              <>
                <Descriptions.Item label="旧件序列号">{selectedRecord.oldPart.serialNumber}</Descriptions.Item>
                <Descriptions.Item label="旧件使用">
                  {selectedRecord.oldPart.usageDays ? `${selectedRecord.oldPart.usageDays}天` : '-'}
                  {selectedRecord.oldPart.usageHours ? ` / ${selectedRecord.oldPart.usageHours}小时` : ''}
                </Descriptions.Item>
              </>
            )}
            
            <Descriptions.Item label="配件费用">¥{selectedRecord.financial.partCost.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="人工费用">¥{selectedRecord.financial.laborCost.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="总费用" span={2}>
              <strong style={{ fontSize: '16px', color: '#f5222d' }}>
                ¥{selectedRecord.financial.totalCost.toLocaleString()}
              </strong>
            </Descriptions.Item>
            
            {selectedRecord.warranty && (
              <>
                <Descriptions.Item label="保修期">{selectedRecord.warranty.months}个月</Descriptions.Item>
                <Descriptions.Item label="保修状态">
                  {getWarrantyStatusTag(selectedRecord.warranty.status)}
                  {selectedRecord.warranty.daysUntilExpires > 0 && (
                    <span style={{ marginLeft: '8px' }}>剩余{selectedRecord.warranty.daysUntilExpires}天</span>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="保修开始">{selectedRecord.warranty.startDate}</Descriptions.Item>
                <Descriptions.Item label="保修结束">{selectedRecord.warranty.endDate}</Descriptions.Item>
              </>
            )}
            
            {selectedRecord.supplier?.name && (
              <>
                <Descriptions.Item label="供应商">{selectedRecord.supplier.name}</Descriptions.Item>
                <Descriptions.Item label="供应商联系方式">{selectedRecord.supplier.contact || '-'}</Descriptions.Item>
              </>
            )}
            
            {selectedRecord.technician?.name && (
              <>
                <Descriptions.Item label="更换技师">{selectedRecord.technician.name}</Descriptions.Item>
                <Descriptions.Item label="工时">{selectedRecord.technician.workHours || '-'}小时</Descriptions.Item>
              </>
            )}
            
            {selectedRecord.notes && (
              <Descriptions.Item label="备注" span={2}>{selectedRecord.notes}</Descriptions.Item>
            )}
            
            <Descriptions.Item label="创建时间">{dayjs(selectedRecord.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{dayjs(selectedRecord.updatedAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default PartReplacementManager;

