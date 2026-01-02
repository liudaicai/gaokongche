import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // 缓存构建结果目录（需位于顶层配置）
  cacheDir: './node_modules/.vite',
  plugins: [
    react({
      // 优化React插件，只包含生产环境需要的功能
      include: "**/*.tsx",
    })
  ],
  // 构建优化
  build: {
    // 最小化代码
    minify: 'esbuild',
    // 提高 chunk 大小警告限制
    chunkSizeWarningLimit: 1000,
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心库
          'react-vendor': ['react', 'react-dom'],
          // Redux 状态管理
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          // Ant Design UI 库
          'antd-vendor': ['antd'],
          // 图表库
          'charts-vendor': ['echarts', 'recharts'],
          // 路由
          'router-vendor': ['react-router-dom'],
          // 日期处理
          'dayjs-vendor': ['dayjs'],
        },
        // 文件命名优化
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  // 开发服务器优化
  server: {
    // 启用热更新
    hmr: true,
    // 代理后端 API，避免相对路径命中前端 5173
    proxy: {
      '/api': {
        // 使用 127.0.0.1 避免 Windows/IPv6 环境下 localhost 解析为 ::1 导致代理连接拒绝
        // 切换到 MySQL 模式后端端口 3003
        target: 'http://127.0.0.1:3003',
        changeOrigin: true,
        // 不要 rewrite，保留 /api 前缀
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // 代理静态上传文件访问，避免直接命中前端开发服务器导致 404
      '/uploads': {
        target: 'http://127.0.0.1:3003',
        changeOrigin: true,
      },
    },
  },
  // 优化ES模块导入
  optimizeDeps: {
    // 预构建的依赖
    include: [
      'react',
      'react-dom',
      '@reduxjs/toolkit',
      'react-redux',
      'antd',
      'antd/es/locale/zh_CN',
    ],
    // 禁用一些不必要的依赖
    exclude: [],
  },
})