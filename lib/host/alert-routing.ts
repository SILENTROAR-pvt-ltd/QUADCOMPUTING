// Where a guest's call belongs on the host console: a room's call to Accommodations, a table's bill to the till, a
// table's waiter or service call to Live Tables, a word for the chef to the kitchen. The bell tray opens that place,
// and the sidebar lights the same place while the call waits.

import { roomNumberFromCall } from './open-room-request';

export type AlertTab = 'accommodations' | 'billing' | 'tables' | 'kitchen' | 'inventory' | 'wallet' | 'reservations';

/** `view: 'bookings'` opens the Accommodations bookings list rather than the front desk. */
export interface AlertTarget { tab: AlertTab; room?: string; table?: string; place: string; view?: 'bookings' }

interface AlertLike { table_number?: string | null; notification_type: string }

export function alertTarget(a: AlertLike): AlertTarget {
  const room = roomNumberFromCall(a.table_number);
  if (room) return { tab: 'accommodations', room, place: `Room ${room}` };
  const table = a.table_number ? String(a.table_number).trim() : '';
  switch (a.notification_type) {
    case 'CHEF': return { tab: 'kitchen', table: table || undefined, place: table ? `Table ${table}` : 'Kitchen' };
    case 'BILL': return { tab: 'billing', table: table || undefined, place: table ? `Table ${table}` : 'Billing' };
    case 'LOW_STOCK_ALERT': return { tab: 'inventory', place: 'Inventory' };
    case 'WALLET_SUSPENDED_LOW_BALANCE': return { tab: 'wallet', place: 'Wallet' };
    case 'EVENT_INTEREST': return { tab: 'reservations', place: 'Reservations' };
    case 'STAY_BOOKING': return { tab: 'accommodations', place: 'Rooms', view: 'bookings' };
    default: return { tab: 'tables', table: table || undefined, place: table ? `Table ${table}` : 'Venue' };
  }
}

/** How many calls wait for each workspace, for the sidebar's lights. */
export function alertCountsByTab(alerts: AlertLike[]): Partial<Record<AlertTab, number>> {
  const counts: Partial<Record<AlertTab, number>> = {};
  for (const a of alerts) {
    const { tab } = alertTarget(a);
    counts[tab] = (counts[tab] || 0) + 1;
  }
  return counts;
}
