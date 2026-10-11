'use client';

import React, { useRef } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { buildPdf, download, qrFromSvg } from '../pdf';

/** A campaign QR with PNG (print size), SVG (vector) and PDF (A4 poster) downloads. */
export function QrDownloads({ url, label, code }: { url: string; label: string; code: string }) {
  const svgBox = useRef<HTMLDivElement>(null);
  const canvasBox = useRef<HTMLDivElement>(null);

  const png = () => {
    const canvas = canvasBox.current?.querySelector('canvas');
    if (!canvas) return;
    canvas.toBlob((blob) => blob && download(blob, `vibers-club-${code}.png`), 'image/png');
  };
  const svg = () => {
    const el = svgBox.current?.querySelector('svg');
    if (!el) return;
    const xml = new XMLSerializer().serializeToString(el);
    download(new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${xml}`], { type: 'image/svg+xml' }), `vibers-club-${code}.svg`);
  };
  const pdf = () => {
    const runs = qrFromSvg(svgBox.current?.querySelector('svg') ?? null);
    if (!runs) return;
    download(buildPdf([
      { x: 56, y: 90, size: 12, text: 'VIBERS CLUB', bold: true, gray: true },
      { x: 56, y: 130, size: 30, text: 'Scan to apply for your Viber Pass', bold: true },
      { x: 56, y: 162, size: 13, text: 'A verified club for travellers, nomads and creators. 18+ only.', gray: true },
      { x: 56, y: 720, size: 11, text: url, gray: true },
      { x: 56, y: 742, size: 9, text: `Campaign: ${label} (${code})`, gray: true },
    ], { runs, x: 130, y: 210, size: 335 }), `vibers-club-${code}.pdf`);
  };

  const btn = 'rounded-full border border-[#2a1250]/15 bg-white px-3 py-1 text-xs font-semibold hover:bg-[#2a1250]/[0.04]';
  return (
    <div className="flex items-center gap-3">
      <div ref={svgBox} className="rounded-xl border border-[#2a1250]/10 bg-white p-1.5"><QRCodeSVG value={url} size={72} level="M" marginSize={2} /></div>
      <div ref={canvasBox} className="hidden" aria-hidden="true"><QRCodeCanvas value={url} size={1024} level="M" marginSize={4} /></div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={btn} onClick={png}>PNG</button>
        <button type="button" className={btn} onClick={svg}>SVG</button>
        <button type="button" className={btn} onClick={pdf}>PDF</button>
      </div>
    </div>
  );
}
