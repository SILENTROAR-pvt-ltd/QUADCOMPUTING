export type DineInSessionStatus = 'open' | 'bill_requested' | 'closed';
export type KOTItemStatus = 'pending' | 'cooking' | 'served' | 'cancelled';

export interface DineInSession {
  id: string;
  business_id: string;
  table_id?: string | null;
  table_number: string;
  guest_session_id: string;
  status: DineInSessionStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRecord {
  id: string;
  order_id: string;
  item_id?: string | null;
  item_name: string;
  price: number;
  quantity: number;
  notes?: string | null;
  kot_status: KOTItemStatus;
  created_at: string;
}

export interface MasterOrderRecord {
  id: string;
  business_id?: string;
  session_id?: string | null;
  subtotal: number;
  tax_amount?: number;
  grand_total: number;
  total_amount?: number;
  status: 'open' | 'finalizing' | 'settled' | 'PENDING' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
  table_id?: string | null;
  table_number?: string;
  payment_method?: string;
  created_at?: string;
}

export interface SessionWithOrderAndItems {
  session: DineInSession;
  order: MasterOrderRecord;
  items: OrderItemRecord[];
}

export interface TableLiveSessionInfo {
  sessionId: string;
  orderId: string;
  status: DineInSessionStatus;
  subtotal: number;
  grandTotal: number;
  itemsCount: number;
  updatedAt: string;
}
