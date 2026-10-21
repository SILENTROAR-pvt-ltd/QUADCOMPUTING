import type { HistoricalStayRecord } from '@/types';

export interface InvoiceItem {
  id?: string;
  name: string;
  price: number;
  qty: number;
  section?: 'ACCOMMODATION' | 'ADD_ON' | 'ROOM_SERVICE' | 'F&B' | string;
  notes?: string;
}

export interface InvoiceData {
  id?: string;
  business_id?: string;
  created_at?: string;
  guest_name?: string;
  guest_phone?: string;
  guest_email?: string;
  guest_address?: string;
  guest_id_type?: string;
  guest_id_number?: string;
  table_number?: string;
  table_id?: string;
  room_id?: string;
  guest_id?: string;
  /** The guest's wallet handle (e.g. @babaaps) when the bill came from a QR session or wallet. */
  guest_handle?: string;
  /** Wallet credit used on this bill; it is part of `discountAmount`. */
  wallet_redeemed?: number;
  /** Cashback the bill earned into the guest's wallet. */
  wallet_cashback?: number;
  payment_method?: string;
  /** A cash bill: the notes handed over and the change returned (cash-tender.ts). */
  cash_tendered?: number | null;
  cash_change?: number | null;
  items: InvoiceItem[];
  subtotal: number;
  discountType?: 'percentage' | 'flat';
  discountValue?: number;
  discountAmount?: number;
  taxAmount?: number;
  grandTotal: number;
  isReadOnly?: boolean;
  served_by_staff_id?: string;
  staff_name?: string;
  /**
   * Set by the POS for a table or room bill: the order is then saved and settled in one request. Carries what only the
   * POS knows about the table's running session.
   */
  settlement?: {
    session_id?: string | null; redemption_code?: string | null; credit_cashback?: boolean;
    /** A room bill only: 'payment' adjusts the amount in the running stay (the guest stays checked in); 'checkout' settles and frees the room. */
    mode?: 'payment' | 'checkout';
    /** With mode 'payment': the amount taken, when it is not the whole bill on screen. */
    amount?: number;
  };
}

/**
 * Adapter function that transforms an Accommodation Stay Record (Folio Ledger)
 * into the standardized POS InvoiceData object.
 */
export function mapFolioToReceipt(stay: HistoricalStayRecord): InvoiceData {
  const roomNumber = stay.room_number || stay.room?.room_number || 'Room';
  const categoryName = stay.category_name || stay.room?.category?.name || 'Standard Accommodation';
  const categoryPrice = Number(stay.category_price ?? stay.room?.category?.price ?? 0);
  const nights = Math.max(1, stay.nights || 1);
  const tariffTotal = categoryPrice * nights;

  // 1. Map Base Room Stay Line Item
  const roomStayItem: InvoiceItem = {
    id: `room_${stay.id}`,
    name: `Room Stay - ${categoryName} (Room ${roomNumber})`,
    qty: nights,
    price: categoryPrice,
    section: 'ACCOMMODATION',
    notes: `${nights} Night${nights > 1 ? 's' : ''} × ₹${categoryPrice.toLocaleString('en-IN')}`,
  };

  // 2. Map Add-on Services Line Items
  const selectedAddons = Array.isArray(stay.selected_addons) ? stay.selected_addons : [];
  let addonsTotal = 0;
  const addonItems: InvoiceItem[] = selectedAddons.map((addon: any, idx: number) => {
    const p = Number(addon.price) || 0;
    const isPerNight = addon.billingType === 'per_night' || addon.billingType === 'per_person_per_day';
    const qty = isPerNight ? nights : 1;
    const lineTotal = p * qty;
    addonsTotal += lineTotal;

    return {
      id: addon.id || `addon_${idx}`,
      name: `${addon.name}${addon.billingType ? ` (${addon.billingType.replace(/_/g, ' ')})` : ''}`,
      qty,
      price: p,
      section: 'ADD_ON',
      notes: isPerNight 
        ? `${nights} Night${nights > 1 ? 's' : ''} × ₹${p.toLocaleString('en-IN')}` 
        : 'One-time add-on service',
    };
  });

  // 3. Map Merged Room Service & F&B Orders
  const finalBilledAmount = Number(stay.total_billed_amount) || (tariffTotal + addonsTotal);
  const otherChargesTotal = Math.max(0, finalBilledAmount - (tariffTotal + addonsTotal));
  const fnbItems: InvoiceItem[] = [];

  if (otherChargesTotal > 0) {
    fnbItems.push({
      id: `fnb_${stay.id}`,
      name: 'Room Service & F&B Orders',
      qty: 1,
      price: otherChargesTotal,
      section: 'ROOM_SERVICE',
      notes: 'Settled food, beverages & minibar folio orders',
    });
  }

  // 4. Combine all items and calculate subtotal
  const allItems: InvoiceItem[] = [roomStayItem, ...addonItems, ...fnbItems];
  const subtotal = tariffTotal + addonsTotal + otherChargesTotal;

  // 5. Construct standardized InvoiceData
  return {
    id: stay.id,
    created_at: stay.check_out_time || stay.check_in_time || stay.created_at || new Date().toISOString(),
    guest_name: stay.guest_name || 'Valued Guest',
    guest_phone: stay.guest_phone || undefined,
    guest_email: stay.guest_email || undefined,
    guest_address: stay.guest_address || undefined,
    guest_id_type: stay.id_type || undefined,
    guest_id_number: stay.id_number || undefined,
    table_number: `Room ${roomNumber} (${categoryName})`,
    room_id: stay.room_id || stay.room?.id,
    payment_method: 'SETTLED',
    items: allItems,
    subtotal,
    discountType: 'flat',
    discountValue: 0,
    discountAmount: 0,
    taxAmount: 0,
    grandTotal: finalBilledAmount,
    isReadOnly: true,
  };
}
