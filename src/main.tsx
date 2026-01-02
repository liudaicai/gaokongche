import React from 'react'
import ReactDOM from 'react-dom/client'
import { StrictMode } from 'react'
import { Provider } from 'react-redux'
import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import minMax from 'dayjs/plugin/minMax'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './features/user/ProtectedRoute'
import ErrorBoundary from './features/common/ErrorBoundary'
import { antdTheme } from './theme/antdTheme' // 引入新主题
import './index.css' // 引入新全局样式

dayjs.locale('zh-cn')
dayjs.extend(minMax)

// 使用React.lazy动态导入组件
const App = React.lazy(() => import('./App'))
const LoginPage = React.lazy(() => import('./features/user/LoginPage'))
const CertificateVerifyPage = React.lazy(() => import('./features/certificates/CertificateVerifyPage'))

// 异步导入store
const getStore = async () => {
  const { store } = await import('./app/store')
  return store
}

declare global {
  interface Window {
    __APP_ROOT__?: ReactDOM.Root;
  }
}

const bootstrapApp = async () => {
  try {
    const store = await getStore()
    
    const container = document.getElementById('root')!
    const root = window.__APP_ROOT__ || ReactDOM.createRoot(container)
    window.__APP_ROOT__ = root
    root.render(
      <StrictMode>
        <ErrorBoundary fallback={<div style={{ padding: 24 }}>页面出现错误，请刷新后重试。</div>}>
          <Provider store={store}>
            {/* 应用新的主题配置 */}
            <ConfigProvider locale={zhCN} theme={antdTheme}>
              <AntdApp>
                <React.Suspense fallback={
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100vh', 
                  background: '#f0f2f5' 
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="loading-spinner" style={{
                      width: '40px',
                      height: '40px',
                      border: '3px solid rgba(0,0,0,0.1)',
                      borderTop: '3px solid #1677ff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      margin: '0 auto 16px'
                    }} />
                    <p style={{ color: '#666', fontSize: '14px' }}>系统加载中...</p>
                  </div>
                </div>
              }>
                <BrowserRouter>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/verify-certificate" element={<CertificateVerifyPage />} />
                    <Route element={<ProtectedRoute />}> 
                      <Route path="/" element={<App />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </BrowserRouter>
              </React.Suspense>
              </AntdApp>
            </ConfigProvider>
          </Provider>
        </ErrorBoundary>
      </StrictMode>,
    )
    if (import.meta.hot) {
      import.meta.hot.accept()
    }
  } catch (error) {
    console.error('应用启动失败:', error)
    document.getElementById('root')!.innerHTML = 
      '<div style="text-align: center; padding: 50px; color: #ff4d4f;">应用加载失败，请刷新页面重试</div>'
  }
}

bootstrapApp()
