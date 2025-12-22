import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button, Card, Popconfirm, Space, Modal, Form, Input, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AppDispatch } from '../../app/store';
import {
  fetchStores,
  addStore,
  updateStore,
  deleteStore,
  selectStores,
  selectStoresLoading
} from './storesSlice';
import { Store } from './types';

const StoreList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { message } = App.useApp();
  const stores = useSelector(selectStores);
  const loading = useSelector(selectStoresLoading);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [form] = Form.useForm();
  
  // 加载数据
  useEffect(() => {
    dispatch(fetchStores());
  }, [dispatch]);
  
  // 处理添加门店
  const handleAddStore = () => {
    setCurrentStore(null);
    setIsModalVisible(true);
  };
  
  // 处理维护门店
  const handleEditStore = (store: Store) => {
    setCurrentStore(store);
    setIsModalVisible(true);
  };
  
  // 处理删除门店
  const handleDeleteStore = async (storeId: string) => {
    try {
      await dispatch(deleteStore(storeId)).unwrap();
      message.success('门店删除成功');
    } catch (error) {
      message.error('门店删除失败');
    }
  };
  
  // 保存门店信息
  const handleSaveStore = async () => {
    console.log('[StoreList] 开始保存门店...');
    console.log('[StoreList] 当前 token:', localStorage.getItem('auth_token')?.substring(0, 20) + '...');
    
    try {
      const values = await form.validateFields();
      console.log('[StoreList] 表单验证通过:', values);
      
      const storeData = {
        name: values.name,
        address: values.address,
        managerId: '',  // 暂时为空，后端会处理
        managerName: values.managerName,
        managerPhone: values.managerPhone
      };
      
      console.log('[StoreList] 准备发送数据:', storeData);
      
      if (currentStore) {
        // 更新门店
        console.log('[StoreList] 更新门店...');
        await dispatch(updateStore({
          ...currentStore,
          ...storeData
        })).unwrap();
        message.success('门店信息更新成功');
      } else {
        // 添加门店
        console.log('[StoreList] 添加门店...');
        const result = await dispatch(addStore(storeData)).unwrap();
        console.log('[StoreList] 添加成功:', result);
        message.success('门店添加成功');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (errorInfo) {
      console.error('[StoreList] 保存失败:', errorInfo);
      message.error(`操作失败: ${errorInfo?.message || '未知错误'}`);
    }
  };
  
  // 门店列表列配置
  const columns: ColumnsType<Store> = [
    {
      title: '序号',
      key: 'index',
      render: (_, __, index) => index + 1,
      width: 80,
    },
    {
      title: '门店名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: '负责人姓名/电话',
      key: 'managerInfo',
      render: (_, record) => (
        <div>
          <div>{record.managerName}</div>
          <div className="text-gray-500 text-sm">{record.managerPhone}</div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditStore(record)}
          >
            维护
          </Button>
          <Popconfirm
            title="确定要删除这个门店吗？"
            onConfirm={() => handleDeleteStore(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  
  return (
    <div className="p-4">
      <Card
        title="门店列表"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddStore}
          >
            添加门店
          </Button>
        }
        className="mb-4"
      >
        <Table
          columns={columns}
          dataSource={stores}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
      
      {/* 添加/编辑门店模态框 */}
      <Modal
        title={currentStore ? '维护门店' : '添加门店'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={handleSaveStore}>确认</Button>
        ]}
        width={600}
        afterOpenChange={(open) => {
          if (open) {
            if (currentStore) {
              form.setFieldsValue({
                name: currentStore.name,
                address: currentStore.address,
                managerName: currentStore.managerName,
                managerPhone: currentStore.managerPhone
              });
            } else {
              form.resetFields();
            }
          }
        }}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="门店名称"
            rules={[{ required: true, message: '请输入门店名称' }]}
          >
            <Input placeholder="请输入门店名称" />
          </Form.Item>
          <Form.Item
            name="address"
            label="地址"
            rules={[{ required: true, message: '请输入门店地址' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入门店地址" />
          </Form.Item>
          <Form.Item
            name="managerName"
            label="负责人姓名"
            rules={[{ required: true, message: '请输入负责人姓名' }]}
          >
            <Input placeholder="请输入负责人姓名" />
          </Form.Item>
          <Form.Item
            name="managerPhone"
            label="负责人电话"
            rules={[
              { required: true, message: '请输入负责人电话' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
            ]}
          >
            <Input placeholder="请输入负责人电话" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StoreList;