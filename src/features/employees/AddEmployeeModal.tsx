import React from 'react';
import { useDispatch } from 'react-redux';
import { Modal, Form, Input, Select, message } from 'antd';
import type { AppDispatch } from '../../app/store';
import { addEmployee } from './employeesSlice';
import { Employee } from './types';

// 区域选项
const regionOptions = [
  { label: '华东区', value: '华东区' },
  { label: '华北区', value: '华北区' },
  { label: '华南区', value: '华南区' },
  { label: '西南区', value: '西南区' },
  { label: '西北区', value: '西北区' },
  { label: '东北区', value: '东北区' },
];

// 职务选项
const positionOptions = [
  { label: '区域经理', value: '区域经理' },
  { label: '业务经理', value: '业务经理' },
  { label: '客户经理', value: '客户经理' },
  { label: '行政人员', value: '行政人员' },
  { label: '财务人员', value: '财务人员' },
];

// 直属领导选项
const leaderOptions = [
  { label: 'admin(管理员)', value: 'admin' },
  { label: '张三(区域经理)', value: 'zhang_san' },
  { label: '李四(业务经理)', value: 'li_si' },
];

interface AddEmployeeModalProps {
  visible: boolean;
  onCancel: () => void;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ visible, onCancel }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // 处理表单提交
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      
      // 验证密码是否一致
      if (values.password !== values.confirmPassword) {
        message.error('两次输入的密码不一致');
        setIsSubmitting(false);
        return;
      }
      
      // 构造员工数据对象
      const employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
        username: values.username,
        name: values.name,
        phone: values.phone,
        idCardNumber: values.idCardNumber,
        position: values.position,
        region: values.region,
        directLeader: values.directLeader,
        password: values.password
      };
      
      // 提交数据到Redux
      await dispatch(addEmployee(employeeData)).unwrap();
      
      message.success('员工添加成功');
      form.resetFields();
      onCancel();
    } catch (error) {
      message.error('员工添加失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 处理模态框关闭
  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };
  
  return (
    <Modal
      forceRender
      title="新增员工"
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText="确定"
      cancelText="取消"
      confirmLoading={isSubmitting}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        className="pt-4"
      >
        {/* 所属区域 */}
        <Form.Item
          label="所属区域"
          name="region"
          rules={[
            { required: true, message: '请选择所属区域' }
          ]}
        >
          <Select placeholder="请选择所属区域" allowClear>
            {regionOptions.map(option => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        
        {/* 用户名 */}
        <Form.Item
          label="用户名"
          name="username"
          rules={[
            { required: true, message: '请输入用户名' },
            { pattern: /^[a-zA-Z0-9_]{3,20}$/, message: '用户名只能包含字母、数字和下划线，长度为3-20位' }
          ]}
        >
          <Input placeholder="请输入用户名（作为登录账号）" />
        </Form.Item>
        
        {/* 职务 */}
        <Form.Item
          label="职务"
          name="position"
          rules={[
            { required: true, message: '请选择职务' }
          ]}
        >
          <Select placeholder="请选择职务" allowClear>
            {positionOptions.map(option => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        
        {/* 直属领导 */}
        <Form.Item
          label="直属领导"
          name="directLeader"
          rules={[
            { required: true, message: '请选择直属领导' }
          ]}
        >
          <Select placeholder="请选择直属领导" allowClear>
            {leaderOptions.map(option => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        
        {/* 姓名 */}
        <Form.Item
          label="姓名"
          name="name"
          rules={[
            { required: true, message: '请输入姓名' },
            { pattern: /^[\u4e00-\u9fa5a-zA-Z]{2,20}$/, message: '姓名只能包含中文和英文，长度为2-20位' }
          ]}
        >
          <Input placeholder="请输入姓名" />
        </Form.Item>
        
        {/* 手机号 */}
        <Form.Item
          label="手机号"
          name="phone"
          rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码格式' }
          ]}
        >
          <Input placeholder="请输入手机号" />
        </Form.Item>
        
        {/* 身份证号码 */}
        <Form.Item
          label="身份证号码"
          name="idCardNumber"
          rules={[
            { required: true, message: '请输入身份证号码' },
            { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号码格式' }
          ]}
        >
          <Input placeholder="请输入身份证号码" />
        </Form.Item>
        
        {/* 密码 */}
        <Form.Item
          label="密码"
          name="password"
          rules={[
            { required: true, message: '请输入密码' },
            { pattern: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{8,20}$/, message: '密码至少包含字母和数字，长度为8-20位' }
          ]}
        >
          <Input.Password placeholder="请输入密码" />
        </Form.Item>
        
        {/* 确认密码 */}
        <Form.Item
          label="再次输入密码"
          name="confirmPassword"
          rules={[
            { required: true, message: '请再次输入密码' }
          ]}
        >
          <Input.Password placeholder="请再次输入密码进行确认" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddEmployeeModal;