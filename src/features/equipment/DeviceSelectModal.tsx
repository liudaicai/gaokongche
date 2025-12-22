import { useEffect, useMemo, useState } from 'react';
import { Modal, Input, Table, message, Checkbox, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { apiGet } from '../../api/client';

type DeviceRow = { id: string; code: string; customCode?: string };

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (devices: DeviceRow[]) => void;
  initialSelectedIds?: string[];
};

export default function DeviceSelectModal({ open, onCancel, onConfirm, initialSelectedIds = [] }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DeviceRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [exact, setExact] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>(initialSelectedIds);

  const fetchList = async () => {
    setLoading(true);
    try {
      const resp: any = await apiGet(`/devices?page=${page}&size=${pageSize}&q=${encodeURIComponent(q || '')}&exact=${exact ? 1 : 0}`);
      const list: DeviceRow[] = resp?.data || resp || [];
      setData(list);
      setTotal(Number(resp?.total || list.length));
    } catch (err: any) {
      message.error(err?.message || '获取设备列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchList();
  }, [open, page, pageSize, q, exact]);

  useEffect(() => {
    // 每次打开时初始化已选
    if (open) setSelectedRowKeys(initialSelectedIds);
  }, [open, initialSelectedIds]);

  const columns: ColumnsType<DeviceRow> = useMemo(() => [
    { title: '序号', key: 'idx', render: (_: any, __: DeviceRow, idx: number) => (page - 1) * pageSize + idx + 1, width: 80 },
    { title: '出厂编号', dataIndex: 'code', key: 'code' },
    { title: '自编号', dataIndex: 'customCode', key: 'customCode', render: (v: string) => v || '-' },
  ], [page, pageSize]);

  return (
    <Modal
      open={open}
      title="选择投保设备"
      onCancel={onCancel}
      onOk={() => {
        const map = new Map(data.map(d => [d.id, d]));
        const selected = selectedRowKeys.map(id => map.get(id)).filter(Boolean) as DeviceRow[];
        onConfirm(selected);
      }}
      width={720}
      okText={`确定（已选 ${selectedRowKeys.length} 台）`}
    >
      <div style={{ marginBottom: 12 }}>
        <Space wrap>
          <Input.Search placeholder="按自编号/出厂编号搜索（支持模糊/精确）" allowClear onSearch={(v) => { setPage(1); setQ(v || ''); }} style={{ width: 280 }} />
          <Checkbox checked={exact} onChange={e => { setExact(e.target.checked); setPage(1); }}>精确匹配自编号</Checkbox>
        </Space>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{ current: page, pageSize, total, showSizeChanger: true }}
        onChange={(p) => { setPage(p.current || 1); setPageSize(p.pageSize || 10); }}
        locale={{ emptyText: q ? '未找到匹配设备' : '暂无可用设备' }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as string[]),
        }}
      />
    </Modal>
  );
}