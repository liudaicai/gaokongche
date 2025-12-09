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
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          // 将第三方库拆分成单独的chunk
          vendor: ['react', 'react-dom', '@reduxjs/toolkit', 'react-redux', 'antd'],
          charts: ['echarts', 'recharts'],
        },
      },
    }
  },
  // 开发服务器优化
  server: {
    // 启用热更新
    hmr: true,
    // 代理后端 API，避免相对路径命中前端 5173
    proxy: {
      '/api': {
        // 使用 127.0.0.1 避免 Windows/IPv6 环境下 localhost 解析为 ::1 导致代理连接拒绝
        target: 'http://127.0.0.1:3002',
        changeOrigin: true,
      },
      // 代理静态上传文件访问，避免直接命中前端开发服务器导致 404
      '/uploads': {
        target: 'http://127.0.0.1:3002',
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