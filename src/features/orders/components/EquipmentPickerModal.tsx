import React, { useMemo, useState } from 'react';
import { Modal, Table, Row, Col, Select, Checkbox, Button, Typography, Tag, Progress } from 'antd';
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

const EquipmentPickerModal: React.FC<Props> = ({ open, item, equipmentList, initialSelectedCodes, onCancel, onConfirm, allowedCodes, onlyWaitingDefault, forceWaitingOnly, defaultStoreIds }) => {
  // 修复：初始状态应该直接使用 onlyWaitingDefault，而不是在 useEffect 中再设置
  const [onlyWaiting, setOnlyWaiting] = useState(forceWaitingOnly ? true : (onlyWaitingDefault ?? true));
  const [filterHeight, setFilterHeight] = useState<string | undefined>(undefined); // 高度筛选
  const [selectedCodes, setSelectedCodes] = useState<string[]>(initialSelectedCodes || []);

  // 弹窗打开时重置状态
  React.useEffect(() => {
    if (open) {
      // 重置筛选条件
      setFilterHeight(undefined);
      setSelectedCodes(initialSelectedCodes || []);
      // 重置待租过滤默认值
      if (forceWaitingOnly) {
        setOnlyWaiting(true);
      } else {
        setOnlyWaiting(onlyWaitingDefault ?? true);
      }
    }
  }, [open, onlyWaitingDefault, forceWaitingOnly, initialSelectedCodes]);

  const requiredHeight = parseFloat(String(item.height ?? 0));
  const requiredCount = item.quantity || 0;
  const typeSpecified = !!item.equipmentType;
  const heightSpecified = item.height !== undefined && String(item.height).length > 0;

  const baseList = useMemo(() => {
    const list = Array.isArray(equipmentList) ? equipmentList : [];
    // 修复：'全部' 表示不限类型，不应该作为过滤条件
    const hasType = !!item.equipmentType && item.equipmentType !== '全部';
    const hasHeight = item.height !== undefined && String(item.height).length > 0;
    if (!hasType && !hasHeight) {
      // 当未指定类型/高度时，返回全部设备列表
      return list;
    }
    return list.filter(
      (e) => (!hasType || e.type === item.equipmentType) && (!hasHeight || Number(e.height) === requiredHeight)
    );
  }, [equipmentList, item.equipmentType, item.height, requiredHeight]);

  // 高度选项（所有场景通用）
  const heightOptions = useMemo(() => Array.from(new Set(baseList.map(e => String(e.height)))).filter(Boolean).sort((a, b) => parseFloat(a) - parseFloat(b)), [baseList]);


  const candidates = useMemo(() => {
    let list = baseList;
    // 修复：若提供了 allowedCodes（退场/报停/索赔场景），优先使用它过滤，且不应用 onlyWaiting 过滤
    if (allowedCodes && allowedCodes.length > 0) {
      const set = new Set(allowedCodes);
      list = list.filter(e => set.has(e.code));
    } else {
      // 进场场景：应用 onlyWaiting 过滤和固定的门店过滤
      // 修复：待租状态包括 'available' 和 'waiting' 两个值
      if (onlyWaiting) list = list.filter(e => e.rentalStatus === 'available' || e.rentalStatus === 'waiting');
      // 进场场景：根据 defaultStoreIds 固定筛选门店
      if (defaultStoreIds && defaultStoreIds.length > 0) {
        const set = new Set(defaultStoreIds.map(String));
        list = list.filter(e => e.storeId && set.has(String(e.storeId)));
      }
    }
    // 高度筛选（所有场景通用）
    if (filterHeight) {
      list = list.filter(e => String(e.height) === filterHeight);
    }
    return list;
  }, [baseList, onlyWaiting, defaultStoreIds, filterHeight, allowedCodes]);

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
      content: `出厂编号 ${code} 将从已选列表移除。`,
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


  // 根据场景选择显示的列：退场/报停/索赔场景只显示编码和自编码
  const columns: ColumnsType<any> = useMemo(() => {
    if (allowedCodes && allowedCodes.length > 0) {
      // 退场/报停/索赔场景：仅显示出厂编号和自编码
      return [
        { title: '出厂编号', dataIndex: 'code', key: 'code', width: 200 },
        { title: '自编码', dataIndex: 'customCode', key: 'customCode', width: 200 },
        { title: '高度', dataIndex: 'height', key: 'height', width: 120 },
      ];
    }
    // 进场等场景：显示完整信息
    return [
      { title: '出厂编号', dataIndex: 'code', key: 'code', width: 140 },
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
  }, [allowedCodes]);

  const data = candidates.map((e) => ({ key: e.code, ...e }));
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
            {/* 退场/报停/索赔场景：只显示高度筛选 */}
            {allowedCodes && allowedCodes.length > 0 ? (
              <>
                <Select
                  allowClear
                  placeholder="按高度筛选"
                  style={{ width: 180 }}
                  value={filterHeight}
                  onChange={setFilterHeight}
                  options={heightOptions.map(h => ({ label: `${h}米`, value: h }))}
                />
                <Typography.Text type="secondary">
                  共 {candidates.length} 台设备，已选 {selectedCodes.length} 台
                </Typography.Text>
              </>
            ) : (
              /* 进场等其他场景：只显示高度筛选和待租复选框 */
              <>
                <Select
                  allowClear
                  placeholder="按高度筛选"
                  style={{ width: 180 }}
                  value={filterHeight}
                  onChange={setFilterHeight}
                  options={heightOptions.map(h => ({ label: `${h}米`, value: h }))}
                />
                <Checkbox 
                  checked={onlyWaiting} 
                  onChange={(e) => setOnlyWaiting(e.target.checked)}
                  disabled={forceWaitingOnly}
                >
                  仅显示待租
                </Checkbox>
                <Typography.Text type="secondary">
                  已选 {selectedCodes.length} 台 / 建议 {requiredCount} 台
                </Typography.Text>
              </>
            )}
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