import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Form, Input, Button, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../app/store';
import { login, clearError } from './authSlice';
import type { LoginFormData } from './types';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [form] = Form.useForm<LoginFormData>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  // 从Redux store中获取认证状态
  const { loading, error } = useSelector((state: RootState) => state.auth);
  
  // 处理表单提交
  const handleSubmit = async (values: LoginFormData) => {
    try {
      // 清除之前的错误
      dispatch(clearError());
      
      // 调用登录API
      await dispatch(login(values)).unwrap();
      
      // 登录成功提示
      message.success('登录成功！正在跳转到系统首页...');
      
      // 使用路由导航到首页，避免整页刷新
      navigate('/', { replace: true });
    } catch (err) {
      // 登录失败提示
      message.error(error || '登录失败，请检查用户名和密码');
    }
  };
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>高空车租赁管理系统</h1>
        <p style={styles.subtitle}>请登录您的账号</p>
      </div>
      
      <Card style={styles.card}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { whitespace: true, message: '用户名不能为空' }
            ]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />
              }
              placeholder="请输入用户名"
              autoFocus
            />
          </Form.Item>
          
          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { whitespace: true, message: '密码不能为空' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />
              }
              placeholder="请输入密码"
            />
          </Form.Item>
          
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}
          
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="login-form-button"
              loading={loading}
              block
              style={styles.button}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </Form.Item>
          
          <div style={styles.tips}>
            <p>提示：默认超级管理员账号为 admin，密码为 admin123</p>
          </div>
        </Form>
      </Card>
    </div>
  );
};

// 样式定义
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
    padding: '20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1890ff',
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  button: {
    height: '40px',
    fontSize: '16px',
  },
  error: {
    color: '#ff4d4f',
    marginBottom: '16px',
    padding: '10px',
    backgroundColor: '#fff2f0',
    borderRadius: '4px',
    textAlign: 'center',
  },
  tips: {
    marginTop: '16px',
    textAlign: 'center',
  },
};

export default LoginPage;