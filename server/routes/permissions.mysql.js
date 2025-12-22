import express from 'express';

function buildPermissionsRouter(pool) {
  const router = express.Router();

  // 辅助函数：转换为驼峰命名
  function toCamelCase(str) {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }

  function keysToCamelCase(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(keysToCamelCase);
    
    const result = {};
    for (const key in obj) {
      result[toCamelCase(key)] = obj[key];
    }
    return result;
  }

  // 构建树形结构
  function buildTree(flatList, parentId = null) {
    const children = flatList.filter(item => item.parent_id === parentId);
    if (children.length === 0) return [];
    
    return children.map(child => ({
      ...keysToCamelCase(child),
      children: buildTree(flatList, child.id)
    }));
  }

  // ==================== 权限定义管理 ====================

  // 获取所有权限（树形结构）
  router.get('/definitions', async (req, res) => {
    try {
      const [permissions] = await pool.query(
        'SELECT * FROM permissions WHERE status = "enabled" ORDER BY sequence, id'
      );

      const tree = buildTree(permissions);

      res.json({
        ok: true,
        data: tree
      });
    } catch (error) {
      console.error('获取权限定义失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // 获取扁平化权限列表
  router.get('/definitions/flat', async (req, res) => {
    try {
      const [permissions] = await pool.query(
        'SELECT * FROM permissions WHERE status = "enabled" ORDER BY sequence, id'
      );

      res.json({
        ok: true,
        data: permissions.map(p => keysToCamelCase(p))
      });
    } catch (error) {
      console.error('获取权限列表失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // ==================== 角色权限管理 ====================

  // 获取角色权限列表
  router.get('/roles', async (req, res) => {
    try {
      const companyId = req.user?.role === 'superadmin' 
        ? req.query.companyId 
        : req.user?.company_id;

      if (!companyId) {
        return res.json({ ok: false, error: '未找到公司信息' });
      }

      const [roles] = await pool.query(
        'SELECT * FROM role_permissions WHERE company_id = ? ORDER BY created_at DESC',
        [companyId]
      );

      res.json({
        ok: true,
        data: roles.map(r => ({
          ...keysToCamelCase(r),
          permissionIds: JSON.parse(r.permission_ids || '[]')
        }))
      });
    } catch (error) {
      console.error('获取角色权限列表失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // 获取单个角色的权限
  router.get('/roles/:roleCode', async (req, res) => {
    try {
      const { roleCode } = req.params;
      const companyId = req.user?.role === 'superadmin' 
        ? req.query.companyId 
        : req.user?.company_id;

      if (!companyId) {
        return res.json({ ok: false, error: '未找到公司信息' });
      }

      const [[role]] = await pool.query(
        'SELECT * FROM role_permissions WHERE company_id = ? AND role_code = ?',
        [companyId, roleCode]
      );

      if (!role) {
        return res.json({ ok: false, error: '角色不存在' });
      }

      res.json({
        ok: true,
        data: {
          ...keysToCamelCase(role),
          permissionIds: JSON.parse(role.permission_ids || '[]')
        }
      });
    } catch (error) {
      console.error('获取角色权限失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // 设置角色权限
  router.post('/roles/:roleCode', async (req, res) => {
    try {
      const { roleCode } = req.params;
      const { roleName, permissionIds } = req.body;
      const userId = req.user?.id;
      const companyId = req.user?.role === 'superadmin' 
        ? req.body.companyId 
        : req.user?.company_id;

      if (!companyId) {
        return res.json({ ok: false, error: '未找到公司信息' });
      }

      if (!roleName || !Array.isArray(permissionIds)) {
        return res.json({ ok: false, error: '参数错误' });
      }

      // 检查是否已存在
      const [[existing]] = await pool.query(
        'SELECT id FROM role_permissions WHERE company_id = ? AND role_code = ?',
        [companyId, roleCode]
      );

      if (existing) {
        // 更新
        await pool.query(
          `UPDATE role_permissions SET 
            role_name = ?,
            permission_ids = ?,
            updated_by = ?
          WHERE company_id = ? AND role_code = ?`,
          [roleName, JSON.stringify(permissionIds), userId, companyId, roleCode]
        );
      } else {
        // 插入
        await pool.query(
          `INSERT INTO role_permissions (
            company_id, role_code, role_name, permission_ids, created_by
          ) VALUES (?, ?, ?, ?, ?)`,
          [companyId, roleCode, roleName, JSON.stringify(permissionIds), userId]
        );
      }

      res.json({ ok: true, message: '保存成功' });
    } catch (error) {
      console.error('设置角色权限失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // 删除角色权限
  router.delete('/roles/:roleCode', async (req, res) => {
    try {
      const { roleCode } = req.params;
      const companyId = req.user?.role === 'superadmin' 
        ? req.query.companyId 
        : req.user?.company_id;

      if (!companyId) {
        return res.json({ ok: false, error: '未找到公司信息' });
      }

      await pool.query(
        'DELETE FROM role_permissions WHERE company_id = ? AND role_code = ?',
        [companyId, roleCode]
      );

      res.json({ ok: true, message: '删除成功' });
    } catch (error) {
      console.error('删除角色权限失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // ==================== 用户权限管理 ====================

  // 获取用户权限
  router.get('/users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const companyId = req.user?.role === 'superadmin' 
        ? req.query.companyId 
        : req.user?.company_id;

      if (!companyId) {
        return res.json({ ok: false, error: '未找到公司信息' });
      }

      const [[userPerm]] = await pool.query(
        'SELECT * FROM user_permissions WHERE company_id = ? AND user_id = ?',
        [companyId, userId]
      );

      if (!userPerm) {
        return res.json({ ok: true, data: null });
      }

      res.json({
        ok: true,
        data: {
          ...keysToCamelCase(userPerm),
          permissionIds: JSON.parse(userPerm.permission_ids || '[]')
        }
      });
    } catch (error) {
      console.error('获取用户权限失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // 设置用户权限
  router.post('/users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { permissionIds, isOverride } = req.body;
      const operatorId = req.user?.id;
      const companyId = req.user?.role === 'superadmin' 
        ? req.body.companyId 
        : req.user?.company_id;

      if (!companyId) {
        return res.json({ ok: false, error: '未找到公司信息' });
      }

      if (!Array.isArray(permissionIds)) {
        return res.json({ ok: false, error: '参数错误' });
      }

      // 检查是否已存在
      const [[existing]] = await pool.query(
        'SELECT id FROM user_permissions WHERE company_id = ? AND user_id = ?',
        [companyId, userId]
      );

      if (existing) {
        // 更新
        await pool.query(
          `UPDATE user_permissions SET 
            permission_ids = ?,
            is_override = ?,
            updated_by = ?
          WHERE company_id = ? AND user_id = ?`,
          [JSON.stringify(permissionIds), isOverride ? 1 : 0, operatorId, companyId, userId]
        );
      } else {
        // 插入
        await pool.query(
          `INSERT INTO user_permissions (
            company_id, user_id, permission_ids, is_override, created_by
          ) VALUES (?, ?, ?, ?, ?)`,
          [companyId, userId, JSON.stringify(permissionIds), isOverride ? 1 : 0, operatorId]
        );
      }

      res.json({ ok: true, message: '保存成功' });
    } catch (error) {
      console.error('设置用户权限失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // 删除用户权限（恢复使用角色权限）
  router.delete('/users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const companyId = req.user?.role === 'superadmin' 
        ? req.query.companyId 
        : req.user?.company_id;

      if (!companyId) {
        return res.json({ ok: false, error: '未找到公司信息' });
      }

      await pool.query(
        'DELETE FROM user_permissions WHERE company_id = ? AND user_id = ?',
        [companyId, userId]
      );

      res.json({ ok: true, message: '删除成功，已恢复使用角色权限' });
    } catch (error) {
      console.error('删除用户权限失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // ==================== 权限检查 ====================

  // 获取用户的有效权限（合并角色和个人权限）
  router.get('/users/:userId/effective', async (req, res) => {
    try {
      const { userId } = req.params;
      const companyId = req.user?.role === 'superadmin' 
        ? req.query.companyId 
        : req.user?.company_id;

      if (!companyId) {
        return res.json({ ok: false, error: '未找到公司信息' });
      }

      // 获取用户信息（包括角色）
      const [[user]] = await pool.query(
        'SELECT role FROM users WHERE id = ? AND company_id = ?',
        [userId, companyId]
      );

      if (!user) {
        return res.json({ ok: false, error: '用户不存在' });
      }

      // 获取用户个人权限
      const [[userPerm]] = await pool.query(
        'SELECT * FROM user_permissions WHERE company_id = ? AND user_id = ?',
        [companyId, userId]
      );

      // 如果有个人权限且是覆盖模式，直接返回个人权限
      if (userPerm && userPerm.is_override) {
        return res.json({
          ok: true,
          data: {
            permissionIds: JSON.parse(userPerm.permission_ids || '[]'),
            source: 'user_override'
          }
        });
      }

      // 获取角色权限
      const [[rolePerm]] = await pool.query(
        'SELECT * FROM role_permissions WHERE company_id = ? AND role_code = ?',
        [companyId, user.role]
      );

      let effectivePermissions = [];

      if (rolePerm) {
        effectivePermissions = JSON.parse(rolePerm.permission_ids || '[]');
      }

      // 合并个人权限（非覆盖模式）
      if (userPerm && !userPerm.is_override) {
        const userPermIds = JSON.parse(userPerm.permission_ids || '[]');
        effectivePermissions = [...new Set([...effectivePermissions, ...userPermIds])];
      }

      res.json({
        ok: true,
        data: {
          permissionIds: effectivePermissions,
          source: userPerm ? 'merged' : 'role'
        }
      });
    } catch (error) {
      console.error('获取用户有效权限失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  return router;
}

export default buildPermissionsRouter;
