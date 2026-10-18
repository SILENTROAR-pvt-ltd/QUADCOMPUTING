'use client';

import React, { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';

interface Props {
  /** The area's name, or null for the tables that have none. */
  zone: string | null;
  count: number;
  /** Whether to print a heading at all: a venue with no areas keeps the plain grid. */
  showHeading: boolean;
  onRename: (from: string, to: string) => Promise<boolean>;
  children: React.ReactNode;
}

/** One area's heading (its name, how many tables, a rename) above its tables. */
export function TableZoneSection({ zone, count, showHeading, onRename, children }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(zone ?? '');

  const save = async () => { if (zone && (await onRename(zone, name))) setEditing(false); };

  return (
    <section aria-label={zone ?? 'Tables with no area'}>
      {showHeading && (
        <div className="mb-2 mt-1 flex items-center justify-between gap-2 border-b border-neutral-200 pb-1.5">
          {editing && zone ? (
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus aria-label={`Rename ${zone}`}
                onKeyDown={(e) => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') setEditing(false); }}
                className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-300" />
              <button type="button" onClick={save} aria-label="Save name" className="cursor-pointer rounded-lg p-1.5 text-neutral-700 hover:bg-neutral-100"><Check className="h-4 w-4" /></button>
              <button type="button" onClick={() => setEditing(false)} aria-label="Cancel" className="cursor-pointer rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <>
              <h4 className="min-w-0 truncate text-sm font-bold tracking-tight text-neutral-900">
                {zone ?? 'Other tables'} <span className="ml-1 text-[11px] font-medium text-neutral-400">{count} {count === 1 ? 'table' : 'tables'}</span>
              </h4>
              {zone && (
                <button type="button" onClick={() => { setName(zone); setEditing(true); }} aria-label={`Rename ${zone}`} title="Rename this area"
                  className="cursor-pointer rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"><Pencil className="h-3.5 w-3.5" /></button>
              )}
            </>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{children}</div>
    </section>
  );
}
