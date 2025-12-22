import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Form, Input, DatePicker, Table, Space, message, Modal, Skeleton, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import { apiGet, apiPost, apiDelete } from '../../api/client';
import { EditOutlined, ShareAltOutlined, DownloadOutlined, DeleteOutlined, DownOutlined } from '@ant-design/icons';
import AddPolicyModal from './AddPolicyModal';

type Policy = {
  id: number;
  number?: string;
  company: string;
  rate: number;
  startDate: string;
  endDate: string;
  equipments: { id: string; serial_no?: string; code?: string; customCode?: string }[];
};


export default function EquipmentPolicies() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Policy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<'company' | 'start_date' | 'end_date' | 'number'>('end_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tableWidth, setTableWidth] = useState<number>(0);
  const [loadError, setLoadError] = useState<string>('');
  const [actionBusy, setActionBusy] = useState<{ id: number; key: string } | null>(null);

  // 权限判定（角色或权限字符串）
  const { user: authUser } = useSelector((s: RootState) => s.auth);
  const roleFromLS = (() => { try { const u = localStorage.getItem('user'); return u ? (JSON.parse(u)?.role) : undefined; } catch { return undefined; } })();
  const permsFromLS = (() => { try { const u = localStorage.getItem('user'); return u ? (JSON.parse(u)?.permissions || []) : []; } catch { return []; } })();
  const userRole = authUser?.role ?? roleFromLS ?? '';
  const userPerms: string[] = (authUser?.permissions as any) || permsFromLS;
  const canEditPolicy = userRole === 'admin' || userRole === 'superadmin' || (userPerms || []).includes('保单管理-编辑');
  const canForwardPolicy = userRole === 'admin' || userRole === 'superadmin' || (userPerms || []).includes('保单管理-转发');
  const canDownloadPolicy = userRole === 'admin' || userRole === 'superadmin' || (userPerms || []).includes('保单管理-下载');
  const canDeletePolicy = userRole === 'admin' || userRole === 'superadmin' || (userPerms || []).includes('保单管理-删除') || (userPerms || []).includes('合同管理-删除');

  const fetchList = async () => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const company = (values.company || '').trim();
      const number = (values.number || '').trim();
      const range = values.dateRange || [];
      const query: Record<string, string> = {
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        sortOrder,
      } as any;
      if (company) query.company = company;
      if (number) query.number = number;
      if (range?.length === 2) {
        query.startDateFrom = dayjs(range[0]).format('YYYY-MM-DD');
        query.endDateTo = dayjs(range[1]).format('YYYY-MM-DD');
      }
      const qs = Object.entries(query).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
      const resp: any = await apiGet(`/policies?${qs}`);
      const list: Policy[] = resp?.data || resp || [];
      setData(list);
      setTotal(Number(resp?.total || list.length));
      setLoadError('');
    } catch (err: any) {
      const msg = err?.message || '获取保单列表失败';
      setLoadError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, [page, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    const refreshWidth = () => {
      const w = containerRef.current?.clientWidth || 0;
      setTableWidth(w);
    };
    refreshWidth();
    window.addEventListener('resize', refreshWidth);
    return () => window.removeEventListener('resize', refreshWidth);
  }, []);

  const columns: ColumnsType<Policy> = useMemo(() => {
    const w = Math.max(tableWidth, 800);
    const equipW = Math.floor(w * 0.50);
    const actionsW = 240; // 操作列固定宽度
    const restW = Math.max(w - equipW - actionsW, 360);
    const unit = Math.floor(restW / 5);
    const idxW = Math.max(Math.floor(unit * 0.6), 56);
    const companyW = Math.max(unit, 120);
    const numberW = Math.max(unit, 120);
    const rateW = Math.max(Math.floor(unit * 0.8), 100);
    const dateW = Math.max(unit, 160);
    return [
    {
      title: '序号',
      dataIndex: 'idx',
      key: 'idx',
      width: idxW,
      render: (_: any, __: Policy, index: number) => (page - 1) * pageSize + index + 1,
      responsive: ['md'],
    },
    {
      title: '保单编号',
      dataIndex: 'number',
      key: 'number',
      width: numberW,
      sorter: true,
      render: (text: string) => text || '-'
    },
    {
      title: '投保公司',
      dataIndex: 'company',
      key: 'company',
      width: companyW,
      render: (text: string, r) => (
        <a onClick={() => showDetail(r.id)}>{text}</a>
      ),
      sorter: true,
    },
    {
      title: '费率(%)',
      dataIndex: 'rate',
      key: 'rate',
      width: rateW,
      align: 'right',
      render: (v: number) => v?.toFixed?.(2) ?? v,
    },
    {
      title: '保单起止日期',
      dataIndex: 'date',
      key: 'date',
      width: dateW,
      render: (_: any, r: Policy) => `${r.startDate} - ${r.endDate}`,
      sorter: true,
    },
    {
      title: '投保设备',
      dataIndex: 'equipments',
      key: 'equipments',
      width: equipW,
      render: (list: Policy['equipments']) => {
        if (loading) return <Skeleton.Input active style={{ width: '60%' }} />;
        const allCodes = (list || [])
          .map(e => e.customCode || e.serial_no || e.code || String(e.id || ''))
          .filter(Boolean);
        const text = allCodes.join('、');
        return (
          <span
            title={text}
            style={{ display: 'inline-block', width: '100%', whiteSpace: 'normal', wordBreak: 'break-word' }}
          >
            {text || '暂无设备数据'}
          </span>
        );
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: actionsW,
      render: (_: any, r: Policy) => {
        const onEdit = () => {
          if (!canEditPolicy) { message.warning('您没有修改权限'); return; }
          setEditingId(r.id);
          setEditOpen(true);
        };
        const onForward = () => {
          if (!canForwardPolicy) { message.warning('您没有转发权限'); return; }
          let emails = '';
          Modal.confirm({
            title: '转发保单',
            content: (
              <Input placeholder="请输入收件邮箱，多个用逗号分隔" onChange={(e) => { emails = e.target.value; }} />
            ),
            onOk: async () => {
              try {
                setActionBusy({ id: r.id, key: 'forward' });
                const list = emails.split(',').map(s => s.trim()).filter(Boolean);
                await apiPost(`/policies/${r.id}/forward`, { toEmails: list });
                message.success('转发成功');
              } catch (err: any) {
                message.error(err?.message || '转发失败');
              } finally {
                setActionBusy(null);
              }
            }
          });
        };
        const onDownloadPdf = async () => {
          if (!canDownloadPolicy) { message.warning('您没有下载权限'); return; }
          try {
            setActionBusy({ id: r.id, key: 'download' });
            const d: any = await apiGet(`/policies/${r.id}`);
            const list = (d.equipments || []) as { customCode?: string; serial_no?: string; code?: string }[];
            const html = `<!doctype html><html><head><meta charset=\"utf-8\"><title>保单_${d.number || r.id}</title></head><body><h3>保单信息</h3><p>保单编号：${d.number || '-'}</p><p>投保公司：${d.company}</p><p>费率：${Number(d.rate)?.toFixed?.(2)}</p><p>起止日期：${d.startDate} - ${d.endDate}</p><h4>设备列表</h4><table border=\"1\" cellspacing=\"0\" cellpadding=\"6\"><thead><tr><th>自编码</th><th>序列号</th><th>设备编号</th></tr></thead><tbody>${list.map(e => `<tr><td>${e.customCode || ''}</td><td>${e.serial_no || ''}</td><td>${e.code || ''}</td></tr>`).join('')}</tbody></table></body></html>`;
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (win) {
              win.onload = () => { win.print?.(); };
              message.success('已打开打印视图，可另存为PDF');
            } else {
              message.warning('无法打开打印视图，请检查浏览器拦截');
            }
          } catch (err: any) {
            message.error(err?.message || '下载失败');
          } finally {
            setActionBusy(null);
          }
        };
        const onDelete = async () => {
          if (!canDeletePolicy) { message.warning('您没有删除权限'); return; }
          Modal.confirm({
            title: '确认删除该保单？',
            onOk: async () => {
              try {
                setActionBusy({ id: r.id, key: 'delete' });
                await apiDelete(`/policies/${r.id}`);
                message.success('删除成功');
                fetchList();
              } catch (err: any) {
                message.error(err?.message || '删除失败');
              } finally {
                setActionBusy(null);
              }
            }
          });
        };

        const items: MenuProps['items'] = [
          { key: 'edit', label: (<Space size={6}><EditOutlined /><span>修改</span></Space>), disabled: !canEditPolicy },
          { key: 'forward', label: (<Space size={6}><ShareAltOutlined /><span>转发</span></Space>), disabled: !canForwardPolicy },
          { key: 'download', label: (<Space size={6}><DownloadOutlined /><span>下载</span></Space>), disabled: !canDownloadPolicy },
          { type: 'divider' },
          { key: 'delete', label: (<Space size={6}><DeleteOutlined /><span>删除</span></Space>), disabled: !canDeletePolicy },
        ];

        const onClick: MenuProps['onClick'] = ({ key, domEvent }) => {
          domEvent.stopPropagation();
          if (key === 'edit') return onEdit();
          if (key === 'forward') return onForward();
          if (key === 'download') return onDownloadPdf();
          if (key === 'delete') return onDelete();
        };

        return (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Dropdown menu={{ items, onClick }} trigger={['click']}>
              <Button size="small" type="default" icon={<DownOutlined />} loading={actionBusy?.id === r.id}>操作</Button>
            </Dropdown>
          </div>
        );
      }
    }
  ];
  }, [page, pageSize, tableWidth, canEditPolicy, canForwardPolicy, canDownloadPolicy, canDeletePolicy]);

  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
    if (sorter?.field) {
      if (sorter.field === 'company') setSortBy('company');
      else if (sorter.field === 'number') setSortBy('number');
      else if (sorter.field === 'date') setSortBy('end_date');
      else setSortBy('end_date');
      setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
    }
  };

  const showDetail = async (id: number) => {
    try {
      const d: any = await apiGet(`/policies/${id}`);
      Modal.info({
        title: '保单详情',
        width: 600,
        content: (
          <div>
            <p>保单编号：{d.number || '-'}</p>
            <p>投保公司：{d.company}</p>
            <p>费率：{Number(d.rate)?.toFixed?.(2)}</p>
            <p>起止日期：{d.startDate} - {d.endDate}</p>
            <p>设备：{(d.equipments || []).map((e: any) => e.customCode || e.serial_no || e.code).join(', ') || '-'}</p>
            <p>附件：{(d.attachments || []).map((a: any) => a.name).join(', ') || '-'}</p>
          </div>
        )
      });
    } catch (err: any) {
      message.error(err?.message || '获取详情失败');
    }
  };

  // 操作功能通过下拉菜单提供：修改、转发、下载、删除

  return (
    <div ref={containerRef} style={{ padding: 16 }}>
      <Card style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline">
          <Form.Item name="number" label="保单编号">
            <Input allowClear placeholder="支持精确/模糊搜索" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="company" label="投保公司">
            <Input allowClear placeholder="支持模糊搜索" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="dateRange" label="日期范围">
            <DatePicker.RangePicker />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={() => { setPage(1); fetchList(); }}>查询</Button>
              <Button onClick={() => { form.resetFields(); setPage(1); fetchList(); }}>重置</Button>
              <Button type="primary" onClick={() => setAddOpen(true)}>新增保单</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {loadError && (
        <Card style={{ marginBottom: 16 }}>
          <Space>
            <span style={{ color: '#ff4d4f' }}>{loadError}</span>
            <Button onClick={() => fetchList()} type="primary">重试</Button>
          </Space>
        </Card>
      )}

      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{ current: page, pageSize, total, showSizeChanger: true }}
        style={{ tableLayout: 'fixed' }}
        scroll={{ x: Math.max(tableWidth, 800) }}
        onChange={handleTableChange}
      />

  <AddPolicyModal
    open={addOpen}
    onCancel={() => setAddOpen(false)}
    onSuccess={() => { setAddOpen(false); fetchList(); }}
    mode="create"
  />
      <AddPolicyModal
        open={editOpen}
        onCancel={() => { setEditOpen(false); setEditingId(undefined); }}
        onSuccess={() => { setEditOpen(false); setEditingId(undefined); fetchList(); }}
        mode="update"
        policyId={editingId}
      />
    </div>
  );
}