export interface KitchenItem {
  name: string;
  qty: number;
  notes?: string;
  category?: string;
  /** Written by the guest order pipeline (submit_guest_order_atomic) when the
   * line was added to an already-open order. */
  is_addon?: boolean;
  completed?: boolean;
  started_at?: string;
  ready_at?: string;
  delivered_at?: string;
}

/** One status change, appended by update_kot_status (and by the API's fallback update). */
export interface KotHistoryEntry {
  from: string;
  to: string;
  at: string;
  staff_id?: string | null;
}

export interface KitchenTicket {
  id: string;
  ticket_number: string;
  table_or_room: string;
  room_id?: string;
  order_id?: string;
  station?: string;
  staff_id?: string;
  items: KitchenItem[];
  /** The table's one note for the whole ticket ("Table note for kitchen"), shown once on the card. */
  notes?: string | null;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  created_at: string;
  updated_at?: string;
  /** When each stage happened; empty for tickets created before the history existed. */
  status_history?: KotHistoryEntry[];
}

export interface TicketTimingBreakdown {
  receivedAt: Date;
  startedAt: Date | null;
  readyAt: Date | null;
  deliveredAt: Date | null;
  prepDurationMin: number | null;
  deliveryDurationMin: number | null;
  totalDurationMin: number;
  formattedReceived: string;
  formattedStarted: string | null;
  formattedReady: string | null;
  formattedDelivered: string | null;
}

export function formatTimeOnly(date: Date | null): string | null {
  if (!date || isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function getTicketTimings(ticket: KitchenTicket, nowMs: number = Date.now()): TicketTimingBreakdown {
  const receivedAt = new Date(ticket.created_at);

  // Extract timestamps from items or fallback
  const firstItem = Array.isArray(ticket.items) && ticket.items.length > 0 ? ticket.items[0] : null;
  
  const startedStr = (firstItem as any)?.started_at || null;
  const readyStr = (firstItem as any)?.ready_at || null;
  const deliveredStr = (firstItem as any)?.delivered_at || (ticket.status === 'SERVED' ? ticket.updated_at : null);

  const startedAt = startedStr ? new Date(startedStr) : null;
  const readyAt = readyStr ? new Date(readyStr) : null;
  const deliveredAt = deliveredStr ? new Date(deliveredStr) : null;

  // Calculate prep duration
  let prepDurationMin: number | null = null;
  if (startedAt && readyAt) {
    prepDurationMin = Math.max(1, Math.round((readyAt.getTime() - startedAt.getTime()) / 60000));
  } else if (startedAt && (ticket.status === 'PREPARING' || ticket.status === 'READY')) {
    prepDurationMin = Math.max(1, Math.round((nowMs - startedAt.getTime()) / 60000));
  }

  // Calculate delivery duration
  let deliveryDurationMin: number | null = null;
  if (readyAt && deliveredAt) {
    deliveryDurationMin = Math.max(1, Math.round((deliveredAt.getTime() - readyAt.getTime()) / 60000));
  } else if (readyAt && ticket.status === 'READY') {
    deliveryDurationMin = Math.max(1, Math.round((nowMs - readyAt.getTime()) / 60000));
  }

  // Calculate total turnaround
  let totalDurationMin: number;
  if (deliveredAt) {
    totalDurationMin = Math.max(1, Math.round((deliveredAt.getTime() - receivedAt.getTime()) / 60000));
  } else {
    totalDurationMin = Math.max(0, Math.round((nowMs - receivedAt.getTime()) / 60000));
  }

  return {
    receivedAt,
    startedAt,
    readyAt,
    deliveredAt,
    prepDurationMin,
    deliveryDurationMin,
    totalDurationMin,
    formattedReceived: formatTimeOnly(receivedAt) || 'N/A',
    formattedStarted: formatTimeOnly(startedAt),
    formattedReady: formatTimeOnly(readyAt),
    formattedDelivered: formatTimeOnly(deliveredAt),
  };
}
