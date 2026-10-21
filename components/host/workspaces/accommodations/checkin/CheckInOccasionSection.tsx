'use client';

import React from 'react';
import { ChevronDown, Gift, HeartHandshake } from 'lucide-react';
import { CheckInSection } from './CheckInSection';
import { CHEVRON, INPUT, LABEL, SELECT } from './field-styles';

interface Props {
  purposeOfVisit: string; setPurposeOfVisit: (val: string) => void;
  isCelebration: boolean; setIsCelebration: (val: boolean) => void;
  celebrationType: string; setCelebrationType: (val: string) => void;
  celebrationNote: string; setCelebrationNote: (val: string) => void;
}

const PURPOSES = [['Leisure & Tourism', 'Leisure'], ['Corporate / Business', 'Business'], ['Workation / Remote Work', 'Workation'], ['Wedding / Family Event', 'Wedding or family event'], ['Transit / Short Stay', 'Transit']];
const OCCASIONS = ['Birthday', 'Anniversary', 'Honeymoon', 'Milestone / Festival', 'Other Celebration'];

/** Why the guest is here, and whether there is something to celebrate: the room can be made ready for it. */
export function CheckInOccasionSection(p: Props) {
  return (
    <CheckInSection icon={HeartHandshake} title="Visit" hint="Optional. Helps the team look after the guest."
      aside={
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-neutral-800">
          <Gift className="h-4 w-4 text-amber-700" aria-hidden /> Celebrating
          <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${p.isCelebration ? 'bg-emerald-600' : 'bg-neutral-300'}`}>
            <input type="checkbox" className="peer sr-only" checked={p.isCelebration} onChange={(e) => p.setIsCelebration(e.target.checked)} />
            <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${p.isCelebration ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </span>
        </label>
      }>
      <div className="space-y-3">
        <div>
          <label htmlFor="purposeOfVisit" className={LABEL}>Purpose of visit</label>
          <div className="relative">
            <select id="purposeOfVisit" value={p.purposeOfVisit} onChange={(e) => p.setPurposeOfVisit(e.target.value)} className={SELECT}>
              {PURPOSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <ChevronDown className={CHEVRON} aria-hidden />
          </div>
        </div>
        {p.isCelebration && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 sm:grid-cols-2 animate-in fade-in duration-150">
            <div>
              <label htmlFor="celebrationType" className={LABEL}>Occasion</label>
              <div className="relative">
                <select id="celebrationType" value={p.celebrationType} onChange={(e) => p.setCelebrationType(e.target.value)} className={SELECT}>
                  {OCCASIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown className={CHEVRON} aria-hidden />
              </div>
            </div>
            <div>
              <label htmlFor="celebrationNote" className={LABEL}>For whom, and what to arrange</label>
              <input id="celebrationNote" type="text" placeholder="e.g. Priya's birthday · cake at 8 pm" value={p.celebrationNote} onChange={(e) => p.setCelebrationNote(e.target.value)} className={INPUT} />
            </div>
          </div>
        )}
      </div>
    </CheckInSection>
  );
}
