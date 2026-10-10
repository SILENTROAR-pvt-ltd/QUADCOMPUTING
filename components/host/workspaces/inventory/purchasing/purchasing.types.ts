import type { PurchaseLine } from '@/lib/services/inventory/purchase-message';

export interface Vendor { id: string; name: string; phone: string | null; notes?: string | null }

export interface PurchaseOrder {
  id: string;
  reference: string;
  vendor_id: string | null;
  vendor_name: string;
  vendor_phone: string | null;
  lines: Array<PurchaseLine & { received_quantity?: number }>;
  estimated_total: number;
  note: string | null;
  status: 'sent' | 'received' | 'cancelled';
  sent_at: string;
  received_at: string | null;
}
