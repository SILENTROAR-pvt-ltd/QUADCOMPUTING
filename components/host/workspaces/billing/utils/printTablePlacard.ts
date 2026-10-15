import { escapeHtml } from '@/lib/utils/escape-html';

export function printTablePlacard(
  qrSvgElement: SVGSVGElement | null,
  activeTableNumber: string,
  mode: 'universal' | 'individual'
) {
  if (!qrSvgElement) return;

  const svgData = new XMLSerializer().serializeToString(qrSvgElement);
  const printWindow = window.open('', '_blank', 'width=650,height=800');
  if (!printWindow) return;

  const isUniversal = mode === 'universal';
  const safeTable = escapeHtml(activeTableNumber);
  const tableTitle = isUniversal ? 'DIGITAL MENU & BAR' : `TABLE ${safeTable}`;
  const subTitle = isUniversal
    ? 'SCAN TO OPEN CAFE MENU & ORDER DIRECT'
    : 'SCAN TO ORDER INSTANTLY TO KITCHEN';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Quad Table Placard - ${safeTable}</title>
        <style>
          @page { size: A6 portrait; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #ffffff;
            color: #111111;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
            text-align: center;
          }
          .card {
            border: 2px solid #111111;
            border-radius: 24px;
            padding: 32px 24px;
            width: 100%;
            max-width: 320px;
          }
          .logo { font-size: 11px; font-weight: 800; letter-spacing: 0.25em; text-transform: uppercase; color: #777777; margin-bottom: 8px; }
          .table-badge {
            display: inline-block;
            background: #111111;
            color: #ffffff;
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 0.15em;
            padding: 6px 16px;
            border-radius: 9999px;
            margin-bottom: 24px;
            text-transform: uppercase;
          }
          .qr-box {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            background: #ffffff;
            border: 1px solid #e5e5e5;
            border-radius: 20px;
            margin-bottom: 24px;
          }
          .qr-box svg { width: 170px; height: 170px; }
          .instructions { font-size: 12px; font-weight: 600; color: #222222; line-height: 1.4; }
          .footer { font-size: 9px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #999999; margin-top: 24px; border-top: 1px dashed #dddddd; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">Quad Hospitality</div>
          <div class="table-badge">${tableTitle}</div>
          <div class="qr-box">${svgData}</div>
          <div class="instructions">${subTitle}<br/>Browse items & track orders in real-time.</div>
          <div class="footer">Powered by Quad Computing POS</div>
        </div>
        <script>
          window.onload = function() { window.focus(); window.print(); window.close(); };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
