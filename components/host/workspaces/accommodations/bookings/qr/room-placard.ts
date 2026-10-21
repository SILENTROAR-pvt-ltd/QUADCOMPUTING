'use client';

import { escapeHtml } from '@/lib/utils/escape-html';

// The room QR as something to hold: a PNG to send to the printer's shop, and an A6 placard (one per room, or every
// room in one print run) that stands on the desk in the room.

export interface RoomPlacard { roomNumber: string; categoryName?: string | null; url: string; svg: SVGSVGElement | null }

/** The QR as a crisp PNG (white margin, 1024 px), downloaded as a file. */
export async function downloadRoomQrPng(svg: SVGSVGElement, roomNumber: string): Promise<void> {
  const data = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => { const el = new Image(); el.onload = () => resolve(el); el.onerror = () => reject(new Error('qr')); el.src = url; });
    const size = 1024; const margin = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, margin, margin, size - margin * 2, size - margin * 2);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
    if (!blob) throw new Error('png');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `room-${roomNumber.replace(/[^A-Za-z0-9-]+/g, '_')}-qr.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 5_000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const card = (p: RoomPlacard, venue: string) => `
  <div class="card">
    <div class="logo">${escapeHtml(venue)}</div>
    <div class="badge">ROOM ${escapeHtml(p.roomNumber)}</div>
    ${p.categoryName ? `<div class="type">${escapeHtml(p.categoryName)}</div>` : ''}
    <div class="qr">${p.svg ? new XMLSerializer().serializeToString(p.svg) : ''}</div>
    <div class="how">Scan with your phone camera</div>
    <ul class="list"><li>Order food &amp; drinks to your room</li><li>See your bill and what is paid</li><li>Housekeeping, towels, the front desk</li><li>Check-out and late check-out</li></ul>
    <div class="foot">Confirm with the last 4 digits of your mobile · Powered by Vibers Connect</div>
  </div>`;

/** Prints one placard per room, A6, in a new window. The host's own printer dialog does the rest. */
export function printRoomPlacards(placards: RoomPlacard[], venue: string): void {
  const w = window.open('', '_blank', 'width=700,height=900');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Room placards · ${escapeHtml(venue)}</title><style>
    @page { size: A6 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #111; background: #fff; }
    .card { width: 105mm; height: 148mm; padding: 10mm 9mm; text-align: center; page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .logo { font-size: 10px; font-weight: 800; letter-spacing: 0.25em; text-transform: uppercase; color: #7a6a4a; margin-bottom: 8px; }
    .badge { display: inline-block; background: #0a3222; color: #fff; font-size: 15px; font-weight: 800; letter-spacing: 0.12em; padding: 7px 18px; border-radius: 999px; }
    .type { font-size: 11px; color: #555; margin-top: 6px; }
    .qr { margin: 14px 0 10px; padding: 12px; border: 1px solid #e6d9b8; border-radius: 18px; background: #fff; }
    .qr svg { width: 50mm; height: 50mm; display: block; }
    .how { font-size: 12px; font-weight: 700; }
    .list { list-style: none; margin-top: 8px; font-size: 10.5px; color: #333; line-height: 1.55; }
    .foot { margin-top: 12px; padding-top: 8px; border-top: 1px dashed #ddd; font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; color: #888; }
  </style></head><body>${placards.map((p) => card(p, venue)).join('')}
  <script>window.onload = function () { window.focus(); window.print(); };</script></body></html>`);
  w.document.close();
}
