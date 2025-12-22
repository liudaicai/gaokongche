import React, { useEffect, useState, useMemo } from 'react';
import { Modal, Table, InputNumber, Space, Button, App, Input, Select, Row, Col, Typography, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { fetchParts } from './partsSlice';
import type { Part, PartSelectItem, PartCategory } from './types';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

interface PartSelectModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedParts: PartSelectItem[]) => void;
}

interface SelectablePartRow extends Part {
  key: number;
  selectedQuantity?: number;
}

const PART_CATEGORIES: PartCategory[] = ['电控系统', '液压系统', '结构件', '易损件'];

const PartSelectModal: React.FC<PartSelectModalProps> = ({ open, onClose, onConfirm }) => {
  const dispatch = useAppDispatch();
  const { message: messageApi } = App.useApp();
  const { parts, loading } = useAppSelector((state) => state.parts);
  const [selectedParts, setSelectedParts] = useState<Map<number, number>>(new Map());
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<PartCategory | undefined>(undefined);

  useEffect(() => {
    if (open) {
      dispatch(fetchParts());
      setSelectedParts(new Map());
      setSearchText('');
      setFilterCategory(undefined);
    }
  }, [open, dispatch]);

  const handleQuantityChange = (partId: number, quantity: number | null) => {
    const newSelected = new Map(selectedParts);
    if (quantity && quantity > 0) {
      newSelected.set(partId, quantity);
    } else {
      newSelected.delete(partId);
    }
    setSelectedParts(newSelected);
  };

  const handleConfirm = () => {
    if (selectedParts.size === 0) {
      messageApi.warning('请选择至少一个配件');
      return;
    }

    const result: PartSelectItem[] = Array.from(selectedParts.entries()).map(([partId, quantity]) => ({
      partId,
      quantity,
    }));

    onConfirm(result);
  };

  // 筛选后的配件列表
  const filteredParts = useMemo(() => {
    let result = parts;

    // 类别筛选
    if (filterCategory) {
      result = result.filter(part => part.category === filterCategory);
    }

    // 搜索文本筛选（支持编号、名称、品牌、型号模糊搜索）
    if (searchText.trim()) {
      const keyword = searchText.trim().toLowerCase();
      result = result.filter(part => 
        (part.code || '').toLowerCase().includes(keyword) ||
        (part.name || '').toLowerCase().includes(keyword) ||
        (part.brand || '').toLowerCase().includes(keyword) ||
        (part.model || '').toLowerCase().includes(keyword) ||
        (part.category || '').toLowerCase().includes(keyword)
      );
    }

    return result;
  }, [parts, filterCategory, searchText]);

  // 已选配件详情
  const selectedPartsDetail = useMemo(() => {
    return Array.from(selectedParts.entries()).map(([partId, quantity]) => {
      const part = parts.find(p => p.id === partId);
      return part ? { ...part, quantity } : null;
    }).filter(Boolean) as (Part & { quantity: number })[];
  }, [selectedParts, parts]);

  const columns: ColumnsType<SelectablePartRow> = [
    {
      title: '配件编号',
      dataIndex: 'code',
      width: 120,
      fixed: 'left',
    },
    {
      title: '配件名称',
      dataIndex: 'name',
      width: 140,
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '类别',
      dataIndex: 'category',
      width: 100,
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      width: 100,
      render: (v) => v || '-',
    },
    {
      title: '规格型号',
      dataIndex: 'model',
      width: 120,
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '采购价格',
      dataIndex: 'purchasePrice',
      width: 100,
      render: (price) => {
        if (price === null || price === undefined || price === '') return '-';
        const n = Number(price);
        return Number.isFinite(n) ? `¥${n.toFixed(2)}` : '-';
      },
    },
    {
      title: '入库数量',
      key: 'quantity',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <InputNumber
          min={1}
          placeholder="数量"
          value={selectedParts.get(record.id)}
          onChange={(value) => handleQuantityChange(record.id, value)}
          style={{ width: '100%' }}
        />
      ),
    },
  ];

  const dataSource: SelectablePartRow[] = filteredParts.map((part) => ({
    ...part,
    key: part.id,
    selectedQuantity: selectedParts.get(part.id),
  }));

  return (
    <Modal
      title="选择配件入库"
      open={open}
      onCancel={onClose}
      width={1200}
      styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button 
            type="primary" 
            onClick={handleConfirm}
            disabled={selectedParts.size === 0}
          >
            确认入库（已选 {selectedParts.size} 种配件）
          </Button>
        </Space>
      }
    >
      <Row gutter={16}>
        {/* 左侧：配件列表 */}
        <Col span={16}>
          {/* 搜索和筛选 */}
          <Space style={{ marginBottom: 12, width: '100%' }} size="middle">
            <Input
              placeholder="搜索配件编号、名称、品牌、型号..."
              prefix={<SearchOutlined />}
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 280 }}
            />
            <Select
              placeholder="筛选类别"
              allowClear
              value={filterCategory}
              onChange={setFilterCategory}
              style={{ width: 140 }}
              options={PART_CATEGORIES.map(cat => ({ label: cat, value: cat }))}
            />
            <Text type="secondary">
              共 {filteredParts.length} 个配件
            </Text>
          </Space>

          <Table
            size="small"
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            pagination={{ 
              pageSize: 8,
              showSizeChanger: false,
              showTotal: (total) => `共 ${total} 条`,
            }}
            scroll={{ y: 420, x: 900 }}
          />
        </Col>

        {/* 右侧：已选配件 */}
        <Col span={8}>
          <div style={{ 
            padding: 12, 
            background: '#fafafa', 
            border: '1px solid #eee', 
            borderRadius: 8,
            height: 520,
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: '1px solid #e0e0e0',
            }}>
              <Text strong>已选配件</Text>
              <Text type="secondary">{selectedParts.size} 种</Text>
            </div>

            <div style={{ 
              flex: 1,
              overflowY: 'auto',
              display: 'flex', 
              flexDirection: 'column', 
              gap: 8,
            }}>
              {selectedPartsDetail.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 0',
                  color: '#999',
                }}>
                  <Text type="secondary">尚未选择配件</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    在左侧列表输入数量后自动加入
                  </Text>
                </div>
              ) : (
                selectedPartsDetail.map(part => (
                  <div 
                    key={part.id} 
                    style={{ 
                      padding: 10,
                      background: '#fff',
                      border: '1px solid #e8e8e8',
                      borderRadius: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ fontSize: 13 }}>{part.code}</Text>
                      <Tag color="blue">{part.category}</Tag>
                    </div>
                    <Text style={{ fontSize: 12, color: '#666' }}>
                      {part.name || '-'}
                    </Text>
                    {(part.brand || part.model) && (
                      <Text style={{ fontSize: 12, color: '#999' }}>
                        {part.brand || ''} {part.brand && part.model ? '/' : ''} {part.model || ''}
                      </Text>
                    )}
                    <div style={{ 
                      marginTop: 4,
                      paddingTop: 6,
                      borderTop: '1px dashed #e8e8e8',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>入库数量：</Text>
                      <Text strong style={{ color: '#1890ff' }}>{part.quantity}</Text>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Col>
      </Row>
    </Modal>
  );
};

export default PartSelectModal;
