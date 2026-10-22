'use client';

import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { OfferCategorySelector } from './OfferCategorySelector';
import { OfferBadgeSelector } from './OfferBadgeSelector';
import { OfferPhotoPicker } from './OfferPhotoPicker';
import { OFFER_TEMPLATES } from './offer-templates';
import { useCreateOfferForm } from '../../hooks/useCreateOfferForm';

interface LiveOfferFormProps {
  venueId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const LABEL = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-neutral-500';
// 16 px text on a phone (iPhones zoom into smaller fields), 44 px tall, so every field is easy to tap.
const FIELD = 'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none sm:text-sm';

/** A new live offer: a ready start (buffet, happy hour...) or your own, a photo, the tag, and how long it runs. */
export function LiveOfferForm({ venueId, onSuccess, onCancel }: LiveOfferFormProps) {
  const f = useCreateOfferForm({ venueId, onSuccess });

  return (
    <form onSubmit={f.handleSubmit} className="space-y-5 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200/70 pb-3">
        <p className="flex items-center gap-2 font-serif text-base font-medium text-neutral-900">
          <Sparkles className="h-4 w-4 text-amber-500" /> New live offer
        </p>
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Live the moment you publish</span>
      </div>

      <div>
        <p className={LABEL}>Start from</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-6 sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {OFFER_TEMPLATES.map((t) => (
            <button key={t.id} type="button" onClick={() => f.applyTemplate(t)} aria-pressed={f.templateId === t.id}
              className={`flex h-16 min-w-[84px] shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border text-[12px] font-semibold transition-colors ${
                f.templateId === t.id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
              }`}>
              <span aria-hidden className="text-lg leading-none">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <OfferCategorySelector category={f.category} onSelectCategory={f.setCategory} />

      <div>
        <label htmlFor="offer-title" className={LABEL}>Offer title *</label>
        <input id="offer-title" type="text" required maxLength={120} placeholder="e.g. Sunday Brunch Buffet, Weekend Suite 20% Off"
          value={f.title} onChange={(e) => f.setTitle(e.target.value)} className={FIELD} />
      </div>

      <OfferPhotoPicker photo={f.photo} />

      <OfferBadgeSelector
        discountBadge={f.discountBadge}
        customBadge={f.customBadge}
        onSelectPreset={(p) => { f.setDiscountBadge(p); f.setCustomBadge(''); }}
        onChangeCustom={f.setCustomBadge}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="offer-description" className={LABEL}>Details</label>
          <textarea id="offer-description" rows={2} maxLength={400} placeholder="e.g. Unlimited starters, mains and desserts · 12 to 3 PM"
            value={f.description} onChange={(e) => f.setDescription(e.target.value)}
            className={`${FIELD} h-auto min-h-[44px] resize-y py-2.5 leading-snug`} />
        </div>
        <div>
          <label htmlFor="offer-validity" className={LABEL}>Runs for</label>
          <select id="offer-validity" value={f.validDays} onChange={(e) => f.setValidDays(e.target.value)} className={`${FIELD} cursor-pointer font-semibold`}>
            <option value="1">24 hours</option>
            <option value="3">3 days</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="none">Until I pause it</option>
          </select>
        </div>
      </div>

      {f.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-medium text-red-700">{f.error}</p>}

      <div className="flex flex-col-reverse gap-2 border-t border-neutral-200/70 pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="h-11 cursor-pointer rounded-xl px-4 text-[13px] font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
          Cancel
        </button>
        <button type="submit" disabled={f.isSubmitting || f.photo.busy}
          className="inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-5 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-50">
          {f.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {f.isSubmitting ? 'Publishing…' : 'Publish live'}
        </button>
      </div>
    </form>
  );
}
