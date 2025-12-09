import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Button, Space, Typography, Card, Form, message } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../app/store';
import { Order } from '../types';
import { useTabs } from '../../common/TabsContext';
import { fetchDefaultTemplate, selectDefaultTemplate } from '../../templates/templatesSlice';
import { TemplatePicker } from '../../templates/components';
import { mapOrderToTemplateData } from '../../templates/templateDataMapper';
import { renderTemplate, printElement, exportElementAsPdf } from '../../templates/templateEngine';

interface Props {
  order: Order;
  tabKey: string;
}

const { Title } = Typography;

const ContractPreviewTab: React.FC<Props> = ({ order, tabKey }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { closeTab } = useTabs();
  const defaultContractTemplate = useSelector(selectDefaultTemplate('合同'));
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | number | undefined>(undefined);

  // 加载默认模板
  useEffect(() => {
    dispatch(fetchDefaultTemplate('合同'));
  }, [dispatch]);

  // 当默认模板加载完成时，设置选中的模板
  useEffect(() => {
    if (defaultContractTemplate && !selectedTemplateId) {
      setSelectedTemplateId(defaultContractTemplate.id);
    }
  }, [defaultContractTemplate, selectedTemplateId]);

  // 获取当前选中的模板
  const currentTemplate = useSelector((state: any) => {
    if (!selectedTemplateId) return null;
    return state.templates.templates.find((t: any) => t.id === selectedTemplateId);
  });

  // 使用新的数据映射逻辑
  const previewHtml = useMemo(() => {
    if (!currentTemplate) {
      return '<div style="padding:12px; color:#888">请选择合同模板</div>';
    }

    // 使用统一的数据映射工具
    const templateData = mapOrderToTemplateData(order as any, '合同');
    
    // 渲染模板
    return renderTemplate(currentTemplate.content || '', templateData);
  }, [currentTemplate, order]);

  const handlePrint = () => {
    if (!previewRef.current) {
      message.warning('请先加载预览内容');
      return;
    }
    printElement(previewRef.current);
  };

  const handleExportPdf = async () => {
    if (!previewRef.current) {
      message.warning('请先加载预览内容');
      return;
    }
    try {
      const filename = `合同-${order.customerName || 'Contract'}-${Date.now()}.pdf`;
      await exportElementAsPdf(previewRef.current, filename);
      message.success('PDF导出成功');
    } catch (error) {
      message.error('PDF导出失败');
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>合同预览</Title>
        <Space>
          <Button onClick={() => closeTab(tabKey)}>返回</Button>
          <Button type="primary" onClick={handlePrint}>打印</Button>
          <Button onClick={handleExportPdf}>导出PDF</Button>
        </Space>
      </div>
      
      {/* 模板选择 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Form layout="inline">
          <Form.Item label="合同模板">
            <TemplatePicker
              type="合同"
              value={selectedTemplateId}
              onChange={setSelectedTemplateId}
              style={{ width: 300 }}
            />
          </Form.Item>
        </Form>
      </Card>

      {/* 预览区域 */}
      <Card>
        <div ref={previewRef} style={{ background: '#fff', padding: 16 }}>
          <div style={{ border: '1px solid #e8e8e8', padding: 8 }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      </Card>
    </div>
  );
};

export default ContractPreviewTab;