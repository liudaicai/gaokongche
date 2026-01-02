import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Button, Card, Popconfirm, Space, Modal, Form, Input, Select, Dropdown, App, Tag } from 'antd';
import type { MenuProps } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, MoreOutlined, KeyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AppDispatch, RootState } from '../../app/store';
import {
  fetchEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  selectEmployees,
  selectEmployeesLoading,
  selectEmployeesTotal,
  selectEmployeesPage,
  selectEmployeesPageSize
} from './employeesSlice';
import { fetchStores, selectStores } from '../stores/storesSlice';
import type { Employee, CreateEmployeeData } from './types';
import { apiGet } from '../../api/client';

const { Option } = Select;

const EmployeeList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { message, modal } = App.useApp();
  const employees = useSelector(selectEmployees);
  const loading = useSelector(selectEmployeesLoading);
  const total = useSelector(selectEmployeesTotal);
  const currentPage = useSelector(selectEmployeesPage);
  const pageSize = useSelector(selectEmployeesPageSize);
  const stores = useSelector((state: RootState) => selectStores(state));
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [form] = Form.useForm();
  
  // 加载数据
  useEffect(() => {
    dispatch(fetchEmployees({ page: 1, pageSize: 10 }));
    dispatch(fetchStores());
    loadDepartments();
    loadPositions();
    loadUsers();
  }, [dispatch]);

  // 加载部门列表
  const loadDepartments = async () => {
    try {
      const data = await apiGet('/departments');
      setDepartments(data || []);
    } catch (error) {
      console.error('加载部门失败:', error);
    }
  };

  // 加载职务列表
  const loadPositions = async () => {
    try {
      const data = await apiGet('/positions');
      setPositions(data || []);
    } catch (error) {
      console.error('加载职务失败:', error);
    }
  };

  // 加载用户列表（用于选择上级）
  const loadUsers = async () => {
    try {
      const data = await apiGet('/approval-config/users');
      setUsers(data || []);
    } catch (error) {
      console.error('加载用户失败:', error);
    }
  };
  
  // 处理添加员工
  const handleAddEmployee = () => {
    setCurrentEmployee(null);
    form.resetFields();
    setIsModalVisible(true);
  };
  
  // 处理编辑员工
  const handleEditEmployee = (employee: Employee) => {
    setCurrentEmployee(employee);
    form.setFieldsValue({
      name: employee.name,
      phone: employee.phone,
      email: employee.email,
      idCardNumber: employee.idCardNumber,
      storeId: employee.storeId,
      department_id: (employee as any).department_id,
      position_id: (employee as any).position_id,
      superior_id: (employee as any).superior_id,
    });
    setIsModalVisible(true);
  };
  
  // 处理删除员工
  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await dispatch(deleteEmployee(employeeId)).unwrap();
      message.success('员工删除成功');
      dispatch(fetchEmployees({ page: currentPage, pageSize }));
    } catch (error: any) {
      message.error(error?.message || '员工删除失败');
    }
  };

  // 处理重置密码
  const handleResetPassword = async (employeeId: string, employeeName: string) => {
    Modal.confirm({
      title: '重置密码确认',
      content: `确定要将员工 "${employeeName}" 的密码重置为默认密码 88888888 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await fetch(`/api/employees/${employeeId}/reset-password`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}`
            }
          });
          
          const data = await response.json();
          
          if (data.ok) {
            message.success('密码已重置为：88888888');
          } else {
            message.error(data.error || '密码重置失败');
          }
        } catch (error: any) {
          message.error(error?.message || '密码重置失败');
        }
      }
    });
  };
  
  // 保存员工信息
  const handleSaveEmployee = async () => {
    console.log('[EmployeeList] 开始保存员工...');
    
    try {
      const values = await form.validateFields();
      console.log('[EmployeeList] 表单验证通过:', values);
      
      // 验证密码
      if (!currentEmployee && values.password !== values.confirmPassword) {
        message.error('两次输入的密码不一致');
        return;
      }
      
      if (currentEmployee) {
        // 更新员工
        console.log('[EmployeeList] 更新员工...');
        await dispatch(updateEmployee({
          id: currentEmployee.id,
          name: values.name,
          phone: values.phone,
          email: values.email,
          idCardNumber: values.idCardNumber,
          storeId: values.storeId,
          department_id: values.department_id,
          position_id: values.position_id,
          superior_id: values.superior_id,
        })).unwrap();
        message.success('员工信息更新成功');
      } else {
        // 添加员工 - 使用手机号作为用户名
        console.log('[EmployeeList] 添加员工...');
        const employeeData: CreateEmployeeData = {
          username: values.phone, // 使用手机号作为用户名
          name: values.name,
          phone: values.phone,
          email: values.email,
          idCardNumber: values.idCardNumber,
          storeId: values.storeId,
          password: values.password,
          confirmPassword: values.confirmPassword,
          department_id: values.department_id,
          position_id: values.position_id,
          superior_id: values.superior_id,
        };
        
        await dispatch(addEmployee(employeeData)).unwrap();
        message.success('员工添加成功，登录账号为手机号');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      dispatch(fetchEmployees({ page: currentPage, pageSize }));
    } catch (error: any) {
      console.error('[EmployeeList] 保存失败:', error);
      message.error(error?.message || '操作失败');
    }
  };
  
  // 分页变化
  const handleTableChange = (pagination: any) => {
    dispatch(fetchEmployees({ page: pagination.current, pageSize: pagination.pageSize }));
  };
  
  // 员工列表列配置
  const columns: ColumnsType<Employee> = [
    {
      title: '序号',
      key: 'index',
      render: (_, __, index) => (currentPage - 1) * pageSize + index + 1,
      width: 60,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '手机号（登录账号）',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
    },
    {
      title: '部门',
      key: 'department',
      render: (_, record: any) => 
        record.department_name ? (
          <Tag color="blue">{record.department_name}</Tag>
        ) : '-',
      width: 120,
    },
    {
      title: '职务',
      key: 'position',
      render: (_, record: any) => 
        record.position_name ? (
          <Tag color="green">{record.position_name}</Tag>
        ) : (
          record.position ? <span>{record.position}</span> : '-'
        ),
      width: 120,
    },
    {
      title: '上级',
      key: 'superior',
      render: (_, record: any) => record.superior_name || '-',
      width: 100,
    },
    {
      title: '所属门店',
      dataIndex: 'storeName',
      key: 'storeName',
      width: 130,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_, record) => {
        const menuItems: MenuProps['items'] = [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: '编辑',
            onClick: () => handleEditEmployee(record)
          },
          {
            key: 'reset',
            icon: <KeyOutlined />,
            label: '重置密码',
            onClick: () => handleResetPassword(record.id, record.name)
          },
          {
            type: 'divider'
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: '删除',
            danger: true,
            onClick: () => {
              modal.confirm({
                title: '确定要删除这个员工吗？',
                content: '删除员工将同时删除其登录账号',
                okText: '确定',
                okType: 'danger',
                cancelText: '取消',
                onOk: () => handleDeleteEmployee(record.id)
              });
            }
          }
        ];

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button type="link" icon={<MoreOutlined />}>
              操作
            </Button>
          </Dropdown>
        );
      },
    },
  ];
  
  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      <Card
        title="员工列表"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddEmployee}
          >
            新增员工
          </Button>
        }
        style={{ marginBottom: '16px' }}
      >
        <Table
          columns={columns}
          dataSource={employees}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
        />
      </Card>
      
      {/* 添加/编辑员工模态框 */}
      <Modal
        title={currentEmployee ? '编辑员工' : '新增员工'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setIsModalVisible(false);
            form.resetFields();
          }}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={handleSaveEmployee}>
            确认
          </Button>
        ]}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          
          <Form.Item
            name="phone"
            label="手机号（登录账号）"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
            ]}
            tooltip="手机号将作为登录账号"
          >
            <Input placeholder="请输入手机号" disabled={!!currentEmployee} />
          </Form.Item>
          
          <Form.Item
            name="idCardNumber"
            label="身份证号码"
            rules={[
              { pattern: /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/, message: '请输入有效的身份证号码' }
            ]}
          >
            <Input placeholder="请输入身份证号码" />
          </Form.Item>

          <Form.Item
            name="department_id"
            label="所属部门"
            rules={[{ required: true, message: '请选择所属部门' }]}
          >
            <Select placeholder="请选择所属部门" allowClear showSearch
              filterOption={(input, option: any) =>
                option?.children?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {departments.map(dept => (
                <Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="position_id"
            label="职务"
            rules={[{ required: true, message: '请选择职务' }]}
          >
            <Select placeholder="请选择职务" allowClear showSearch
              filterOption={(input, option: any) =>
                option?.children?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {positions.map(pos => (
                <Option key={pos.id} value={pos.id}>
                  {pos.name} (Lv.{pos.level})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="superior_id"
            label="直属上级"
          >
            <Select placeholder="请选择直属上级" allowClear showSearch
              filterOption={(input, option: any) =>
                option?.children?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {users
                .filter(u => !currentEmployee || u.id !== currentEmployee.id)
                .map(user => (
                  <Option key={user.id} value={user.id}>
                    {user.name} ({user.username})
                  </Option>
                ))
              }
            </Select>
          </Form.Item>
          
          <Form.Item
            name="storeId"
            label="所属门店"
          >
            <Select placeholder="请选择所属门店" allowClear>
              {stores.map(store => (
                <Option key={store.id} value={store.id}>
                  {store.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          {!currentEmployee && (
            <>
              <Form.Item
                name="password"
                label="密码"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6位' }
                ]}
              >
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
              
              <Form.Item
                name="confirmPassword"
                label="再次输入密码"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请再次输入密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="请再次输入密码" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default EmployeeList;

