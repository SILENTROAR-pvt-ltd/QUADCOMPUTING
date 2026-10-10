export function calculateRunningTotal(sentItems: any[]): number {
  return sentItems.reduce((acc, it: any) => {
    const p = Number(it.price ?? it.unit_price ?? it.total_item_price ?? 0) || 0;
    const q = Math.max(1, Number(it.quantity ?? it.qty ?? 1) || 1);
    return acc + p * q;
  }, 0);
}

export function computeSettledTotal(masterOrder: any, sentItems: any[], settledAmount?: number): number {
  if (Number(settledAmount) > 0) return Number(settledAmount);
  const ordTotal = Number(masterOrder?.grand_total || masterOrder?.total_amount);
  if (ordTotal > 0) return ordTotal;
  return calculateRunningTotal(sentItems);
}

export function checkHasActiveOrder(sentItems: any[], masterOrder: any): boolean {
  if (sentItems && sentItems.length > 0) return true;
  if (!masterOrder) return false;
  const s = (masterOrder.status || '').toLowerCase();
  const isClosed = ['settled', 'completed', 'cancelled', 'billed'].includes(s);
  return !isClosed && (Number(masterOrder.grand_total) > 0 || (Array.isArray(masterOrder.items) && masterOrder.items.length > 0));
}

export function extractActiveKotTicket(data: any) {
  return {
    kotStatus: data?.kot_status || (data?.ticket?.status ? data.ticket.status : null),
    ticketNumber: data?.ticket_number || data?.ticket?.ticket_number || null,
  };
}

export function isSessionClosedForTable(sessionStatus?: string, tableMatches?: boolean): boolean {
  return sessionStatus === 'closed' && Boolean(tableMatches);
}

export function formatOrderItemAddonsSummary(selectedAddons: any[], notes?: string): string {
  const addonsSummary = (selectedAddons || []).map((a: any) => `${a.name} (+₹${a.price})`).join(', ');
  return [addonsSummary, notes].filter(Boolean).join(' | ');
}

export function normalizeTableIdentifier(table?: string): string {
  return (table || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^table\s*/i, '')
    .replace(/^t-/i, '')
    .trim()
    .toUpperCase();
}
