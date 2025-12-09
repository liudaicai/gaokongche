import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * 认证守卫组件，确保只有登录用户才能访问受保护的页面
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  // 从Redux store中获取认证状态和用户信息
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  // 检查用户是否已登录 - 增强版
  const checkLoginStatus = () => {
    try {
      // 先检查localStorage，因为它是持久化的登录状态
      const isAuthenticatedLS = localStorage.getItem('isAuthenticated') === 'true';
      const userLS = localStorage.getItem('user');
      
      return isAuthenticatedLS || (isAuthenticated && user !== null) || !!userLS;
    } catch (error) {
      console.error('检查登录状态失败:', error);
      return false;
    }
  };
  
  // 组件挂载时检查登录状态
  useEffect(() => {
  }, []);
  
  // 如果用户未登录，不渲染子组件
  if (!checkLoginStatus()) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;