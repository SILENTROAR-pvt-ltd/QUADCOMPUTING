'use client';

import { Plus } from 'lucide-react';

const STEPS = [
  { n: '1', title: 'Add your raw stock', body: 'Milk, rice, oil, chicken… with opening quantity, cost and a reorder level.' },
  { n: '2', title: 'Link recipes', body: 'In Menu Catalog, set what each dish uses (e.g. 150 g paneer per Paneer Tikka).' },
  { n: '3', title: 'Sell as usual', body: 'Every settled bill and served KOT deducts its ingredients, once, at cost.' },
];

/** First run: what to set up so stock tracks itself. */
export function InventoryEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10">
      <h2 className="font-serif text-2xl text-neutral-950">Track stock automatically</h2>
      <p className="mt-1 max-w-xl text-sm text-neutral-500">Three steps, then stock levels, food cost, wastage and reorder lists keep themselves up to date.</p>
      <ol className="mt-6 grid gap-4 md:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-950 font-mono text-xs text-white">{s.n}</span>
            <p className="mt-3 font-semibold text-neutral-950">{s.title}</p>
            <p className="mt-1 text-xs text-neutral-600">{s.body}</p>
          </li>
        ))}
      </ol>
      <button type="button" onClick={onAdd} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white hover:bg-neutral-800 cursor-pointer">
        <Plus className="h-4 w-4" /> Add stock items
      </button>
    </section>
  );
}
