import React, { useMemo, useRef } from 'react';
import { Button, Space, Typography, Card } from 'antd';
import { useSelector } from 'react-redux';
import { Order } from '../types';
import { useTabs } from '../../common/TabsContext';
import { selectDefaultTemplate, selectTemplateMapping } from '../../templates/templatesSlice';
import { renderTemplate, printElement, exportElementAsPdf } from '../../templates/templateEngine';

interface Props {
  order: Order;
  tabKey: string;
}

const { Title } = Typography;

const ContractPreviewTab: React.FC<Props> = ({ order, tabKey }) => {
  const { closeTab } = useTabs();
  const defaultContractTemplate = useSelector(selectDefaultTemplate('合同'));
  const mapping = useSelector(defaultContractTemplate ? selectTemplateMapping(defaultContractTemplate.id) : (() => ({})) as any);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const previewHtml = useMemo(() => {
    if (!defaultContractTemplate) {
      return '<div style="padding:12px; color:#888">尚未设置默认合同模板</div>';
    }
    // 基础源数据（供路径解析）
    const source: Record<string, any> = {
      order,
      system: { printDate: new Date().toLocaleDateString() },
    };
    const getByPath = (obj: any, path: string) => {
      if (!path) return '';
      return path.split('.').reduce((acc: any, key: string) => (acc == null ? '' : acc[key]), obj);
    };
    // 若存在占位符映射，按映射生成数据对象
    const mappedData: Record<string, any> = {};
    Object.entries(mapping || {}).forEach(([k, p]) => {
      mappedData[k] = getByPath(source, p as string);
    });
    // 处理 items 列表：如果映射指定了 items 列表路径，则标准化子项结构
    let items: any[] = [];
    if (mappedData.items && Array.isArray(mappedData.items)) {
      items = (mappedData.items as any[]).map((it: any, idx: number) => ({
        index: idx + 1,
        equipment_type: it.equipmentType || it.type || '—',
        height: it.height || '—',
        quantity: it.quantity ?? it.count ?? 0,
        daily_price: (it.dailyRentalPrice ?? it.rentalRateDaily ?? it.dailyPrice ?? '—'),
        monthly_rate: (it.monthlyRentalRate ?? it.rentalRateMonthly ?? it.monthlyPrice ?? '—'),
      }));
      mappedData.items = items;
    }
    // 回退：若未提供映射则使用默认字段构造
    if (!Object.keys(mappedData).length) {
      items = (order.equipmentItems || []).map((it: any, idx: number) => ({
        index: idx + 1,
        equipment_type: it.equipmentType || '—',
        height: it.height || '—',
        quantity: it.quantity || 0,
        daily_price: (it.dailyRentalPrice ?? it.rentalRateDaily ?? '—'),
        monthly_rate: (it.monthlyRentalRate ?? it.rentalRateMonthly ?? '—'),
      }));
      mappedData.contract_number = (order as any)?.contractNumber || `CN-${Date.now().toString().slice(-6)}`;
      mappedData.print_date = new Date().toLocaleDateString();
      mappedData.lessor_name = (order as any)?.vendorName || '惠州振鸿工程机械租赁有限公司';
      mappedData.lessee_name = order.customerName;
      mappedData.project_name = order.projectName;
      mappedData.delivery_location = order.deliveryLocation || order.projectName;
      mappedData.payment_agreement = (order as any)?.paymentAgreement || (order as any)?.otherAgreements || '按月结算，次月10日前支付上月租金';
      mappedData.items = items;
    }
    return renderTemplate(defaultContractTemplate.content || '', mappedData);
  }, [defaultContractTemplate, order, mapping]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>合同预览</Title>
        <Space>
          <Button onClick={() => closeTab(tabKey)}>返回</Button>
          <Button type="primary" onClick={() => previewRef.current && printElement(previewRef.current)}>打印</Button>
          <Button onClick={() => previewRef.current && exportElementAsPdf(previewRef.current, '合同')}>导出PDF</Button>
        </Space>
      </div>
      <Card>
        <div ref={previewRef} style={{ background: '#fff', padding: 16 }}>
          <div style={{ border: '1px solid #e8e8e8', padding: 8 }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      </Card>
    </div>
  );
};

export default ContractPreviewTab;