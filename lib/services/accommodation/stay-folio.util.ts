import { businessDateString } from '@/lib/utils/business-day';

// One set of rules for what a stay costs, used by the check-in quote, the live folio and checkout,
// so the guest is charged exactly what they were quoted.

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StayAddon {
  id?: string;
  name: string;
  price: number | string;
  billingType?: string;
  /** People a per-person add-on is for, fixed at check-in. Older stays without it count one. */
  persons?: number;
}

export interface FolioLine { id: string; name: string; price: number; qty: number; notes?: string; type: 'room_tariff' | 'addon' }

/** Hotel nights: India-time calendar dates from check-in to check-out (or now), at least one. */
export function stayNights(checkIn?: string | null, checkOut?: string | number | Date | null): number {
  const start = checkIn ? new Date(checkIn) : null;
  const end = checkOut ? new Date(checkOut) : new Date();
  if (!start || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const days = Math.round((Date.parse(businessDateString(end)) - Date.parse(businessDateString(start))) / DAY_MS);
  return Math.max(1, days);
}

/** How many units of an add-on a stay uses: nights, nights × persons, or once. */
export function addonUnits(addon: StayAddon, nights: number): number {
  if (addon.billingType === 'per_night') return nights;
  if (addon.billingType === 'per_person_per_day') return nights * Math.max(1, Number(addon.persons) || 1);
  return 1;
}

export function addonTotal(addon: StayAddon, nights: number): number {
  return (Number(addon.price) || 0) * addonUnits(addon, nights);
}

function addonNote(addon: StayAddon, nights: number): string {
  const n = `${nights} night${nights === 1 ? '' : 's'}`;
  if (addon.billingType === 'per_night') return n;
  if (addon.billingType === 'per_person_per_day') {
    const p = Math.max(1, Number(addon.persons) || 1);
    return `${n} × ${p} ${p === 1 ? 'person' : 'people'}`;
  }
  return 'once per stay';
}

interface FolioInput { roomId: string; roomNumber: string; categoryName?: string | null; rate: number; nights: number; addons?: StayAddon[] }

/** The room tariff and add-on lines of a stay, with their totals. */
export function buildStayFolio({ roomId, roomNumber, categoryName, rate, nights, addons = [] }: FolioInput) {
  const tariff: FolioLine = {
    id: `tariff-${roomId}`,
    name: `Room ${roomNumber} · ${categoryName || 'Stay'}`,
    price: Number(rate) || 0,
    qty: nights,
    notes: `${nights} night${nights === 1 ? '' : 's'} × ₹${(Number(rate) || 0).toLocaleString('en-IN')}`,
    type: 'room_tariff',
  };
  const addonLines: FolioLine[] = addons.map((a, i) => ({
    id: a.id || `addon-${i}`,
    name: a.name,
    price: Number(a.price) || 0,
    qty: addonUnits(a, nights),
    notes: addonNote(a, nights),
    type: 'addon',
  }));
  const tariffTotal = tariff.price * tariff.qty;
  const addonsTotal = addonLines.reduce((s, l) => s + l.price * l.qty, 0);
  return { lines: [tariff, ...addonLines], tariffTotal, addonsTotal, total: tariffTotal + addonsTotal };
}

/** Order statuses that no longer belong on an open folio, in every spelling the code paths write. */
export const CLOSED_ORDER_STATUSES = '(settled,SETTLED,cancelled,CANCELLED,completed,COMPLETED)';
