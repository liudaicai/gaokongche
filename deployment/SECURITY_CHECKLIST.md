# 🔐 安全配置检查清单

## ✅ 必须完成的安全配置

### 1. 密码安全 ⭐⭐⭐⭐⭐

- [x] **密码加密**：使用bcrypt（10 rounds）✅
- [ ] **修改默认密码**：登录后立即修改 `admin/admin123`
- [x] **密码强度要求**：最少6个字符 ✅
- [x] **失败锁定机制**：5次失败后自动锁定 ✅

**当前状态**：✅ 已实现 bcrypt 加密和登录失败锁定

---

### 2. JWT Token安全 ⭐⭐⭐⭐⭐

- [ ] **JWT_SECRET配置**：必须使用强随机密钥（至少32字符）
- [x] **Token过期时间**：24小时 ✅
- [x] **Token验证**：每个API请求都验证 ✅

**生成强密钥命令**：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**配置位置**：`.env` 文件中的 `JWT_SECRET`

---

### 3. 数据库安全 ⭐⭐⭐⭐⭐

- [ ] **专用用户**：创建专用数据库用户（不使用root）
- [ ] **强密码**：数据库密码至少16字符
- [ ] **访问限制**：只允许localhost访问
- [ ] **定期备份**：配置自动备份

**创建专用用户**：
```sql
CREATE USER 'gaokongche_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON gaokongche.* TO 'gaokongche_user'@'localhost';
FLUSH PRIVILEGES;
```

---

### 4. 文件权限 ⭐⭐⭐⭐

- [ ] **代码文件**：755权限，www-data用户
- [ ] **.env文件**：600权限（只有owner可读写）
- [ ] **上传目录**：755权限，定期清理

**配置命令**：
```bash
sudo chown -R www-data:www-data /var/www/gaokongche
sudo chmod -R 755 /var/www/gaokongche
sudo chmod 600 /var/www/gaokongche/.env
```

---

### 5. 网络安全 ⭐⭐⭐⭐

- [ ] **防火墙**：只开放80, 443, 22端口
- [ ] **HTTPS**：配置SSL证书（Let's Encrypt）
- [ ] **API端口隐藏**：3001端口不对外开放
- [ ] **CORS配置**：只允许指定域名

**防火墙配置**：
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

---

### 6. 审计日志 ⭐⭐⭐

- [x] **登录日志**：记录所有登录尝试 ✅
- [x] **操作日志**：记录关键操作 ✅
- [ ] **日志轮转**：配置logrotate

**当前状态**：✅ 已实现完整的audit_logs表

---

### 7. 限流保护 ⭐⭐⭐

- [x] **登录限流**：防止暴力破解 ✅（代码中已实现，但当前注释掉了）
- [ ] **API限流**：防止API滥用
- [x] **SQL注入防护**：使用参数化查询 ✅

**恢复登录限流**：
在 `server/routes/auth.mysql.js` 中取消注释：
```javascript
router.post('/login', strictRateLimiter(), ...)
```

---

### 8. 数据备份 ⭐⭐⭐⭐⭐

- [ ] **自动备份**：每日备份数据库
- [ ] **异地备份**：备份存储在其他服务器
- [ ] **备份测试**：定期测试恢复流程

**配置自动备份**：
```bash
# 创建备份脚本 /root/backup_gaokongche.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p gaokongche | gzip > /backup/gaokongche_$DATE.sql.gz
find /backup -name "gaokongche_*.sql.gz" -mtime +7 -delete

# 添加到crontab
crontab -e
# 每天凌晨2点执行
0 2 * * * /root/backup_gaokongche.sh
```

---

## 🚨 紧急响应

### 如果发现安全问题

1. **立即操作**：
   ```bash
   # 停止服务
   pm2 stop gaokongche-api
   
   # 备份数据库
   mysqldump -u root -p gaokongche > emergency_backup.sql
   ```

2. **检查日志**：
   ```sql
   SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100;
   ```

3. **重置所有密码**：
   ```sql
   -- 锁定所有账户
   UPDATE users SET is_locked = 1 WHERE role != 'admin';
   ```

---

## 📝 定期安全检查

### 每周检查

- [ ] 检查登录失败日志
- [ ] 检查异常API访问
- [ ] 检查磁盘空间

### 每月检查

- [ ] 更新系统软件包
- [ ] 审查用户权限
- [ ] 测试备份恢复

### 每季度检查

- [ ] 更新Node.js版本
- [ ] 审查安全配置
- [ ] 渗透测试（可选）

---

## 🎯 当前系统安全评估

### ✅ 已实现的安全功能

1. ✅ **密码加密**：bcrypt (10 rounds)
2. ✅ **登录失败锁定**：5次失败自动锁定
3. ✅ **JWT认证**：Token认证机制
4. ✅ **审计日志**：完整的操作日志
5. ✅ **SQL防注入**：参数化查询
6. ✅ **软删除**：防止数据误删

### ⚠️ 需要配置的安全功能

1. ⚠️ **JWT_SECRET**：必须配置强随机密钥
2. ⚠️ **默认密码**：首次登录后必须修改
3. ⚠️ **数据库用户**：创建专用用户（不使用root）
4. ⚠️ **HTTPS**：配置SSL证书
5. ⚠️ **自动备份**：配置定期备份
6. ⚠️ **登录限流**：取消注释限流中间件

---

**最后更新**：2024-12-16
