# 🚀 高空车租赁管理系统 - 生产环境部署指南

## 📋 目录

1. [环境要求](#环境要求)
2. [数据库部署](#数据库部署)
3. [后端部署](#后端部署)
4. [前端部署](#前端部署)
5. [安全配置](#安全配置)
6. [验证部署](#验证部署)

---

## 🖥️ 环境要求

### 必需软件

| 软件 | 版本要求 | 用途 |
|------|---------|------|
| **Node.js** | 18.x 或更高 | 运行后端服务 |
| **MySQL** | 5.7+ 或 8.0+ | 数据库 |
| **Nginx** | 1.18+ | Web服务器（可选，用于反向代理） |

### 服务器要求

- **最低配置**：2核CPU, 4GB RAM, 40GB硬盘
- **推荐配置**：4核CPU, 8GB RAM, 100GB硬盘
- **操作系统**：Ubuntu 20.04+, CentOS 7+, Windows Server 2019+

---

## 💾 数据库部署

### 步骤 1：安装MySQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# CentOS/RHEL
sudo yum install mysql-server
sudo systemctl start mysqld
sudo systemctl enable mysqld
```

### 步骤 2：配置MySQL

```bash
# 安全配置
sudo mysql_secure_installation

# 登录MySQL
mysql -u root -p
```

### 步骤 3：执行数据库初始化

```sql
-- 1. 创建数据库和表结构
source /path/to/deployment/sql/01_database_schema.sql

-- 2. 创建管理员账户
source /path/to/deployment/sql/02_create_admin_user.sql

-- 3. 验证
USE gaokongche;
SHOW TABLES;
SELECT username, role FROM users;
```

### 🔒 默认管理员账户

- **用户名**: `admin`
- **密码**: `admin123`
- **⚠️ 重要**: 首次登录后立即修改密码！

---

## 🔧 后端部署

### 步骤 1：上传代码

```bash
# 上传项目文件到服务器
scp -r /local/path/to/project user@server:/var/www/gaokongche/
```

### 步骤 2：安装依赖

```bash
cd /var/www/gaokongche
npm install --production
```

### 步骤 3：配置环境变量

创建 `.env` 文件：

```bash
# 数据库配置
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=gaokongche

# JWT密钥（必须修改！）
JWT_SECRET=your_very_long_and_random_secret_key_here_at_least_32_characters

# 服务端口
PORT=3001

# 运行环境
NODE_ENV=production

# CORS允许的前端域名
ALLOWED_ORIGINS=http://your-domain.com,https://your-domain.com

# 租户模式
TENANT_MODE=single

# 日志级别
LOG_LEVEL=info
```

### 步骤 4：启动后端服务

#### 方式1：使用PM2（推荐）

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start server/index.js --name gaokongche-api

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs gaokongche-api
```

#### 方式2：使用systemd

创建 `/etc/systemd/system/gaokongche-api.service`:

```ini
[Unit]
Description=GaoKongChe API Service
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/gaokongche
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=gaokongche-api
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl start gaokongche-api
sudo systemctl enable gaokongche-api
sudo systemctl status gaokongche-api
```

---

## 🌐 前端部署

### 步骤 1：构建前端

```bash
cd /var/www/gaokongche
npm run build
```

### 步骤 2：配置Nginx

创建 `/etc/nginx/sites-available/gaokongche`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    root /var/www/gaokongche/dist;
    index index.html;
    
    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API代理
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 文件上传大小限制
    client_max_body_size 50M;
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/gaokongche /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 步骤 3：配置HTTPS（可选但推荐）

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com
```

---

## 🔐 安全配置

### 1. 修改默认管理员密码

**⚠️ 重要：部署后第一件事！**

```bash
# 登录系统后，访问用户管理页面修改密码
# 或者直接在数据库中修改
```

### 2. JWT密钥配置

在 `.env` 文件中设置强密钥：

```bash
# 生成随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 将生成的密钥设置到 .env
JWT_SECRET=your_generated_secret_key
```

### 3. 数据库安全

```sql
-- 创建专用数据库用户（不使用root）
CREATE USER 'gaokongche_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON gaokongche.* TO 'gaokongche_user'@'localhost';
FLUSH PRIVILEGES;
```

更新 `.env` 中的数据库配置：

```bash
MYSQL_USER=gaokongche_user
MYSQL_PASSWORD=strong_password_here
```

### 4. 防火墙配置

```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable

# 不要对外开放3001端口（API端口）
# 只通过Nginx反向代理访问
```

### 5. 文件权限

```bash
# 设置正确的文件权限
sudo chown -R www-data:www-data /var/www/gaokongche
sudo chmod -R 755 /var/www/gaokongche
sudo chmod 600 /var/www/gaokongche/.env
```

---

## ✅ 验证部署

### 1. 检查数据库

```sql
USE gaokongche;
SHOW TABLES;
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'gaokongche';
-- 应该显示 40+ 个表
```

### 2. 检查后端服务

```bash
# 检查服务状态
pm2 status
# 或
sudo systemctl status gaokongche-api

# 查看日志
pm2 logs gaokongche-api
# 或
sudo journalctl -u gaokongche-api -f

# 测试API
curl http://localhost:3001/api/health
```

### 3. 检查前端访问

```bash
# 浏览器访问
http://your-domain.com

# 或使用curl
curl -I http://your-domain.com
```

### 4. 测试登录

1. 打开浏览器访问系统
2. 使用管理员账户登录：
   - 用户名：`admin`
   - 密码：`admin123`
3. 立即修改密码！

---

## 🐛 常见问题

### 问题1：数据库连接失败

**错误**：`ER_ACCESS_DENIED_ERROR`

**解决**：
```bash
# 检查MySQL服务状态
sudo systemctl status mysql

# 检查用户权限
mysql -u root -p
SHOW GRANTS FOR 'gaokongche_user'@'localhost';
```

### 问题2：API无法访问

**检查清单**：
1. 后端服务是否运行？`pm2 status`
2. 端口3001是否被占用？`netstat -tulpn | grep 3001`
3. `.env` 配置是否正确？
4. 防火墙是否阻止？

### 问题3：前端访问404

**检查清单**：
1. `npm run build` 是否成功？
2. Nginx配置是否正确？`nginx -t`
3. dist目录是否存在？`ls /var/www/gaokongche/dist`
4. Nginx是否重载？`sudo systemctl reload nginx`

### 问题4：登录失败

**可能原因**：
1. 密码hash不匹配
2. JWT_SECRET未配置
3. 数据库中users表为空

**解决**：
```sql
-- 重新创建管理员账户
source /path/to/deployment/sql/02_create_admin_user.sql
```

---

## 📊 性能优化（可选）

### 1. MySQL优化

```sql
-- 为常用查询添加索引（部署脚本中已包含）
-- 检查慢查询
SHOW VARIABLES LIKE 'slow_query_log';
SET GLOBAL slow_query_log = 'ON';
```

### 2. Nginx缓存

```nginx
# 在 nginx 配置中添加
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. PM2 集群模式

```bash
pm2 start server/index.js -i max --name gaokongche-api
```

---

## 🔄 更新部署

### 更新代码

```bash
cd /var/www/gaokongche
git pull origin main
npm install --production
npm run build
pm2 restart gaokongche-api
```

### 更新数据库

```bash
# 备份数据库
mysqldump -u root -p gaokongche > backup_$(date +%Y%m%d_%H%M%S).sql

# 执行增量SQL脚本（如果有）
mysql -u root -p gaokongche < migrations/xxx_new_feature.sql
```

---

## 📱 系统监控

### 日志位置

- **后端日志**: `pm2 logs gaokongche-api`
- **Nginx日志**: `/var/log/nginx/access.log` 和 `/var/log/nginx/error.log`
- **MySQL日志**: `/var/log/mysql/error.log`

### 监控命令

```bash
# 系统资源
htop

# 磁盘空间
df -h

# MySQL状态
mysql -u root -p -e "SHOW PROCESSLIST;"

# PM2监控
pm2 monit
```

---

## 🆘 紧急恢复

### 数据库恢复

```bash
# 恢复备份
mysql -u root -p gaokongche < backup_20241216_120000.sql
```

### 服务重启

```bash
# 重启后端
pm2 restart gaokongche-api

# 重启Nginx
sudo systemctl restart nginx

# 重启MySQL
sudo systemctl restart mysql
```

---

## ✅ 部署检查清单

- [ ] MySQL已安装并配置
- [ ] 数据库已初始化（01_database_schema.sql）
- [ ] 管理员账户已创建（02_create_admin_user.sql）
- [ ] `.env` 文件已配置
- [ ] JWT_SECRET已设置为强密钥
- [ ] Node.js依赖已安装
- [ ] 后端服务已启动（PM2或systemd）
- [ ] 前端已构建（npm run build）
- [ ] Nginx已配置并启动
- [ ] 防火墙规则已设置
- [ ] SSL证书已配置（生产环境）
- [ ] 默认密码已修改
- [ ] 数据库已备份
- [ ] 监控已配置

---

## 📞 技术支持

如遇到问题，请查看：
1. 后端日志：`pm2 logs gaokongche-api`
2. 系统日志：`sudo journalctl -u gaokongche-api -f`
3. Nginx日志：`sudo tail -f /var/log/nginx/error.log`

---

**部署完成！祝您使用愉快！** 🎉
