import type { HistoricalStayRecord } from '@/types';

interface PrintInvoiceOptions {
  stay: HistoricalStayRecord;
  roomNumber: string;
  categoryName: string;
  categoryPrice: number;
  nights: number;
  tariffTotal: number;
  selectedAddons: any[];
  otherChargesTotal: number;
  finalBilledAmount: number;
  checkInFormatted: string;
  checkOutFormatted: string;
}

export function printStayInvoice({
  stay,
  roomNumber,
  categoryName,
  categoryPrice,
  nights,
  tariffTotal,
  selectedAddons,
  otherChargesTotal,
  finalBilledAmount,
  checkInFormatted,
  checkOutFormatted
}: PrintInvoiceOptions) {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    window.print();
    return;
  }

  const addonsRowsHtml = selectedAddons.map((addon: any) => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">${addon.name} <span style="font-size:11px; color:#64748b;">(${addon.billingType || 'addon'})</span></td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-family: monospace;">₹${Number(addon.price).toLocaleString()}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice - Room ${roomNumber} - ${stay.guest_name}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 40px;
            background: #fff;
          }
          .invoice-box {
            max-width: 700px;
            margin: auto;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 32px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          .logo-text {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.5px;
          }
          .tagline {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 4px;
          }
          .invoice-title {
            text-align: right;
          }
          .invoice-title h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
          }
          .badge-settled {
            display: inline-block;
            background: #dcfce7;
            color: #166534;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 9999px;
            margin-top: 6px;
          }
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
            font-size: 13px;
            line-height: 1.6;
          }
          .details-box {
            background: #f8fafc;
            border-radius: 8px;
            padding: 16px;
          }
          .details-box h4 {
            margin: 0 0 8px 0;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 13px;
          }
          th {
            background: #0f172a;
            color: #fff;
            font-weight: 600;
            text-align: left;
            padding: 10px 12px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          th.text-right {
            text-align: right;
          }
          .total-section {
            border-top: 2px solid #0f172a;
            margin-top: 16px;
            padding-top: 16px;
            display: flex;
            justify-content: space-between;
            align-items: baseline;
          }
          .total-title {
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .total-amount {
            font-size: 26px;
            font-weight: 800;
            font-family: monospace;
            color: #0f172a;
          }
          .footer-note {
            margin-top: 32px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 16px;
            font-size: 11px;
            color: #94a3b8;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <div class="logo-text">QUAD HOSPITALITY</div>
              <div class="tagline">Official Guest Folio & Tax Invoice</div>
            </div>
            <div class="invoice-title">
              <h2>INVOICE</h2>
              <div class="badge-settled">PAID & SETTLED</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px; font-family: monospace;">
                Folio #${stay.id.slice(0, 13).toUpperCase()}
              </div>
            </div>
          </div>

          <div class="details-grid">
            <div class="details-box">
              <h4>Guest Information</h4>
              <div><strong>${stay.guest_name}</strong></div>
              <div>Phone: ${stay.guest_phone || 'N/A'}</div>
              ${stay.guest_email ? `<div>Email: ${stay.guest_email}</div>` : ''}
              ${stay.id_type || stay.id_number ? `<div>ID: ${stay.id_type ? `${stay.id_type} • ` : ''}${stay.id_number || ''}</div>` : stay.guest_id_proof ? `<div>ID Proof: ${stay.guest_id_proof}</div>` : ''}
              ${stay.guest_address ? `<div>Address: ${stay.guest_address}</div>` : ''}
              <div>Guests: ${stay.total_guests || 1} Person(s)</div>
              <div>Purpose: ${stay.purpose_of_visit || 'Leisure'}</div>
              ${stay.is_celebration ? `<div>Celebration: ${stay.celebration_type || 'Special Event'}</div>` : ''}
            </div>

            <div class="details-box">
              <h4>Stay Information</h4>
              <div><strong>Room ${roomNumber}</strong> - ${categoryName}</div>
              <div>Check-in: ${checkInFormatted}</div>
              <div>Check-out: ${checkOutFormatted}</div>
              <div>Duration: <strong>${nights} Night${nights > 1 ? 's' : ''}</strong></div>
              <div>Rate: ₹${categoryPrice.toLocaleString()} / night</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;">
                  <strong>Accommodation Stay Tariff</strong><br>
                  <span style="font-size: 11px; color: #64748b;">${nights} Night(s) @ ₹${categoryPrice.toLocaleString()}/night</span>
                </td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-family: monospace; font-weight: 600;">
                  ₹${tariffTotal.toLocaleString()}
                </td>
              </tr>
              ${addonsRowsHtml}
              ${otherChargesTotal > 0 ? `
                <tr>
                  <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9;">
                    <strong>F&B Room Service & Restaurant POS Orders</strong><br>
                    <span style="font-size: 11px; color: #64748b;">Consolidated settled kitchen tickets</span>
                  </td>
                  <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-family: monospace; font-weight: 600;">
                    ₹${otherChargesTotal.toLocaleString()}
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>

          <div class="total-section">
            <div>
              <div class="total-title">Total Settled Folio Amount</div>
              <div style="font-size: 11px; color: #64748b;">All taxes and service fees included</div>
            </div>
            <div class="total-amount">
              ₹${finalBilledAmount.toLocaleString()}
            </div>
          </div>

          <div class="footer-note">
            Thank you for staying with us. This is an electronically generated folio and does not require a physical signature.
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
