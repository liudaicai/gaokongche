import { store } from '../app/store';
import { API_BASE, apiGet } from '../api/client';
import { fetchOrders, fetchOrderById } from '../features/orders/ordersSlice';
import {
  fetchEquipmentsStart,
  fetchEquipmentsSuccess,
  fetchEquipmentsFailure,
  fetchInventoryStart,
  fetchInventorySuccess,
  fetchInventoryFailure,
} from '../features/equipment/equipmentslice';

type BroadcastEvent = {
  type: string;
  orderId?: string;
  [key: string]: any;
};

// 简易事件聚合与节流控制
class RealtimeController {
  private es: EventSource | null = null;
  private reconnectTimer: any = null;
  private retryAttempt = 0;
  private maxSseRetries = 3;
  private sseDisabled = false;
  private orderRefreshTimers: Map<string, any> = new Map();
  private listRefreshTimer: any = null;
  private pollingTimer: any = null;
  private equipmentRefreshTimer: any = null;

  start() {
    // 如果浏览器支持EventSource，则优先使用SSE
    if (typeof window !== 'undefined' && 'EventSource' in window && !this.sseDisabled) {
      this.connectSSE();
    } else {
      // 降级：轮询
      this.startPolling();
    }
    // 返回关闭函数
    return () => this.stop();
  }

  private connectSSE() {
    try {
      if (this.sseDisabled) {
        this.startPolling();
        return;
      }
      this.es?.close();
      const url = `${API_BASE}/events`;
      this.es = new EventSource(url, { withCredentials: false });
      this.retryAttempt = 0;

      this.es.onmessage = (ev) => {
        this.onMessage(ev);
      };
      this.es.onerror = (_err) => {
        // 出错时尝试重连，指数退避
        this.es?.close();
        this.retryAttempt += 1;
        if (this.retryAttempt >= this.maxSseRetries) {
          // 本会话禁用SSE，降级为轮询
          this.sseDisabled = true;
          this.startPolling();
        } else {
          this.scheduleReconnect();
        }
      };
    } catch (_err) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    const backoff = Math.min(30000, 2000 * Math.pow(2, this.retryAttempt));
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      // 如果SSE仍不可用或已禁用，降级到轮询
      if (!(typeof window !== 'undefined' && 'EventSource' in window) || this.sseDisabled) {
        this.startPolling();
      } else {
        this.connectSSE();
      }
    }, backoff);
  }

  private onMessage(ev: MessageEvent) {
    let data: BroadcastEvent | null = null;
    try {
      data = JSON.parse(ev.data);
    } catch (_) {
      // 心跳或不可解析的消息
      return;
    }
    if (!data) return;

    const type = data.type;
    const orderId = data.orderId as string | undefined;

    // 针对订单相关事件做增量刷新
    if (orderId && this.isOrderEvent(type)) {
      this.scheduleOrderRefresh(orderId);
      // 同时轻量触发列表刷新（节流）保证列表汇总一致
      this.scheduleListRefresh();
      return;
    }

    // 设备状态变更：触发设备列表与库存刷新（节流）
    if (this.isEquipmentEvent(type)) {
      this.scheduleEquipmentRefresh();
      // 同时轻量触发订单列表刷新，避免订单聚合信息落后
      this.scheduleListRefresh();
      return;
    }

    // 其他事件类型可在此扩展，例如物流、门店等
    // 默认策略：轻量刷新订单列表，避免错过状态变更
    this.scheduleListRefresh();
  }

  private isOrderEvent(type: string): boolean {
    return (
      type.startsWith('order.') ||
      type === 'order.updated'
    );
  }

  private isEquipmentEvent(type: string): boolean {
    return type.startsWith('equipment.') || type === 'equipment.status.changed';
  }

  private scheduleOrderRefresh(orderId: string) {
    // 避免同一订单频繁刷新，合并到500ms窗口
    const existing = this.orderRefreshTimers.get(orderId);
    if (existing) return;
    const timer = setTimeout(() => {
      this.orderRefreshTimers.delete(orderId);
      try {
        store.dispatch(fetchOrderById(orderId) as any);
      } catch (e) {
        // 忽略临时错误
      }
    }, 500);
    this.orderRefreshTimers.set(orderId, timer);
  }

  private scheduleListRefresh() {
    if (this.listRefreshTimer) return;
    this.listRefreshTimer = setTimeout(() => {
      this.listRefreshTimer = null;
      try {
        store.dispatch(fetchOrders() as any);
      } catch (e) {
        // 忽略临时错误
      }
    }, 3000);
  }

  private scheduleEquipmentRefresh() {
    if (this.equipmentRefreshTimer) return;
    // 合并到800ms窗口，避免短时间内多次刷新
    this.equipmentRefreshTimer = setTimeout(async () => {
      this.equipmentRefreshTimer = null;
      try {
        store.dispatch(fetchEquipmentsStart());
        const list = await apiGet<any>('/equipments');
        store.dispatch(fetchEquipmentsSuccess(Array.isArray(list) ? list : []));
      } catch (err: any) {
        store.dispatch(fetchEquipmentsFailure(err?.message || '获取设备列表失败'));
      }

      try {
        store.dispatch(fetchInventoryStart());
        const inv = await apiGet<any>('/equipments/inventory/stats');
        store.dispatch(fetchInventorySuccess(inv || []));
      } catch (err: any) {
        store.dispatch(fetchInventoryFailure(err?.message || '获取库存统计失败'));
      }
    }, 800);
  }

  private startPolling() {
    clearInterval(this.pollingTimer);
    // 每15秒轮询订单列表，作为降级方案
    this.pollingTimer = setInterval(() => {
      try {
        store.dispatch(fetchOrders() as any);
        const state = store.getState() as any;
        const selected = state.orders?.selectedOrder;
        if (selected?.id) {
          store.dispatch(fetchOrderById(selected.id) as any);
        }
      } catch (_) {}
    }, 15000);
  }

  stop() {
    this.es?.close();
    this.es = null;
    clearTimeout(this.reconnectTimer);
    this.orderRefreshTimers.forEach(t => clearTimeout(t));
    this.orderRefreshTimers.clear();
    clearTimeout(this.listRefreshTimer);
    this.listRefreshTimer = null;
    clearInterval(this.pollingTimer);
    this.pollingTimer = null;
    this.sseDisabled = false;
    this.retryAttempt = 0;
  }
}

let controller: RealtimeController | null = null;

export function initRealtime() {
  if (controller) return () => controller?.stop();
  controller = new RealtimeController();
  return controller.start();
}