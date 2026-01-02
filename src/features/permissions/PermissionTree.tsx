import React, { useState, useEffect, useMemo } from 'react';
import { Tree, Button, Space, App, Checkbox } from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { Permission } from './types';

interface PermissionTreeProps {
  permissions: Permission[];
  checkedKeys: number[];
  onChange: (checkedKeys: number[]) => void;
  readonly?: boolean;
  showSaveButton?: boolean;
  onSave?: (checkedKeys: number[]) => Promise<void>;
  onClose?: () => void;
}

const PermissionTree: React.FC<PermissionTreeProps> = ({
  permissions,
  checkedKeys,
  onChange,
  readonly = false,
  showSaveButton = true,
  onSave,
  onClose,
}) => {
  const { message } = App.useApp();
  const [localCheckedKeys, setLocalCheckedKeys] = useState<number[]>(checkedKeys);
  const [allChecked, setAllChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalCheckedKeys(checkedKeys);
  }, [checkedKeys]);

  // 获取所有权限ID
  const getAllPermissionIds = (perms: Permission[]): number[] => {
    let ids: number[] = [];
    perms.forEach(perm => {
      ids.push(perm.id);
      if (perm.children && perm.children.length > 0) {
        ids = ids.concat(getAllPermissionIds(perm.children));
      }
    });
    return ids;
  };

  const allPermissionIds = useMemo(() => getAllPermissionIds(permissions), [permissions]);

  // 转换为Ant Design Tree所需的数据格式
  const convertToTreeData = (perms: Permission[]): DataNode[] => {
    return perms.map(perm => ({
      title: perm.name,
      key: perm.id,
      children: perm.children && perm.children.length > 0 
        ? convertToTreeData(perm.children) 
        : undefined,
    }));
  };

  const treeData = useMemo(() => convertToTreeData(permissions), [permissions]);

  const handleCheck = (checked: any) => {
    const checkedKeys = Array.isArray(checked) ? checked : checked.checked;
    setLocalCheckedKeys(checkedKeys);
    onChange(checkedKeys);
    
    // 更新全选状态
    setAllChecked(checkedKeys.length === allPermissionIds.length);
  };

  const handleSelectAll = (e: any) => {
    const checked = e.target.checked;
    const keys = checked ? allPermissionIds : [];
    setLocalCheckedKeys(keys);
    onChange(keys);
    setAllChecked(checked);
  };

  const handleSave = async () => {
    if (!onSave) return;
    
    try {
      setSaving(true);
      await onSave(localCheckedKeys);
      message.success('保存成功');
      onClose?.();
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部操作栏 */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Space>
          <Checkbox 
            checked={allChecked}
            onChange={handleSelectAll}
            disabled={readonly}
          >
            全选
          </Checkbox>
          <span style={{ color: '#999', fontSize: 12 }}>
            已选择 {localCheckedKeys.length} / {allPermissionIds.length} 项
          </span>
        </Space>
        
        {showSaveButton && (
          <Space>
            {onClose && (
              <Button onClick={onClose}>
                仅保存
              </Button>
            )}
            <Button 
              type="primary" 
              onClick={handleSave}
              loading={saving}
              disabled={readonly}
            >
              保存并关闭
            </Button>
          </Space>
        )}
      </div>

      {/* 树形权限列表 */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <Tree
          checkable
          selectable={false}
          checkedKeys={localCheckedKeys}
          onCheck={handleCheck}
          treeData={treeData}
          defaultExpandAll
          disabled={readonly}
          style={{ fontSize: 14 }}
        />
      </div>
    </div>
  );
};

export default PermissionTree;
