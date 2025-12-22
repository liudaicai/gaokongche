/**
 * 智能模板推荐组件
 * 根据订单状态自动推荐下一步应该生成的单据
 */

import React from 'react';
import { Card, Space, Button, Tag, Timeline, Alert } from 'antd';
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  FileTextOutlined,
  RightOutlined 
} from '@ant-design/icons';
import type { TemplateType } from '../types';
import type { OrderData } from '../templateDataMapper';

interface Props {
  order: OrderData;
  onGenerate: (type: TemplateType) => void;
  generatedTypes?: TemplateType[]; // 已生成的单据类型
}

interface RecommendationStep {
  type: TemplateType;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  condition: (order: OrderData) => boolean;
}

const SmartTemplateRecommendation: React.FC<Props> = ({ 
  order, 
  onGenerate,
  generatedTypes = []
}) => {
  // 推荐规则
  const recommendationSteps: RecommendationStep[] = [
    {
      type: '合同',
      title: '签订租赁合同',
      description: '与客户确认租赁条款并签订正式合同',
      priority: 'high',
      condition: (order) => order.contractNumber ? false : true, // 没有合同号时推荐
    },
    {
      type: '进场',
      title: '办理设备进场',
      description: '设备送达现场，交接并记录设备状态',
      priority: 'high',
      condition: (order) => {
        // 有合同且设备已分配时推荐
        return !!order.contractNumber && (order.equipmentDemands?.length || 0) > 0;
      },
    },
    {
      type: '结算',
      title: '租金结算',
      description: '按周期结算租金费用',
      priority: 'medium',
      condition: (order) => {
        // 设备已进场一段时间后推荐
        return true; // 简化判断
      },
    },
    {
      type: '退场',
      title: '办理设备退场',
      description: '项目结束，设备返回门店',
      priority: 'low',
      condition: (order) => {
        // 租赁结束或项目完成时推荐
        return true; // 简化判断
      },
    },
  ];

  // 获取推荐的步骤
  const recommendations = recommendationSteps.filter(step => 
    step.condition(order) && !generatedTypes.includes(step.type)
  );

  // 下一步推荐（优先级最高的未完成步骤）
  const nextStep = recommendations.length > 0 ? recommendations[0] : null;

  // 已完成的步骤
  const completedSteps = recommendationSteps.filter(step => 
    generatedTypes.includes(step.type)
  );

  if (!nextStep && completedSteps.length === 0) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'blue';
      default: return 'default';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return '紧急';
      case 'medium': return '重要';
      case 'low': return '一般';
      default: return '';
    }
  };

  return (
    <Card 
      title={
        <Space>
          <FileTextOutlined />
          <span>智能推荐</span>
        </Space>
      }
      size="small"
    >
      {/* 下一步推荐 */}
      {nextStep && (
        <Alert
          message={
            <Space>
              <span style={{ fontWeight: 600 }}>建议下一步操作</span>
              <Tag color={getPriorityColor(nextStep.priority)}>
                {getPriorityText(nextStep.priority)}
              </Tag>
            </Space>
          }
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
                  {nextStep.title}
                </div>
                <div style={{ color: '#666', marginBottom: 12 }}>
                  {nextStep.description}
                </div>
              </div>
              <Button 
                type="primary" 
                icon={<RightOutlined />}
                onClick={() => onGenerate(nextStep.type)}
              >
                立即生成{nextStep.type}
              </Button>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 流程时间线 */}
      {(completedSteps.length > 0 || recommendations.length > 0) && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: '#666' }}>
            办理流程
          </div>
          <Timeline>
            {completedSteps.map((step) => (
              <Timeline.Item
                key={step.type}
                color="green"
                dot={<CheckCircleOutlined style={{ fontSize: 16 }} />}
              >
                <div style={{ color: '#52c41a', fontWeight: 500 }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  已完成
                </div>
              </Timeline.Item>
            ))}
            
            {recommendations.slice(0, 3).map((step, index) => (
              <Timeline.Item
                key={step.type}
                color={index === 0 ? 'blue' : 'gray'}
                dot={
                  index === 0 
                    ? <ClockCircleOutlined style={{ fontSize: 16 }} /> 
                    : undefined
                }
              >
                <div style={{ 
                  color: index === 0 ? '#1890ff' : '#999',
                  fontWeight: index === 0 ? 500 : 'normal'
                }}>
                  {step.title}
                  {index === 0 && (
                    <Tag 
                      color={getPriorityColor(step.priority)} 
                      style={{ marginLeft: 8 }}
                    >
                      {getPriorityText(step.priority)}
                    </Tag>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  {index === 0 ? '下一步' : '待办理'}
                </div>
                {index === 0 && (
                  <Button 
                    size="small" 
                    type="link"
                    style={{ padding: 0, height: 'auto', marginTop: 4 }}
                    onClick={() => onGenerate(step.type)}
                  >
                    立即生成 <RightOutlined />
                  </Button>
                )}
              </Timeline.Item>
            ))}
          </Timeline>
        </div>
      )}
    </Card>
  );
};

export default SmartTemplateRecommendation;


