export const IS_UUID = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
// Must match orders_payment_method_check in the database.
export const TENDERS = ['UPI', 'CASH', 'CARD', 'SPLIT', 'WALLET'];

export interface SettlementInput {
  businessId: string;
  sessionId: string | null;
  orderId: string | null;
  tableId: string | null;
  rawTable: string;
}

/** The request as settlement reads it: ids checked, the table name trimmed. Reads nothing from the database. */
export function readSettlementInput(body: any): SettlementInput {
  const { session_id, order_id, table_id, table_number, business_id } = body;
  let rawTable = (table_number || '').trim();
  const tableId = IS_UUID(table_id) ? table_id : null;
  if (table_id && !rawTable && !tableId) rawTable = String(table_id).trim();
  return {
    businessId: IS_UUID(business_id) ? business_id : '',
    sessionId: IS_UUID(session_id) ? session_id : null,
    orderId: IS_UUID(order_id) ? order_id : null,
    tableId,
    rawTable,
  };
}
