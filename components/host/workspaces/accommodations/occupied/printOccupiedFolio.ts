import type { PhysicalRoom } from '@/types';
import { escapeHtml as esc } from '@/lib/utils/escape-html';

interface PrintFolioOptions {
  room: PhysicalRoom;
  billingSummary: {
    nights: number;
    roomRate: number;
    roomTariffSubtotal: number;
    addonsSubtotal: number;
    ordersSubtotal: number;
    grandTotalPayable: number;
  };
  orders: any[];
}

export function printOccupiedFolio({ room, billingSummary, orders }: PrintFolioOptions) {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    window.print();
    return;
  }

  const itemsHtml = orders.flatMap(o => (Array.isArray(o.items) ? o.items : [])).map(it => `
    <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed #eee;">
      <span>${esc(it.qty)}x ${esc(it.name)}</span>
      <span>₹${(it.price * it.qty).toFixed(2)}</span>
    </div>
  `).join('');

  const addonsHtml = (Array.isArray(room.selected_addons) ? room.selected_addons : []).map((a: any) => `
    <div style="display:flex; justify-content:space-between; padding:4px 0;">
      <span>${esc(a.name)} (${esc(a.billingType || 'addon')})</span>
      <span>₹${Number(a.price).toFixed(2)}</span>
    </div>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Guest Folio - Room ${esc(room.room_number)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #111; max-width: 600px; margin: 0 auto; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
          .meta { font-size: 12px; color: #555; margin-bottom: 16px; }
          .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #777; margin-top: 16px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
          .total-row { border-top: 2px solid #000; margin-top: 16px; padding-top: 8px; font-size: 16px; font-weight: bold; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INTERIM GUEST FOLIO</h1>
          <p style="margin:0; font-size:12px;">Room ${esc(room.room_number)} • ${esc(room.category?.name || 'Accommodation')}</p>
        </div>
        <div class="meta">
          <p><strong>Guest:</strong> ${esc(room.guest_name || 'In-House Guest')}</p>
          <p><strong>Contact:</strong> ${esc(room.guest_phone || 'N/A')}</p>
          <p><strong>Check-In:</strong> ${room.check_in_time ? new Date(room.check_in_time).toLocaleString() : 'N/A'}</p>
        </div>

        <div class="section-title">Accommodation Charges</div>
        <div style="display:flex; justify-content:space-between; padding:6px 0;">
          <span>Room Tariff (${billingSummary.nights} Night${billingSummary.nights > 1 ? 's' : ''} × ₹${billingSummary.roomRate})</span>
          <span>₹${billingSummary.roomTariffSubtotal.toFixed(2)}</span>
        </div>
        ${addonsHtml}

        <div class="section-title">Room Service & POS Orders</div>
        ${itemsHtml || '<p style="font-size:12px; color:#888;">No F&B billed</p>'}
        <div style="display:flex; justify-content:space-between; padding:6px 0; font-weight:bold;">
          <span>F&B Subtotal:</span>
          <span>₹${billingSummary.ordersSubtotal.toFixed(2)}</span>
        </div>

        <div class="total-row">
          <span>TOTAL FOLIO DUE:</span>
          <span>₹${billingSummary.grandTotalPayable.toFixed(2)}</span>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
}
