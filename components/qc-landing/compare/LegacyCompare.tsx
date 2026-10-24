'use client';

import React, { useState } from 'react';
import { Check, Minus } from 'lucide-react';
import { Reveal } from '@/components/vibers/Reveal';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { CONTAINER, H2, KICKER_LIGHT, LEAD_LIGHT, SECTION, TURN_LIGHT } from '../qc-brand';
import { LEGACY_ROWS } from './legacy-rows';
import s from '@/components/vibers/luxe.module.css';

const FIRST = 6;

/**
 * Quad Computing with Vibers Connect beside a typical legacy POS, topic by topic. Ours on the left in ivory, the common
 * legacy pattern on the right, receding. The first six show; the rest open on request so the point lands before the list.
 */
export function LegacyCompare() {
  const [all, setAll] = useState(false);
  const rows = all ? LEGACY_ROWS : LEGACY_ROWS.slice(0, FIRST);

  return (
    <section id="compare" aria-labelledby="compare-title" className={`${SECTION} ${s.grain} overflow-hidden bg-[#0c0f0d] text-[#f6f3ec]`}>
      <div className={CONTAINER}>
        <div className="max-w-3xl">
          <Reveal><p className={KICKER_LIGHT}>Compare</p></Reveal>
          <Reveal index={1}><h2 id="compare-title" className={`${DISPLAY} ${H2}`}>A till was never enough. <em className={TURN_LIGHT}>This is the whole house.</em></h2></Reveal>
          <Reveal index={2}><p className={`${LEAD_LIGHT} mt-6`}>How Quad Computing with Vibers Connect differs from a typical counter-billing POS. Setups vary from vendor to vendor; the pattern rarely does.</p></Reveal>
        </div>

        <Reveal index={1}>
          <div className="mt-12 overflow-hidden rounded-[24px] border border-white/10">
            <div className="hidden grid-cols-[13rem_1fr_1fr] border-b border-white/10 bg-white/[0.03] text-[11px] font-semibold uppercase tracking-[0.2em] md:grid">
              <span className="px-6 py-4 text-[#f6f3ec]/45">Topic</span>
              <span className="border-l border-white/10 bg-[#d9c193]/10 px-6 py-4 text-[#d9c193]">Quad Computing + Vibers Connect</span>
              <span className="border-l border-white/10 px-6 py-4 text-[#f6f3ec]/45">Typical legacy POS</span>
            </div>
            <ul>
              {rows.map((r, i) => (
                <li key={r.topic} className={`grid border-b border-white/[0.07] last:border-0 md:grid-cols-[13rem_1fr_1fr] ${i >= FIRST ? s.rowIn : ''}`}>
                  <p className="flex items-center gap-3 px-6 pb-2 pt-5 text-[14px] font-semibold md:py-5">
                    <r.icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#d9c193]" /> {r.topic}
                  </p>
                  <p className="flex items-start gap-3 bg-[#d9c193]/[0.06] px-6 py-3 text-[14px] leading-relaxed text-[#f6f3ec] md:border-l md:border-white/10 md:py-5">
                    <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#d9c193]" />
                    <span><span className="sr-only">Quad Computing: </span>{r.ours}</span>
                  </p>
                  <p className="flex items-start gap-3 px-6 pb-5 pt-3 text-[14px] leading-relaxed text-[#f6f3ec]/45 md:border-l md:border-white/10 md:py-5">
                    <Minus aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#f6f3ec]/30" />
                    <span><span className="sr-only">Typical legacy POS: </span>{r.theirs}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-2xl text-[11.5px] leading-relaxed text-[#f6f3ec]/40">
            “Typical legacy POS” describes common counter-billing setups in Indian restaurants, not any one product; features and
            prices vary by vendor. Quad Computing features as of October 2026.
          </p>
          {LEGACY_ROWS.length > FIRST && (
            <button type="button" aria-expanded={all} onClick={() => setAll((a) => !a)}
              className="h-10 shrink-0 rounded-full border border-[#f6f3ec]/25 px-5 text-[12.5px] font-semibold text-[#f6f3ec] transition-colors hover:border-[#f6f3ec]">
              {all ? 'Show fewer' : `Show all ${LEGACY_ROWS.length} topics`}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
