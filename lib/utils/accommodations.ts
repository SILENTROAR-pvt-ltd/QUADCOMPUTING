import type { HistoricalStayRecord, RoomAddon, StayHistoryMetrics } from '@/types';

/**
 * Calculates total billable nights between check-in and check-out.
 * Ensures a minimum of 1 night.
 */
export function calculateNights(checkIn: string, checkOut?: string | null): number {
  if (!checkIn) return 1;
  const start = new Date(checkIn).getTime();
  const end = checkOut ? new Date(checkOut).getTime() : Date.now();
  if (isNaN(start) || isNaN(end) || end <= start) return 1;
  const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

/**
 * Computes addon subtotal for a stay duration.
 */
export function calculateStayAddonsTotal(addons: RoomAddon[] = [], nights: number = 1): number {
  return addons.reduce((sum, addon) => {
    const price = Number(addon.price) || 0;
    if (addon.billingType === 'per_night' || addon.billingType === 'per_person_per_day') {
      return sum + price * nights;
    }
    return sum + price;
  }, 0);
}

/**
 * Computes summary metrics for historical stay records.
 */
export function computeStayHistoryMetrics(stays: HistoricalStayRecord[] = []): StayHistoryMetrics {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let totalRevenue = 0;
  let revenueThisMonth = 0;
  let checkoutsThisMonth = 0;
  let totalNights = 0;
  let totalGuestsHosted = 0;

  for (const stay of stays) {
    const billed = Number(stay.total_billed_amount) || 0;
    totalRevenue += billed;
    totalNights += stay.nights || 1;
    totalGuestsHosted += stay.total_guests || 1;

    if (stay.check_out_time) {
      const coDate = new Date(stay.check_out_time);
      if (coDate.getFullYear() === currentYear && coDate.getMonth() === currentMonth) {
        checkoutsThisMonth += 1;
        revenueThisMonth += billed;
      }
    }
  }

  const totalCheckouts = stays.length;
  const avgLengthOfStay = totalCheckouts > 0 
    ? Math.round((totalNights / totalCheckouts) * 10) / 10 
    : 0;

  return {
    totalCheckouts,
    checkoutsThisMonth,
    totalRevenue,
    revenueThisMonth,
    avgLengthOfStay,
    totalGuestsHosted
  };
}

/**
 * Filters historical stay records by search query, category, and timeframe.
 */
export function filterPastStays(
  stays: HistoricalStayRecord[],
  query: string = '',
  categoryId: string = 'ALL',
  timeframe: string = 'ALL'
): HistoricalStayRecord[] {
  const cleanQuery = query.trim().toLowerCase();
  const now = Date.now();

  return stays.filter(stay => {
    // 1. Search Query (Name or Phone)
    if (cleanQuery) {
      const nameMatch = stay.guest_name?.toLowerCase().includes(cleanQuery);
      const phoneMatch = stay.guest_phone?.toLowerCase().includes(cleanQuery);
      const roomMatch = stay.room_number?.toLowerCase().includes(cleanQuery);
      if (!nameMatch && !phoneMatch && !roomMatch) {
        return false;
      }
    }

    // 2. Category Filter
    if (categoryId && categoryId !== 'ALL') {
      const stayCatId = stay.room?.category?.id;
      if (stayCatId !== categoryId) {
        return false;
      }
    }

    // 3. Timeframe Filter
    if (timeframe && timeframe !== 'ALL' && stay.check_out_time) {
      const checkoutTimestamp = new Date(stay.check_out_time).getTime();
      const diffDays = (now - checkoutTimestamp) / (1000 * 60 * 60 * 24);

      if (timeframe === '7_DAYS' && diffDays > 7) return false;
      if (timeframe === '30_DAYS' && diffDays > 30) return false;
      if (timeframe === 'THIS_MONTH') {
        const coDate = new Date(stay.check_out_time);
        const curDate = new Date();
        if (coDate.getFullYear() !== curDate.getFullYear() || coDate.getMonth() !== curDate.getMonth()) {
          return false;
        }
      }
    }

    return true;
  });
}

/**
 * Calculates folio billing strictly excluding room_stay orders from F&B orders.
 * Formula: (Base Room Rate × Nights) + Total Selected Add-ons + Actual Room Service F&B Orders = Grand Total
 */
export function calculateFolioBilling(params: {
  roomRate: number;
  nights: number;
  addons?: RoomAddon[];
  orders?: Array<{ order_type?: string; grand_total?: number | string; total_amount?: number | string }>;
}) {
  const { roomRate, nights, addons = [], orders = [] } = params;
  const roomTariffSubtotal = (Number(roomRate) || 0) * Math.max(1, nights || 1);
  const addonsSubtotal = calculateStayAddonsTotal(addons, nights);
  
  // Strictly filter out master room_stay order
  const actualOrders = orders.filter(o => o.order_type !== 'room_stay');
  const ordersSubtotal = actualOrders.reduce(
    (sum, o) => sum + (Number(o.grand_total || o.total_amount) || 0),
    0
  );

  const grandTotalPayable = roomTariffSubtotal + addonsSubtotal + ordersSubtotal;

  return {
    nights: Math.max(1, nights || 1),
    roomRate: Number(roomRate) || 0,
    roomTariffSubtotal,
    addonsSubtotal,
    ordersSubtotal,
    grandTotalPayable,
    ordersCount: actualOrders.length
  };
}

