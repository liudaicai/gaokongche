import React, { useMemo, useState, useDeferredValue } from 'react';
import { Modal, Table, Row, Col, Input, Select, Checkbox, Button, Typography, Tag, Progress } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Equipment } from '../../equipment/equipmentslice';
import { mapRentalStatus, renderEquipmentSource } from '../../equipment/utils';

interface Props {
  open: boolean;
  item: { equipmentType: string; height: string | number; quantity: number };
  equipmentList: Equipment[];
  initialSelectedCodes: string[];
  onCancel: () => void;
  onConfirm: (selectedCodes: string[]) => void;
  // 新增：允许选择的设备编码集合（用于退场，仅显示这些）
  allowedCodes?: string[];
  // 新增：默认是否仅显示待租（退场默认显示全部）
  onlyWaitingDefault?: boolean;
  // 新增：强制只显示待租设备，不允许用户更改（用于调拨场景）
  forceWaitingOnly?: boolean;
  // 新增：门店列表（用于"出库门店"筛选，支持多选）
  storeList?: Array<{ id: string; name: string }>;
  // 新增：默认门店筛选（通常取当前表单的出库门店）
  defaultStoreIds?: string[];
}

const EquipmentPickerModal: React.FC<Props> = ({ open, item, equipmentList, initialSelectedCodes, onCancel, onConfirm, allowedCodes, onlyWaitingDefault, forceWaitingOnly, storeList, defaultStoreIds }) => {
  const [search, setSearch] = useState('');
  const [onlyWaiting, setOnlyWaiting] = useState(onlyWaitingDefault ?? true);
  const [filterBrand, setFilterBrand] = useState<string | undefined>(undefined);
  const [filterModel, setFilterModel] = useState<string | undefined>(undefined);
  const [filterWarehouses, setFilterWarehouses] = useState<string[]>([]);
  const [filterStoreIds, setFilterStoreIds] = useState<string[]>(defaultStoreIds || []);
  const [selectedCodes, setSelectedCodes] = useState<string[]>(initialSelectedCodes || []);

  // 当弹窗打开或默认值变化时，重置待租过滤默认值
  React.useEffect(() => {
    if (forceWaitingOnly) {
      setOnlyWaiting(true); // 强制设置为true
    } else {
      setOnlyWaiting(onlyWaitingDefault ?? true);
    }
  }, [onlyWaitingDefault, forceWaitingOnly, open]);

  // 打开时同步默认门店筛选（按当前出库门店）
  React.useEffect(() => {
    setFilterStoreIds(defaultStoreIds || []);
  }, [defaultStoreIds, open]);

  const requiredHeight = parseFloat(String(item.height ?? 0));
  const requiredCount = item.quantity || 0;
  const typeSpecified = !!item.equipmentType;
  const heightSpecified = item.height !== undefined && String(item.height).length > 0;

  const baseList = useMemo(() => {
    const list = Array.isArray(equipmentList) ? equipmentList : [];
    const hasType = !!item.equipmentType;
    const hasHeight = item.height !== undefined && String(item.height).length > 0;
    if (!hasType && !hasHeight) {
      // 当未指定类型/高度时，返回全部设备列表（用于调拨场景）
      return list;
    }
    return list.filter(
      (e) => (!hasType || e.type === item.equipmentType) && (!hasHeight || Number(e.height) === requiredHeight)
    );
  }, [equipmentList, item.equipmentType, item.height, requiredHeight]);

  const brandOptions = useMemo(() => Array.from(new Set(baseList.map(e => e.brand))).filter(Boolean), [baseList]);
  const modelOptions = useMemo(() => Array.from(new Set(baseList.map(e => e.model))).filter(Boolean), [baseList]);
  const warehouseOptions = useMemo(() => Array.from(new Set(baseList.map(e => e.warehouse))).filter(Boolean), [baseList]);

  const computedStoreList = useMemo(() => {
    if (storeList && storeList.length > 0) return storeList;
    // 回退：从设备数据推导（有id时）
    const map = new Map<string, string>();
    baseList.forEach(e => {
      if (e.storeId) map.set(String(e.storeId), e.storeName || String(e.storeId));
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [storeList, baseList]);

  const storeOptions = useMemo(() => computedStoreList.map(s => ({ label: s.name, value: s.id })), [computedStoreList]);

  // 性能优化：对搜索输入使用延迟值，降低筛选频率
  const deferredSearch = useDeferredValue(search);

  const candidates = useMemo(() => {
    let list = baseList;
    if (onlyWaiting) list = list.filter(e => e.rentalStatus === 'waiting');
    if (filterBrand) list = list.filter(e => e.brand === filterBrand);
    if (filterModel) list = list.filter(e => e.model === filterModel);
    if (filterStoreIds && filterStoreIds.length > 0) {
      const set = new Set(filterStoreIds.map(String));
      list = list.filter(e => e.storeId && set.has(String(e.storeId)));
    }
    if (filterWarehouses && filterWarehouses.length > 0) {
      const set = new Set(filterWarehouses);
      list = list.filter(e => e.warehouse && set.has(e.warehouse));
    }
    if (deferredSearch) {
      const s = deferredSearch.trim();
      list = list.filter((e) => (e.code || '').includes(s) || (e.customCode || '').includes(s));
    }
    // 退场：若提供允许选择的编码集合，则仅保留该集合
    if (allowedCodes && allowedCodes.length > 0) {
      const set = new Set(allowedCodes);
      list = list.filter(e => set.has(e.code));
    }
    return list;
  }, [baseList, onlyWaiting, filterBrand, filterModel, filterStoreIds, filterWarehouses, deferredSearch, allowedCodes]);

  const selectedEquipments = useMemo(() => {
    const list = Array.isArray(equipmentList) ? equipmentList : [];
    return selectedCodes
      .map(code => list.find(e => e.code === code))
      .filter(Boolean) as Equipment[];
  }, [selectedCodes, equipmentList]);

  const handleRowSelectionChange = (keys: React.Key[]) => {
    const codes = (keys as string[]) || [];
    setSelectedCodes(codes);
  };

  const removeSelected = (code: string) => {
    Modal.confirm({
      title: '确认移除该设备？',
      content: `设备编码 ${code} 将从已选列表移除。`,
      okText: '移除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => setSelectedCodes(prev => prev.filter(c => c !== code)),
    });
  };

  const clearSelection = () => {
    Modal.confirm({
      title: '确认清空已选设备？',
      content: '清空后需要重新选择设备。',
      okText: '清空',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => setSelectedCodes([]),
    });
  };

  const autoPick = () => {
    const remaining = Math.max(requiredCount - selectedCodes.length, 0);
    if (remaining === 0) return;
    const available = candidates
      .map(e => e.code)
      .filter(code => !selectedCodes.includes(code));
    const pick = available.slice(0, remaining);
    setSelectedCodes(prev => [...prev, ...pick]);
  };


  const columns: ColumnsType<any> = [
    { title: '设备编码', dataIndex: 'code', key: 'code', width: 140 },
    { title: '自编码', dataIndex: 'customCode', key: 'customCode', width: 140 },
    { title: '品牌', dataIndex: 'brand', key: 'brand', width: 120 },
    { title: '型号', dataIndex: 'model', key: 'model', width: 150 },
    { title: '所属门店', dataIndex: 'storeName', key: 'storeName', width: 140, render: (v: string) => v || '—' },
    { title: '来源', dataIndex: 'source', key: 'source', width: 100, render: (v: string) => renderEquipmentSource(v) },
    { title: '仓库', dataIndex: 'warehouse', key: 'warehouse', width: 120 },
    { title: '高度', dataIndex: 'height', key: 'height', width: 100 },
    {
      title: '状态',
      dataIndex: 'rentalStatus',
      key: 'rentalStatus',
      width: 100,
      render: (v: string) => {
        const { text, color } = mapRentalStatus(v);
        return <Tag color={color}>{text}</Tag>;
      },
    },
  ];

  const storeNameMap = useMemo(() => new Map(computedStoreList.map(s => [String(s.id), s.name])), [computedStoreList]);
  const data = candidates.map((e) => ({ key: e.code, ...e, storeName: e.storeName || (e.storeId ? storeNameMap.get(String(e.storeId)) : undefined) }));
  const progressPercent = requiredCount > 0 ? Math.min(100, Math.round((selectedCodes.length / requiredCount) * 100)) : 0;

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={`选择设备（类型：${typeSpecified ? item.equipmentType : '全部'} / 高度：${heightSpecified ? item.height : '不限'}，建议选 ${requiredCount} 台，可超额）`}
      width={960}
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      footer={[
        <Button key="close" onClick={onCancel}>关闭</Button>,
        <Button key="clear" onClick={clearSelection}>清空所选</Button>,
        <Button key="auto" onClick={autoPick}>自动选择剩余</Button>,
        <Button key="ok" type="primary" onClick={() => onConfirm(selectedCodes)} disabled={selectedCodes.length === 0}>确认选择</Button>,
      ]}
    >
      <Row gutter={16}>
        <Col span={16}>
          <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Input.Search
              allowClear
              placeholder="搜索编码/自编码"
              onSearch={setSearch}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 240 }}
            />
            <Select
              allowClear
              placeholder="品牌"
              style={{ width: 140 }}
              value={filterBrand}
              onChange={setFilterBrand}
              options={brandOptions.map(b => ({ label: b, value: b }))}
            />
            <Select
              allowClear
              placeholder="型号"
              style={{ width: 160 }}
              value={filterModel}
              onChange={setFilterModel}
              options={modelOptions.map(m => ({ label: m, value: m }))}
            />
            <Select
              mode="multiple"
              allowClear
              placeholder="出库门店（可多选）"
              style={{ width: 220 }}
              value={filterStoreIds}
              onChange={(vals) => setFilterStoreIds(vals as string[])}
              options={storeOptions}
            />
            <Select
              mode="multiple"
              allowClear
              placeholder="设备所在仓库（可多选）"
              style={{ width: 220 }}
              value={filterWarehouses}
              onChange={(vals) => setFilterWarehouses(vals as string[])}
              options={warehouseOptions.map(w => ({ label: w, value: w }))}
            />
            <Checkbox 
              checked={onlyWaiting} 
              onChange={(e) => setOnlyWaiting(e.target.checked)}
              disabled={forceWaitingOnly} // 在调拨场景下禁用此选项
            >
              仅显示待租
            </Checkbox>
            <Typography.Text type="secondary">
              建议选 {requiredCount} 台，可超额；已选 {selectedCodes.length} 台
            </Typography.Text>
          </div>
          <Table
            size="small"
            rowKey="key"
            columns={columns}
            dataSource={data}
            pagination={{ pageSize: 10 }}
            rowSelection={{
              type: 'checkbox',
              selectedRowKeys: selectedCodes,
              onChange: handleRowSelectionChange,
              getCheckboxProps: (record) => {
                const code = (record as any)?.code;
                const disabled = !!(allowedCodes && allowedCodes.length > 0 && !allowedCodes.includes(code));
                return { disabled };
              },
            }}
            scroll={{ y: 420 }}
          />
        </Col>
        <Col span={8}>
          <div style={{ padding: 12, background: '#fafafa', border: '1px solid #eee', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Typography.Text>已选设备</Typography.Text>
              <Typography.Text type="secondary">{selectedCodes.length} / {requiredCount}</Typography.Text>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Progress percent={progressPercent} size="small" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
              {selectedEquipments.length === 0 ? (
                <Typography.Text type="secondary">尚未选择设备</Typography.Text>
              ) : selectedEquipments.map(e => (
                <div key={e.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{e.code} / {e.customCode}</span>
                    <span style={{ color: '#888', fontSize: 12 }}>{e.brand} / {e.model}</span>
                  </div>
                  <Button size="small" onClick={() => removeSelected(e.code)}>移除</Button>
                </div>
              ))}
            </div>
          </div>
        </Col>
      </Row>
    </Modal>
  );
};

export default EquipmentPickerModal;