'use client';

import React, { useState } from 'react';
import { nextTableNames } from '@/lib/services/table/table-zones';
import { FORM_INPUT, ZoneField } from './ZoneField';

interface Props {
  isSaving: boolean;
  zones: string[];
  /** Every table name the venue already has, so the new ones carry on after them. */
  existingNumbers: string[];
  onGenerate: (count: string, cap: string, zone: string) => Promise<boolean>;
}

/** Quick setup: a run of tables under one area, numbered on from the last one (T-07, T-08 ...). */
export function TableBulkForm({ isSaving, zones, existingNumbers, onGenerate }: Props) {
  const [open, setOpen] = useState(false);
  const [zone, setZone] = useState('');
  const [count, setCount] = useState('10');
  const [capacity, setCapacity] = useState('4');

  const names = nextTableNames(existingNumbers, Math.min(Math.max(parseInt(count) || 0, 0), 50));
  const submit = async () => { if (await onGenerate(count, capacity, zone)) { setOpen(false); setZone(''); } };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Quick Setup</h3>
        <button type="button" onClick={() => setOpen(!open)} className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 hover:underline cursor-pointer">
          {open ? 'Cancel' : 'Bulk Generate'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <ZoneField value={zone} onChange={setZone} zones={zones} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">How many</label>
              <input type="number" min="1" max="50" value={count} onChange={(e) => setCount(e.target.value)} className={`${FORM_INPUT} text-center`} />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Seats each</label>
              <input type="number" min="1" max="20" value={capacity} onChange={(e) => setCapacity(e.target.value)} className={`${FORM_INPUT} text-center`} />
            </div>
          </div>
          <p className="text-[10px] text-neutral-400">
            {names.length > 0
              ? `Will create ${names[0]}${names.length > 1 ? ` through ${names[names.length - 1]}` : ''}${zone.trim() ? ` in ${zone.trim()}` : ''}, ${capacity || 4} seats each.`
              : 'Enter how many tables to create.'}
          </p>
          <button type="button" onClick={submit} disabled={isSaving || names.length === 0} className="w-full rounded-xl bg-neutral-900 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
            {isSaving && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {isSaving ? 'Generating...' : `Generate ${names.length} Tables`}
          </button>
        </div>
      )}
    </div>
  );
}
