# 🚀 生产环境部署 - 快速开始

## 📋 文件说明

| 文件名 | 用途 | 必读程度 |
|--------|------|---------|
| **PRODUCTION_DEPLOYMENT_GUIDE.md** | 完整部署指南 | ⭐⭐⭐⭐⭐ |
| **SECURITY_CHECKLIST.md** | 安全配置检查清单 | ⭐⭐⭐⭐⭐ |
| **FINAL_DEPLOYMENT_REPORT.md** | 部署完成报告 | ⭐⭐⭐⭐ |
| **init-production.sh** | Linux/Mac 初始化脚本 | ⭐⭐⭐⭐⭐ |
| **init-production.ps1** | Windows 初始化脚本 | ⭐⭐⭐⭐⭐ |
| **env.example** | 环境变量配置模板 | ⭐⭐⭐⭐⭐ |

---

## ⚡ 30秒快速部署

### Linux/Mac

```bash
# 1. 运行初始化脚本
chmod +x deployment/init-production.sh
./deployment/init-production.sh

# 2. 启动服务
pm2 start server/index.js --name gaokongche-api
```

### Windows

```powershell
# 1. 运行初始化脚本
.\deployment\init-production.ps1

# 2. 启动服务
npm run api
```

---

## 🔐 默认账户

- **用户名**: `admin`
- **密码**: `admin123`
- **⚠️ 首次登录后立即修改密码！**

---

## 📚 详细文档

遇到问题？请查看完整文档：

1. **部署指南**: `PRODUCTION_DEPLOYMENT_GUIDE.md`
2. **安全配置**: `SECURITY_CHECKLIST.md`
3. **部署报告**: `FINAL_DEPLOYMENT_REPORT.md`

---

## ✅ 部署检查

部署完成后，验证以下项目：

- [ ] 数据库已创建（40+ 张表）
- [ ] 管理员账户可以登录
- [ ] Dashboard能正常显示数据
- [ ] JWT_SECRET已修改为强随机密钥
- [ ] 默认密码已修改
- [ ] 防火墙已配置
- [ ] HTTPS已启用（生产环境）

---

**最后更新**：2024-12-17
