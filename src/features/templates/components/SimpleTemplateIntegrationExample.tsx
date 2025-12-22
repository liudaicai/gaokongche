/**
 * 简化模板使用 - 集成示例
 * 展示如何在订单详情页中使用简化的模板组件
 */

import React, { useState } from 'react';
import { Space, Button, Divider, Tabs } from 'antd';
import { ThunderboltOutlined, AppstoreOutlined, OrderedListOutlined, BulbOutlined } from '@ant-design/icons';
import type { OrderData } from '../templateDataMapper';
import type { Template, TemplateType } from '../types';
import QuickGenerateButton from './QuickGenerateButton';
import TemplateCardSelector from './TemplateCardSelector';
import BatchGenerateDialog from './BatchGenerateDialog';
import SmartTemplateRecommendation from './SmartTemplateRecommendation';

interface Props {
  order: OrderData;
  templates: Template[]; // 所有可用模板
}

const SimpleTemplateIntegrationExample: React.FC<Props> = ({ order, templates }) => {
  const [batchDialogVisible, setBatchDialogVisible] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();
  const [generatedTypes, setGeneratedTypes] = useState<TemplateType[]>([]);

  // 按类型获取默认模板
  const getDefaultTemplate = (type: TemplateType): Template | undefined => {
    return templates.find(t => t.type === type && t.isDefault);
  };

  // 获取各类型的默认模板内容
  const defaultTemplateContents: Record<TemplateType, string | undefined> = {
    '合同': getDefaultTemplate('合同')?.content,
    '进场': getDefaultTemplate('进场')?.content,
    '退场': getDefaultTemplate('退场')?.content,
    '结算': getDefaultTemplate('结算')?.content,
    '索赔': getDefaultTemplate('索赔')?.content,
    '报停': getDefaultTemplate('报停')?.content,
  };

  const handleQuickGenerate = (type: TemplateType) => {
    // 使用默认模板快速生成
    const defaultTemplate = getDefaultTemplate(type);
    if (defaultTemplate) {
      // 这里可以直接调用生成逻辑
      console.log(`快速生成${type}`, defaultTemplate);
      setGeneratedTypes([...generatedTypes, type]);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* 方式1：一键生成按钮 - 最简单 */}
      <div>
        <h3>
          <ThunderboltOutlined /> 方式1：一键生成（最快）
        </h3>
        <p style={{ color: '#666', marginBottom: 16 }}>
          无需选择模板，直接使用默认模板生成。适合日常快速操作。
        </p>
        <Space wrap>
          <QuickGenerateButton 
            order={order}
            type="合同"
            defaultTemplateContent={defaultTemplateContents['合同']}
            onGenerated={() => console.log('合同已生成')}
          />
          <QuickGenerateButton 
            order={order}
            type="进场"
            defaultTemplateContent={defaultTemplateContents['进场']}
            onGenerated={() => console.log('进场单已生成')}
          />
          <QuickGenerateButton 
            order={order}
            type="结算"
            defaultTemplateContent={defaultTemplateContents['结算']}
            onGenerated={() => console.log('结算单已生成')}
          />
          <Button 
            icon={<OrderedListOutlined />}
            onClick={() => setBatchDialogVisible(true)}
          >
            批量生成
          </Button>
        </Space>
      </div>

      <Divider />

      {/* 方式2：智能推荐 - 最智能 */}
      <div>
        <h3>
          <BulbOutlined /> 方式2：智能推荐（最智能）
        </h3>
        <p style={{ color: '#666', marginBottom: 16 }}>
          根据订单状态自动推荐下一步操作。适合新手用户。
        </p>
        <SmartTemplateRecommendation
          order={order}
          generatedTypes={generatedTypes}
          onGenerate={handleQuickGenerate}
        />
      </div>

      <Divider />

      {/* 方式3：可视化选择 - 最直观 */}
      <div>
        <h3>
          <AppstoreOutlined /> 方式3：可视化选择（最直观）
        </h3>
        <p style={{ color: '#666', marginBottom: 16 }}>
          用卡片方式选择模板，看得更清楚。适合需要自定义模板的场景。
        </p>
        <Tabs
          items={[
            {
              key: 'contract',
              label: '合同模板',
              children: (
                <TemplateCardSelector
                  templates={templates.filter(t => t.type === '合同')}
                  selectedId={selectedTemplateId}
                  onSelect={(template) => {
                    setSelectedTemplateId(template.id);
                    console.log('选择了模板:', template);
                  }}
                  onPreview={(template) => {
                    console.log('预览模板:', template);
                  }}
                />
              ),
            },
            {
              key: 'entry',
              label: '进场模板',
              children: (
                <TemplateCardSelector
                  templates={templates.filter(t => t.type === '进场')}
                  selectedId={selectedTemplateId}
                  onSelect={(template) => {
                    setSelectedTemplateId(template.id);
                    console.log('选择了模板:', template);
                  }}
                  onPreview={(template) => {
                    console.log('预览模板:', template);
                  }}
                />
              ),
            },
          ]}
        />
      </div>

      {/* 批量生成对话框 */}
      <BatchGenerateDialog
        visible={batchDialogVisible}
        order={order}
        templates={defaultTemplateContents}
        onCancel={() => setBatchDialogVisible(false)}
        onSuccess={() => {
          console.log('批量生成成功');
        }}
      />
    </div>
  );
};

export default SimpleTemplateIntegrationExample;


