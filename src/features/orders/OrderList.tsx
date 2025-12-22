import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button, Card, message, Popconfirm, Modal, Form, Select, Dropdown } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AppDispatch, RootState } from '../../app/store';
import {
  fetchOrders,
  deleteOrder,
  updateOrder,
  selectOrders,
  selectOrdersLoading
} from './ordersSlice';
import { Order, OrderFormData, OrderEquipmentItem, EquipmentFilter } from './types';
import { apiGet } from '../../api/client';
import { useTabs } from '../common/TabsContext';
import EntryOperationTab from './tabs/EntryOperationTab';
import ExitOperationTab from './tabs/ExitOperationTab';
import ReceiptOperationTab from './tabs/ReceiptOperationTab';
import RefundOperationTab from './tabs/RefundOperationTab';
import SuspensionOperationTab from './tabs/SuspensionOperationTab';
import ClaimOperationTab from './tabs/ClaimOperationTab';
import SettlementTab from './tabs/SettlementTab';
import ClearanceOperationTab from './tabs/ClearanceOperationTab';
import ContractPreviewTab from './tabs/ContractPreviewTab';
import NewOrderTab from './tabs/NewOrderTab';
import InvoiceManagement from './InvoiceManagement';
// 引入门店管理-公司认证数据源
import { fetchCompanyVerifications } from '../stores/storesSlice';
import { fetchCustomers } from '../customers/customerSlice';
import OrderDetailTab from './tabs/OrderDetailTab';
import OrderRepairModal from './components/OrderRepairModal';

const OrderList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const orders = useSelector(selectOrders);
  const loading = useSelector(selectOrdersLoading);
  const { openTab } = useTabs();
  const deleteLockRef = useRef<number>(0);

  // 调试信息
  useEffect(() => {
    console.log('[OrderList] Orders updated:', orders);
    console.log('[OrderList] Orders count:', orders.length);
    console.log('[OrderList] Orders data:', JSON.stringify(orders.slice(0, 1), null, 2));
    if (orders.length > 0) {
      console.log('[OrderList] First order details:', orders[0]);
    }
  }, [orders]);

  const [isEquipmentModalVisible, setIsEquipmentModalVisible] = useState(false);
  const [selectedOrderForRepair, setSelectedOrderForRepair] = useState<Order | null>(null);
  const [orderForm] = Form.useForm<OrderFormData>();
  // equipmentItemsWatch removed; watching is handled inside Form via EstimatedAmount
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentFilter>({
    equipmentType: '',
    height: '',
    status: '待租'
  });
  // 移除expandedRows状态，不需要点击展开

  // 模拟设备数据
  const mockEquipmentData = [
    { id: 'eq1', type: '剪刀车', height: '8米', status: '待租' },
    { id: 'eq2', type: '剪刀车', height: '10米', status: '待租' },
    { id: 'eq3', type: '剪刀车', height: '12米', status: '待租' },
    { id: 'eq4', type: '直臂车', height: '16米', status: '待租' },
    { id: 'eq5', type: '直臂车', height: '20米', status: '待租' },
    { id: 'eq6', type: '曲臂车', height: '14米', status: '待租' },
    { id: 'eq7', type: '曲臂车', height: '18米', status: '待租' },
    { id: 'eq8', type: '蜘蛛车', height: '22米', status: '待租' },
  ];

  // 设备类型和高度选项
  const equipmentTypes = ['剪刀车', '直臂车', '曲臂车', '蜘蛛车', '高空作业平台'];
  const heights = ['8米', '10米', '12米', '14米', '16米', '18米', '20米', '22米', '24米'];

  // 加载数据
  useEffect(() => {
    console.log('[OrderList] Fetching orders...');
    dispatch(fetchOrders());
    dispatch(fetchCustomers() as any);
    dispatch(fetchCompanyVerifications());
  }, [dispatch]);

  // 监听订单数据变化，确保列表更新
  const prevOrdersRef = useRef(orders);
  useEffect(() => {
    if (prevOrdersRef.current !== orders) {
      // 订单数据已更新，强制重新渲染
      prevOrdersRef.current = orders;
    }
  }, [orders]);

  // 打开订单详情标签页
  const openOrderDetailTab = (order: Order) => {
    const key = `order-detail-${order.id}`;
    openTab({
      key,
      label: `订单详情：${order.customerName}/${order.projectName}`,
      content: <OrderDetailTab orderId={order.id} tabKey={key} initialOrder={order} />,
    });
  };

  // 处理新增订单
  const handleAddOrder = () => {
    const tabKey = `order-new-${Date.now()}`;
    openTab({
      key: tabKey,
      label: '新增订单',
      content: <NewOrderTab tabKey={tabKey} />
    });
  };

  // 处理删除订单
  const handleDeleteOrder = async (orderId: string) => {
    try {
      await dispatch(deleteOrder(orderId)).unwrap();
      message.success('订单删除成功');
    } catch (error) {
      message.error('订单删除失败');
    }
  };

  // 批量删除空订单（无任何关联单据）
  const bulkDeleteEmptyOrders = async () => {
    // 权限检查已放开，方便测试
    try {
      const empties: Order[] = [];
      for (const o of orders) {
        try {
          const check = await apiGet<{ ok: boolean; data?: any; error?: string }>(`/orders/${o.id}/delete-check`);
          if (!check?.ok || !check?.data) continue;
          const associations = check.data.associations || {};
          const total = Object.values(associations).map(v => Number(v) || 0).reduce((a, b) => a + b, 0);
          if (total === 0) empties.push(o);
        } catch { /* 忽略单个检查错误，继续 */ }
      }
      if (empties.length === 0) {
        Modal.info({ title: '未发现空订单', content: '当前列表中没有可删除的空订单（无关联单据）。' });
        return;
      }
      Modal.confirm({
        title: `确认删除 ${empties.length} 个空订单？此操作不可撤销`,
        okText: '确认删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          let ok = 0, fail = 0;
          for (const o of empties) {
            try {
              await dispatch(deleteOrder(o.id)).unwrap();
              ok++;
            } catch {
              fail++;
            }
          }
          message.success(`批量删除完成：成功 ${ok}，失败 ${fail}`);
          // 刷新列表，确保展示最新数据
          try { await dispatch(fetchOrders()).unwrap(); } catch { }
        },
      });
    } catch (e: any) {
      Modal.error({ title: '批量删除失败', content: e?.message || '网络或服务器异常，请稍后重试' });
    }
  };

  // 权限判定（角色或权限字符串）
  const { user: authUser } = useSelector((s: RootState) => s.auth);
  const roleFromLS = (() => { try { const u = localStorage.getItem('user'); return u ? (JSON.parse(u)?.role) : undefined; } catch { return undefined; } })();
  const permsFromLS = (() => { try { const u = localStorage.getItem('user'); return u ? (JSON.parse(u)?.permissions || []) : []; } catch { return []; } })();
  const userRole = authUser?.role ?? roleFromLS ?? '';
  const userPerms: string[] = (authUser?.permissions as any) || permsFromLS;
  const canDelete = userRole === 'superadmin' || (userPerms || []).includes('合同管理-删除');

  // 删除前预检查 + 二次确认
  const preCheckAndConfirmDelete = async (record: Order) => {
    // 权限检查已放开，方便测试
    Modal.confirm({
      title: '确认要删除该订单吗？此操作不可撤销',
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        const now = Date.now();
        if (now - (deleteLockRef.current || 0) < 300) return;
        deleteLockRef.current = now;
        await handleDeleteOrder(record.id);
      },
    });
  };

  const handleActionClick = (key: string, record: Order) => {
    if (key === 'entry') {
      const tabKey = `order-entry-${record.id}`;
      openTab({
        key: tabKey,
        label: `进场：${record.projectName || record.contractNumber || record.customerName || record.id}`,
        content: <EntryOperationTab tabKey={tabKey} order={record} />
      });
      return;
    }
    if (key === 'exit') {
      const tabKey = `order-exit-${record.id}`;
      openTab({
        key: tabKey,
        label: `退场：${record.projectName || record.contractNumber || record.customerName || record.id}`,
        content: <ExitOperationTab tabKey={tabKey} order={record} />
      });
      return;
    }
    if (key === 'payment') {
      const tabKey = `order-payment-${record.id}`;
      openTab({
        key: tabKey,
        label: `收款：${record.projectName || record.contractNumber || record.customerName || record.id}`,
        content: <ReceiptOperationTab tabKey={tabKey} order={record} />
      });
      return;
    }
    if (key === 'refund') {
      const tabKey = `order-refund-${record.id}`;
      openTab({
        key: tabKey,
        label: `退款：${record.projectName || record.contractNumber || record.customerName || record.id}`,
        content: <RefundOperationTab tabKey={tabKey} order={record} />
      });
      return;
    }
    if (key === 'stop') {
      const tabKey = `order-suspension-${record.id}`;
      openTab({
        key: tabKey,
        label: `报停：${record.projectName || record.contractNumber || record.customerName || record.id}`,
        content: <SuspensionOperationTab tabKey={tabKey} order={record} />
      });
      return;
    }
    if (key === 'claim') {
      const tabKey = `order-claim-${record.id}`;
      openTab({
        key: tabKey,
        label: `索赔：${record.projectName || record.contractNumber || record.customerName || record.id}`,
        content: <ClaimOperationTab tabKey={tabKey} order={record} />
      });
      return;
    }
    if (key === 'settlement') {
      const tabKey = `order-settlement-${record.id}`;
      openTab({
        key: tabKey,
        label: `结算：${record.projectName || record.contractNumber || record.customerName || record.id}`,
        content: <SettlementTab tabKey={tabKey} order={record} />
      });
      return;
    }
    if (key === 'contract') {
      const tabKey = `order-contract-${record.id}`;
      openTab({
        key: tabKey,
        label: `合同预览：${record.projectName || record.contractNumber || record.customerName || record.id}`,
        content: <ContractPreviewTab tabKey={tabKey} order={record} />
      });
      return;
    }
    if (key === 'closing') {
      const tabKey = `order-clearance-${record.id}`;
      openTab({
        key: tabKey,
        label: `结清：${record.projectName || record.contractNumber || record.customerName || record.id}`,
        content: <ClearanceOperationTab tabKey={tabKey} order={record} />
      });
      return;
    }
    if (key === 'change') {
      // 变更功能：打开订单编辑页面
      const tabKey = `order-edit-${record.id}`;
      openTab({
        key: tabKey,
        label: `变更：${record.projectName || record.contractNumber || record.customerName || record.id}`,
        content: <NewOrderTab tabKey={tabKey} orderId={record.id} />
      });
      return;
    }
    if (key === 'invoice') {
      const tabKey = `order-invoice-${record.id}`;
      openTab({
        key: tabKey,
        label: `发票管理：${record.projectName || record.contractNumber || record.customerName || record.id}`,
        content: <InvoiceManagement orderId={record.id} />
      });
      return;
    }
    if (key === 'archive') {
      handleArchiveOrder(record);
      return;
    }
    if (key === 'delete') {
      preCheckAndConfirmDelete(record);
      return;
    }
    if (key === 'repair') {
      setSelectedOrderForRepair(record);
      return;
    }
    // 其他操作可在此扩展
  };

  // 归档订单
  const handleArchiveOrder = async (order: Order) => {
    try {
      const updated = { ...order, archivedAt: new Date().toISOString() };
      await dispatch(updateOrder(updated)).unwrap();
      message.success('订单已归档');
    } catch (error) {
      message.error('订单归档失败');
    }
  };

  // 不需要handleRowExpand函数，改为悬停显示


  // 处理选择设备
  const handleSelectEquipment = (selectedEquipment: typeof mockEquipmentData[0]) => {
    const currentItems = orderForm.getFieldValue('equipmentItems') || [];
    const newItem: OrderEquipmentItem = {
      id: Date.now().toString(),
      equipmentType: selectedEquipment.type,
      equipmentCategory: selectedEquipment.type || '高空车', // 使用 type 作为类别
      height: selectedEquipment.height,
      quantity: 1,
      dailyRate: 500,
      monthlyRate: 12000,
      deposit: 5000,
      shippingFee: 1000,
      modificationFee: 500,
      scheduledEntryDate: '',
      estimatedExitDate: '',
      rentalPeriod: 30,
      shippingType: '双程'
    };

    orderForm.setFieldsValue({
      equipmentItems: [...currentItems, newItem]
    });
    setIsEquipmentModalVisible(false);
  };


  // 订单列表列配置
  const columns: ColumnsType<Order> = React.useMemo(() => [
    {
      title: '序号',
      key: 'index',
      render: (_, __, index) => index + 1,
      width: 80,
    },
    {
      title: '创建日期',
      dataIndex: ['creationDate'],
      key: 'creationDate',
    },
    {
      title: '客户名称/项目名称',
      key: 'customerProject',
      render: (_, record) => (
        <div>
          <div>{record.customerName}</div>
          <div className="text-gray-500 text-sm">{record.projectName}</div>
        </div>
      ),
    },
    {
      title: '合同编号/负责人',
      key: 'contractManager',
      render: (_, record) => (
        <div>
          <div>
            <Button type="link" onClick={(e) => { e.stopPropagation(); openOrderDetailTab(record); }}>{record.contractNumber}</Button>
          </div>
          <div className="text-gray-500 text-sm">{record.businessManagerName}</div>
        </div>
      ),
    },
    {
      title: '进场/退场数量',
      key: 'entryExit',
      render: (_, record) => {
        const entry = record?.status?.entryCount ?? 0;
        const exit = record?.status?.exitCount ?? 0;
        return <div>{entry} / {exit}</div>;
      },
    },
    {
      title: '履约状态',
      key: 'performanceStatus',
      dataIndex: ['status', 'performanceStatus'],
      render: (status) => {
        const s = status ?? '履约';
        return (
          <span className={s === '履约' ? 'text-green-500' : 'text-red-500'}>
            {s}
          </span>
        );
      },
    },
    {
      title: '实收金额',
      key: 'actualReceivedAmount',
      dataIndex: ['status', 'actualReceivedAmount'],
      render: (amount) => `¥${(amount ?? 0).toLocaleString()}`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <span onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
          <Dropdown
            menu={{
              items: [
                { key: 'contract', label: <Button size="small">合同预览</Button> },
                { key: 'entry', label: <Button size="small">进场</Button> },
                { key: 'exit', label: <Button size="small">退场</Button> },
                { key: 'payment', label: <Button size="small">收款</Button> },
                { key: 'refund', label: <Button size="small">退款</Button> },
                { key: 'stop', label: <Button size="small">报停</Button> },
                { key: 'claim', label: <Button size="small">索赔</Button> },
                { key: 'settlement', label: <Button size="small">结算</Button> },
                { key: 'closing', label: <Button size="small">结清</Button> },
                { key: 'invoice', label: <Button size="small">发票</Button> },
                { key: 'repair', label: <Button size="small">报修</Button> },
                { key: 'change', label: <Button size="small">变更</Button> },
                {
                  key: 'archive',
                  label: (
                    <Popconfirm
                      title="确认归档该订单？"
                      onConfirm={() => handleArchiveOrder(record)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button size="small">归档</Button>
                    </Popconfirm>
                  )
                },
                {
                  key: 'delete',
                  label: (
                    <Button
                      size="small"
                      type="primary"
                      danger
                      style={{ minWidth: 48, minHeight: 48 }}
                    >
                      删除
                    </Button>
                  )
                },
              ],
              onClick: ({ key }) => handleActionClick(key as string, record),
            }}
            placement="bottom"
            trigger={['click']}
          >
            <Button size="small" onClick={(e) => e.stopPropagation()}>操作</Button>
          </Dropdown>
        </span>
      ),
    },
  ], [openOrderDetailTab, canDelete]);

  // 过滤设备数据
  const filteredEquipment = mockEquipmentData.filter(equipment => {
    if (equipmentFilter.equipmentType && equipment.type !== equipmentFilter.equipmentType) return false;
    if (equipmentFilter.height && equipment.height !== equipmentFilter.height) return false;
    if (equipmentFilter.status === '待租' && equipment.status !== '待租') return false;
    return true;
  });

  return (
    <Card
      title="订单列表"
      extra={
        <span style={{ display: 'inline-flex', gap: 8 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddOrder}>
            新增订单
          </Button>
          <Button danger onClick={bulkDeleteEmptyOrders} disabled={!canDelete}>
            清理空订单
          </Button>
        </span>
      }
    >
      <Table
        key={`orders-table-${orders.length}-${orders.map(o => o.id).join(',')}`}
        columns={columns}
        dataSource={Array.isArray(orders) ? orders : []}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1200 }}
        locale={{ emptyText: orders.length === 0 ? '暫无数据' : '加载中...' }}
        onRow={(record) => ({
          onClick: () => openOrderDetailTab(record),
        })}
      />

      {/* 设备选择模态框 */}
      <Modal
        forceRender
        title="选择设备"
        open={isEquipmentModalVisible}
        onOk={() => setIsEquipmentModalVisible(false)}
        onCancel={() => setIsEquipmentModalVisible(false)}
        width={800}
        footer={null}
      >
        <Card size="small" className="mb-4">
          <Form layout="inline" form={orderForm}>
            <Form.Item label="设备类型">
              <Select
                value={equipmentFilter.equipmentType}
                onChange={value => setEquipmentFilter({ ...equipmentFilter, equipmentType: value })}
                style={{ width: 120 }}
              >
                <Select.Option value="">全部</Select.Option>
                {equipmentTypes.map(type => <Select.Option key={type} value={type}>{type}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item label="高度">
              <Select
                value={equipmentFilter.height}
                onChange={value => setEquipmentFilter({ ...equipmentFilter, height: value })}
                style={{ width: 120 }}
              >
                <Select.Option value="">全部</Select.Option>
                {heights.map(h => <Select.Option key={h} value={h}>{h}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item>
              <Button type="primary">搜索</Button>
            </Form.Item>
          </Form>
        </Card>
        <Table
          columns={[
            { title: '设备类型', dataIndex: 'type', key: 'type' },
            { title: '高度', dataIndex: 'height', key: 'height' },
            { title: '状态', dataIndex: 'status', key: 'status' },
            {
              title: '操作',
              key: 'action',
              render: (_, record) => (
                <Button type="link" onClick={() => handleSelectEquipment(record)}>
                  选择
                </Button>
              ),
            },
          ]}
          dataSource={filteredEquipment}
          rowKey="id"
          pagination={{ pageSize: 5 }}
        />
      </Modal>

      {/* 报修模态框 */}
      {
        selectedOrderForRepair && (
          <OrderRepairModal
            open={!!selectedOrderForRepair}
            onCancel={() => setSelectedOrderForRepair(null)}
            order={selectedOrderForRepair}
          />
        )
      }
    </Card >
  );
};

export default OrderList;