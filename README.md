# 高空车租赁管理系统

高空作业车辆租赁业务的全流程管理系统，涵盖订单、设备、财务、物流、转租等核心业务。

---

## 🎯 核心功能

### 业务管理
- **订单管理** - 租赁合同、进场、退场、结算全流程
- **设备档案** - 设备信息、状态追踪、维修记录
- **客户管理** - 客户信息、项目管理
- **门店管理** - 多门店支持

### 财务管理
- **收款记录** - 收款单据、对账
- **付款记录** - 付款单据
- **设备采购** - 采购记录、还款计划
- **财务报表** - 收支统计、利润分析

### 物流管理
- **物流台账** - 进场、退场运输记录
- **车辆管理** - 运输车辆、司机管理
- **物流公司** - 第三方物流商管理

### 转租管理
- **转租公司** - 转租商管理、付款对账
- **转租设备** - 设备租赁、还租管理

### 辅助功能
- **配件管理** - 配件库存、出入库、核销
- **维修管理** - 设备维修记录
- **提醒系统** - 合同到期、续约提醒
- **权限管理** - 用户角色权限
- **Word模板** - 合同文档自动生成

---

## 🚀 快速开始

### 1. 环境要求
- Node.js 18+
- MySQL 5.7+ / 8.0+
- Python 3.9+（OCR服务）

### 2. 安装依赖
```bash
npm install
cd python_services && pip install -r requirements.txt
```

### 3. 配置环境
```bash
cp .env.production .env
# 编辑 .env 文件，配置数据库连接
```

### 4. 初始化数据库
```bash
mysql -u root -p < sql/mysql/baseline_v1.0.sql
mysql -u root -p < deployment/sql/02_create_admin_user.sql
```

### 5. 启动服务
```bash
# 后端
npm run api

# 前端
npm run dev

# OCR服务
cd python_services && python ocr_service.py
```

### 6. 访问系统
```
http://localhost:5173
用户名：admin
密码：admin123
```

---

## 📚 文档

### 部署文档
- `DEPLOYMENT_GUIDE.md` - 完整部署指南
- `DEPLOYMENT_CHECKLIST.md` - 部署检查清单
- `deployment/README.md` - 部署包说明

### 功能文档
- `docs/` - 业务功能说明
- `OCR_QUICK_START.md` - OCR功能使用
- `templates/` - Word模板使用指南

### API文档
查看源码：`server/routes/`

---

## 🏗️ 技术栈

### 前端
- React 18
- Redux Toolkit
- Ant Design 5
- TypeScript
- Vite

### 后端
- Node.js + Express 5
- MySQL 2
- JWT认证

### 其他
- Python（OCR服务）
- docxtemplater（Word模板）
- PM2（进程管理）

---

## 📂 项目结构

```
d:\kaifa\4\
  ├── src/                 # 前端源码
  ├── server/              # 后端源码
  ├── python_services/     # Python OCR服务
  ├── sql/mysql/           # 数据库迁移文件
  ├── scripts/             # 工具脚本
  ├── docs/                # 业务文档
  ├── templates/           # Word模板
  ├── deployment/          # 部署文件
  ├── public/              # 静态资源
  └── i18n/                # 国际化配置
```

---

## 🔧 开发

### 运行开发环境
```bash
# 终端1：后端
npm run api

# 终端2：前端
npm run dev

# 终端3：OCR服务
cd python_services && python ocr_service.py
```

### 构建生产版本
```bash
npm run build
```

### 代码规范
```bash
npm run lint
```

---

## 📞 支持

### 遇到问题？
1. 查看 `deployment/✅_项目清理完成报告.md`
2. 查看 `DEPLOYMENT_GUIDE.md`
3. 检查日志文件

---

## 📜 License

私有项目

---

## ✅ 当前状态

**版本**：v1.0  
**状态**：🎉 生产就绪  
**最后更新**：2024-12-16
