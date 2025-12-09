import React from 'react'
import ReactDOM from 'react-dom/client'
import { StrictMode } from 'react'
import { Provider } from 'react-redux'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import minMax from 'dayjs/plugin/minMax'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './features/user/ProtectedRoute'
import ErrorBoundary from './features/common/ErrorBoundary'

dayjs.locale('zh-cn')
dayjs.extend(minMax)

// 使用React.lazy动态导入组件
const App = React.lazy(() => import('./App'))
const LoginPage = React.lazy(() => import('./features/user/LoginPage'))

// 异步导入store，减少初始加载大小
const getStore = async () => {
  const { store } = await import('./app/store')
  return store
}

// 预加载关键资源
// const preloadCriticalResources = () => {
//   // 预加载字体
//   const fontLink = document.createElement('link');
//   fontLink.rel = 'preload';
//   fontLink.as = 'font';
//   fontLink.type = 'font/woff2';
//   fontLink.crossOrigin = 'anonymous';
//   fontLink.href = '/fonts/main.woff2';
//   document.head.appendChild(fontLink);
// };

declare global {
  interface Window {
    __APP_ROOT__?: ReactDOM.Root;
  }
  // 扩展 ImportMeta，声明热更新属性，避免 TS 报错
  interface ImportMeta {
    hot?: { accept: () => void } | undefined;
  }
}

// 启动应用（带根节点复用防止重复 createRoot）
const bootstrapApp = async () => {
  try {
    // 获取store实例
    const store = await getStore()
    
    // 渲染应用
    const container = document.getElementById('root')!
    const root = window.__APP_ROOT__ || ReactDOM.createRoot(container)
    window.__APP_ROOT__ = root
    root.render(
      <StrictMode>
        <ErrorBoundary fallback={<div style={{ padding: 24 }}>页面出现错误，请刷新后重试。</div>}>
          <Provider store={store}>
            <ConfigProvider locale={zhCN}>
              <React.Suspense fallback={<div>应用加载中...</div>}>
                <BrowserRouter>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route element={<ProtectedRoute />}> 
                      <Route path="/" element={<App />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </BrowserRouter>
              </React.Suspense>
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
    // 显示错误信息
    document.getElementById('root')!.innerHTML = 
      '<div style="text-align: center; padding: 50px; color: #ff4d4f;">应用加载失败，请刷新页面重试</div>'
  }
}

// 启动应用
bootstrapApp()