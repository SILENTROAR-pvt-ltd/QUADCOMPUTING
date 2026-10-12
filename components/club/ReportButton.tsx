'use client';

import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button, FOCUS, Notice, field } from './ui';
import { Sheet } from './ui-extra';
import { clubFetch } from './api';

export type ReportTarget = 'user' | 'message' | 'story' | 'event' | 'property' | 'post' | 'comment' | 'meetup';

/** The Red Flag form: a short reason, sent to the staff queue. */
export function ReportSheet({ type, id, open, onClose }: { type: ReportTarget; id: string; open: boolean; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const close = () => { setMsg(null); onClose(); };

  const send = async () => {
    setBusy(true);
    const res = await clubFetch('/reports', { body: { target_type: type, target_id: id, reason } });
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: 'Thanks. Our team will look at it.' } : { ok: false, text: res.error });
    if (res.ok) setTimeout(() => { setReason(''); close(); }, 1500);
  };

  return (
    <Sheet open={open} onClose={close} title="What is wrong?">
      <p className="text-xs text-[#14261b]/65">Reports are private. The person is not told who reported them.</p>
      <textarea data-autofocus className={`${field} mt-3 min-h-24`} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Harassment, spam, fake profile, unsafe plan…" />
      <div className="mt-3">{msg && <Notice tone={msg.ok ? 'good' : 'bad'}>{msg.text}</Notice>}</div>
      <div className="mt-3 flex justify-end gap-2">
        <Button tone="quiet" type="button" onClick={close}>Cancel</Button>
        <Button tone="danger" type="button" busy={busy} disabled={reason.trim().length < 3} onClick={send}>Send report</Button>
      </div>
    </Sheet>
  );
}

/** The Red Flag button. */
export function ReportButton({ type, id, label = 'Report', compact }: { type: ReportTarget; id: string; label?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={compact ? label : undefined} title={label}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-[#14261b]/60 hover:bg-red-50 hover:text-red-700 ${FOCUS}`}>
        <Flag aria-hidden="true" className="h-3.5 w-3.5" />{!compact && label}
      </button>
      <ReportSheet type={type} id={id} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
