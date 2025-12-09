import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Form, Input, Select, DatePicker, Collapse, InputNumber, Row, Col, Button, Typography, message, Modal, Tooltip, Affix } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { AppDispatch } from '../../../app/store';
import { addOrder } from '../ordersSlice';
import { OrderFormData, OrderEquipmentItem } from '../types';
import { useTabs } from '../../common/TabsContext';
import { fetchCompanyVerifications, selectCompanyVerifications, selectCompanyVerificationsLoading } from '../../stores/storesSlice';
import { fetchEmployees, selectEmployees, selectEmployeesLoading } from '../../employees/employeesSlice';
import { selectEquipmentList, fetchEquipmentsStart, fetchEquipmentsSuccess, fetchEquipmentsFailure, Equipment } from '../../equipment/equipmentslice';
import EquipmentPickerModal from '../components/EquipmentPickerModal';
import CustomerPickerModal from '../../customers/CustomerPickerModal';
import dayjs from 'dayjs';
import { apiGet } from '../../../api/client';
import { calculateOrderEstimatedAmount } from '../pricing';

const { TextArea } = Input;
const { Option } = Select;

interface NewOrderTabProps {
  tabKey: string;
  orderId?: string; // 可选的订单ID，用于编辑模式
}

// 设备型号结构（用于级联筛选）
interface EquipmentModel {
  id: string;
  category: string; // 设备类别
  brand: string;    // 品牌
  model: string;    // 型号
  type: string;     // 设备类型
  height: number;   // 高度（米）
  driveType: string; // 驱动类型
}

const monthCalcOptions = [
  { label: '30天为一月', value: '30天为一月' },
  { label: '自然月', value: '自然月' },
];
const paymentAgreementOptions = [
  { label: '预付', value: '预付' },
  { label: '月结', value: '月结' },
  { label: '退场付清', value: '退场付清' },
];
const freightReductionOptions = [
  { label: '无减免', value: '无减免' },
  { label: '三个月免运费', value: '三个月免运费' },
  { label: '三个月免单程半年免双程', value: '三个月免单程半年免双程' },
  { label: '两个月免单程三个月免双程', value: '两个月免单程三个月免双程' },
];
const freightCalcOptions = [
  { label: '按台计费', value: '按台计费' },
  { label: '按趟计费', value: '按趟计费' },
];
const invoiceTypeOptions = [
  { label: '不开票', value: '不开票' },
  { label: '专票', value: '专票' },
  { label: '普票', value: '普票' },
];

// 设备类别选项（从设备型号管理获取）
const EQUIPMENT_CATEGORIES = [
  '高空车',
  '叉车',
  '吊车',
  '车载高空车',
];

// 设备类型选项（从设备型号管理获取）
const EQUIPMENT_TYPES = [
  '剪叉车',
  '曲臂车',
  '直臂车',
  '履带剪叉',
  '套筒车',
  '蜘蛛车',
  '吸盘车',
];

const NewOrderTab: React.FC<NewOrderTabProps> = ({ tabKey }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch<AppDispatch>();
  const { closeTab } = useTabs();
  const isUpdatingRef = useRef(false);

  const companyVerifications = useSelector(selectCompanyVerifications);
  const companyVerificationsLoading = useSelector(selectCompanyVerificationsLoading);
  const employees = useSelector(selectEmployees);
  const employeesLoading = useSelector(selectEmployeesLoading);
  const equipmentList = useSelector(selectEquipmentList);

  // 保护性处理：确保员工列表为数组
  const safeEmployees = Array.isArray(employees) ? employees : [];

  // 保护性处理：确保公司认证列表为数组
  const safeCompanyVerifications = Array.isArray(companyVerifications) ? companyVerifications : [];

  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerItemIndex, setPickerItemIndex] = useState<number | null>(null);
  // 防重复点击：新增设备按钮锁
  const [addLocked, setAddLocked] = useState(false);

  // 新增：设备型号数据状态
  const [equipmentModels, setEquipmentModels] = useState<EquipmentModel[]>([]);

  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchCompanyVerifications());
  }, [dispatch]);

  // 拉取设备列表（用于设备选择模态）
  useEffect(() => {
    dispatch(fetchEquipmentsStart());
    apiGet<Equipment[]>('/equipments')
      .then(list => dispatch(fetchEquipmentsSuccess(list)))
      .catch((err: any) => dispatch(fetchEquipmentsFailure(err?.message || '获取设备列表失败')));
  }, [dispatch]);

  // 新增：加载设备型号数据
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const models = await apiGet<EquipmentModel[]>('/models');
        setEquipmentModels(models);
      } catch (err: any) {
        console.error('获取设备型号失败:', err);
      }
    };
    fetchModels();
  }, []);

  // 新增：根据设备类别获取可用的设备类型
  const getAvailableTypes = (category: string): string[] => {
    if (!category) return EQUIPMENT_TYPES;
    const categoryModels = equipmentModels.filter(model => model.category === category);
    const types = [...new Set(categoryModels.map(model => model.type))];
    return types.length > 0 ? types : EQUIPMENT_TYPES;
  };

  // 新增：根据设备类别和类型获取可用的高度
  const getAvailableHeights = (category: string, type: string): number[] => {
    if (!category || !type) return [];
    const filteredModels = equipmentModels.filter(
      model => model.category === category && model.type === type
    );
    const heights = [...new Set(filteredModels.map(model => model.height))];
    return heights.sort((a, b) => a - b);
  };

  // 新增：处理设备类别变化的级联筛选
  const handleCategoryChange = (_value: string, index: number) => {
    const equipmentItems = form.getFieldValue('equipmentItems') || [];
    if (equipmentItems[index]) {
      // 清空设备类型和高度
      equipmentItems[index].equipmentType = undefined;
      equipmentItems[index].height = undefined;
      form.setFieldsValue({ equipmentItems });
    }
  };

  // 新增：处理设备类型变化的级联筛选
  const handleTypeChange = (_value: string, index: number) => {
    const equipmentItems = form.getFieldValue('equipmentItems') || [];
    if (equipmentItems[index]) {
      // 清空高度
      equipmentItems[index].height = undefined;
      form.setFieldsValue({ equipmentItems });
    }
  };



  // 新增：数据验证函数
  const validateEquipmentItem = (item: any): string[] => {
    const errors: string[] = [];
    
    // 基础字段验证
    if (!item.equipmentCategory) errors.push('设备类别不能为空');
    if (!item.equipmentType) errors.push('设备类型不能为空');
    if (!item.height) errors.push('高度不能为空');
    if (!item.quantity || item.quantity <= 0) errors.push('数量必须大于0');
    
    // 数值字段验证
    if (item.dailyRate && (isNaN(item.dailyRate) || item.dailyRate < 0)) {
      errors.push('天租价必须为非负数');
    }
    if (item.monthlyRate && (isNaN(item.monthlyRate) || item.monthlyRate < 0)) {
      errors.push('月租价必须为非负数');
    }
    if (item.deposit && (isNaN(item.deposit) || item.deposit < 0)) {
      errors.push('押金必须为非负数');
    }
    if (item.shippingFee && (isNaN(item.shippingFee) || item.shippingFee < 0)) {
      errors.push('运费必须为非负数');
    }
    if (item.modificationFee && (isNaN(item.modificationFee) || item.modificationFee < 0)) {
      errors.push('改装费必须为非负数');
    }
    if (item.rentalPeriod && (isNaN(item.rentalPeriod) || item.rentalPeriod <= 0)) {
      errors.push('租期必须大于0');
    }
    
    // 关联验证
    if (item.dailyRate && item.monthlyRate && item.rentalPeriod) {
      // 移除了计算租金相关的验证逻辑
    }
    
    // 日期验证
    if (item.scheduledEntryDate && item.estimatedExitDate) {
      const entryDate = dayjs(item.scheduledEntryDate);
      const exitDate = dayjs(item.estimatedExitDate);
      if (exitDate.isBefore(entryDate)) {
        errors.push('退场日期不能早于进场日期');
      }
      
      // 如果有租期，验证日期差是否与租期匹配
      if (item.rentalPeriod) {
        const daysDiff = exitDate.diff(entryDate, 'day') + 1; // 包含进场当天
        if (Math.abs(daysDiff - item.rentalPeriod) > 1) { // 允许1天的误差
          errors.push(`租期(${item.rentalPeriod}天)与日期差(${daysDiff}天)不匹配`);
        }
      }
    }
    
    return errors;
  };

  // 新增：批量验证所有设备项
  const validateAllEquipmentItems = (): boolean => {
    const equipmentItems = form.getFieldValue('equipmentItems') || [];
    let hasErrors = false;
    
    equipmentItems.forEach((item: any, index: number) => {
      const errors = validateEquipmentItem(item);
      if (errors.length > 0) {
        hasErrors = true;
        message.error(`设备需求第${index + 1}项: ${errors.join(', ')}`);
      }
    });
    
    return !hasErrors;
  };



  // 新增：处理日期字段变化，实现智能计算功能
  const handleDateFieldChange = (index: number, source?: 'entry' | 'exit' | 'rentalPeriod') => {
    const items = form.getFieldValue('equipmentItems') || [];
    const item = items[index];
    
    if (!item) return;
    
    const { scheduledEntryDate, estimatedExitDate, rentalPeriod } = item;
    
    // 验证租期范围
    if (rentalPeriod !== undefined && rentalPeriod !== null) {
      if (rentalPeriod < 0) {
        message.error('租期不能为负数');
        return;
      }
      if (rentalPeriod > 3650) {
        message.error('租期不能超过10年(3650天)');
        return;
      }
      if (rentalPeriod % 1 !== 0) {
        message.error('租期必须为整数');
        return;
      }
    }
    
    // 智能计算逻辑：根据已有的字段计算缺失的字段
    let shouldUpdate = false;
    const updatedItems = [...items];
    const updatedItem = { ...item };
    
    // 情况1：当来源为日期变化，且同时有进/退场日期时，自动计算租期
    if (source !== 'rentalPeriod' && scheduledEntryDate && estimatedExitDate) {
      const entryMoment = dayjs(scheduledEntryDate);
      const exitMoment = dayjs(estimatedExitDate);
      
      // 验证日期有效性
      if (exitMoment.isBefore(entryMoment)) {
        message.error('预计退场日期不能早于预计进场日期');
        return;
      }
      
      const calculatedPeriod = exitMoment.diff(entryMoment, 'day') + 1; // 包含进场当天
      
      // 只有当计算出的租期与当前租期不同时才更新
      if (updatedItem.rentalPeriod !== calculatedPeriod) {
        updatedItem.rentalPeriod = calculatedPeriod;
        shouldUpdate = true;
      }
    }
    
    // 情况2：如果有进场日期和租期，但没有退场日期或需要重新计算退场日期
    if (scheduledEntryDate && rentalPeriod && rentalPeriod > 0) {
      const entryMoment = dayjs(scheduledEntryDate);
      const calculatedExitDate = entryMoment.add(rentalPeriod - 1, 'day'); // 减1因为包含进场当天
      
      // 只有当计算出的退场日期与当前退场日期不同时才更新
      if (!estimatedExitDate || !dayjs(estimatedExitDate).isSame(calculatedExitDate, 'day')) {
        updatedItem.estimatedExitDate = calculatedExitDate;
        shouldUpdate = true;
      }
    }
    
    // 情况3：如果有退场日期和租期，但没有进场日期或需要重新计算进场日期
    if (estimatedExitDate && rentalPeriod && rentalPeriod > 0 && !scheduledEntryDate) {
      const exitMoment = dayjs(estimatedExitDate);
      const calculatedEntryDate = exitMoment.subtract(rentalPeriod - 1, 'day'); // 减1因为包含进场当天
      
      updatedItem.scheduledEntryDate = calculatedEntryDate;
      shouldUpdate = true;
    }
    
    // 只有当需要更新时才设置表单值
    if (shouldUpdate) {
      updatedItems[index] = updatedItem;
      form.setFieldsValue({ equipmentItems: updatedItems });
    }
  };



  const SummaryAmount: React.FC = () => {
    const items: any[] = Form.useWatch('equipmentItems', form) || [];
    const total = calculateOrderEstimatedAmount(items as any);
    return (
      <div style={{ textAlign: 'right', marginTop: 16 }}>
        <Typography.Text strong>合同预估金额: {total.toFixed(2)} 元</Typography.Text>
      </div>
    );
  };

  const FormAutoLinkages: React.FC<{ isUpdatingRef: React.MutableRefObject<boolean> }> = ({ isUpdatingRef }) => {
    const watchedDeliveryLocation = Form.useWatch('deliveryLocation', form);
    useEffect(() => {
      if (watchedDeliveryLocation && !form.getFieldValue('returnAddress')) {
        form.setFieldsValue({ returnAddress: watchedDeliveryLocation });
      }
    }, [watchedDeliveryLocation]);

    const equipmentItemsWatch = Form.useWatch('equipmentItems', form);
    useEffect(() => {
      if (isUpdatingRef.current) return;
    }, [equipmentItemsWatch]);
    return null;
  };

  // 一、合同基本信息
  const panelBasicInfo = (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="合同编号">
          <Input disabled value="系统自动生成" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="lessorId" label="出租方" rules={[{ required: true, message: '请选择出租方' }]}> 
          <Select placeholder="请选择出租方" loading={companyVerificationsLoading} allowClear>
            {safeCompanyVerifications.map((company) => (
              <Option key={company.id} value={company.id}>{company.companyName}</Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="客户名称" required>
          <Input readOnly placeholder="请选择客户" value={selectedCustomer?.name || selectedCustomer?.companyName} onClick={() => setCustomerPickerOpen(true)} />
        </Form.Item>
        <Form.Item name="customerId" hidden>
          <Input />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="businessManagerId" label="业务负责人" rules={[{ required: true, message: '请选择业务负责人' }]}> 
          <Select placeholder="请选择业务负责人" loading={employeesLoading} allowClear>
            {safeEmployees.map((emp: any) => (
              <Option key={emp.id} value={emp.id}>{emp.name}</Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
    </Row>
  );

  // 二、结算信息
  const panelSettlementInfo = (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="monthCalculationMethod" label="月份计算方式" rules={[{ required: true, message: '请选择月份计算方式' }]}> 
          <Select options={monthCalcOptions} placeholder="请选择" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="paymentAgreement" label="支付约定" rules={[{ required: true, message: '请选择支付约定' }]}> 
          <Select options={paymentAgreementOptions} placeholder="请选择" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="shippingFeeReduction" label="运费减免约定" rules={[{ required: true, message: '请选择运费减免约定' }]}> 
          <Select options={freightReductionOptions} placeholder="请选择" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="shippingFeeCalculation" label="运费计算方式" rules={[{ required: true, message: '请选择运费计算方式' }]}> 
          <Select options={freightCalcOptions} placeholder="请选择" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="invoiceType" label="是否开票" rules={[{ required: true, message: '请选择是否开票' }]}> 
          <Select options={invoiceTypeOptions} placeholder="请选择" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item noStyle shouldUpdate={(prev, cur) => prev.invoiceType !== cur.invoiceType}>
          {() => {
            const type = form.getFieldValue('invoiceType');
            if (type === '专票' || type === '普票') {
              return (
                <Form.Item name="invoiceTaxRate" label="发票税额(%)" rules={[{ required: true, message: '请输入税率' }]}> 
                  <InputNumber style={{ width: '100%' }} min={0} max={100} step={1} placeholder="请输入税率" />
                </Form.Item>
              );
            }
            return null;
          }}
        </Form.Item>
      </Col>
    </Row>
  );

  // 三、项目信息
  const panelProjectInfo = (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="projectName" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}> 
          <Input placeholder="请输入项目名称" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="constructionCategory" label="施工类别" rules={[{ required: true, message: '请选择施工类别' }]}> 
          <Select placeholder="请选择施工类别">
            <Option value="消防">消防</Option>
            <Option value="水电">水电</Option>
            <Option value="安装">安装</Option>
            <Option value="机电">机电</Option>
            <Option value="保温">保温</Option>
            <Option value="外墙非油漆">外墙非油漆</Option>
            <Option value="涂装">涂装</Option>
            <Option value="其他">其他</Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item name="deliveryLocation" label="交机地点" rules={[{ required: true, message: '请输入交机地点' }]}> 
          <Input placeholder="请输入交机地点" />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item name="otherAgreements" label="其他约定"> 
          <TextArea rows={4} placeholder="请输入其他约定" />
        </Form.Item>
      </Col>
    </Row>
  );

  // 四、设备需求
  const panelEquipmentRequirement = (
    <div>
      <Form.List name="equipmentItems">
        {(fields, { add, remove }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '8px 0' }}>
              <Tooltip title="添加一条设备需求项" placement="left">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  style={{ height: 40, minWidth: 48 }}
                  disabled={addLocked}
                  onClick={() => {
                    if (addLocked) return;
                    setAddLocked(true);
                    add({
                      equipmentCategory: undefined,
                      equipmentType: undefined,
                      height: undefined,
                      quantity: 1,
                      dailyRate: undefined,
                      monthlyRate: undefined,
                      deposit: undefined,
                      shippingFee: undefined,
                      modificationFee: undefined,
                      scheduledEntryDate: undefined,
                      estimatedExitDate: undefined,
                      rentalPeriod: undefined,
                      shippingType: '双程',
                    });
                    setTimeout(() => setAddLocked(false), 300);
                  }}
                >
                  新增设备
                </Button>
              </Tooltip>
            </div>
            {fields.map(({ key, name, fieldKey, ...restField }) => {
              const currentItem = form.getFieldValue(['equipmentItems', name]) || {};
              const availableTypes = getAvailableTypes(currentItem.equipmentCategory);
              const availableHeights = getAvailableHeights(currentItem.equipmentCategory, currentItem.equipmentType);
              
              return (
                <Row 
                  key={key} 
                  gutter={8} 
                  style={{ 
                    marginBottom: 16, 
                    display: 'flex', 
                    flexWrap: 'nowrap',
                    alignItems: 'flex-start'
                  }}
                >
                    {/* 序号列 - 固定宽度60px */}
                    <Col style={{ width: 60, display: 'flex', alignItems: 'center' }}>
                      <Typography.Text type="secondary">序号：{name + 1}</Typography.Text>
                    </Col>
                    
                    {/* 设备类别列 - 固定宽度120px */}
                    <Col style={{ width: 120 }}>
                      <Form.Item 
                        {...restField} 
                        name={[name, 'equipmentCategory']} 
                        fieldKey={[fieldKey!, 'equipmentCategory']} 
                        label="设备类别" 
                        rules={[{ required: true, message: '请选择设备类别' }]}
                      > 
                        <Select 
                          placeholder="请选择"
                          showSearch
                          filterOption={(input, option) =>
                            (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                          }
                          onChange={(value) => handleCategoryChange(value, name)}
                        >
                          {EQUIPMENT_CATEGORIES.map(category => (
                            <Option key={category} value={category}>{category}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    
                    {/* 设备类型列 - 优化宽度 */}
                    <Col style={{ 
                      minWidth: 110, 
                      maxWidth: 110,
                      overflow: 'hidden'
                    }}>
                      <Form.Item 
                        {...restField} 
                        name={[name, 'equipmentType']} 
                        fieldKey={[fieldKey!, 'equipmentType']} 
                        label={
                          <span title="设备类型" style={{ 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            display: 'block'
                          }}>
                            设备类型
                          </span>
                        }
                        rules={[{ required: true, message: '请选择设备类型' }]}
                      > 
                        <Select 
                          placeholder="请选择"
                          showSearch
                          filterOption={(input, option) =>
                            (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                          }
                          onChange={(value) => handleTypeChange(value, name)}
                          disabled={!currentItem.equipmentCategory}
                          style={{ width: '100%' }}
                        >
                          {availableTypes.map(type => (
                            <Option key={type} value={type}>{type}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    
                    {/* 高度列 - 优化宽度 */}
                    <Col style={{ 
                      minWidth: 85, 
                      maxWidth: 85,
                      overflow: 'hidden'
                    }}>
                      <Form.Item 
                        {...restField} 
                        name={[name, 'height']} 
                        fieldKey={[fieldKey!, 'height']} 
                        label={
                          <span title="高度(米)" style={{ 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            display: 'block'
                          }}>
                            高度(米)
                          </span>
                        }
                        rules={[{ required: true, message: '请选择高度' }]}
                      > 
                        <Select 
                          placeholder="请选择"
                          disabled={!currentItem.equipmentType}
                          style={{ width: '100%' }}
                        >
                          {availableHeights.map(height => (
                            <Option key={height} value={height}>{height}米</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    
                    {/* 数量列 - 优化宽度 */}
                    <Col style={{ 
                      minWidth: 70, 
                      maxWidth: 70,
                      overflow: 'hidden'
                    }}>
                      <Form.Item 
                        {...restField} 
                        name={[name, 'quantity']} 
                        fieldKey={[fieldKey!, 'quantity']} 
                        label={
                          <span title="数量" style={{ 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            display: 'block'
                          }}>
                            数量
                          </span>
                        }
                        rules={[{ required: true, message: '请输入数量' }]}
                      > 
                        <InputNumber min={1} style={{ width: '100%'}} controls={false} />
                      </Form.Item>
                    </Col>
                    
                    {/* 天租/台列 */}
                    <Col style={{ minWidth: 90 }}>
                      <Form.Item 
                        {...restField} 
                        name={[name, 'dailyRate']} 
                        fieldKey={[fieldKey!, 'dailyRate']} 
                        label="天租价(元/台)"
                      > 
                        <InputNumber 
                          min={0} 
                          style={{ width: '100%' }} 
                         controls={false}
                         />
                      </Form.Item>
                    </Col>
                    
                    {/* 月租/台列 */}
                    <Col style={{ minWidth: 90 }}>
                      <Form.Item 
                        {...restField} 
                        name={[name, 'monthlyRate']} 
                        fieldKey={[fieldKey!, 'monthlyRate']} 
                        label="月租价(元/台)"
                      > 
                        <InputNumber 
                          min={0} 
                          style={{ width: '100%' }} 
                         controls={false}
                         />
                      </Form.Item>
                    </Col>
                    

                    
                    {/* 押金/台列 */}
                    <Col style={{ minWidth: 80 }}>
                      <Form.Item 
                        {...restField} 
                        name={[name, 'deposit']} 
                        fieldKey={[fieldKey!, 'deposit']} 
                        label="押金(元/台)"
                      > 
                        <InputNumber min={0} style={{ width: '100%' }} controls={false} />
                      </Form.Item>
                    </Col>
                    
                    {/* 运费/台列 */}
                    <Col style={{ minWidth: 80 }}>
                      <Form.Item 
                        {...restField} 
                        name={[name, 'shippingFee']} 
                        fieldKey={[fieldKey!, 'shippingFee']} 
                        label="运费(元/台)"
                      > 
                        <InputNumber min={0} style={{ width: '100%' }} controls={false} />
                      </Form.Item>
                    </Col>
                    
                    {/* 改装费/台列 */}
                    <Col style={{ minWidth: 80 }}>
                      <Form.Item 
                        {...restField} 
                        name={[name, 'modificationFee']} 
                        fieldKey={[fieldKey!, 'modificationFee']} 
                        label="改装费(元/台)"
                      > 
                        <InputNumber min={0} style={{ width: '100%' }} controls={false} />
                      </Form.Item>
                    </Col>
                    
                    {/* 进场日期列 */}
                    <Col style={{ minWidth: 160 }}>
                      <Form.Item 
                        {...restField}
                        name={[name, 'scheduledEntryDate']}
                        label="预计进场日期"
                        rules={[{ required: true, message: '请选择预计进场日期' }]}
                    >
                      <DatePicker 
                        style={{ width: '100%' }} 
                        onChange={() => setTimeout(() => handleDateFieldChange(name, 'entry'), 100)}
                      />
                    </Form.Item>
                    </Col>
                    
                    {/* 退场日期列 */}
                    <Col style={{ minWidth: 160 }}>
                      <Form.Item 
                        {...restField}
                        name={[name, 'estimatedExitDate']}
                        label="预计退场日期"
                        rules={[{ required: true, message: '请选择预计退场日期' }]}
                    >
                      <DatePicker 
                        style={{ width: '100%' }} 
                        onChange={() => setTimeout(() => handleDateFieldChange(name, 'exit'), 100)}
                      />
                    </Form.Item>
                    </Col>
                    
                    {/* 租期列 - 优化宽度 */}
                    <Col style={{ 
                      minWidth: 90, 
                      maxWidth: 90,
                      overflow: 'hidden'
                    }}>
                      <Form.Item 
                        {...restField}
                        name={[name, 'rentalPeriod']}
                        label={
                          <span title="租期(天)" style={{ 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            display: 'block'
                          }}>
                            租期(天)
                          </span>
                        }
                        rules={[{ required: true, message: '请输入租期(天)' }]}
                    >
                      <InputNumber 
                        min={0} 
                        max={3650} // 最大10年
                        precision={0} // 只允许整数
                        style={{ width: '100%' }} 
                        onBlur={() => handleDateFieldChange(name, 'rentalPeriod')}
                        placeholder="天数"
                        parser={(value) => value ? parseInt(value.replace(/[^\d]/g, ''), 10) || 0 : 0}
                        controls={false}
                      />
                    </Form.Item>
                    </Col>
                    
                    {/* 运费类型列 - 优化宽度 */}
                    <Col style={{ 
                      minWidth: 90, 
                      maxWidth: 90,
                      overflow: 'hidden'
                    }}>
                      <Form.Item 
                        {...restField}
                        name={[name, 'shippingType']}
                        fieldKey={[fieldKey!, 'shippingType']}
                        label={
                          <span title="运费类型" style={{ 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            display: 'block'
                          }}>
                            运费类型
                          </span>
                        }
                      >
                        <Select style={{ width: '100%' }}>
                          <Option value="单程">单程</Option>
                          <Option value="双程">双程</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    

                    
                    {/* 操作列 */}
                    <Col style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                      <Button 
                        danger 
                        size="small" 
                        style={{ minWidth: 48, minHeight: 48 }}
                        icon={<DeleteOutlined />} 
                        onClick={() => {
                          Modal.confirm({
                            title: '确认删除该设备项？',
                            content: '删除后需重新添加设备项，操作不可撤销。',
                            okText: '删除',
                            cancelText: '取消',
                            okButtonProps: { danger: true },
                            onOk: () => remove(name),
                          });
                        }}
                      >
                        删除
                      </Button>
                    </Col>
                  </Row>
              );
            })}
            
            {/* 底部新增按钮已移至顶部右侧 */}
            </div>
        )}
        </Form.List>
        <SummaryAmount />

        {/* 设备选择模态 */}
        <EquipmentPickerModal
          open={pickerOpen}
          item={(pickerItemIndex != null) ? (() => {
            const items: any[] = form.getFieldValue('equipmentItems') || [];
            const it = items[pickerItemIndex] || { equipmentType: '', height: '', quantity: 0 };
            return { equipmentType: it.equipmentType || '', height: it.height || '', quantity: Number(it.quantity || 0) };
          })() : { equipmentType: '', height: '', quantity: 0 }}
          equipmentList={equipmentList}
          initialSelectedCodes={[]}
          onCancel={() => { setPickerOpen(false); setPickerItemIndex(null); }}
          onConfirm={(codes: string[]) => {
            // 在UI层保存所选设备编码（不参与提交，仅用于参考）；可按需扩展
            const items: any[] = form.getFieldValue('equipmentItems') || [];
            if (pickerItemIndex != null && items[pickerItemIndex]) {
              items[pickerItemIndex].selectedEquipmentCodes = codes;
              form.setFieldsValue({ equipmentItems: items });
            }
            setPickerOpen(false);
            setPickerItemIndex(null);
          }}
        />
    </div>
  );

  const handleFinish = async () => {
    // 先进行数据验证
    if (!validateAllEquipmentItems()) {
      return;
    }

    const v = form.getFieldsValue(true) as any;
    const payload: OrderFormData = {
      lessorId: v.lessorId,
      customerId: v.customerId,
      projectName: v.projectName || '',
      businessManagerId: v.businessManagerId,
      monthCalculationMethod: v.monthCalculationMethod,
      paymentAgreement: v.paymentAgreement,
      shippingFeeReduction: v.shippingFeeReduction,
      shippingFeeCalculation: v.shippingFeeCalculation,
      isTaxInvoice: v.invoiceType,
      invoiceTaxRate: v.invoiceType === '不开票' ? undefined : v.invoiceTaxRate,
      constructionCategory: v.constructionCategory || '其他',
      deliveryLocation: v.deliveryLocation || '',
      otherAgreements: v.otherAgreements || '',
      equipmentItems: (v.equipmentItems || []).map((it: any) => ({
        equipmentCategory: it.equipmentCategory, // 新增设备类别字段
        equipmentType: it.equipmentType,
        height: it.height,
        quantity: Number(it.quantity || 0),
        dailyRate: Number(it.dailyRate || 0),
        monthlyRate: Number(it.monthlyRate || 0),
        deposit: Number(it.deposit || 0),
        shippingFee: Number(it.shippingFee || 0),
        modificationFee: Number(it.modificationFee || 0),
        scheduledEntryDate: it.scheduledEntryDate ? dayjs(it.scheduledEntryDate).format('YYYY-MM-DD') : undefined,
        estimatedExitDate: it.estimatedExitDate ? dayjs(it.estimatedExitDate).format('YYYY-MM-DD') : undefined,
        rentalPeriod: Number(it.rentalPeriod || 0),
        shippingType: it.shippingType || '双程',
      })) as OrderEquipmentItem[],
    };
    try {
      await dispatch(addOrder(payload)).unwrap();
      message.success('订单提交成功！');
      closeTab(tabKey);
    } catch (err: any) {
      message.error(err?.message || '订单提交失败');
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{
        monthCalculationMethod: '30天为一月',
        paymentAgreement: '预付',
        shippingFeeReduction: '无减免',
        shippingFeeCalculation: '按台计费',
        invoiceType: '不开票',
        equipmentItems: [],
      }}
    >
      <FormAutoLinkages isUpdatingRef={isUpdatingRef} />
      <Collapse
        defaultActiveKey={['1', '2', '3', '4']}
        ghost
        items={[
          { key: '1', label: '一、合同基本信息', children: panelBasicInfo },
          { key: '2', label: '二、结算信息', children: panelSettlementInfo },
          { key: '3', label: '三、项目信息', children: panelProjectInfo },
          { key: '4', label: '四、设备需求', children: panelEquipmentRequirement },
        ]}
      />
      <Affix offsetBottom={0}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 16px',
            background: '#fff',
            borderTop: '1px solid #f0f0f0',
          }}
        >
          <Button type="primary" htmlType="submit">
            提交
          </Button>
          <Button htmlType="button" onClick={() => form.resetFields()}>
            取消
          </Button>
        </div>
      </Affix>

      {/* 客户选择 */}
      <CustomerPickerModal
        visible={customerPickerOpen}
        onCancel={() => setCustomerPickerOpen(false)}
        onSelect={(customer: any) => {
          const id = customer.id || customer._id;
          setSelectedCustomer(customer);
          form.setFieldsValue({ customerId: id });
          setCustomerPickerOpen(false);
        }}
      />
    </Form>
  );
};

export default NewOrderTab;