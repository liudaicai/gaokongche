/**
 * 合同生成组件
 * 使用docxtemplater基于模板和订单数据生成DOCX合同
 */
import React, { useState } from 'react';
import { Button, message as antdMessage, App } from 'antd';
import { FileWordOutlined, DownloadOutlined } from '@ant-design/icons';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { apiGet, apiPost } from '../../api/client';

interface ContractGeneratorProps {
  orderId: number;
  templateId: number;
  onSuccess?: (contractUrl?: string) => void;
  buttonText?: string;
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
}

export const ContractGenerator: React.FC<ContractGeneratorProps> = ({
  orderId,
  templateId,
  onSuccess,
  buttonText = '生成合同',
  type = 'primary'
}) => {
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(false);

  const generateContract = async () => {
    setLoading(true);
    
    try {
      // 1. 获取订单详细信息
      message.loading({ content: '正在加载订单数据...', key: 'generate', duration: 0 });
      const orderResponse = await apiGet(`/orders/${orderId}`);
      const order = orderResponse.data || orderResponse;
      
      if (!order) {
        throw new Error('订单数据加载失败');
      }

      // 2. 获取模板信息
      message.loading({ content: '正在加载模板...', key: 'generate', duration: 0 });
      const templateResponse = await apiGet(`/templates/${templateId}`);
      const template = templateResponse.data || templateResponse;
      
      if (!template || !template.fileUrl) {
        throw new Error('模板文件不存在，请上传DOCX模板文件');
      }

      // 3. 下载模板文件
      message.loading({ content: '正在下载模板文件...', key: 'generate', duration: 0 });
      const templateFileResponse = await fetch(template.fileUrl);
      
      if (!templateFileResponse.ok) {
        throw new Error('模板文件下载失败');
      }
      
      const templateBuffer = await templateFileResponse.arrayBuffer();

      // 4. 准备合同数据
      message.loading({ content: '正在填充合同数据...', key: 'generate', duration: 0 });
      const contractData = prepareContractData(order);

      // 5. 使用docxtemplater生成文档
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.render(contractData);

      // 6. 生成最终文档
      message.loading({ content: '正在生成合同文件...', key: 'generate', duration: 0 });
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // 7. 下载文件
      const fileName = `合同-${contractData.contractNumber}.docx`;
      saveAs(output, fileName);

      // 8. 记录合同生成（可选：上传到服务器）
      try {
        await apiPost('/contracts/generate', {
          orderId,
          templateId,
          contractNumber: contractData.contractNumber
        });
      } catch (err) {
        console.warn('合同记录保存失败:', err);
      }

      message.success({ content: '合同生成成功！', key: 'generate', duration: 2 });
      onSuccess?.(fileName);
      
    } catch (error: any) {
      console.error('生成合同失败:', error);
      message.error({ 
        content: `生成失败: ${error.message}`, 
        key: 'generate', 
        duration: 3 
      });
      
      modal.error({
        title: '合同生成失败',
        content: (
          <div>
            <p>{error.message}</p>
            {error.message.includes('模板文件') && (
              <p style={{ marginTop: 8, color: '#666' }}>
                请确保在模板管理中上传了DOCX格式的合同模板文件
              </p>
            )}
          </div>
        )
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type={type}
      icon={<FileWordOutlined />}
      loading={loading}
      onClick={generateContract}
    >
      {buttonText}
    </Button>
  );
};

/**
 * 准备合同数据
 */
function prepareContractData(order: any) {
  // 生成合同编号
  const contractNumber = `HT${new Date().getFullYear()}${order.id.toString().padStart(6, '0')}`;
  
  // 格式化日期
  const formatDate = (date: string | Date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  // 准备设备列表
  const equipmentList = (order.equipmentItems || order.equipment_demands || []).map((item: any, index: number) => ({
    序号: index + 1,
    设备类型: `${item.category || item.equipmentCategory || ''} ${item.type || item.equipmentType || ''}`,
    型号: item.model || item.equipmentModel || '',
    高度: `${item.height || item.equipmentHeight || ''}米`,
    数量: item.quantity || 1,
    进场日期: item.scheduledEntryDate || item.entry_date || '',
    退场日期: item.estimatedExitDate || item.exit_date || '',
    租期: `${item.rentalPeriod || 0}天`,
    日租金: `¥${(item.dailyRate || 0).toLocaleString()}`,
    月租金: `¥${(item.monthlyRate || 0).toLocaleString()}`,
    租金: `¥${(item.rent || 0).toLocaleString()}`
  }));

  return {
    // 基本信息
    contractNumber,
    orderNumber: order.orderNumber || order.order_number || '',
    createDate: formatDate(new Date()),
    
    // 客户信息
    customerName: order.customerName || order.customer_name || '',
    customerContact: order.customerContact || order.contact_person || '',
    customerPhone: order.customerPhone || order.contact_phone || '',
    customerAddress: order.customerAddress || order.contact_address || '',
    
    // 设备清单
    equipmentList,
    
    // 金额信息
    totalRent: `¥${(order.totalRent || order.total_rent || 0).toLocaleString()}`,
    totalDeposit: `¥${(order.totalDeposit || order.total_deposit || 0).toLocaleString()}`,
    totalFreight: `¥${(order.totalFreight || order.total_freight || 0).toLocaleString()}`,
    totalAmount: `¥${(order.totalAmount || order.total_amount || 0).toLocaleString()}`,
    
    // 其他信息
    remarks: order.remarks || order.notes || '无',
    companyName: order.companyName || order.company_name || '',
    salesPersonName: order.salesPersonName || order.salesperson_name || '',
    
    // 日期信息
    signDate: formatDate(new Date()),
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate()
  };
}

export default ContractGenerator;


