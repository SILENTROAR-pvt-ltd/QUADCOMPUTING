'use client';

// The story the 7% explainer plays (CashbackFlow.tsx): three expenses earn 7% each, then a coffee is paid from the wallet.
import { useEffect, useRef, type RefObject } from 'react';

export const SPENDS = [
  { tag: 'Stay', what: 'Two nights, garden room', amount: 4800 },
  { tag: 'Food', what: 'Dinner for three', amount: 2400 },
  { tag: 'Get-together', what: 'Bonfire night', amount: 1200 },
];
export const USE = { tag: 'Paid from your wallet', what: 'Coffee for two, next morning', amount: 320 };
export const TRAITS = [
  { title: 'Instant', text: 'Lands after each expense.' },
  { title: 'Flexible', text: 'Pays any bill, or your next stay.' },
  { title: 'No expiry', text: 'Use it whenever you like.' },
];
export const STEP_MS = 2600;

export const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
export const back = (n: number) => Math.round(n * 0.07);
/** The wallet after `phase` steps: 1 to 3 expenses earned, then (4) a coffee paid from it. */
export const balanceAt = (phase: number) =>
  SPENDS.slice(0, Math.min(phase, 3)).reduce((a, x) => a + back(x.amount), 0) - (phase >= 4 ? USE.amount : 0);

/** Eases the number in `ref` towards `target`, writing the text directly rather than re-rendering every frame. */
export function useCountTo(ref: RefObject<HTMLSpanElement | null>, target: number, ms = 900) {
  const shown = useRef(target);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = shown.current, t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      shown.current = from + (target - from) * (1 - Math.pow(1 - t, 3));
      el.textContent = rupees(shown.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref, target, ms]);
}
