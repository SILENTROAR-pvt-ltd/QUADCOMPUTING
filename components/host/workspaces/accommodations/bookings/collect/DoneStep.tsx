'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Copy, MessageCircle, Printer } from 'lucide-react';
import type { Receipt } from './useCollect';
import { StayReceipt } from './StayReceipt';

interface Props { receipt: Receipt | null; businessName: string; upiId: string | null; onCopy: (msg: string) => void; onClose: () => void }

/** Payment recorded: first the guest's check-in link (the next thing to do), then the bill itself as the platform's tax invoice. */
export function DoneStep({ receipt, businessName, upiId, onCopy, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  if (!receipt) return <div className="h-56 animate-pulse rounded-2xl border border-neutral-200 bg-white" aria-busy="true" />;
  const { quote, link } = receipt;
  const phone = quote.guestPhone ? `91${quote.guestPhone}` : '';
  const text = `Hello ${quote.guestName.split(' ')[0]}, your room at ${businessName} is paid. Complete your check-in here: ${link}`;
  const copy = async () => { try { await navigator.clipboard.writeText(link || ''); setCopied(true); onCopy('Check-in link copied.'); setTimeout(() => setCopied(false), 2000); } catch { onCopy('Could not copy. Select the link and copy it.'); } };

  return (
    <div className="space-y-4">
      <p role="status" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Payment recorded{receipt.billId ? ` · invoice ${receipt.billId.split('-')[0].toUpperCase()}` : ''}</p>

      {link && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Guest check-in link</p>
          <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row">
            <div className="rounded-xl border-2 border-neutral-950 bg-white p-2"><QRCodeSVG value={link} size={132} level="M" /></div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs text-neutral-600">The guest scans this QR from your screen, or you send the link. It opens their check-in: ID photo, then the room.</p>
              <p className="break-all rounded-lg bg-neutral-50 px-2.5 py-2 font-mono text-[11px] text-neutral-700">{link}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void copy()} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"><Copy className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy link'}</button>
                {phone && <a href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>}
              </div>
            </div>
          </div>
        </div>
      )}

      <StayReceipt receipt={receipt} businessName={businessName} upiId={upiId} />

      <div className="flex gap-3">
        <button type="button" onClick={() => window.print()} className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-800 hover:bg-neutral-50"><Printer className="h-4 w-4" /> Print bill</button>
        <button type="button" onClick={onClose} className="h-12 flex-1 cursor-pointer rounded-xl bg-neutral-950 text-sm font-semibold text-white hover:bg-neutral-800">Done</button>
      </div>
    </div>
  );
}
