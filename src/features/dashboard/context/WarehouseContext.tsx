import { createContext } from 'react';

// 创建仓库上下文，用于全局共享选中的仓库
export const WarehouseContext = createContext<{
  selectedWarehouse: string;
  setSelectedWarehouse: (value: string) => void;
}>({
  selectedWarehouse: 'all',
  setSelectedWarehouse: () => {},
});
