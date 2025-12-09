# 高空车租赁管理系统

## 📋 项目简介

基于 **React + Express + MySQL** 构建的高空车租赁管理系统，支持设备管理、订单管理、客户管理、物流管理、财务管理等核心业务功能。

## 🚀 技术栈

### 前端
- **框架**: React 18+ with TypeScript
- **构建工具**: Vite
- **状态管理**: Redux Toolkit
- **UI框架**: Ant Design
- **样式**: CSS Modules

### 后端
- **运行时**: Node.js
- **框架**: Express
- **数据库**: MySQL 8.0+
- **认证**: JWT + bcryptjs
- **日志**: Winston
- **文件上传**: Multer

## 📦 核心功能模块

### 1. 设备管理
- 设备档案管理（品牌、类型、规格、高度）
- 设备状态跟踪
- 设备维修记录
- 配件管理

### 2. 订单管理
- 订单创建与编辑
- 设备需求管理
- 租金自动计算
- 订单报停
- 订单结算
- 合同预览与打印

### 3. 客户管理
- 客户信息管理
- 客户历史订单
- 客户信用管理

### 4. 物流管理
- 物流台账
- 进场/退场记录
- 运输管理

### 5. 财务管理
- 收款记录
- 退款记录
- 发票管理
- 财务报表
- 数据统计与分析

### 6. 转租管理
- 转租订单管理
- 转租设备分配
- 转租收支管理

### 7. 文档模板管理
- 合同模板
- 进场/退场单模板
- 结算单模板
- 一键生成与打印
- 智能推荐功能

### 8. 系统管理
- 用户管理
- 角色权限
- 门店管理
- 公司管理
- 员工管理

## 🛠️ 快速开始

### 环境要求
- Node.js >= 16.x
- MySQL >= 8.0
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd <project-directory>
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑.env文件，配置数据库连接等信息
```

4. **初始化数据库**
```bash
# 运行数据库迁移
npm run db:migrate
```

5. **启动开发服务器**
```bash
# 终端1：启动后端API服务
npm run api

# 终端2：启动前端开发服务器
npm run dev
```

6. **访问应用**
- 前端: http://localhost:5173
- 后端API: http://localhost:3001
- 默认账号: `admin` / `admin123`

## 📂 项目结构

```
.
├── src/                    # 前端源代码
│   ├── features/          # 功能模块
│   │   ├── orders/        # 订单管理
│   │   ├── equipment/     # 设备管理
│   │   ├── customers/     # 客户管理
│   │   ├── logistics/     # 物流管理
│   │   ├── finance/       # 财务管理
│   │   ├── templates/     # 模板管理
│   │   └── ...
│   ├── api/               # API客户端
│   ├── app/               # Redux store
│   └── components/        # 通用组件
│
├── server/                 # 后端源代码
│   ├── routes/            # API路由
│   ├── middleware/        # 中间件
│   ├── services/          # 业务服务
│   └── utils/             # 工具函数
│
├── sql/                   # 数据库脚本
│   └── mysql/             # MySQL迁移脚本
│
├── docs/                  # 项目文档
│   ├── DEPLOYMENT_GUIDE.md            # 部署指南
│   ├── template-system-user-guide.md  # 模板系统用户手册
│   ├── template-simple-usage-guide.md # 模板简化使用指南
│   └── ...
│
├── scripts/               # 工具脚本
│   ├── db_migrate.js     # 数据库迁移工具
│   └── init_admin_user.js # 初始化管理员
│
└── public/                # 静态资源
```

## 🔧 NPM 脚本

```bash
# 开发
npm run dev          # 启动前端开发服务器
npm run api          # 启动后端API服务

# 构建
npm run build        # 构建前端生产版本

# 数据库
npm run db:migrate   # 运行数据库迁移

# 工具
npm run init-admin   # 初始化管理员账户
```

## 📖 文档索引

### 核心文档
- [部署指南](DEPLOYMENT_GUIDE.md)
- [宝塔部署指南](DEPLOY_BAOTA.md)
- [快速部署脚本](deploy_quick_start.sh)

### 功能模块文档
- [模板管理系统 - 用户手册](docs/template-system-user-guide.md)
- [模板管理系统 - 简化使用指南](docs/template-simple-usage-guide.md)
- [模板管理系统 - 实施指南](docs/模板管理系统-实施指南.md)
- [模板管理系统 - 交付清单](docs/模板管理系统-交付清单.md)
- [财务管理模块 - 完成报告](财务管理模块-实施完成报告.md)
- [财务管理模块 - 快速开始](财务管理模块-快速开始.md)
- [转租管理模块使用说明](docs/转租管理模块使用说明.md)
- [物流台账统计逻辑说明](物流台账统计逻辑修改说明.md)

### 技术文档
- [模板映射设计](docs/template-mapping-design.md)
- [模板简化组件索引](docs/template-simple-components-index.md)
- [模板系统文件索引](docs/template-system-files-index.md)

## 🔐 安全说明

### 生产环境部署前必须修改：

1. **JWT_SECRET**：修改为至少32字符的强密钥
2. **数据库密码**：使用强密码
3. **管理员密码**：首次登录后立即修改
4. **CORS配置**：仅允许可信域名

### 安全最佳实践
- ✅ 所有API接口使用JWT认证
- ✅ 密码使用bcrypt加密存储
- ✅ SQL查询使用参数化语句
- ✅ 文件上传有类型和大小限制
- ✅ 敏感操作记录审计日志

## 🐛 故障排查

### 常见问题

**1. 数据库连接失败**
- 检查MySQL服务是否运行
- 确认`.env`中的数据库配置正确
- 验证数据库用户权限

**2. 前端API请求404**
- 确认后端服务已启动
- 检查Vite代理配置
- 查看浏览器Network面板

**3. 认证失败/401错误**
- 检查localStorage中的`auth_token`
- 确认JWT_SECRET配置一致
- 清除浏览器缓存重新登录

**4. 模板生成失败**
- 确保已配置默认模板
- 检查订单数据完整性
- 查看浏览器控制台错误

## 📊 性能优化

- ✅ 使用React.memo优化组件渲染
- ✅ 列表数据使用分页
- ✅ 图片懒加载
- ✅ API响应缓存
- ✅ 数据库查询优化和索引

## 🚀 部署

### 开发环境
```bash
npm run dev    # 前端
npm run api    # 后端
```

### 生产环境
```bash
# 1. 构建前端
npm run build

# 2. 配置Nginx反向代理
# 参考 DEPLOYMENT_GUIDE.md

# 3. 使用PM2管理后端进程
pm2 start server/index.js --name gaokongche-api

# 4. 配置自动启动
pm2 startup
pm2 save
```

详细部署步骤请参考 [部署指南](DEPLOYMENT_GUIDE.md)

## 📝 开发规范

### 代码规范
- 使用TypeScript类型注解
- 遵循ESLint规则
- 组件使用函数式+Hooks
- API统一使用`src/api/client.ts`

### Git提交规范
```
feat: 新增功能
fix: 修复bug
refactor: 重构代码
docs: 更新文档
style: 代码格式化
perf: 性能优化
test: 添加测试
chore: 构建/工具变动
```

### 数据库变更
- 所有变更通过迁移脚本完成
- 迁移文件命名：`NNN_description.sql`
- 支持重复执行（幂等性）

## 🤝 贡献指南

1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交Pull Request

## 📄 许可证

[MIT License](LICENSE)

## 💬 联系方式

如有问题或建议，请通过以下方式联系：

- 📧 Email: support@example.com
- 📱 电话: 400-xxx-xxxx
- 🌐 网站: https://example.com

## 🎉 致谢

感谢所有为本项目做出贡献的开发者！

---

**版本**: 1.0.0  
**最后更新**: 2025年12月  
**维护状态**: ✅ 积极维护中


