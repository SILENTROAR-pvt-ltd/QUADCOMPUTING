'use client';

import React, { useState } from 'react';

interface StaffEditPanelProps {
  name: string;
  hasPin: boolean;
  onSave: (patch: { name?: string; pin?: string }) => Promise<void>;
  onCancel: () => void;
}

/** Edits one staff member's name and, optionally, gives them a new 4-digit PIN. */
export function StaffEditPanel({ name, hasPin, onSave, onCancel }: StaffEditPanelProps) {
  const [draft, setDraft] = useState(name);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  const trimmed = draft.replace(/\s+/g, ' ').trim();
  const nameChanged = trimmed !== name;
  const pinReady = pin.length === 4;
  const valid = trimmed.length >= 2 && (pin.length === 0 || pinReady) && (nameChanged || pinReady);

  const save = async () => {
    setBusy(true);
    await onSave({ ...(nameChanged ? { name: trimmed } : {}), ...(pinReady ? { pin } : {}) });
    setBusy(false);
  };

  const field = 'h-10 rounded-lg border border-neutral-200 bg-white px-3 text-[16px] focus:border-neutral-900 focus:outline-none';
  return (
    <div className="space-y-2 rounded-xl bg-neutral-50 p-3">
      <label className="block text-[11px] font-semibold text-neutral-500">Name
        <input value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 60))} autoComplete="off" className={`${field} mt-1 w-full`} />
      </label>
      <label className="block text-[11px] font-semibold text-neutral-500">{hasPin ? 'New PIN (leave empty to keep the current one)' : 'PIN (4 digits)'}
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" autoComplete="off"
          placeholder="4 digits" className={`${field} mt-1 w-32`} />
      </label>
      <div className="flex gap-2">
        <button type="button" disabled={!valid || busy} onClick={() => void save()}
          className="h-10 cursor-pointer rounded-lg bg-neutral-950 px-4 text-xs font-semibold text-white disabled:opacity-40">{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" onClick={onCancel} className="h-10 cursor-pointer rounded-lg px-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-100">Cancel</button>
      </div>
    </div>
  );
}
