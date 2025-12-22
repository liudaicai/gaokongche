import React, { useEffect, useState } from 'react';
import { Modal, Table, Button, Space, Tag, App, InputNumber, Input } from 'antd';
import { CheckCircleOutlined, RollbackOutlined } from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { fetchPendingWriteoffs, returnPendingPart, fetchParts } from './partsSlice';
import WriteOffModal from './WriteOffModal';
import type { PartTransaction } from './types';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface PendingWriteoffsListProps {
  open: boolean;
  onClose: () => void;
}

const PendingWriteoffsList: React.FC<PendingWriteoffsListProps> = ({ open, onClose }) => {
  const dispatch = useAppDispatch();
  const { message: messageApi, modal } = App.useApp();
  const { pendingWriteoffs, pendingLoading } = useAppSelector((state) => state.parts);
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PartTransaction | null>(null);

  useEffect(() => {
    if (open) {
      dispatch(fetchPendingWriteoffs());
    }
  }, [open, dispatch]);

  // 打开核销弹窗
  const handleWriteOff = (record: PartTransaction) => {
    setSelectedTransaction(record);
    setShowWriteOffModal(true);
  };

  // 退回配件
  const handleReturn = (record: PartTransaction) => {
    let returnQuantity = record.quantity;
    let returnRemark = '';

    modal.confirm({
      title: '退回配件',
      icon: <RollbackOutlined />,
      content: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <div style={{ marginBottom: 8 }}>
              <strong>配件信息：</strong>
            </div>
            <div style={{ color: '#666' }}>
              {record.partCode} - {record.partName || '-'}
            </div>
            <div style={{ color: '#666', marginTop: 4 }}>
              {record.partBrand || ''} {record.partBrand && record.partModel ? '/' : ''} {record.partModel || ''}
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 8 }}>
              <strong>领用数量：</strong>{record.quantity}
            </div>
            <div style={{ marginBottom: 8, marginTop: 12 }}>退回数量：</div>
            <InputNumber
              min={1}
              max={record.quantity}
              defaultValue={record.quantity}
              style={{ width: '100%' }}
              onChange={(value) => {
                returnQuantity = value || record.quantity;
              }}
            />
          </div>

          <div>
            <div style={{ marginBottom: 8, marginTop: 12 }}>退回备注：</div>
            <TextArea
              rows={2}
              placeholder="请输入退回原因（可选）"
              onChange={(e) => {
                returnRemark = e.target.value;
              }}
            />
          </div>
        </Space>
      ),
      okText: '确认退回',
      cancelText: '取消',
      width: 500,
      onOk: async () => {
        try {
          await dispatch(returnPendingPart({
            transactionId: record.transactionId || record.id,
            quantity: returnQuantity,
            remark: returnRemark,
          })).unwrap();
          
          messageApi.success('退回成功');
          await dispatch(fetchPendingWriteoffs());
          await dispatch(fetchParts());
        } catch (error: any) {
          if (error.message) {
            messageApi.error(error.message);
          } else {
            messageApi.error('退回失败');
          }
        }
      },
    });
  };

  const columns: ColumnsType<PartTransaction> = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_text, _record, index) => index + 1,
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
      width: 140,
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '配件类别',
      dataIndex: 'partCategory',
      width: 100,
      render: (v) => v ? <Tag color="blue">{v}</Tag> : '-',
    },
    {
      title: '品牌/规格型号',
      key: 'brandModel',
      width: 180,
      ellipsis: true,
      render: (_, record) => {
        const brand = record.partBrand || '';
        const model = record.partModel || '';
        return `${brand}${brand && model ? ' / ' : ''}${model}` || '-';
      },
    },
    {
      title: '领用门店',
      dataIndex: 'storeName',
      width: 120,
      render: (v) => v || '-',
    },
    {
      title: '领用人',
      dataIndex: 'operatorRealName',
      width: 100,
      render: (v, record) => v || record.operatorName || '-',
    },
    {
      title: '领用时间',
      dataIndex: 'transactionTime',
      width: 120,
      render: (time) => time ? dayjs(time).format('YYYY/MM/DD') : '-',
    },
    {
      title: '领用数量',
      dataIndex: 'quantity',
      width: 80,
      align: 'center',
      render: (qty) => <Tag color="orange">{qty}</Tag>,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 150,
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button 
            size="small" 
            type="primary" 
            icon={<CheckCircleOutlined />}
            onClick={() => handleWriteOff(record)}
          >
            核销
          </Button>
          <Button 
            size="small" 
            icon={<RollbackOutlined />}
            onClick={() => handleReturn(record)}
          >
            退回
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title="待核销配件列表"
        open={open}
        onCancel={onClose}
        width={1400}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
        ]}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f0f7ff', borderRadius: 6 }}>
          <Space direction="vertical" size={4}>
            <div style={{ fontSize: 14, color: '#1890ff' }}>
              💡 <strong>待核销配件说明：</strong>
            </div>
            <div style={{ fontSize: 13, color: '#666' }}>
              • 领用的配件会先保存为"待核销"状态，不会立即扣除库存
            </div>
            <div style={{ fontSize: 13, color: '#666' }}>
              • 实际使用时点击"核销"，才会真正扣除库存
            </div>
            <div style={{ fontSize: 13, color: '#666' }}>
              • 未使用的配件可以点击"退回"，退回到门店库存
            </div>
          </Space>
        </div>

        <Table<PartTransaction>
          columns={columns}
          dataSource={pendingWriteoffs}
          rowKey={(record) => record.transactionId || record.id}
          loading={pendingLoading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条待核销记录`,
            defaultPageSize: 10,
            pageSizeOptions: ['10', '20', '50'],
          }}
          scroll={{ x: 1300, y: 450 }}
          locale={{
            emptyText: '暂无待核销配件',
          }}
        />
      </Modal>

      {/* 核销弹窗 */}
      <WriteOffModal
        open={showWriteOffModal}
        onClose={() => {
          setShowWriteOffModal(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
      />
    </>
  );
};

export default PendingWriteoffsList;
