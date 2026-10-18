'use client';

import React, { useState } from 'react';
import { FORM_INPUT, ZoneField } from './ZoneField';
import { TableBulkForm } from './TableBulkForm';

interface TableManagementFormsProps {
  isSaving: boolean;
  /** The areas the venue already has. */
  zones: string[];
  existingNumbers: string[];
  onAddSingle: (num: string, cap: string, zone: string) => Promise<boolean>;
  onBulkGenerate: (count: string, cap: string, zone: string) => Promise<boolean>;
}

export function TableManagementForms({ isSaving, zones, existingNumbers, onAddSingle, onBulkGenerate }: TableManagementFormsProps) {
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [newZone, setNewZone] = useState('');

  const handleSingleSubmit = async () => {
    const ok = await onAddSingle(newTableNumber, newCapacity, newZone);
    // The area stays, so the next table of the same floor is one more tap.
    if (ok) { setNewTableNumber(''); setNewCapacity('4'); }
  };

  return (
    <div className="space-y-4">
      {/* Add Single Table */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-neutral-500">Add Table</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <input value={newTableNumber} onChange={(e) => setNewTableNumber(e.target.value)} placeholder="e.g. T-05" className={FORM_INPUT} />
          </div>
          <div className="w-24">
            <input type="number" min="1" max="20" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} placeholder="Seats" className={`${FORM_INPUT} text-center`} />
          </div>
          <button type="button" onClick={handleSingleSubmit} disabled={isSaving || !newTableNumber.trim()} className="rounded-xl bg-neutral-900 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:bg-neutral-800 disabled:opacity-50 cursor-pointer">
            Add
          </button>
        </div>
        <div className="mt-4"><ZoneField value={newZone} onChange={setNewZone} zones={zones} /></div>
      </div>

      <TableBulkForm isSaving={isSaving} zones={zones} existingNumbers={existingNumbers} onGenerate={onBulkGenerate} />
    </div>
  );
}
