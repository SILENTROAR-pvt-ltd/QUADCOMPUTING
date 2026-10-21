'use client';

import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { inr, istDateTime } from '@/components/stay/stay-format';
import type { RoomState } from './useRoomStay';

interface Props { late: NonNullable<RoomState['late_checkout']>; onRequest: (optionId: string) => Promise<string> }

/**
 * Late check-out: the owner's options priced for this room, the desk's answer to a request, and one tap to ask. The fee
 * is paid at the desk. Offered only while no other guest is due in a room of this type after the check-out; otherwise
 * the guest is told to ask the desk, which may still find a way.
 */
export function LateCheckout({ late, onRequest }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  if (late.options.length === 0) return null;

  const ask = async (id: string) => { setBusy(id); setNote(await onRequest(id)); setBusy(null); };
  const pending = late.request?.status === 'pending';

  return (
    <section id="late-checkout" className="scroll-mt-28 rounded-[1.5rem] border border-neutral-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"><Clock className="h-5 w-5" /></span>
        <div>
          <h3 className="text-lg font-medium text-neutral-950" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Stay a little longer</h3>
          <p className="text-xs text-neutral-500">{late.current ? `You check out by ${istDateTime(late.current)}.` : 'Ask to extend your check-out.'} The desk confirms and takes the fee at the desk (UPI, cash or card).</p>
        </div>
      </div>

      {pending && <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">Requested: {late.request?.label} ({inr(late.request?.fee || 0)}). Waiting for the desk.</p>}
      {late.request?.status === 'declined' && <p role="status" className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-700">The desk could not extend this time. You may ask for another option, or speak to them.</p>}

      {late.available ? (
        <div className="mt-4 space-y-2">
          {late.options.map((o) => (
            <button key={o.id} type="button" disabled={pending || busy !== null} onClick={() => void ask(o.id)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition hover:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-50">
              <span className="text-sm font-medium text-neutral-900">{o.label}</span>
              <span className="font-mono text-sm text-neutral-700">{o.fee > 0 ? inr(o.fee) : 'Free'}</span>
            </button>
          ))}
        </div>
      ) : (
        <p role="status" className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-700">Another guest is expected in this room type after your check-out, so the time cannot be extended here. The desk may still be able to help.</p>
      )}
      {note && <p role="status" className="mt-3 text-xs text-neutral-600">{note}</p>}
    </section>
  );
}
