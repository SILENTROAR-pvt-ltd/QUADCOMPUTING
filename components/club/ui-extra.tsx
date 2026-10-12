'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { Avatar, FOCUS } from './ui';
import { CLUB_DISPLAY } from './fonts';

/** A filter pill: white with a hairline when off, forest green when on. */
export function Chip({ active, className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button type="button" aria-pressed={active} {...rest}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition ${active ? 'bg-[#17301f] text-[#f6f4ec] shadow-[0_8px_18px_-10px_rgba(23,48,31,0.8)]' : 'bg-white text-[#14261b]/80 shadow-[0_4px_14px_-10px_rgba(20,38,27,0.5)] ring-1 ring-[#14261b]/[0.06] hover:text-[#14261b]'} ${FOCUS} ${className}`} />
  );
}

/** Two to four tabs in one pill, like "One way | Round trip". */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: Array<[T, string]>; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex gap-1 rounded-full bg-white p-1 shadow-[0_6px_18px_-12px_rgba(20,38,27,0.5)] ring-1 ring-[#14261b]/[0.06]">
      {options.map(([key, text]) => (
        <button key={key} type="button" role="tab" aria-selected={value === key} onClick={() => onChange(key)}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${value === key ? 'bg-[#17301f] text-[#f6f4ec]' : 'text-[#14261b]/60 hover:text-[#14261b]'} ${FOCUS}`}>{text}</button>
      ))}
    </div>
  );
}

const FAB = `fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#17301f] text-[#c8da4a] shadow-[0_18px_36px_-12px_rgba(23,48,31,0.7)] ring-4 ring-[#f1efe6] transition hover:scale-105 active:scale-95 lg:bottom-8 lg:right-8 ${FOCUS}`;

/** The round "+" that floats above the tab bar. */
export function Fab({ href, onClick, label }: { href?: string; onClick?: () => void; label: string }) {
  const icon = <Plus aria-hidden="true" className="h-6 w-6" strokeWidth={2.5} />;
  return href
    ? <Link href={href} aria-label={label} title={label} className={FAB}>{icon}</Link>
    : <button type="button" onClick={onClick} aria-label={label} title={label} className={FAB}>{icon}</button>;
}

/** Overlapping faces with a chartreuse "+N" bubble for everyone else. */
export function Faces({ people, total, size = 32, ring = 'ring-white' }: { people: Array<{ name: string; avatar_url: string | null }>; total: number; size?: number; ring?: string }) {
  const extra = Math.max(0, total - people.length);
  return (
    <span className="flex items-center">
      {people.map((p, i) => <span key={i} className={`-ml-2 rounded-full ring-2 first:ml-0 ${ring}`}><Avatar url={p.avatar_url} name={p.name} size={size} /></span>)}
      {extra > 0 && (
        <span className={`-ml-2 grid place-items-center rounded-full bg-[#c8da4a] text-[11px] font-bold text-[#14261b] ring-2 ${ring}`} style={{ width: size, height: size }}>
          +{extra > 99 ? 99 : extra}
        </span>
      )}
    </span>
  );
}

export function SectionTitle({ id, title, sub, action }: { id?: string; title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className={`${CLUB_DISPLAY} text-[22px] font-semibold leading-tight text-[#14261b]`}>{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-[#14261b]/65">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * A bottom sheet on phones, a centred dialog on larger screens. Escape or a tap outside closes it.
 * It focuses the field marked data-autofocus (or the first field); `focusField={false}` focuses the
 * sheet itself, so reading does not pop up the phone keyboard.
 */
export function Sheet({ open, onClose, title, children, focusField = true }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; focusField?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  // Drawn at the top of the Club page, not where it is used: a sticky header with a blur (or any parent
  // with a transform) would otherwise become the box a "fixed" sheet is placed in, and clip it.
  const [host, setHost] = useState<Element | null>(null);
  useEffect(() => { setHost(document.querySelector('.club-theme') ?? document.body); }, []);
  useEffect(() => { close.current = onClose; });

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    const overflow = document.body.style.overflow;
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const root = panel.current;
    const target = focusField ? root?.querySelector<HTMLElement>('[data-autofocus]') ?? root?.querySelector<HTMLElement>('textarea, input, select') : null;
    (target ?? root)?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; before?.focus?.(); };
  }, [open, focusField, host]);

  if (!open || !host) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} onClick={onClose}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[#14261b]/40 backdrop-blur-sm sm:items-center sm:p-4">
      <div ref={panel} tabIndex={-1} onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full overflow-y-auto overflow-x-hidden rounded-t-[32px] bg-[#fbfaf6] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[#14261b] shadow-2xl outline-none sm:max-w-lg sm:rounded-[32px]">
        <div aria-hidden="true" className="mx-auto -mt-1 mb-3 h-1 w-10 rounded-full bg-[#14261b]/15 sm:hidden" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className={`${CLUB_DISPLAY} text-xl font-semibold`}>{title}</p>
          <button type="button" onClick={onClose} aria-label="Close" className={`grid h-9 w-9 place-items-center rounded-full bg-white text-[#14261b]/70 shadow-sm ring-1 ring-[#14261b]/[0.06] hover:text-[#14261b] ${FOCUS}`}><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>,
    host,
  );
}
