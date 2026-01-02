import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Table, Modal, Popconfirm, message, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../app/store';
import {
  fetchCustomers,
  deleteCustomer,
  addCustomer,
  updateCustomer,
  Customer,
  EnterpriseCustomer
} from './customerSlice';
import AddCustomerModal from './AddCustomerModal';
import ErrorBoundary from '../common/ErrorBoundary';

const { confirm } = Modal;

const CustomerList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { customers, loading } = useSelector((state: RootState) => state.customers);
  const [addModalVisible, setAddModalVisible] = React.useState(false);
  const [editCustomer, setEditCustomer] = React.useState<Customer | null>(null);

  // 加载客户列表
  useEffect(() => {
    dispatch(fetchCustomers() as any);
  }, [dispatch]);



  // 打开添加客户模态框
  const showAddModal = () => {
    setEditCustomer(null);
    setAddModalVisible(true);
  };

  // 打开编辑客户模态框
  const showEditModal = (customer: Customer) => {
    setEditCustomer(customer);
    setAddModalVisible(true);
  };

  // 处理删除客户 - 优化为乐观更新
  const handleDelete = (id: string) => {
    confirm({
      title: '确定要删除这个客户吗？',
      icon: <ExclamationCircleOutlined />,
      content: '删除后数据将无法恢复',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        dispatch(deleteCustomer(id) as any).then(() => {
          message.success('客户删除成功');
        }).catch((err: any) => {
          // 显示具体的错误原因
          const errorMsg = err?.message || '客户删除失败';
          message.error(errorMsg);
        });
      }
    });
  };

  // 表格列配置
  const columns = [
    {
      title: '客户类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'personal' ? 'blue' : 'green'}>
          {type === 'personal' ? '个人客户' : '企业客户'}
        </Tag>
      ),
      width: 100,
    },
    {
      title: '客户名称/联系人/电话',
      dataIndex: 'name',
      key: 'name',
      render: (_: string, record: Customer) => {
        if (record.type === 'personal') {
          return (
            <div>
              <div>{record.name}</div>
              <div style={{ fontSize: 12, color: '#666' }}>
                {record.phone}
              </div>
            </div>
          );
        } else {
          const enterpriseRecord = record as any; // 类型断言
          const contact = enterpriseRecord.contacts && enterpriseRecord.contacts.length > 0
            ? enterpriseRecord.contacts[0]
            : null;

          return (
            <div>
              <div>{enterpriseRecord.companyName}</div>
              {contact && (
                <div style={{ fontSize: 12, color: '#666' }}>
                  {contact.name} | {contact.phone}
                </div>
              )}
            </div>
          );
        }
      }
    },
    {
      title: '业务负责人',
      dataIndex: 'businessManagerName',
      key: 'businessManager',
      render: (_: string, record: Customer) => {
        // 优先显示 businessManagerName，如果没有则显示 businessManager
        return (record as any).businessManagerName || (record as any).businessManager || '-';
      }
    },
    {
      title: '在租设备数量',
      dataIndex: 'equipmentCount',
      key: 'equipmentCount',
      sorter: (a: Customer, b: Customer) => a.equipmentCount - b.equipmentCount
    },
    {
      title: '履约金额',
      dataIndex: 'contractAmount',
      key: 'contractAmount',
      render: (amount: number) => `¥${amount.toLocaleString()}`
    },
    {
      title: '欠款金额',
      dataIndex: 'outstandingAmount',
      key: 'outstandingAmount',
      render: (amount: number) => (
        <Tag color={amount > 0 ? 'red' : 'green'}>
          ¥{amount.toLocaleString()}
        </Tag>
      )
    },
    {
      title: '实收金额',
      dataIndex: 'receivedAmount',
      key: 'receivedAmount',
      render: (amount: number) => `¥${amount.toLocaleString()}`
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Customer) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个客户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 渲染表头右侧的添加按钮
  const tableHeader = (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      onClick={showAddModal}
    >
      添加客户
    </Button>
  );

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>客户列表</h1>
      <Table
        columns={columns}
        dataSource={customers}
        rowKey="id"
        loading={loading}
        title={() => tableHeader}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条数据`
        }}
      />

      {/* 添加/编辑客户模态框，使用错误边界包装 */}
      <ErrorBoundary fallback={
        <Modal
          title="错误提示"
          open={addModalVisible}
          onCancel={() => setAddModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setAddModalVisible(false)}>
              关闭
            </Button>
          ]}
        >
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', color: '#333' }}>添加/编辑客户表单加载失败</p>
            <p style={{ color: '#666', marginTop: '8px' }}>请稍后重试或联系系统管理员</p>
          </div>
        </Modal>
      }>
        <AddCustomerModal
          visible={addModalVisible}
          customer={editCustomer}
          onCancel={() => setAddModalVisible(false)}
          onSuccess={(customerData: Customer | EnterpriseCustomer) => {
            setAddModalVisible(false);
            if (editCustomer) {
              dispatch(updateCustomer(customerData as Customer) as any)
                .then(() => message.success('客户更新成功'))
                .catch((err: any) => message.error(err?.message || '客户更新失败'));
            } else {
              dispatch(addCustomer(customerData as Customer) as any)
                .then(() => message.success('客户添加成功'))
                .catch((err: any) => message.error(err?.message || '客户添加失败'));
            }
          }}
        />
      </ErrorBoundary>
    </div>
  );
};

export default CustomerList;