import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Form, Input, Button, App, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../app/store';
import { login, clearError } from './authSlice';
import type { LoginFormData } from './types';
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/common/Logo';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [form] = Form.useForm<LoginFormData>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  
  // 从 Redux store 中获取认证状态
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
      
      // 等待一个微任务，确保 Redux 状态更新完成
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 100);
    } catch (err) {
      // 登录失败提示
      message.error((err as Error)?.message || error || '登录失败，请检查用户名和密码');
    }
  };
  
  // 背景图片数组（星邦智能/Sinoboom 风格：蓝色高空车、剪叉车、工程场景）
  const bgImages = [
    'https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=2000&auto=format&fit=crop', // 蓝色臂车 (类似 Sinoboom TB系列)
    'https://images.unsplash.com/photo-1584282497676-0f30536e2577?q=80&w=2000&auto=format&fit=crop', // 剪叉车作业 (类似 Sinoboom GTJZ系列)
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2000&auto=format&fit=crop', // 建筑工地远景
    'https://plus.unsplash.com/premium_photo-1661962692059-55d5a4319814?q=80&w=2000&auto=format&fit=crop', // 蓝色机械细节
  ];

  // 预加载图片
  React.useEffect(() => {
    bgImages.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // 轮播背景状态
  const [currentBgIndex, setCurrentBgIndex] = React.useState(0);

  // 自动切换背景
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % bgImages.length);
    }, 5000); // 每5秒切换一次
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={styles.container}>
      {/* 背景轮播层 */}
      {bgImages.map((img, index) => (
        <div
          key={img}
          style={{
            ...styles.bgLayer,
            backgroundImage: `url(${img})`,
            opacity: index === currentBgIndex ? 1 : 0,
            zIndex: 0,
          }}
        />
      ))}
      
      {/* 遮罩层，确保文字清晰 */}
      <div style={styles.overlay} />

      <Card style={styles.card}>
        <div style={styles.header}>
            <div style={styles.logoContainer}>
                <Logo height={80} type="icon" />
            </div>
            <Title level={3} style={styles.title}>高空车租赁管理系统</Title>
            <Text type="secondary" style={styles.subtitle}>欢迎回来，请登录您的账号</Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { whitespace: true, message: '用户名不能为空' }
            ]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" style={{ color: '#bfbfbf' }} />}
              placeholder="用户名"
              autoFocus
            />
          </Form.Item>
          
          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { whitespace: true, message: '密码不能为空' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" style={{ color: '#bfbfbf' }} />}
              placeholder="密码"
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
              {loading ? '登录中...' : '立即登录'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
      
      <div style={styles.footer}>
        <Text type="secondary" style={{ fontSize: '12px' }}>© 2025 高空车租赁管理系统 All Rights Reserved</Text>
      </div>
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
    position: 'relative',
    overflow: 'hidden',
    // background removed, handled by bgLayer
  },
  bgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transition: 'opacity 1s ease-in-out',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // 半透明遮罩
    zIndex: 1,
    backdropFilter: 'blur(3px)', // 轻微磨砂效果
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // 稍微透明的白色背景
    zIndex: 2, // 确保在遮罩之上
    position: 'relative',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  logoContainer: {
    marginBottom: '16px',
  },
  logoIcon: {
    fontSize: '48px',
    color: '#1890ff',
  },
  title: {
    marginBottom: '8px',
    color: '#1f1f1f',
    marginTop: 0,
  },
  subtitle: {
    fontSize: '16px',
    color: '#595959',
  },
  button: {
    height: '48px',
    fontSize: '16px',
    fontWeight: 500,
    marginTop: '10px',
    borderRadius: '8px',
  },
  error: {
    color: '#ff4d4f',
    marginBottom: '24px',
    padding: '12px',
    backgroundColor: '#fff2f0',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '14px',
    border: '1px solid #ffccc7',
  },
  footer: {
    marginTop: '40px',
    textAlign: 'center',
    zIndex: 2,
    position: 'relative',
    color: 'rgba(255, 255, 255, 0.8)', // 页脚文字改为浅色
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
};

export default LoginPage;
