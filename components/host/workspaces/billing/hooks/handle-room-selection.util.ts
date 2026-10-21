import { creditLine } from '@/lib/services/stay/stay-ledger';
import { mergeBillLines } from '@/lib/services/stay/stay-scope';

export interface RoomFolioLines {
  lines: Array<{ id: string; name: string; price: number; qty: number }>;
  masterOrderId: string | null;
  guestName: string | null;
  guestPhone: string | null;
  payable: number;
  nights: number;
}

/**
 * A room's running bill for the POS, read the way the front desk reads it: the nights so far at the tariff, add-ons and
 * fees, every room-service order's dishes (the same dish twice becomes one line), and the advance paid at the desk as a
 * credit. What checkout would settle right now.
 */
export async function fetchRoomFolioLines(roomId: string): Promise<RoomFolioLines> {
  const res = await fetch(`/api/host/accommodations/rooms/${encodeURIComponent(roomId)}/dossier`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) throw new Error(data?.error || 'The room folio could not be loaded.');

  const dishes = mergeBillLines((data.orders || []).flatMap((o: any) => (Array.isArray(o.items) ? o.items : [])));
  const credit = Number(data.billingSummary?.advancePaid) || 0;
  const raw = [...(data.folioLines || []), ...dishes, ...(credit > 0 ? [creditLine(credit)] : [])];
  const lines = raw.map((l: any, i: number) => ({
    id: String(l.id || `${l.name || l.item_name || 'line'}-${i}`),
    name: String(l.name || l.item_name || 'Item'),
    price: Number(l.price) || 0,
    qty: Math.max(1, Number(l.qty ?? l.quantity) || 1),
  }));
  return {
    lines,
    masterOrderId: data.masterOrder?.id || null,
    guestName: data.room?.guest_name || null,
    guestPhone: data.room?.guest_phone || null,
    payable: Number(data.billingSummary?.grandTotalPayable) || 0,
    nights: Number(data.billingSummary?.nights) || 0,
  };
}
