'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Notice, field } from '../ui';
import { clubFetch } from '../api';

/** Loads an admin list and offers a reload. */
export function useAdminList<T = any>(path: string, key: string) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    const r = await clubFetch(path);
    if (r.ok) { setRows(r.data[key]); setError(''); } else setError(r.error);
  }, [path, key]);
  useEffect(() => { setRows(null); void reload(); }, [reload]);
  return { rows, error, reload };
}

/** Runs a staff decision (POST) and reports the result inline. */
export function useDecision(path: string, onDone: () => void) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const decide = async (id: string, body: Record<string, unknown>, confirm?: string) => {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(id);
    setError('');
    const r = await clubFetch(path, { body });
    setBusy('');
    if (!r.ok) return setError(r.error);
    onDone();
  };
  return { busy, error, decide };
}

/** Approve / reject with a required reason for rejection. */
export function DecisionRow({ id, busy, onApprove, onReject, approveLabel = 'Approve', rejectLabel = 'Reject' }:
  { id: string; busy: string; onApprove: () => void; onReject: (note: string) => void; approveLabel?: string; rejectLabel?: string }) {
  const [note, setNote] = useState('');
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button tone="ink" busy={busy === id} onClick={onApprove}>{approveLabel}</Button>
      <input aria-label="Reason" className={`${field} w-auto min-w-48 flex-1 py-2`} placeholder="Reason (needed to reject)" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button tone="danger" disabled={note.trim().length < 3} onClick={() => onReject(note)}>{rejectLabel}</Button>
    </div>
  );
}

export function StatusTabs({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1">
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${value === o ? 'bg-[#7c3aed] text-white' : 'bg-white text-[#2a1250]/65'}`}>{o.replace('_', ' ')}</button>
      ))}
    </div>
  );
}

export function ListState({ rows, error, empty }: { rows: unknown[] | null; error: string; empty: string }) {
  if (error) return <Notice>{error}</Notice>;
  if (rows && rows.length === 0) return <p className="rounded-2xl border border-dashed border-[#2a1250]/15 p-6 text-center text-sm text-[#2a1250]/55">{empty}</p>;
  return null;
}
