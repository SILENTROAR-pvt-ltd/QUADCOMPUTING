'use client';

import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button, Notice, field } from './ui';
import { clubFetch } from './api';

type Target = 'user' | 'message' | 'story' | 'event' | 'property';

/** The Red Flag button: a short reason, sent to the staff queue. */
export function ReportButton({ type, id, label = 'Report', compact }: { type: Target; id: string; label?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    const res = await clubFetch('/reports', { body: { target_type: type, target_id: id, reason } });
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: 'Thanks. Our team will look at it.' } : { ok: false, text: res.error });
    if (res.ok) setTimeout(() => { setOpen(false); setMsg(null); setReason(''); }, 1500);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={compact ? label : undefined}
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-[#2a1250]/50 hover:bg-rose-50 hover:text-rose-700">
        <Flag aria-hidden="true" className="h-3.5 w-3.5" />{!compact && label}
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Report" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold">What is wrong?</p>
            <p className="mt-1 text-xs text-[#2a1250]/55">Reports are private. The person is not told who reported them.</p>
            <textarea className={`${field} mt-3 min-h-24`} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Harassment, spam, fake profile, unsafe plan…" />
            <div className="mt-3">{msg && <Notice tone={msg.ok ? 'good' : 'bad'}>{msg.text}</Notice>}</div>
            <div className="mt-3 flex justify-end gap-2">
              <Button tone="quiet" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button tone="danger" type="button" busy={busy} disabled={reason.trim().length < 3} onClick={send}>Send report</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
