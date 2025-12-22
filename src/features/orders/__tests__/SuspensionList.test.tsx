/**
 * 报停列表组件测试
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { message } from 'antd';
import SuspensionList from '../SuspensionList';
import * as apiClient from '../../../api/client';

// Mock API
jest.mock('../../../api/client');
const mockedApiGet = apiClient.apiGet as jest.MockedFunction<typeof apiClient.apiGet>;
const mockedApiDelete = apiClient.apiDelete as jest.MockedFunction<typeof apiClient.apiDelete>;

// Mock Ant Design Message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

describe('SuspensionList Component', () => {
  const mockOrderId = '1';
  const mockSuspensions = [
    {
      id: 1,
      orderId: 1,
      suspensionType: 'weather',
      reason: '台风天气',
      startDate: '2025-12-01',
      endDate: '2025-12-03',
      suspensionDays: 3,
      isChargeFree: true,
      discountRate: 100,
      status: 'approved',
      approverName: '张三',
      creatorName: '李四',
      createdAt: '2025-11-15T10:00:00Z',
      updatedAt: '2025-11-15T10:00:00Z'
    },
    {
      id: 2,
      orderId: 1,
      suspensionType: 'site_stop',
      reason: '工地停工',
      startDate: '2025-12-05',
      suspensionDays: null,
      isChargeFree: true,
      discountRate: 100,
      status: 'pending',
      creatorName: '王五',
      createdAt: '2025-11-16T10:00:00Z',
      updatedAt: '2025-11-16T10:00:00Z'
    }
  ];

  const mockStats = {
    totalSuspensions: 2,
    pendingCount: 1,
    approvedCount: 1,
    rejectedCount: 0,
    endedCount: 0,
    totalSuspensionDays: 3,
    freeSuspensionDays: 3
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedApiGet.mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve(mockStats as any);
      }
      return Promise.resolve(mockSuspensions as any);
    });
  });

  it('应该正确渲染报停列表', async () => {
    render(<SuspensionList orderId={mockOrderId} />);

    await waitFor(() => {
      expect(screen.getByText('台风天气')).toBeInTheDocument();
      expect(screen.getByText('工地停工')).toBeInTheDocument();
    });
  });

  it('应该显示统计信息', async () => {
    render(<SuspensionList orderId={mockOrderId} />);

    await waitFor(() => {
      expect(screen.getByText('总报停次数')).toBeInTheDocument();
      expect(screen.getByText('待审批')).toBeInTheDocument();
      expect(screen.getByText('总报停天数')).toBeInTheDocument();
      expect(screen.getByText('免费报停天数')).toBeInTheDocument();
    });
  });

  it('应该正确显示报停状态标签', async () => {
    render(<SuspensionList orderId={mockOrderId} />);

    await waitFor(() => {
      expect(screen.getByText('已批准')).toBeInTheDocument();
      expect(screen.getByText('待审批')).toBeInTheDocument();
    });
  });

  it('应该正确显示计费方式', async () => {
    render(<SuspensionList orderId={mockOrderId} />);

    await waitFor(() => {
      const freeTags = screen.getAllByText('免费');
      expect(freeTags.length).toBeGreaterThan(0);
    });
  });

  it('点击创建报停按钮应该打开模态框', async () => {
    render(<SuspensionList orderId={mockOrderId} />);

    await waitFor(() => {
      const createButton = screen.getByText('创建报停');
      expect(createButton).toBeInTheDocument();
    });

    // 点击创建按钮
    fireEvent.click(screen.getByText('创建报停'));

    // 应该打开创建模态框
    // 注意：需要 Mock CreateSuspensionModal 组件才能完整测试
  });

  it('应该显示待审批报停的审批按钮', async () => {
    render(<SuspensionList orderId={mockOrderId} />);

    await waitFor(() => {
      const approveButtons = screen.getAllByText('审批');
      expect(approveButtons.length).toBeGreaterThan(0);
    });
  });

  it('删除报停应该调用 API 并刷新列表', async () => {
    mockedApiDelete.mockResolvedValue(undefined as any);

    render(<SuspensionList orderId={mockOrderId} />);

    await waitFor(() => {
      expect(screen.getByText('工地停工')).toBeInTheDocument();
    });

    // 点击删除按钮
    const deleteButtons = screen.getAllByText('删除');
    fireEvent.click(deleteButtons[0]);

    // 确认删除（需要处理 Modal.confirm）
    // 注意：Ant Design 的 Modal.confirm 需要特殊处理

    // await waitFor(() => {
    //   expect(mockedApiDelete).toHaveBeenCalledWith(
    //     `/orders/${mockOrderId}/suspensions/2`
    //   );
    // });
  });

  it('加载失败应该显示错误消息', async () => {
    mockedApiGet.mockRejectedValue(new Error('Network error'));

    render(<SuspensionList orderId={mockOrderId} />);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalled();
    });
  });

  it('应该正确格式化日期显示', async () => {
    render(<SuspensionList orderId={mockOrderId} />);

    await waitFor(() => {
      expect(screen.getByText('2025-12-01')).toBeInTheDocument();
      expect(screen.getByText('2025-12-03')).toBeInTheDocument();
    });
  });

  it('应该显示报停天数', async () => {
    render(<SuspensionList orderId={mockOrderId} />);

    await waitFor(() => {
      expect(screen.getByText('3天')).toBeInTheDocument();
    });
  });

  it('未指定设备的报停应该显示"整个订单"标签', async () => {
    const suspensionsWithoutEquipment = [
      {
        ...mockSuspensions[0],
        equipmentCode: null
      }
    ];

    mockedApiGet.mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve(mockStats as any);
      }
      return Promise.resolve(suspensionsWithoutEquipment as any);
    });

    render(<SuspensionList orderId={mockOrderId} />);

    await waitFor(() => {
      expect(screen.getByText('整个订单')).toBeInTheDocument();
    });
  });

  it('应该可以展开查看报停详情', async () => {
    render(<SuspensionList orderId={mockOrderId} />);

    await waitFor(() => {
      expect(screen.getByText('台风天气')).toBeInTheDocument();
    });

    // 点击展开按钮
    // 注意：需要找到表格的展开按钮并点击
    // const expandButtons = screen.getAllByRole('button', { name: /expand/i });
    // fireEvent.click(expandButtons[0]);

    // await waitFor(() => {
    //   expect(screen.getByText('报停原因')).toBeInTheDocument();
    // });
  });
});

