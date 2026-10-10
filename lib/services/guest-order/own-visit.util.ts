// A guest's bill is the orders of THEIR dine-in visit, nothing else.
// Several guests can sit at one table within minutes of each other; grouping by
// table or by time window merged their bills (a ₹200 bill showed as ₹630 and
// the cashback of three guests was summed onto one). Visits are keyed by the
// dine-in session, and only when this device took part in the order.

export const VISIT_WINDOW_MS = 2 * 60 * 60 * 1000;

export interface SettledOrderRow {
  id: string;
  session_id?: string | null;
  created_at: string;
  grand_total?: number | null;
  total_amount?: number | null;
  subtotal?: number | null;
}

export interface OwnVisit<T extends SettledOrderRow> {
  own: T | null;
  visitOrders: T[];
  total: number;
}

export function ownVisitOrders<T extends SettledOrderRow>(
  settled: T[],
  knownOrderId: string | null | undefined,
  now: number = Date.now()
): OwnVisit<T> {
  const none: OwnVisit<T> = { own: null, visitOrders: [], total: 0 };
  if (!knownOrderId) return none;

  const own = settled.find((o) => o.id === knownOrderId) || null;
  if (!own) return none;
  if (now - new Date(own.created_at).getTime() >= VISIT_WINDOW_MS) return none;

  const visitOrders = own.session_id ? settled.filter((o) => o.session_id === own.session_id) : [own];
  const total = visitOrders.reduce((sum, o) => sum + (Number(o.grand_total || o.total_amount || o.subtotal) || 0), 0);
  return { own, visitOrders, total };
}
