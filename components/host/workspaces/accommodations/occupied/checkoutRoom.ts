import type { PhysicalRoom } from '@/types';

/**
 * Checks the guest out: the server writes the stay's invoice (ready for settlement) and frees the
 * room for housekeeping. The invoice then opens in billing, where the tender is taken.
 */
export async function checkoutRoom(room: PhysicalRoom): Promise<{ ok: true; invoice: any; orderId?: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/host/accommodations/rooms/${room.id}/checkout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.invoice) return { ok: false, error: data.error || 'Checkout failed. The guest is still checked in; please retry.' };
    return { ok: true, invoice: data.invoice, orderId: data.order_id };
  } catch {
    return { ok: false, error: 'No connection. The guest is still checked in; please retry.' };
  }
}

/** Opens the invoice in billing (same tab), the way the POS expects a preloaded room invoice. */
export function openInvoiceInBilling(invoice: any, orderId?: string) {
  try {
    sessionStorage.setItem('quad_preloaded_invoice', JSON.stringify(invoice));
    if (orderId) sessionStorage.setItem('quad_preloaded_order_id', orderId);
  } catch {}
  window.dispatchEvent(new CustomEvent('quad:preload-invoice', { detail: invoice }));
  window.dispatchEvent(new CustomEvent('quad:navigate-tab', { detail: 'billing' }));
  if (orderId) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'billing');
    url.searchParams.set('orderId', orderId);
    window.history.pushState({}, '', url.toString());
  }
}
