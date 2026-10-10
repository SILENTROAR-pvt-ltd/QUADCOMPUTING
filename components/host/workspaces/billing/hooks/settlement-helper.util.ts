// Same-browser tabs only. Cross-device guests are notified by the server
// (settle-session.service broadcasts on the venue-scoped table channel).
export async function broadcastTableSettled(tableNumber: string, grandTotal: number) {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('quad_kitchen_sync');
      bc.postMessage({ event: 'table_settled', payload: { table_number: tableNumber, settled_total: grandTotal } });
      bc.close();
    }
  } catch {}
}

export function dispatchWalletRefreshEvents() {
  try { window.dispatchEvent(new CustomEvent('wallet:refresh')); } catch {}
  try { window.dispatchEvent(new CustomEvent('guest-wallet:refresh')); } catch {}
}

export function clearOrderIdUrlParam() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (url.searchParams.has('orderId')) {
    url.searchParams.delete('orderId');
    window.history.replaceState({}, '', url.toString());
  }
}
