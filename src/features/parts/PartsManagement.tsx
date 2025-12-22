import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Space, Dropdown, InputNumber, Modal, Input, Tag, App, Row, Col, Select } from 'antd';
import { PlusOutlined, InboxOutlined, MoreOutlined, HistoryOutlined, DeleteOutlined, ExclamationCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchParts, usePart, returnPart, scrapPart, deletePart, fetchTransactions } from './partsSlice';
import AddPartModal from './AddPartModal';
import StockInModal from './StockInModal';
import PendingWriteoffsList from './PendingWriteoffsList';
import type { Part, PartStock, PartTransaction } from './types';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import dayjs from 'dayjs';

const { TextArea } = Input;

const PartsManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { message: messageApi, modal } = App.useApp();
  const { parts, loading, transactions, transactionsLoading } = useAppSelector((state) => state.parts);
  const stores = useAppSelector((state) => state.stores.stores);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showPendingWriteoffsModal, setShowPendingWriteoffsModal] = useState(false);
  const [operationModal, setOperationModal] = useState<{
    visible: boolean;
    type: 'use' | 'return' | 'scrap' | null;
    part: Part | null;
    storeId: number | null;
  }>({
    visible: false,
    type: null,
    part: null,
    storeId: null,
  });
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(undefined);
  const [operationQuantity, setOperationQuantity] = useState<number>(1);
  const [operationRemark, setOperationRemark] = useState<string>('');

  useEffect(() => {
    dispatch(fetchParts());
  }, [dispatch]);

  // 打开出入库记录
  const handleShowTransactions = () => {
    setShowTransactionsModal(true);
    dispatch(fetchTransactions());
  };

  // 打开操作弹窗
  const openOperationModal = (type: 'use' | 'return' | 'scrap', part: Part, storeId?: number) => {
    setOperationModal({
      visible: true,
      type,
      part,
      storeId: storeId || null,
    });
    setSelectedStoreId(storeId);
    setOperationQuantity(1);
    setOperationRemark('');
  };

  // 关闭操作弹窗
  const closeOperationModal = () => {
    setOperationModal({
      visible: false,
      type: null,
      part: null,
      storeId: null,
    });
    setSelectedStoreId(undefined);
    setOperationQuantity(1);
    setOperationRemark('');
  };

  // 执行操作
  const handleOperation = async () => {
    if (!operationModal.part || !operationModal.type) {
      return;
    }

    // 所有操作都需要选择门店
    if (!selectedStoreId) {
      messageApi.warning('请选择门店');
      return;
    }

    if (!operationQuantity || operationQuantity <= 0) {
      messageApi.warning('请输入有效的数量');
      return;
    }

    try {
      const data = {
        partId: operationModal.part.id,
        storeId: selectedStoreId,
        quantity: operationQuantity,
        remark: operationRemark,
      };

      switch (operationModal.type) {
        case 'use':
          await dispatch(usePart(data)).unwrap();
          messageApi.success('领用成功');
          break;
        case 'return':
          await dispatch(returnPart(data)).unwrap();
          messageApi.success('退回成功');
          break;
        case 'scrap':
          await dispatch(scrapPart(data)).unwrap();
          messageApi.success('报废成功');
          break;
      }

      await dispatch(fetchParts());
      closeOperationModal();
    } catch (error: any) {
      if (error.message) {
        messageApi.error(error.message);
      } else {
        messageApi.error('操作失败');
      }
    }
  };

  // 删除配件
  const handleDelete = (record: Part) => {
    modal.confirm({
      title: '确认删除配件',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确定要删除以下配件吗？</p>
          <p style={{ marginTop: 8 }}>
            <strong>配件编号：</strong>{record.code}<br />
            <strong>配件名称：</strong>{record.name || '-'}<br />
            <strong>配件类别：</strong>{record.category}
          </p>
          <p style={{ color: '#ff4d4f', marginTop: 12 }}>
            注意：如果该配件有库存，将无法删除
          </p>
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await dispatch(deletePart(record.id)).unwrap();
          messageApi.success('删除成功');
          await dispatch(fetchParts());
        } catch (error: any) {
          if (error.message) {
            messageApi.error(error.message);
          } else {
            messageApi.error('删除失败');
          }
        }
      },
    });
  };

  // 渲染库存信息
  const renderStocks = (stocks: PartStock[] | undefined) => {
    if (!stocks || stocks.length === 0) {
      return <Tag color="default">暂无库存</Tag>;
    }

    return (
      <Space direction="vertical" size={2}>
        {stocks.map((stock, index) => {
          const storeName = stock.storeName || '未知门店';
          return (
            <Tag key={`${stock.storeId}-${index}`} color={stock.quantity > 0 ? 'blue' : 'default'}>
              {storeName}：{stock.quantity}
            </Tag>
          );
        })}
      </Space>
    );
  };

  // 操作菜单
  const getOperationMenu = (record: Part): MenuProps => {
    const stocks = record.stocks || [];
    const menuItems: MenuProps['items'] = [];
    const hasStock = stocks.some(stock => stock.quantity > 0);

    // 领用、退回、报废 - 统一在弹窗中选择门店
    if (hasStock) {
      menuItems.push(
        {
          key: 'use',
          label: '领用',
          onClick: () => openOperationModal('use', record),
        },
        {
          key: 'return',
          label: '退回',
          onClick: () => openOperationModal('return', record),
        },
        {
          key: 'scrap',
          label: '报废',
          onClick: () => openOperationModal('scrap', record),
          danger: true,
        }
      );
    }

    // 如果没有库存操作项，显示提示
    if (menuItems.length === 0) {
      menuItems.push({
        key: 'no-stock',
        label: '暂无可用库存',
        disabled: true,
      });
    }

    // 添加分隔符和删除选项（删除始终显示）
    if (menuItems.length > 0 && menuItems[0].key !== 'no-stock') {
      menuItems.push({
        type: 'divider' as const,
      });
    }

    menuItems.push({
      key: 'delete',
      label: '删除配件',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDelete(record),
    });

    return { items: menuItems };
  };

  const columns: ColumnsType<Part> = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_text, _record, index) => index + 1,
    },
    {
      title: '配件编号',
      dataIndex: 'code',
      width: 120,
    },
    {
      title: '配件类别',
      dataIndex: 'category',
      width: 100,
      filters: [
        { text: '电控系统', value: '电控系统' },
        { text: '液压系统', value: '液压系统' },
        { text: '结构件', value: '结构件' },
        { text: '易损件', value: '易损件' },
      ],
      onFilter: (value, record) => record.category === value,
    },
    {
      title: '配件名称',
      dataIndex: 'name',
      width: 160,
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '品牌/规格型号',
      key: 'brandModel',
      width: 200,
      render: (_, record) => {
        const brand = record.brand || '';
        const model = record.model || '';
        return `${brand}${brand && model ? ' / ' : ''}${model}` || '-';
      },
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
      title: '库存数量',
      key: 'stocks',
      width: 200,
      render: (_, record) => renderStocks(record.stocks),
    },
    {
      title: '总库存',
      dataIndex: 'totalQuantity',
      width: 80,
      align: 'center',
      sorter: (a, b) => (a.totalQuantity || 0) - (b.totalQuantity || 0),
      render: (quantity) => quantity || 0,
    },
    {
      title: '适用范围',
      dataIndex: 'applicableRange',
      width: 150,
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Dropdown menu={getOperationMenu(record)} trigger={['click']}>
          <Button type="link" icon={<MoreOutlined />}>
            操作
          </Button>
        </Dropdown>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Card variant="outlined">
        <Row align="middle" justify="space-between" style={{ marginBottom: 12 }}>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowAddModal(true)}
            >
              新增配件
            </Button>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<CheckCircleOutlined />} 
                onClick={() => setShowPendingWriteoffsModal(true)}
              >
                待核销配件
              </Button>
              <Button icon={<HistoryOutlined />} onClick={handleShowTransactions}>
                出入库记录
              </Button>
              <Button
                type="default"
                icon={<InboxOutlined />}
                onClick={() => setShowStockInModal(true)}
              >
                入库
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={parts}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            defaultPageSize: 20,
          }}
          scroll={{ x: 1360 }}
        />
      </Card>

      {/* 新增配件弹窗 */}
      <AddPartModal open={showAddModal} onClose={() => setShowAddModal(false)} />

      {/* 入库弹窗 */}
      <StockInModal open={showStockInModal} onClose={() => setShowStockInModal(false)} />

      {/* 待核销配件列表 */}
      <PendingWriteoffsList 
        open={showPendingWriteoffsModal} 
        onClose={() => setShowPendingWriteoffsModal(false)} 
      />

      {/* 操作弹窗（领用、退回、报废） */}
      <Modal
        title={
          operationModal.type === 'use'
            ? '配件领用'
            : operationModal.type === 'return'
            ? '配件退回'
            : '配件报废'
        }
        open={operationModal.visible}
        onOk={handleOperation}
        onCancel={closeOperationModal}
        width={500}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <div style={{ marginBottom: 8, color: '#666' }}>配件编号</div>
            <div style={{ fontWeight: 500 }}>{operationModal.part?.code}</div>
          </div>

          <div>
            <div style={{ marginBottom: 8, color: '#666' }}>配件类别</div>
            <Tag color="blue">{operationModal.part?.category}</Tag>
          </div>

          <div>
            <div style={{ marginBottom: 8, color: '#666' }}>配件名称</div>
            <div style={{ fontWeight: 500 }}>{operationModal.part?.name || '-'}</div>
          </div>

          <div>
            <div style={{ marginBottom: 8, color: '#666' }}>品牌/规格型号</div>
            <div>
              {operationModal.part?.brand || ''}{' '}
              {operationModal.part?.brand && operationModal.part?.model ? '/' : ''}{' '}
              {operationModal.part?.model || ''}
            </div>
          </div>

          {/* 门店选择（领用、退回、报废都需要） */}
          <div>
            <div style={{ marginBottom: 8, color: '#666' }}>选择门店 *</div>
            <Select
              placeholder={`请选择${operationModal.type === 'use' ? '领用' : operationModal.type === 'return' ? '退回' : '报废'}门店`}
              value={selectedStoreId}
              onChange={setSelectedStoreId}
              style={{ width: '100%' }}
              options={
                operationModal.part?.stocks
                  ?.filter(stock => stock.quantity > 0)
                  .map(stock => ({
                    label: `${stock.storeName}（库存：${stock.quantity}）`,
                    value: stock.storeId,
                  })) || []
              }
            />
          </div>

          <div>
            <div style={{ marginBottom: 8, color: '#666' }}>数量 *</div>
            <InputNumber
              min={1}
              value={operationQuantity}
              onChange={(value) => setOperationQuantity(value || 1)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <div style={{ marginBottom: 8, color: '#666' }}>备注</div>
            <TextArea
              rows={3}
              placeholder="请输入备注信息（选填）"
              value={operationRemark}
              onChange={(e) => setOperationRemark(e.target.value)}
            />
          </div>
        </Space>
      </Modal>

      {/* 出入库记录弹窗 */}
      <Modal
        title="配件出入库记录"
        open={showTransactionsModal}
        onCancel={() => setShowTransactionsModal(false)}
        width={1200}
        footer={[
          <Button key="close" onClick={() => setShowTransactionsModal(false)}>
            关闭
          </Button>,
        ]}
      >
        <Table<PartTransaction>
          columns={[
            {
              title: '序号',
              key: 'index',
              width: 60,
              align: 'center',
              render: (_text, _record, index) => index + 1,
            },
            {
              title: '操作类型',
              dataIndex: 'transactionType',
              width: 100,
              render: (type: string) => {
                const typeMap = {
                  stock_in: { text: '入库', color: 'green' },
                  use: { text: '领用', color: 'blue' },
                  return: { text: '退回', color: 'orange' },
                  scrap: { text: '报废', color: 'red' },
                };
                const config = typeMap[type] || { text: type, color: 'default' };
                return <Tag color={config.color}>{config.text}</Tag>;
              },
            },
            {
              title: '配件编号',
              dataIndex: 'partCode',
              width: 120,
              render: (v) => v || '-',
            },
            {
              title: '配件名称',
              dataIndex: 'partName',
              width: 150,
              ellipsis: true,
              render: (v) => v || '-',
            },
            {
              title: '品牌/规格型号',
              key: 'brandModel',
              width: 180,
              ellipsis: true,
              render: (_,record) => {
                const brand = record.partBrand || '';
                const model = record.partModel || '';
                return `${brand}${brand && model ? ' / ' : ''}${model}` || '-';
              },
            },
            {
              title: '门店',
              dataIndex: 'storeName',
              width: 120,
              render: (v) => v || '-',
            },
            {
              title: '操作时间',
              dataIndex: 'transactionTime',
              width: 120,
              render: (time) => time ? dayjs(time).format('YYYY-MM-DD') : '-',
            },
            {
              title: '数量',
              dataIndex: 'quantity',
              width: 80,
              align: 'center',
              render: (qty: number) => {
                const isPositive = qty > 0;
                return (
                  <span style={{ color: isPositive ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>
                    {isPositive ? `+${qty}` : qty}
                  </span>
                );
              },
            },
            {
              title: '操作人',
              dataIndex: 'operatorName',
              width: 100,
              render: (v) => v || '-',
            },
            {
              title: '备注',
              dataIndex: 'remark',
              width: 150,
              ellipsis: true,
              render: (v) => v || '-',
            },
          ]}
          dataSource={transactions}
          rowKey="id"
          loading={transactionsLoading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            defaultPageSize: 10,
          }}
          scroll={{ x: 1200, y: 500 }}
        />
      </Modal>
    </div>
  );
};

export default PartsManagement;
