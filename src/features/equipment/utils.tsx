// 设备相关的工具函数
import { Tag } from 'antd';
import type { Equipment } from './equipmentslice';

/**
 * 将设备来源值映射为显示文本和标签颜色
 * @param source 设备来源值
 * @returns 包含文本和颜色的对象
 */
export const mapEquipmentSource = (source: string) => {
  const sourceMap: Record<string, { text: string; color: string }> = {
    'self-owned': { text: '自有', color: 'blue' },
    'sublease': { text: '转租', color: 'orange' },
    'other': { text: '其他', color: 'default' }
  };
  return sourceMap[source] || { text: source, color: 'default' };
};

/**
 * 渲染设备来源标签
 * @param source 设备来源值
 * @returns React组件
 */
export const renderEquipmentSource = (source: string) => {
  const { text, color } = mapEquipmentSource(source);
  return <Tag color={color}>{text}</Tag>;
};

/**
 * 将租赁状态值映射为显示文本和标签颜色
 * @param status 租赁状态值
 * @returns 包含文本和颜色的对象
 */
export const mapRentalStatus = (status: string) => {
  const statusMap: Record<string, { text: string; color: string }> = {
    'renting': { text: '在租', color: 'red' },
    'waiting': { text: '待租', color: 'green' },
    'repairing': { text: '维修', color: 'gray' },
    'idle': { text: '闲置', color: 'orange' }
  };
  return statusMap[status] || { text: status, color: 'default' };
};

/**
 * 渲染租赁状态标签
 * @param status 租赁状态值
 * @returns React组件
 */
export const renderRentalStatus = (status: string) => {
  const { text, color } = mapRentalStatus(status);
  return <Tag color={color}>{text}</Tag>;
};

/**
 * 将保险状态值映射为显示文本和标签颜色
 * @param status 保险状态值
 * @returns 包含文本和颜色的对象
 */
export const mapInsuranceStatus = (status: string) => {
  const statusMap: Record<string, { text: string; color: string }> = {
    'insured': { text: '在保', color: 'green' },
    'uninsured': { text: '脱保', color: 'red' },
    'expiring': { text: '即将到期', color: 'orange' }
  };
  return statusMap[status] || { text: status, color: 'default' };
};

/**
 * 渲染保险状态标签
 * @param status 保险状态值
 * @returns React组件
 */
export const renderInsuranceStatus = (status: string) => {
  const { text, color } = mapInsuranceStatus(status);
  return <Tag color={color}>{text}</Tag>;
};

/**
 * 渲染合同名称，仅在租赁状态为在租时显示
 * @param contractName 合同名称
 * @param record 设备记录
 * @returns 显示的文本
 */
export const renderContractName = (contractName: string, record: Partial<Equipment>) => {
  if (record.rentalStatus === 'renting') {
    return contractName || '未设置合同名称';
  }
  return '-';
};

/**
 * 格式化高度显示
 * @param height 高度值
 * @returns 格式化后的高度文本
 */
export const formatHeight = (height: number | string) => {
  return `${height}m`;
};

/**
 * 根据设备列表过滤设备
 * @param equipmentList 设备列表
 * @param searchParams 搜索参数
 * @returns 过滤后的设备列表
 */
export const filterEquipmentList = (
  equipmentList: Equipment[], 
  searchParams: {
    code?: string;
    customCode?: string;
    type?: string;
    height?: string;
  }
) => {
  return equipmentList.filter(equipment => 
    (searchParams.code === undefined || searchParams.code === '' || equipment.code.includes(searchParams.code)) &&
    (searchParams.customCode === undefined || searchParams.customCode === '' || equipment.customCode.includes(searchParams.customCode)) &&
    (searchParams.type === undefined || searchParams.type === '' || equipment.type === searchParams.type) &&
    (searchParams.height === undefined || searchParams.height === '' || equipment.height.toString() === searchParams.height)
  );
};