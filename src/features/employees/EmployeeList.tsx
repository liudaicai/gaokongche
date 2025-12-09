import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button, Popconfirm, message, Card, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AppDispatch } from '../../app/store';
import { fetchEmployees, deleteEmployee, selectEmployees, selectEmployeesLoading } from './employeesSlice';
import { Employee } from './types';
import AddEmployeeModal from './AddEmployeeModal.tsx';
import EditEmployeeModal from './EditEmployeeModal.tsx';

const EmployeeList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const employees = useSelector(selectEmployees);
  const loading = useSelector(selectEmployeesLoading);
  
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  
  // 加载员工数据
  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);
  
  // 处理新增员工
  const handleAddEmployee = () => {
    setIsAddModalVisible(true);
  };
  
  // 处理编辑员工
  const handleEditEmployee = (employee: Employee) => {
    setCurrentEmployee(employee);
    setIsEditModalVisible(true);
  };
  
  // 处理删除员工
  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await dispatch(deleteEmployee(employeeId)).unwrap();
      message.success('员工删除成功');
    } catch (error) {
      message.error('员工删除失败');
    }
  };
  
  // 员工列表列配置
  const columns: ColumnsType<Employee> = [
    {
      title: '序号',
      key: 'index',
      render: (_, __, index) => index + 1,
      width: 80,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '姓名/手机号',
      key: 'namePhone',
      render: (_, record) => (
        <div>
          <div>{record.name}</div>
          <div className="text-gray-500 text-sm">{record.phone}</div>
        </div>
      ),
    },
    {
      title: '身份证号码',
      dataIndex: 'idCardNumber',
      key: 'idCardNumber',
      render: (text) => {
        // 部分隐藏身份证号码
        if (text) {
          return text.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
        }
        return '-';
      },
    },
    {
      title: '职务',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: '区域',
      dataIndex: 'region',
      key: 'region',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditEmployee(record)}
            className="mr-2"
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个员工吗？"
            onConfirm={() => handleDeleteEmployee(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" icon={<DeleteOutlined />} danger>
              删除
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];
  
  return (
    <div className="p-4">
      <Card
        title="员工管理"
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAddEmployee}
          >
            新增员工
          </Button>
        }
        className="mb-4"
      >
        <Table
          columns={columns}
          dataSource={employees}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: (
              <Empty description="暂无员工数据" />
            ),
          }}
        />
      </Card>
      
      {/* 新增员工模态框 */}
      <AddEmployeeModal
        visible={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
      />
      
      {/* 编辑员工模态框 */}
      {currentEmployee && (
        <EditEmployeeModal
          visible={isEditModalVisible}
          employee={currentEmployee}
          onCancel={() => {
            setIsEditModalVisible(false);
            setCurrentEmployee(null);
          }}
        />
      )}
    </div>
  );
};

export default EmployeeList;