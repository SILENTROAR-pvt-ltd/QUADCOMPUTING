import { ChefHat, ConciergeBell } from 'lucide-react';
import { OrdersByHourChart } from './OrdersByHourChart';

type TableState = 'seated' | 'bill' | 'vacant';
const TABLES: { name: string; state: TableState }[] = [
  { name: 'T1', state: 'seated' }, { name: 'T2', state: 'bill' }, { name: 'T3', state: 'vacant' }, { name: 'T4', state: 'seated' },
  { name: 'T5', state: 'vacant' }, { name: 'T6', state: 'seated' }, { name: 'T7', state: 'bill' }, { name: 'T8', state: 'vacant' },
];
const STATE: Record<TableState, { label: string; cls: string }> = {
  seated: { label: 'Seated', cls: 'border-black bg-black text-white' },
  bill: { label: 'Bill asked', cls: 'border-[#d9c08f] bg-[#fbf6ea] text-[#5c4520]' },
  vacant: { label: 'Vacant', cls: 'border-black/10 bg-white text-zinc-500' },
};

/** An illustration of the host control centre. Every number in it is sample data. */
export function HeroProductPreview() {
  return (
    <figure aria-label="Illustrative preview of the Quad Computing control centre" className="relative">
      <div aria-hidden="true" className="absolute -inset-4 -z-10 rounded-[2rem] bg-[radial-gradient(closest-side,rgba(200,169,106,0.22),transparent)]" />
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[#f6f5f1] px-4 py-2.5">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" /><span className="h-2.5 w-2.5 rounded-full bg-zinc-300" /><span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
          </span>
          <span className="ml-2 truncate rounded-md bg-white px-3 py-1 text-[11px] text-zinc-500">quadcomputing.vercel.app/host/control-center</span>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-[1.15fr_1fr]">
          <section aria-label="Live tables">
            <div className="flex items-baseline justify-between">
              <h3 className="text-[12px] font-semibold text-black">Live tables</h3>
              <span className="text-[11px] text-zinc-500">3 seated · 2 bills</span>
            </div>
            <ul className="mt-3 grid grid-cols-4 gap-2">
              {TABLES.map((t) => (
                <li key={t.name} className={`rounded-lg border px-2 py-2 text-center ${STATE[t.state].cls}`}>
                  <span className="block text-[13px] font-semibold">{t.name}</span>
                  <span className="block text-[9px] uppercase tracking-wide opacity-80">{STATE[t.state].label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-black/[0.08] bg-[#faf9f6] px-3 py-2 text-[11px] text-zinc-700">
              <ConciergeBell aria-hidden="true" className="h-3.5 w-3.5 text-black" /> Table 6 called the waiter
            </div>
          </section>

          <section aria-label="Kitchen ticket" className="rounded-xl border border-black/[0.08] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-black">KOT #142 · Table 4</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-black px-2 py-0.5 text-[10px] font-medium text-white">
                <ChefHat aria-hidden="true" className="h-3 w-3" /> Preparing
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 text-[12px] text-zinc-700">
              <li className="flex justify-between"><span>Misal Pav</span><span className="tabular-nums">× 2</span></li>
              <li className="flex justify-between"><span>Masala Chai</span><span className="tabular-nums">× 2</span></li>
              <li className="flex justify-between"><span>Cheese Grill Sandwich</span><span className="tabular-nums">× 1</span></li>
            </ul>
            <p className="mt-3 border-t border-dashed border-black/10 pt-2 text-[11px] text-zinc-500">Note: less spicy</p>
          </section>

          <div className="sm:col-span-2"><OrdersByHourChart /></div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-[11px] text-zinc-500">Illustrative preview · sample data</figcaption>
    </figure>
  );
}
