/**
 * 模板卡片选择器 - 可视化选择模板
 * 用卡片方式展示模板，比下拉菜单更直观
 */

import React, { useState } from 'react';
import { Card, Row, Col, Badge, Tag, Button, Space, Empty } from 'antd';
import { CheckCircleOutlined, StarFilled, EyeOutlined } from '@ant-design/icons';
import type { Template } from '../types';

const { Meta } = Card;

interface Props {
  templates: Template[];
  selectedId?: string;
  onSelect: (template: Template) => void;
  onPreview?: (template: Template) => void;
  showPreview?: boolean;
  renderActions?: (template: Template) => React.ReactNode[];
}

const TemplateCardSelector: React.FC<Props> = ({ 
  templates, 
  selectedId,
  onSelect,
  onPreview,
  showPreview = true,
  renderActions,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (templates.length === 0) {
    return (
      <Empty 
        description="暂无可用模板"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {templates.map((template) => {
        const isSelected = selectedId === template.id;
        const isDefault = template.isDefault;

        // Default actions if no custom renderActions provided
        const defaultActions = showPreview ? [
          <Button 
            key="preview"
            type="text" 
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onPreview?.(template);
            }}
          >
            预览
          </Button>
        ] : undefined;

        const actions = renderActions ? renderActions(template) : defaultActions;

        return (
          <Col key={template.id} xs={24} sm={12} md={8} lg={6} xl={6}>
            <Badge.Ribbon 
              text={isDefault ? '默认' : undefined}
              color={isDefault ? 'blue' : undefined}
              style={{ display: isDefault ? 'block' : 'none' }}
            >
              <Card
                hoverable
                onMouseEnter={() => setHoveredId(template.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelect(template)}
                style={{
                  borderColor: isSelected ? '#1890ff' : undefined,
                  borderWidth: isSelected ? 2 : 1,
                  position: 'relative',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                styles={{ body: { flex: 1 } }}
                cover={
                  <div 
                    style={{ 
                      height: 120, 
                      background: isSelected 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : isDefault
                        ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                        : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 48,
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {isSelected ? (
                      <CheckCircleOutlined />
                    ) : isDefault ? (
                      <StarFilled />
                    ) : (
                      '📄'
                    )}
                  </div>
                }
                actions={actions}
              >
                <Meta
                  title={
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <div style={{ 
                        fontWeight: 600, 
                        fontSize: 16,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }} title={template.name}>
                        {template.name}
                      </div>
                      <div>
                        <Tag color={isSelected ? 'blue' : 'default'} style={{ marginRight: 0 }}>
                          {template.type}
                        </Tag>
                        {template.status === 'disabled' && <Tag color="red">停用</Tag>}
                      </div>
                    </Space>
                  }
                  description={
                    <div style={{ 
                      fontSize: 12,
                      color: '#999',
                      marginTop: 8,
                      minHeight: 40,
                    }}>
                      {template.description ? (
                        <div style={{ 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          display: '-webkit-box', 
                          WebkitLineClamp: 2, 
                          WebkitBoxOrient: 'vertical' 
                        }} title={template.description}>
                          {template.description}
                        </div>
                      ) : (
                        <div>
                          {template.versions && template.versions.length > 0 && (
                            <span>版本: {template.versions.length} · </span>
                          )}
                          {template.updatedAt && (
                            <span>更新: {new Date(template.updatedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      )}
                    </div>
                  }
                />
                
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: '#1890ff',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 18,
                    zIndex: 1
                  }}>
                    <CheckCircleOutlined />
                  </div>
                )}
              </Card>
            </Badge.Ribbon>
          </Col>
        );
      })}
    </Row>
  );
};

export default TemplateCardSelector;
