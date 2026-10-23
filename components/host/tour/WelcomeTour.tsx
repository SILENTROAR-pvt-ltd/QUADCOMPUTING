'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { useVisibleTabs } from '../control-center/useVisibleTabs';
import type { ControlCenterTab } from '../ControlCenterHeader';
import { tourSteps } from './tour-steps';
import { useWelcomeTour } from './useWelcomeTour';

interface Props {
  venueId: string;
  venueName: string;
  /** Shows a section behind the tile (the console skips a section that would ask for the master PIN). */
  onShowTab: (tab: ControlCenterTab) => void;
}

/**
 * The first-visit tour: a small card in the corner (a sheet at the foot of a phone) that walks a new host through the
 * sections their venue uses, opening each one behind the card. Next and Back move through it, Skip ends it at once,
 * and the arrow keys and Escape work too. It never blocks the console underneath.
 */
export function WelcomeTour({ venueId, venueName, onShowTab }: Props) {
  const { open, close } = useWelcomeTour(venueId);
  const { model, tabs, allowed } = useVisibleTabs();
  const ready = useHostWorkspace((s) => s.hydrated && Boolean(s.profile));
  const labels = useMemo(() => Object.fromEntries(tabs.map((t) => [t.id, t.label])), [tabs]);
  const steps = useMemo(() => tourSteps(model, allowed, labels, venueName || 'Your venue'), [model, allowed, labels, venueName]);
  const [i, setI] = useState(0);
  const at = Math.min(i, steps.length - 1);
  const step = steps[at];
  const last = at === steps.length - 1;
  const show = useRef(onShowTab);
  show.current = onShowTab;

  useEffect(() => { if (open) setI(0); }, [open]);
  useEffect(() => { if (open && ready && step?.tab) show.current(step.tab); }, [open, ready, step?.tab]);

  const next = () => (last ? close() : setI(at + 1));
  const back = () => setI(Math.max(0, at - 1));
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, steps.length - 1));
      else if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, steps.length]);

  if (!open || !ready || !step) return null;
  const Icon = step.icon;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[95] p-3 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[400px] sm:p-0">
      <motion.section role="dialog" aria-modal="false" aria-labelledby="tour-title" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.2, 0.7, 0.1, 1] }}
        className="overflow-hidden rounded-[24px] border border-neutral-200 bg-white text-neutral-900 shadow-[0_30px_80px_-28px_rgba(0,0,0,0.45)]">
        <header className="flex items-center justify-between gap-3 px-5 pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Step {at + 1} of {steps.length}</span>
          {!last && <button type="button" onClick={close} className="cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900">Skip tour</button>}
        </header>
        <div aria-hidden className="mt-2.5 flex gap-1 px-5">
          {steps.map((s, k) => <span key={s.id} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${k <= at ? 'bg-neutral-900' : 'bg-neutral-200'}`} />)}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.2 }} className="px-5 pb-1 pt-4">
            <div className="flex items-start gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white"><Icon className="h-5 w-5" aria-hidden /></span>
              <div className="min-w-0">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-emerald-700">{step.kicker}</p>
                <h2 id="tour-title" className="mt-0.5 font-serif text-[1.35rem] leading-tight">{step.title}</h2>
              </div>
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-neutral-600">{step.text}</p>
            {step.todo.length > 0 && (
              <div className="mt-3 rounded-2xl bg-neutral-50 p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{step.id === 'welcome' ? 'In this tour' : last ? 'Your first steps' : 'What to do here'}</p>
                <ul className="mt-2 space-y-1.5">
                  {step.todo.map((t) => <li key={t} className="flex gap-2 text-[13px] leading-snug text-neutral-800"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />{t}</li>)}
                </ul>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <footer className="mt-3 flex items-center justify-between gap-3 border-t border-neutral-100 px-5 py-3.5">
          <button type="button" onClick={back} disabled={at === 0} className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 disabled:cursor-default disabled:opacity-0">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </button>
          <button type="button" onClick={next} className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white hover:bg-neutral-800">
            {at === 0 ? 'Show me around' : last ? 'Start setting up' : 'Next'} {!last && <ArrowRight className="h-4 w-4" aria-hidden />}
          </button>
        </footer>
      </motion.section>
    </div>
  );
}
