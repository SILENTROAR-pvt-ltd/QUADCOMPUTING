'use client';

import React from 'react';
import { HeartHandshake, Gift } from 'lucide-react';

interface Props {
  purposeOfVisit: string;
  setPurposeOfVisit: (val: string) => void;
  isCelebration: boolean;
  setIsCelebration: (val: boolean) => void;
  celebrationType: string;
  setCelebrationType: (val: string) => void;
  celebrationNote: string;
  setCelebrationNote: (val: string) => void;
}

const inputClass = "w-full bg-neutral-50/80 border border-neutral-200 focus:border-neutral-900 text-neutral-900 rounded-xl px-4 py-3 text-xs sm:text-sm outline-none transition-all focus:bg-white";
const labelClass = "mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-500";

export function CheckInOccasionSection({
  purposeOfVisit,
  setPurposeOfVisit,
  isCelebration,
  setIsCelebration,
  celebrationType,
  setCelebrationType,
  celebrationNote,
  setCelebrationNote
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 shadow-xs">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
        <HeartHandshake className="h-4 w-4 text-zinc-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
          03. Purpose & Special Occasion Intelligence
        </h3>
      </div>

      <div>
        <label htmlFor="purposeOfVisit" className={labelClass}>
          Primary Purpose of Visit
        </label>
        <select
          id="purposeOfVisit"
          value={purposeOfVisit}
          onChange={(e) => setPurposeOfVisit(e.target.value)}
          className={`${inputClass} cursor-pointer`}
        >
          <option value="Leisure & Tourism">Leisure & Tourism</option>
          <option value="Corporate / Business">Corporate / Business Travel</option>
          <option value="Workation / Remote Work">Workation / Remote Work</option>
          <option value="Wedding / Family Event">Wedding / Family Gathering</option>
          <option value="Transit / Short Stay">Transit / Short Layover</option>
        </select>
      </div>

      {/* Celebration Toggle */}
      <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-neutral-700" />
            <div>
              <p className="text-xs font-bold text-zinc-900">Guest Celebrating Special Occasion?</p>
              <p className="text-[11px] text-zinc-500">Enable to personalize room experience and amenities</p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-zinc-200/80 p-1">
            <button
              type="button"
              onClick={() => setIsCelebration(false)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !isCelebration ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setIsCelebration(true)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isCelebration ? 'bg-neutral-100 text-neutral-900 shadow-xs border border-neutral-200' : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              Yes 🎉
            </button>
          </div>
        </div>

        {/* Celebration Details (Rendered if Yes) */}
        {isCelebration && (
          <div className="pt-3 border-t border-zinc-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div>
              <label htmlFor="celebrationType" className={labelClass}>
                Celebration Type
              </label>
              <select
                id="celebrationType"
                value={celebrationType}
                onChange={(e) => setCelebrationType(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-950 cursor-pointer"
              >
                <option value="Birthday">Birthday 🎂</option>
                <option value="Anniversary">Anniversary 💍</option>
                <option value="Honeymoon">Honeymoon 🥂</option>
                <option value="Milestone / Festival">Milestone / Festival ✨</option>
                <option value="Other Celebration">Other Celebration 🎈</option>
              </select>
            </div>

            <div>
              <label htmlFor="celebrationNote" className={labelClass}>
                Honoree Name & Surprise Note
              </label>
              <input
                id="celebrationNote"
                type="text"
                placeholder="e.g. Surprise chocolate cake, flower bouquet"
                value={celebrationNote}
                onChange={(e) => setCelebrationNote(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-950"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
