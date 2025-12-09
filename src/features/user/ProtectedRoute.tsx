import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Outlet, useNavigate } from 'react-router-dom';
import type { RootState } from '../../app/store';

/**
 * 路由层的受保护组件：未登录则重定向到 /login
 */
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const isAuthenticatedLS = typeof window !== 'undefined' && localStorage.getItem('isAuthenticated') === 'true';
  const navigate = useNavigate();
  const authed = isAuthenticated || isAuthenticatedLS;

  useEffect(() => {
    if (!authed) {
      navigate('/login', { replace: true });
    }
  }, [authed, navigate]);

  if (!authed) {
    return null;
  }

  return <Outlet />;
};

export default ProtectedRoute;