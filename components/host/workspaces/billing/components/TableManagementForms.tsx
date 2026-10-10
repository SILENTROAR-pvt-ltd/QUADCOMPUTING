'use client';

import React, { useState } from 'react';

interface TableManagementFormsProps {
  isSaving: boolean;
  onAddSingle: (num: string, cap: string) => Promise<boolean>;
  onBulkGenerate: (count: string, prefix: string, cap: string) => Promise<boolean>;
}

export function TableManagementForms({ isSaving, onAddSingle, onBulkGenerate }: TableManagementFormsProps) {
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkCount, setBulkCount] = useState('10');
  const [bulkPrefix, setBulkPrefix] = useState('T');
  const [bulkCapacity, setBulkCapacity] = useState('4');

  const handleSingleSubmit = async () => {
    const ok = await onAddSingle(newTableNumber, newCapacity);
    if (ok) { setNewTableNumber(''); setNewCapacity('4'); }
  };

  const handleBulkSubmit = async () => {
    const ok = await onBulkGenerate(bulkCount, bulkPrefix, bulkCapacity);
    if (ok) setShowBulkForm(false);
  };

  const inputClass = 'w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm transition-all focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 placeholder:text-neutral-400';

  return (
    <div className="space-y-4">
      {/* Add Single Table */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-neutral-500">Add Table</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <input value={newTableNumber} onChange={(e) => setNewTableNumber(e.target.value)} placeholder="e.g. T-05, VIP-1" className={inputClass} />
          </div>
          <div className="w-24">
            <input type="number" min="1" max="20" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} placeholder="Seats" className={`${inputClass} text-center`} />
          </div>
          <button type="button" onClick={handleSingleSubmit} disabled={isSaving || !newTableNumber.trim()} className="rounded-xl bg-neutral-900 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:bg-neutral-800 disabled:opacity-50 cursor-pointer">
            Add
          </button>
        </div>
      </div>

      {/* Bulk Generator */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Quick Setup</h3>
          <button type="button" onClick={() => setShowBulkForm(!showBulkForm)} className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 hover:underline cursor-pointer">
            {showBulkForm ? 'Cancel' : 'Bulk Generate'}
          </button>
        </div>

        {showBulkForm && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Prefix</label>
                <input value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value)} placeholder="T" className={`${inputClass} text-center`} />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Count</label>
                <input type="number" min="1" max="50" value={bulkCount} onChange={(e) => setBulkCount(e.target.value)} className={`${inputClass} text-center`} />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-neutral-400">Seats Each</label>
                <input type="number" min="1" max="20" value={bulkCapacity} onChange={(e) => setBulkCapacity(e.target.value)} className={`${inputClass} text-center`} />
              </div>
            </div>
            <p className="text-[10px] text-neutral-400">
              Will create: {bulkPrefix.trim().toUpperCase() || 'T'}-01 through {bulkPrefix.trim().toUpperCase() || 'T'}-
              {String(parseInt(bulkCount) || 0).padStart(2, '0')} with {bulkCapacity || '4'} seats each.
            </p>
            <button type="button" onClick={handleBulkSubmit} disabled={isSaving} className="w-full rounded-xl bg-neutral-900 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
              {isSaving && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {isSaving ? 'Generating...' : `Generate ${bulkCount || 0} Tables`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
