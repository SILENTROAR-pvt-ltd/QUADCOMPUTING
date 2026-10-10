'use client';

import React from 'react';

export const input = 'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 aria-[invalid=true]:border-rose-400';

interface SectionProps { id: string; title: string; description?: string; children: React.ReactNode; aside?: React.ReactNode }

/** A titled card on the profile page. */
export function Section({ id, title, description, children, aside }: SectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 pb-4">
        <div>
          <h2 id={`${id}-title`} className="font-serif text-xl text-neutral-950">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-neutral-500">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

interface FieldProps { label: string; hint?: string; error?: string | null; children: React.ReactNode; className?: string }

/** A labelled control with its hint, or its error when it has one. */
export function Field({ label, hint, error, children, className = '' }: FieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-neutral-700">{label}</span>
      {children}
      {error ? <span role="alert" className="mt-1 block text-xs text-rose-700">{error}</span>
        : hint ? <span className="mt-1 block text-xs text-neutral-500">{hint}</span> : null}
    </label>
  );
}

export interface FieldBinding {
  value: (path: string) => string;
  set: (path: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  err: (path: string) => string | null;
}

/** Wires inputs to the form by dotted path ("venue.gstNumber") and shows the server's error on its field. */
export function bindFields(form: any, update: (path: string, v: unknown) => void, error: { text: string; field?: string } | null): FieldBinding {
  return {
    value: (path) => { const [g, k] = path.split('.'); return String(form?.[g]?.[k] ?? ''); },
    set: (path) => (e) => update(path, e.target.value),
    err: (path) => (error?.field === path ? error.text : null),
  };
}
