// Pricing utility for orders: implements first-month and beyond-month rent rules
import { OrderEquipmentItem } from './types';

// Helper to coerce any value to a safe non-negative number
const toNum = (x: any): number => {
  const n = Number(x);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

/**
 * Calculate rent for a single unit over the given rental days.
 * Updated Rules (新规则):
 * 1) Compare dailyRate * rentalPeriod with monthlyRate:
 *    - If daily total > monthly: Use monthly rate calculation
 *      * First month (≤30 days): Minimum charge is full monthlyRate
 *      * After first month: monthlyRate + (monthlyRate / 30) * (days - 30)
 *    - If daily total ≤ monthly: Use dailyRate * rentalPeriod
 * 2) If monthly rate is missing: fallback to dailyRate * rentalDays
 * 3) If daily rate is missing: fallback to monthlyRate calculation
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

  // No daily: fallback to monthly calculation
  if (daily <= 0) {
    if (days <= 30) {
      return Number(monthly.toFixed(2));
    }
    const total = monthly + ((monthly / 30) * (days - 30));
    return Number(total.toFixed(2));
  }

  // Compare daily total with monthly rate
  const dailyTotal = daily * days;
  
  if (dailyTotal > monthly) {
    // Use monthly rate calculation
    if (days <= 30) {
      // First month: minimum charge is full monthly rate
      return Number(monthly.toFixed(2));
    } else {
      // After first month: monthly + (monthly/30) * remaining days
      const total = monthly + ((monthly / 30) * (days - 30));
      return Number(total.toFixed(2));
    }
  } else {
    // Use daily rate
    return Number(dailyTotal.toFixed(2));
  }
}

export type PricingLogEntry = {
  step: string;
  details: string;
  values?: Record<string, number | string>;
};

/**
 * Calculate rent with an audit log according to NEW business rules:
 * 新租金计算逻辑：
 * 1) 比较 日租价*租期 与 月租价：
 *    - 如果 日租总额 > 月租价：使用月租价计算
 *      * 第一个月（≤30天）：最小收费为一个月租价
 *      * 超过一个月：月租价 + (月租价/30) * (天数-30)
 *    - 如果 日租总额 ≤ 月租价：使用日租价 * 租期
 * 2) 其他费用按实际金额计算
 * 3) Round to 2 decimals at the end; keep intermediate values in log.
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

  // No monthly: fallback to daily pricing only
  if (monthly <= 0) {
    const amt = Number((daily * days).toFixed(2));
    log.push({ step: 'no_monthly', details: '无月租价，按日租计算', values: { amount: amt } });
    return { amount: amt, log };
  }

  // No daily: fallback to monthly calculation
  if (daily <= 0) {
    let amt: number;
    if (days <= 30) {
      amt = Number(monthly.toFixed(2));
      log.push({ step: 'no_daily_first_month', details: '无日租价，第一个月收取月租价', values: { amount: amt } });
    } else {
      amt = Number((monthly + ((monthly / 30) * (days - 30))).toFixed(2));
      log.push({ step: 'no_daily_beyond_month', details: '无日租价，按月租价 + (月租价/30)*超出天数', values: { amount: amt, beyondDays: days - 30 } });
    }
    return { amount: amt, log };
  }

  // Compare daily total with monthly rate
  const dailyTotal = daily * days;
  
  log.push({
    step: 'comparison',
    details: '比较日租总额与月租价',
    values: {
      dailyTotal: Number(dailyTotal.toFixed(2)),
      monthly,
      useMonthly: dailyTotal > monthly ? 'yes' : 'no'
    }
  });

  if (dailyTotal > monthly) {
    // Use monthly rate calculation
    let amt: number;
    if (days <= 30) {
      // First month: minimum charge is full monthly rate
      amt = Number(monthly.toFixed(2));
      log.push({
        step: 'monthly_first_month',
        details: '日租总额 > 月租价，第一个月最小收费为一个月租价',
        values: { days, monthlyRate: monthly, amount: amt }
      });
    } else {
      // After first month: monthly + (monthly/30) * remaining days
      const remainingDays = days - 30;
      const remainingRent = (monthly / 30) * remainingDays;
      amt = Number((monthly + remainingRent).toFixed(2));
      log.push({
        step: 'monthly_beyond_month',
        details: '日租总额 > 月租价，超过一个月按：月租价 + (月租价/30)*超出天数',
        values: {
          firstMonthRent: monthly,
          remainingDays,
          remainingRent: Number(remainingRent.toFixed(2)),
          amount: amt
        }
      });
    }
    return { amount: amt, log };
  } else {
    // Use daily rate
    const amt = Number(dailyTotal.toFixed(2));
    log.push({
      step: 'daily_rate',
      details: '日租总额 ≤ 月租价，使用日租价 * 租期',
      values: { dailyRate: daily, days, amount: amt }
    });
    return { amount: amt, log };
  }
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