import React from 'react';

/** A dashboard card: title, optional one-line note and actions on the right, then its content. */
export function Panel({ title, note, actions, children, className = '', pad = true }: {
  title?: string; note?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean;
}) {
  return (
    <section className={`min-w-0 rounded-2xl border border-[#ebebe8] bg-white ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold tracking-tight text-neutral-950">{title}</h2>}
            {note && <p className="mt-0.5 text-xs text-neutral-500">{note}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

/** A figure with its label, an optional hint below and an optional coloured change. */
export function Stat({ label, value, hint, change, tone = 'neutral' }: {
  label: string; value: React.ReactNode; hint?: React.ReactNode; change?: { text: string; good: boolean | null }; tone?: 'neutral' | 'dark';
}) {
  const dark = tone === 'dark';
  return (
    <div className={`rounded-2xl border p-4 ${dark ? 'border-neutral-900 bg-neutral-950 text-white' : 'border-neutral-200/80 bg-white'}`}>
      <p className={`text-[11px] font-medium uppercase tracking-wider ${dark ? 'text-amber-200/80' : 'text-neutral-500'}`}>{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
        {change && <span className={change.good === null ? 'text-neutral-500' : change.good ? 'text-emerald-600' : 'text-rose-600'}>{change.text}</span>}
        {hint && <span className={dark ? 'text-white/60' : 'text-neutral-500'}>{hint}</span>}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-500">{children}</p>;
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{children}</p>;
}
