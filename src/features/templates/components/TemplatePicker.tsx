/**
 * 通用模板选择组件
 * 用于在各个业务流程中选择模板
 */

import React, { useEffect } from 'react';
import { Select, Tag, Spin } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../app/store';
import { fetchTemplates, selectTemplatesByType } from '../templatesSlice';
import type { TemplateType } from '../types';

interface TemplatePickerProps {
  type: TemplateType;
  value?: string | number;
  onChange?: (templateId: string | number) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  allowClear?: boolean;
}

/**
 * 模板选择器组件
 * 自动加载指定类型的模板，支持显示默认标签
 */
export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  type,
  value,
  onChange,
  placeholder = '选择模板',
  style,
  disabled = false,
  allowClear = false,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const templates = useSelector((state: RootState) => selectTemplatesByType(type)(state));
  const loading = useSelector((state: RootState) => state.templates.loading);

  // 组件加载时获取指定类型的模板
  useEffect(() => {
    dispatch(fetchTemplates({ type, status: 'enabled' }));
  }, [type, dispatch]);

  // 启用的模板列表
  const enabledTemplates = templates.filter(t => t.status === 'enabled');

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{ width: '100%', ...style }}
      disabled={disabled}
      allowClear={allowClear}
      loading={loading}
      notFoundContent={loading ? <Spin size="small" /> : '暂无可用模板'}
    >
      {enabledTemplates.map(t => (
        <Select.Option key={t.id} value={t.id}>
          {t.name}
          {t.isDefault && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              默认
            </Tag>
          )}
        </Select.Option>
      ))}
    </Select>
  );
};

export default TemplatePicker;


