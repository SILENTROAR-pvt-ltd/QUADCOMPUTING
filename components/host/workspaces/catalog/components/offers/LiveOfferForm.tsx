'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { OfferCategorySelector } from './OfferCategorySelector';
import { OfferBadgeSelector } from './OfferBadgeSelector';
import { useCreateOfferForm } from '../../hooks/useCreateOfferForm';

interface LiveOfferFormProps {
  venueId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function LiveOfferForm({ venueId, onSuccess, onCancel }: LiveOfferFormProps) {
  const {
    title, setTitle,
    description, setDescription,
    category, setCategory,
    discountBadge, setDiscountBadge,
    customBadge, setCustomBadge,
    validDays, setValidDays,
    isSubmitting, error, handleSubmit,
  } = useCreateOfferForm({ venueId, onSuccess });

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-200/90 bg-neutral-50/50 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between border-b border-neutral-200/70 pb-3">
        <div className="flex items-center gap-2 text-neutral-900 font-serif text-base font-medium">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Create Live Special Offer</span>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Instantly Live</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <OfferCategorySelector category={category} onSelectCategory={setCategory} />
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Offer Title *</label>
          <input
            type="text"
            required
            placeholder="e.g. Sunset Happy Hour Cocktails, 20% Weekend Suite"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-9.5 px-3.5 rounded-xl border border-neutral-200/90 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 shadow-2xs"
          />
        </div>
      </div>

      <OfferBadgeSelector
        discountBadge={discountBadge}
        customBadge={customBadge}
        onSelectPreset={(p) => { setDiscountBadge(p); setCustomBadge(''); }}
        onChangeCustom={setCustomBadge}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Description</label>
          <input
            type="text"
            placeholder="e.g. Applicable on craft cocktails between 5 PM and 8 PM daily"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-9.5 px-3.5 rounded-xl border border-neutral-200/90 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 shadow-2xs"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Validity</label>
          <select
            value={validDays}
            onChange={(e) => setValidDays(e.target.value)}
            className="w-full h-9.5 px-3 rounded-xl border border-neutral-200/90 bg-white text-xs font-semibold text-neutral-700 focus:outline-none focus:border-neutral-900 shadow-2xs cursor-pointer"
          >
            <option value="1">Valid 24 Hours</option>
            <option value="3">Valid 3 Days</option>
            <option value="7">Valid 7 Days</option>
            <option value="30">Valid 30 Days</option>
            <option value="none">No Expiry</option>
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200/70">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-black text-xs font-semibold text-white shadow-xs disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isSubmitting ? 'Publishing...' : 'Publish Live'}</span>
        </button>
      </div>
    </form>
  );
}
