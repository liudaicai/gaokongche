// Pricing utility for orders: implements first-month and beyond-month rent rules
import { OrderEquipmentItem } from './types';

// Helper to coerce any value to a safe non-negative number
const toNum = (x: any): number => {
  const n = Number(x);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

/**
 * Calculate rent for a single unit over the given rental days.
 * Rules:
 * 1) First month (first 30 days):
 *    - If both daily and monthly exist: use min(dailyRate * firstDays, monthlyRate)
 *      (if daily*days > monthly, charge whole monthly; minimum billing cycle is one month).
 *    - If daily missing but monthly exists: charge monthlyRate for the first 30 days.
 * 2) Beyond first month: use (monthlyRate / 30) * remainingDays
 * 3) If monthly missing: fallback to dailyRate * rentalDays (or 0 if daily missing)
 */
export function calculateRentForPeriod(
  dailyRate?: number,
  monthlyRate?: number,
  rentalDays?: number
): number {
  const daily = toNum(dailyRate);
  const monthly = toNum(monthlyRate);
  const days = toNum(rentalDays);
  if (days <= 0) return 0;

  // No monthly: fallback to daily pricing only
  if (monthly <= 0) {
    return Number((daily * days).toFixed(2));
  }

  const firstDays = Math.min(days, 30);
  let firstMonthRent = monthly; // default if no daily
  if (daily > 0) {
    firstMonthRent = Math.min(daily * firstDays, monthly);
  }

  const remainingDays = Math.max(days - 30, 0);
  const remainingRent = (monthly / 30) * remainingDays;

  const total = firstMonthRent + remainingRent;
  return Number(total.toFixed(2));
}

export type PricingLogEntry = {
  step: string;
  details: string;
  values?: Record<string, number | string>;
};

/**
 * Calculate rent with an audit log according to business rules:
 * - When equipment has not exited: use (monthlyRate / 30) * rentalDays (no first-month comparison)
 * - When exited within first 30 days from entry: compare daily*days vs monthly (minimum one full month if monthly chosen)
 * - When exited after 30 days: first 30 days apply min(daily*firstDays, monthly), remainder monthly/30
 * - Round to 2 decimals at the end; keep intermediate values in log.
 */
export function calculateRentWithAudit(params: {
  dailyRate?: number;
  monthlyRate?: number;
  rentalDays?: number; // days within the settlement cycle
  hasExited: boolean;
  entryDate?: string;
  exitDate?: string;
}): { amount: number; log: PricingLogEntry[] } {
  const log: PricingLogEntry[] = [];
  const daily = toNum(params.dailyRate);
  const monthly = toNum(params.monthlyRate);
  const days = toNum(params.rentalDays);

  log.push({ step: 'input', details: '原始输入', values: { daily, monthly, days } });

  if (days <= 0) {
    log.push({ step: 'zero_days', details: '租期为0天，租金为0' });
    return { amount: 0, log };
  }

  if (monthly <= 0) {
    const amt = Number((daily * days).toFixed(2));
    log.push({ step: 'no_monthly', details: '无月租价，按日租计算', values: { amount: amt } });
    return { amount: amt, log };
  }

  if (!params.hasExited) {
    const amt = Number(((monthly / 30) * days).toFixed(2));
    log.push({ step: 'not_exited', details: '未退场，按月租/30*天数计算', values: { amount: amt } });
    return { amount: amt, log };
  }

  // Determine if exited within 30 days from entry (inclusive)
  let exitedWithinFirstMonth = false;
  if (params.entryDate && params.exitDate) {
    try {
      const entry = new Date(params.entryDate);
      const exit = new Date(params.exitDate);
      const msPerDay = 24 * 60 * 60 * 1000;
      const diffDays = Math.floor((exit.setHours(23,59,59,999) - new Date(entry.setHours(0,0,0,0)).getTime()) / msPerDay) + 1;
      exitedWithinFirstMonth = diffDays <= 30;
      log.push({ step: 'diff', details: '进退场间隔天数', values: { diffDays } });
    } catch {
      // Fallback: use rentalDays as proxy
      exitedWithinFirstMonth = days <= 30;
      log.push({ step: 'diff_fallback', details: '日期解析失败，使用租期判断', values: { days } });
    }
  } else {
    exitedWithinFirstMonth = days <= 30;
    log.push({ step: 'diff_missing', details: '缺少日期，使用租期判断', values: { days } });
  }

  if (exitedWithinFirstMonth) {
    const dailyTotal = daily * days;
    const chosen = Math.min(dailyTotal, monthly);
    const amt = Number(chosen.toFixed(2));
    log.push({ step: 'first_month_exit', details: '首月退场，比较日租与月租，取较小者', values: { dailyTotal: Number(dailyTotal.toFixed(2)), monthly, amount: amt } });
    return { amount: amt, log };
  }

  // Exited after first month: segment calculation
  const firstDays = Math.min(days, 30);
  const firstMonthDaily = daily * firstDays;
  const firstMonthRent = Math.min(firstMonthDaily, monthly);
  const remainingDays = Math.max(days - 30, 0);
  const remainingRent = (monthly / 30) * remainingDays;
  const total = Number((firstMonthRent + remainingRent).toFixed(2));
  log.push({
    step: 'segmented',
    details: '跨月分段：首月取min(日租*天, 月租)，余下按月租/30',
    values: {
      firstDays,
      firstMonthDaily: Number(firstMonthDaily.toFixed(2)),
      firstMonthRent: Number(firstMonthRent.toFixed(2)),
      remainingDays,
      remainingRent: Number(remainingRent.toFixed(2)),
      amount: total,
    },
  });
  return { amount: total, log };
}

/**
 * Calculate total amount for one equipment item (all units),
 * including rent and other fees (deposit/shipping/modification) per unit.
 */
export function calculateItemTotal(item: Partial<OrderEquipmentItem>): number {
  const qty = toNum(item?.quantity);
  const rent = calculateRentForPeriod(item?.dailyRate, item?.monthlyRate, item?.rentalPeriod);
  const otherPerUnit = toNum(item?.deposit) + toNum(item?.shippingFee) + toNum(item?.modificationFee);
  const total = qty * (rent + otherPerUnit);
  return Number(total.toFixed(2));
}

/**
 * Calculate estimated amount for an order by summing all equipment item totals.
 */
export function calculateOrderEstimatedAmount(items: Array<Partial<OrderEquipmentItem>>): number {
  const sum = (items || []).reduce((acc, it) => acc + calculateItemTotal(it), 0);
  return Number(sum.toFixed(2));
}