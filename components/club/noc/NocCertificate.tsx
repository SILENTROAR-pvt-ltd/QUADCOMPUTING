'use client';

import React, { useRef } from 'react';
import { BadgeCheck, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { Button } from '../ui';
import { rupees } from '../api';
import { buildPdf, download, qrFromSvg } from '../pdf';

export interface NocPayload {
  code: string; title: string; creator: string; starts_at: string; ends_at: string; properties: string[];
  collected: number; fees: number; paid_out: number; issued_at: string;
}

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

/** The No Objection Certificate, with a QR that opens this verification page, and a PDF download. */
export function NocCertificate({ noc, verifyUrl }: { noc: NocPayload; verifyUrl: string }) {
  const qrRef = useRef<HTMLDivElement>(null);
  const lines: Array<[string, string]> = [
    ['Plan', noc.title], ['Organised by', noc.creator], ['Dates', `${day(noc.starts_at)} to ${day(noc.ends_at)}`],
    ['Partner properties', noc.properties.join(', ') || 'None'], ['Collected', rupees(noc.collected)], ['Platform fee', rupees(noc.fees)],
    ['Paid to vendors', rupees(noc.paid_out)], ['Escrow balance', rupees(0)], ['Issued', day(noc.issued_at)], ['Certificate no.', noc.code],
  ];

  const pdf = () => {
    const runs = qrFromSvg(qrRef.current?.querySelector('svg') ?? null);
    const texts = [
      { x: 56, y: 80, size: 11, text: 'VIBERS CLUB', bold: true, gray: true },
      { x: 56, y: 112, size: 24, text: 'No Objection Certificate', bold: true },
      { x: 56, y: 140, size: 11, text: 'This plan is completed and its escrow ledger has settled to zero.', gray: true },
      ...lines.flatMap(([k, v], i) => [{ x: 56, y: 190 + i * 26, size: 10, text: k, gray: true }, { x: 200, y: 190 + i * 26, size: 12, text: v }]),
      { x: 56, y: 760, size: 9, text: `Verify: ${verifyUrl}`, gray: true },
    ];
    download(buildPdf(texts, runs ? { runs, x: 420, y: 60, size: 120 } : undefined), `vibers-club-noc-${noc.code}.pdf`);
  };

  return (
    <article className="mx-auto max-w-2xl rounded-[28px] border border-[#2a1250]/10 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(42,18,80,0.5)] sm:p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#be185d]">Vibers Club</p>
          <h1 className={`${DISPLAY} mt-1 text-3xl sm:text-4xl`}>No Objection Certificate</h1>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><BadgeCheck className="h-4 w-4" /> Signature verified</p>
        </div>
        <div ref={qrRef} className="shrink-0 rounded-2xl border border-[#2a1250]/10 p-2"><QRCodeSVG value={verifyUrl} size={96} level="M" /></div>
      </div>
      <dl className="mt-8 divide-y divide-[#2a1250]/[0.07]">
        {lines.map(([k, v]) => <div key={k} className="grid grid-cols-[150px_1fr] gap-3 py-2.5 text-sm"><dt className="text-[#2a1250]/55">{k}</dt><dd className="font-medium">{v}</dd></div>)}
      </dl>
      <Button tone="quiet" className="mt-8" onClick={pdf}><Download className="h-4 w-4" /> Download PDF</Button>
    </article>
  );
}
