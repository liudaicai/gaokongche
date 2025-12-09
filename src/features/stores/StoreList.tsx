import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button, Card, message, Popconfirm, Space, Modal, Form, Input, Select } from 'antd';
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
import { fetchEmployees, selectEmployees } from '../employees/employeesSlice';

const StoreList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const stores = useSelector(selectStores);
  const loading = useSelector(selectStoresLoading);
  const employees = useSelector(selectEmployees);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [form] = Form.useForm();
  
  // 加载数据
  useEffect(() => {
    dispatch(fetchStores());
    dispatch(fetchEmployees());
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
    try {
      const values = await form.validateFields();
      const selectedEmployee = employees.find(emp => emp.id === values.managerId);
      
      if (!selectedEmployee) {
        message.error('请选择有效的负责人');
        return;
      }
      
      const storeData = {
        name: values.name,
        address: values.address,
        managerId: values.managerId,
        managerName: selectedEmployee.name,
        managerPhone: selectedEmployee.phone
      };
      
      if (currentStore) {
        // 更新门店
        await dispatch(updateStore({
          ...currentStore,
          ...storeData
        })).unwrap();
        message.success('门店信息更新成功');
      } else {
        // 添加门店
        await dispatch(addStore(storeData)).unwrap();
        message.success('门店添加成功');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (errorInfo) {
      message.error('表单验证失败');
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
                managerId: currentStore.managerId
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
            name="managerId"
            label="负责人"
            rules={[{ required: true, message: '请选择负责人' }]}
          >
            <Select
              placeholder="请选择负责人"
              style={{ width: '100%' }}
              optionFilterProp="children"
            >
              {employees.map(employee => (
                <Select.Option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.phone})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StoreList;