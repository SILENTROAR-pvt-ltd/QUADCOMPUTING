/**
 * Centralized Active Order & KOT In-Memory Store
 * Provides persistent in-memory caching and real-time synchronization between
 * guest table QR orders and host kitchen KOT workspaces, handling edge cases
 * where remote Supabase RLS might restrict anonymous guest inserts.
 */

export interface ActiveOrderItem {
  id?: string;
  order_id: string;
  item_id?: string | null;
  item_name: string;
  price: number;
  quantity: number;
  notes?: string | null;
  kot_status?: string;
  created_at?: string;
}

export interface ActiveOrderRecord {
  id: string;
  business_id: string;
  table_number: string;
  session_id?: string | null;
  status: 'open' | 'pending' | 'preparing' | 'ready' | 'served' | 'settled' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  grand_total: number;
  total_amount: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  items: any[];
  raw_items: ActiveOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface InMemKitchenTicket {
  id: string;
  business_id: string;
  order_id: string;
  ticket_number: string;
  table_or_room: string;
  items: {
    name: string;
    qty: number;
    notes?: string;
    category?: string;
    is_addon?: boolean;
  }[];
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface InMemBillRequestEvent {
  id: string;
  session_id: string | null;
  business_id: string;
  table_number: string;
  requested_at: string;
  settled_at?: string | null;
  item_count: number;
  running_total: number;
  session_status: 'bill_requested' | 'closed';
}

// Global scope caching across hot-reloads in Next.js development
const globalStore = globalThis as unknown as {
  __quad_active_orders?: Map<string, ActiveOrderRecord>;
  __quad_kitchen_tickets?: InMemKitchenTicket[];
  __quad_bill_requests?: InMemBillRequestEvent[];
  __quad_recent_settled_orders?: Map<string, ActiveOrderRecord>;
};

if (!globalStore.__quad_active_orders) {
  globalStore.__quad_active_orders = new Map();
}
if (!globalStore.__quad_kitchen_tickets) {
  globalStore.__quad_kitchen_tickets = [];
}
if (!globalStore.__quad_bill_requests) {
  globalStore.__quad_bill_requests = [];
}
if (!globalStore.__quad_recent_settled_orders) {
  globalStore.__quad_recent_settled_orders = new Map();
}

const activeOrders = globalStore.__quad_active_orders;
const kitchenTickets = globalStore.__quad_kitchen_tickets;
const billRequests = globalStore.__quad_bill_requests;

const normalizeTable = (t: string) => {
  return (t || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^table\s*/i, '')
    .replace(/^t-/i, '')
    .trim()
    .toUpperCase();
};

export function getTableKey(businessId?: string | null, tableNumber?: string | null): string {
  if (!tableNumber || !tableNumber.trim()) return `${businessId || 'default'}_UNSET_TABLE`;
  const normT = normalizeTable(tableNumber);
  return `${businessId || 'default'}_${normT}`;
}

export function findActiveOrder(businessId?: string | null, tableNumber?: string | null): ActiveOrderRecord | null {
  if (!tableNumber || !tableNumber.trim()) return null;
  const key = getTableKey(businessId, tableNumber);
  const found = activeOrders.get(key);
  if (found && !['settled', 'cancelled', 'completed', 'billed', 'closed', 'paid'].includes(found.status.toLowerCase())) {
    return found;
  }
  return null;
}

export function saveActiveOrder(order: ActiveOrderRecord) {
  const key = getTableKey(order.business_id, order.table_number);
  activeOrders.set(key, order);
  // Also index by order ID
  activeOrders.set(order.id, order);
}

export function addKitchenTicket(ticket: InMemKitchenTicket) {
  kitchenTickets.unshift(ticket);
}

export function getKitchenTickets(businessId?: string | null): InMemKitchenTicket[] {
  if (!businessId) return kitchenTickets;
  return kitchenTickets.filter(t => t.business_id === businessId);
}

export function updateKitchenTicketStatus(ticketId: string, status: InMemKitchenTicket['status']) {
  const t = kitchenTickets.find(x => x.id === ticketId || x.ticket_number === ticketId);
  if (t) {
    t.status = status;
    t.updated_at = new Date().toISOString();

    const orderStatusMap: Record<string, ActiveOrderRecord['status']> = {
      PREPARING: 'preparing',
      READY: 'ready',
      SERVED: 'served',
      PENDING: 'open',
    };
    const mappedStatus = orderStatusMap[status];
    if (mappedStatus) {
      if (t.order_id && activeOrders.has(t.order_id)) {
        const ord = activeOrders.get(t.order_id)!;
        ord.status = mappedStatus;
        ord.updated_at = new Date().toISOString();
        if (ord.raw_items) {
          ord.raw_items.forEach((it) => { it.kot_status = status.toLowerCase(); });
        }
      }
      const normT = normalizeTable(t.table_or_room);
      if (normT) {
        activeOrders.forEach((ord) => {
          if (normalizeTable(ord.table_number) === normT && !['settled', 'cancelled'].includes(ord.status)) {
            ord.status = mappedStatus;
            ord.updated_at = new Date().toISOString();
            if (ord.raw_items) {
              ord.raw_items.forEach((it) => { it.kot_status = status.toLowerCase(); });
            }
          }
        });
      }
    }
  }
}

export function findKitchenTicketForTableOrOrder(businessId?: string | null, tableNumber?: string | null, orderId?: string | null): InMemKitchenTicket | null {
  const normT = tableNumber ? normalizeTable(tableNumber) : '';
  if (orderId) {
    const byOrder = kitchenTickets.find(t => t.order_id === orderId && (!businessId || t.business_id === businessId));
    if (byOrder) return byOrder;
  }
  for (const t of kitchenTickets) {
    if (businessId && t.business_id && t.business_id !== businessId) continue;
    if (normT && normalizeTable(t.table_or_room) === normT && !['SERVED', 'CANCELLED', 'COMPLETED'].includes(t.status)) return t;
  }
  for (const t of kitchenTickets) {
    if (businessId && t.business_id && t.business_id !== businessId) continue;
    if (normT && normalizeTable(t.table_or_room) === normT && t.status !== 'CANCELLED') return t;
  }
  return null;
}

export function getAllActiveOrders(businessId?: string | null): ActiveOrderRecord[] {
  const results: ActiveOrderRecord[] = [];
  const seenIds = new Set<string>();

  activeOrders.forEach((order) => {
    if (!order || seenIds.has(order.id)) return;
    if (businessId && order.business_id && order.business_id !== businessId) return;
    const isClosed = ['settled', 'cancelled', 'completed', 'billed'].includes((order.status || '').toLowerCase());
    if (!isClosed && (Number(order.grand_total) > 0 || (Array.isArray(order.items) && order.items.length > 0))) {
      seenIds.add(order.id);
      results.push(order);
    }
  });
  return results;
}

export const recentSettledOrders = globalStore.__quad_recent_settled_orders!;

export function findRecentSettledOrder(businessId?: string | null, tableNumber?: string | null): ActiveOrderRecord | null {
  if (!tableNumber || !tableNumber.trim()) return null;
  const key = getTableKey(businessId, tableNumber);
  const found = recentSettledOrders.get(key);
  if (found) {
    const ageMs = Date.now() - new Date(found.updated_at || found.created_at).getTime();
    if (ageMs < 4 * 60 * 60 * 1000) return found;
  }
  return null;
}

export function closeActiveOrder(businessId?: string | null, tableNumber?: string | null) {
  if (!tableNumber || !tableNumber.trim()) return;
  const normT = normalizeTable(tableNumber);
  if (!normT) return;

  const key = getTableKey(businessId, tableNumber);
  const order = activeOrders.get(key);
  if (order) {
    order.status = 'settled';
    order.updated_at = new Date().toISOString();
    recentSettledOrders.set(key, order);
  }
  activeOrders.delete(key);

  // Clear any entries strictly matching this specific table and business
  activeOrders.forEach((v, k) => {
    if (v && normalizeTable(v.table_number) === normT) {
      if (!businessId || !v.business_id || v.business_id === businessId) {
        v.status = 'settled';
        recentSettledOrders.set(k, v);
        activeOrders.delete(k);
      }
    } else if (order && v && v.id === order.id) {
      v.status = 'settled';
      recentSettledOrders.set(k, v);
      activeOrders.delete(k);
    }
  });

  // Mark pending/preparing kitchen tickets for this exact table as SERVED
  for (const t of kitchenTickets) {
    if (normalizeTable(t.table_or_room) === normT) {
      if (!businessId || !t.business_id || t.business_id === businessId) {
        t.status = 'SERVED';
        t.updated_at = new Date().toISOString();
      }
    } else if (order && t.order_id === order.id) {
      t.status = 'SERVED';
      t.updated_at = new Date().toISOString();
    }
  }

  // Settle active bill requests strictly for this table
  settleInMemBillRequests(businessId, tableNumber, order?.session_id);
}

export function recordBillRequestEvent(event: InMemBillRequestEvent) {
  const normT = normalizeTable(event.table_number);
  const existingIndex = billRequests.findIndex(
    (r) => !r.settled_at && normalizeTable(r.table_number) === normT && (!event.business_id || r.business_id === event.business_id)
  );
  if (existingIndex >= 0) {
    billRequests[existingIndex] = {
      ...billRequests[existingIndex],
      running_total: event.running_total,
      item_count: event.item_count,
      requested_at: event.requested_at,
    };
  } else {
    billRequests.unshift(event);
  }
}

export function getInMemBillRequests(businessId?: string | null): InMemBillRequestEvent[] {
  if (!businessId) return billRequests;
  return billRequests.filter((r) => !r.business_id || r.business_id === businessId);
}

export function settleInMemBillRequests(businessId?: string | null, tableNumber?: string | null, sessionId?: string | null) {
  if (!tableNumber && !sessionId) return;
  const normT = tableNumber ? normalizeTable(tableNumber) : null;
  const nowIso = new Date().toISOString();
  for (const r of billRequests) {
    if (businessId && r.business_id && r.business_id !== businessId) continue;
    const matchesTable = normT && normalizeTable(r.table_number) === normT;
    const matchesSession = sessionId && r.session_id === sessionId;
    if ((matchesTable || matchesSession) && !r.settled_at) {
      r.settled_at = nowIso;
      r.session_status = 'closed';
    }
  }
}

