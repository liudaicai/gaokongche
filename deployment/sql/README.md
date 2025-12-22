# SQL部署脚本说明

## 📋 文件说明

### 01_database_schema.sql
- **用途**：创建完整的数据库表结构
- **来源**：基于 `sql/mysql/baseline_v1.0.sql`
- **包含**：所有业务表、索引、外键约束
- **执行时间**：约30-60秒

### 02_create_admin_user.sql  
- **用途**：创建系统管理员账户
- **默认账户**：
  - 用户名：`admin`
  - 密码：`admin123`
  - 角色：系统管理员
- **⚠️ 重要**：首次登录后立即修改密码！

## 🚀 部署步骤

### 1. 登录MySQL
```bash
mysql -u root -p
```

### 2. 执行数据库初始化
```sql
source d:/kaifa/4/deployment/sql/01_database_schema.sql
```

### 3. 创建管理员账户
```sql
source d:/kaifa/4/deployment/sql/02_create_admin_user.sql
```

### 4. 验证
```sql
USE gaokongche;
SHOW TABLES;
SELECT * FROM users WHERE role='admin';
```

## ⚠️ 注意事项

1. **字符集**：数据库使用 utf8mb4
2. **排序规则**：utf8mb4_unicode_ci
3. **时区**：使用服务器本地时区
4. **外键**：已启用外键约束

## 📞 如遇到问题

1. **权限不足**：确保MySQL用户有CREATE DATABASE权限
2. **字符集错误**：检查MySQL配置文件中的default-character-set
3. **表已存在**：先删除数据库 `DROP DATABASE gaokongche;` 再重新执行

---

**最后更新**：2024-12-16
