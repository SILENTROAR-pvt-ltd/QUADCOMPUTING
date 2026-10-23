'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SPENDS, STEP_MS, TRAITS, USE, back, balanceAt, rupees, useCountTo } from './cashback-story';
import { DISPLAY } from './vibers-fonts';
import s from './luxe.module.css';

/**
 * The 7% explained by watching it happen: expenses land in a live ledger one by one, 7% of each drops into the Viber
 * wallet and the balance counts up, then part of it pays for a coffee. It loops while on screen. Without JavaScript or
 * with reduced motion the finished story stands still.
 */
export function CashbackFlow() {
  const root = useRef<HTMLDivElement>(null);
  const balance = useRef<HTMLSpanElement>(null);
  const begun = useRef(false);
  const [phase, setPhase] = useState(4);
  const [round, setRound] = useState(0);
  const [banked, setBanked] = useState(balanceAt(4));
  const [live, setLive] = useState(false);
  useCountTo(balance, banked);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!live) return;
    if (!begun.current) { begun.current = true; setRound(1); setPhase(0); return; }
    const t = setTimeout(() => {
      if (phase >= 4) { setRound((r) => r + 1); setPhase(0); } else setPhase(phase + 1);
    }, phase === 0 ? 700 : phase >= 4 ? STEP_MS * 1.8 : STEP_MS);
    return () => clearTimeout(t);
  }, [live, phase]);

  // The wallet moves a beat after the row lands, once the gold dot has carried the 7% down to it.
  useEffect(() => { const t = setTimeout(() => setBanked(balanceAt(phase)), phase === 0 ? 0 : 1100); return () => clearTimeout(t); }, [phase]);

  const rows = SPENDS.slice(0, Math.min(phase, 3));
  const last = rows[rows.length - 1];
  const caption = phase === 0 ? 'Every expense at a Vibers Connect point earns 7%.'
    : phase >= 4 ? `${rupees(USE.amount)} spent on coffee, ${rupees(balanceAt(4))} still yours.` : `+${rupees(back(last.amount))} back from ${last.tag.toLowerCase()}.`;

  return (
    <div ref={root} className="mt-9">
      <div className="rounded-[18px] bg-[#fbf9f4] p-5 shadow-[0_24px_50px_-34px_rgba(16,35,26,0.45)] ring-1 ring-[#10231a]/[0.06] sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#10231a]/50">Your stay, as it happens</p>
          <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a6d3f]">
            <span aria-hidden="true" className={`${s.pulse} h-1.5 w-1.5 rounded-full bg-[#b08d57]`} /> Live
          </span>
        </div>
        <ul className="mt-4 min-h-[232px] space-y-2.5">
          {phase === 0 && <li className="grid h-[200px] place-items-center text-[13px] italic text-[#10231a]/40">Every expense lands here.</li>}
          {rows.map((x) => (
            <li key={`${round}-${x.tag}`} className={`${s.rowIn} grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-[#10231a]/[0.05]`}>
              <span className="min-w-0">
                <span className="block text-[9.5px] font-semibold uppercase tracking-[0.22em] text-[#8a6d3f]">{x.tag}</span>
                <span className={`${DISPLAY} block truncate text-[1.1rem] leading-tight`}>{x.what}</span>
              </span>
              <span className="text-right tabular-nums">
                <span className="block text-[13.5px] font-semibold">{rupees(x.amount)}</span>
                <span className={`${s.chipIn} block text-[11.5px] font-semibold text-[#8a6d3f]`}>+{rupees(back(x.amount))}</span>
              </span>
            </li>
          ))}
          {phase >= 4 && (
            <li key={`${round}-use`} className={`${s.rowIn} grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-[#0f2a1e]/[0.04] px-4 py-3 ring-1 ring-[#0f2a1e]/15`}>
              <span className="min-w-0">
                <span className="block text-[9.5px] font-semibold uppercase tracking-[0.22em] text-[#173a2a]">{USE.tag}</span>
                <span className={`${DISPLAY} block truncate text-[1.1rem] leading-tight`}>{USE.what}</span>
              </span>
              <span className="text-[13.5px] font-semibold tabular-nums text-[#173a2a]">&minus;{rupees(USE.amount)}</span>
            </li>
          )}
        </ul>
      </div>

      <div aria-hidden="true" className="relative mx-auto h-12 w-px bg-[#b08d57]/35">
        {phase > 0 && <span key={`${round}-${phase}`} className={`${phase >= 4 ? s.flowUp : s.flowDown} absolute -left-[3px] top-0 h-[7px] w-[7px] rounded-full bg-[#b08d57]`} />}
        <span className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a6d3f]">{phase >= 4 ? 'Spend it' : '7% back'}</span>
      </div>

      <div className="relative overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#0f2a1e,#1d4632)] p-5 text-[#f5f1e8] shadow-[0_30px_60px_-34px_rgba(15,42,30,0.8)] sm:p-6">
        <div aria-hidden="true" className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(217,193,147,0.28),transparent_65%)]" />
        <div className="relative flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#d9c193]">Viber wallet</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#f5f1e8]/55">7% on everything</p>
        </div>
        <p className={`${DISPLAY} relative mt-3 text-[2.8rem] font-light leading-none tabular-nums`}><span ref={balance}>{rupees(balanceAt(4))}</span></p>
        <p aria-live="polite" className="relative mt-2 text-[13px] text-[#f5f1e8]/70">{caption}</p>
      </div>

      <ul className="mt-6 grid grid-cols-3 gap-3">
        {TRAITS.map((t, i) => {
          const on = phase === 0 ? false : i === 0 ? phase < 4 : phase >= 4;
          return (
            <li key={t.title} className={`border-t pt-3 transition-colors duration-700 ${on ? 'border-[#b08d57] text-[#10231a]' : 'border-[#10231a]/10 text-[#10231a]/50'}`}>
              <p className={`${DISPLAY} text-[1.15rem] italic leading-tight`}>{t.title}</p>
              <p className="mt-1 text-[12.5px] leading-snug">{t.text}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
