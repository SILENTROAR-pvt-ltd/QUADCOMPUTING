'use client';

import React, { useRef } from 'react';
import { BadgeCheck, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../ui';
import { rupees } from '../api';
import { CLUB_DISPLAY } from '../fonts';
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
    <article className="relative mx-auto max-w-2xl overflow-hidden rounded-[28px] border border-[#14261b]/10 bg-[#fbfaf6] p-6 sm:p-10">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-[#c8da4a]" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#3c6b2b]">Vibers Club</p>
          <h1 className={`${CLUB_DISPLAY} mt-2 text-4xl font-semibold leading-tight sm:text-5xl`}>No Objection <em className="font-medium text-[#3c6b2b]">Certificate</em></h1>
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#3c6b2b]"><BadgeCheck className="h-4 w-4" /> Signature verified</p>
        </div>
        <div ref={qrRef} className="shrink-0 rounded-2xl bg-white p-2"><QRCodeSVG value={verifyUrl} size={96} level="M" /></div>
      </div>
      <dl className="mt-8 divide-y divide-[#14261b]/[0.07]">
        {lines.map(([k, v]) => <div key={k} className="grid grid-cols-[140px_1fr] gap-3 py-2.5 text-sm sm:grid-cols-[170px_1fr]"><dt className="text-[#14261b]/65">{k}</dt><dd className="font-medium">{v}</dd></div>)}
      </dl>
      <Button tone="quiet" className="mt-8" onClick={pdf}><Download className="h-4 w-4" /> Download PDF</Button>
    </article>
  );
}
