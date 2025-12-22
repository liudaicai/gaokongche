import React from 'react';
import { Button, Space } from 'antd';
import './FixedFooterButtons.css';

interface FixedFooterButtonsProps {
  children?: React.ReactNode;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  submitDisabled?: boolean;
  showCancel?: boolean;
  extra?: React.ReactNode;
}

/**
 * 固定在页面底部的按钮栏组件
 * 用于统一所有表单页面的提交按钮样式和位置
 */
export const FixedFooterButtons: React.FC<FixedFooterButtonsProps> = ({
  children,
  onSubmit,
  onCancel,
  submitText = '提交',
  cancelText = '取消',
  loading = false,
  submitDisabled = false,
  showCancel = true,
  extra,
}) => {
  return (
    <div className="fixed-footer-buttons">
      <div className="fixed-footer-buttons-content">
        <div className="fixed-footer-buttons-left">
          {extra}
        </div>
        <div className="fixed-footer-buttons-right">
          <Space size="middle">
            {children || (
              <>
                {showCancel && onCancel && (
                  <Button size="large" onClick={onCancel}>
                    {cancelText}
                  </Button>
                )}
                {onSubmit && (
                  <Button
                    type="primary"
                    size="large"
                    onClick={onSubmit}
                    loading={loading}
                    disabled={submitDisabled}
                  >
                    {submitText}
                  </Button>
                )}
              </>
            )}
          </Space>
        </div>
      </div>
    </div>
  );
};

