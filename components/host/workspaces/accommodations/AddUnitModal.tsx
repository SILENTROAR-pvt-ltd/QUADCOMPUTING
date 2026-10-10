'use client';

import React, { useState } from 'react';
import type { RoomCategory } from '@/types';
import { X, Bed, Plus } from 'lucide-react';

interface Props {
  categories: RoomCategory[];
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
}

const inputClass = "w-full bg-neutral-50/80 border border-neutral-200 focus:border-neutral-900 text-neutral-900 rounded-xl px-4 py-3 text-sm outline-none transition-all focus:bg-white";
const labelClass = "mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-500";

export function AddUnitModal({ categories, isOpen, onClose, onAdded }: Props) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [roomNumber, setRoomNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !roomNumber.trim()) {
      alert('Please select a category and specify a room number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/host/accommodations/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: categoryId,
          room_number: roomNumber.trim()
        })
      });

      if (res.ok) {
        setRoomNumber('');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wallet:refresh'));
        }
        onAdded();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create room unit');
      }
    } catch {
      alert('Network error adding room unit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200/90 space-y-5 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-medium text-neutral-900 tracking-tight">
              Add Room Unit
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Ingest a new physical unit to your front desk grid.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Select Room Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className={inputClass}
            >
              <option value="" disabled>Choose Category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (₹{Number(c.price).toLocaleString()}/night)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Manual Room / Unit Number *</label>
            <input
              type="text"
              required
              placeholder="e.g. 105, Villa-B, Suite 4"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className={`${inputClass} font-mono font-bold`}
              autoFocus
            />
            <p className="mt-1 text-[11px] text-neutral-400">
              This unit will be immediately active on the Live Front Desk grid.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200/90 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 shadow-2xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-neutral-900 hover:bg-black px-5 py-2.5 text-xs font-semibold text-white shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Create Unit
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
