import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Outlet, useNavigate } from 'react-router-dom';
import type { RootState } from '../../app/store';
import * as sessionManager from '../../utils/sessionManager';

/**
 * 路由层的受保护组件：未登录则重定向到 /login
 * 使用sessionStorage，关闭页面后需要重新登录
 */
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  
  // 检查sessionStorage和会话有效性
  const hasToken = typeof window !== 'undefined' && !!sessionManager.getAuthToken();
  const isSessionValid = typeof window !== 'undefined' && sessionManager.isSessionValid();
  const authed = isAuthenticated && hasToken && isSessionValid;

  useEffect(() => {
    if (!authed) {
      console.log('[ProtectedRoute] 会话无效，重定向到登录页');
      navigate('/login', { replace: true });
    }
  }, [authed, navigate]);

  // 如果未认证，返回 null
  if (!authed) {
    return null;
  }

  return <Outlet />;
};

export default ProtectedRoute;