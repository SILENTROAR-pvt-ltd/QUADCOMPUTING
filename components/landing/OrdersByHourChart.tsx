// A single-series column chart for the product preview. The numbers are sample data and are labelled so.
const DATA = [
  { tick: '12p', label: '12 pm', value: 6 }, { tick: '', label: '1 pm', value: 9 }, { tick: '', label: '2 pm', value: 14 },
  { tick: '3p', label: '3 pm', value: 11 }, { tick: '', label: '4 pm', value: 7 }, { tick: '', label: '5 pm', value: 5 },
  { tick: '6p', label: '6 pm', value: 8 }, { tick: '', label: '7 pm', value: 13 }, { tick: '', label: '8 pm', value: 19 },
  { tick: '9p', label: '9 pm', value: 24 }, { tick: '', label: '10 pm', value: 21 }, { tick: '', label: '11 pm', value: 12 },
];
const AXIS_MAX = 25;
const TICKS = [0, 10, 20];
const PEAK = Math.max(...DATA.map((d) => d.value));
const pct = (v: number) => `${(v / AXIS_MAX) * 100}%`;

export function OrdersByHourChart() {
  return (
    <figure className="rounded-xl border border-black/[0.08] bg-[#fcfcfb] p-4">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-[#0b0b0b]">Orders by hour</span>
        <span className="text-[11px] text-[#898781]">Sample data</span>
      </figcaption>

      <div aria-hidden="true" className="relative mt-5 h-28">
        {TICKS.map((t) => (
          <div key={t} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: pct(t) }}>
            <span className="w-4 text-right text-[9px] tabular-nums text-[#898781]">{t}</span>
            <span className={`h-px flex-1 ${t === 0 ? 'bg-[#c3c2b7]' : 'bg-[#e1e0d9]'}`} />
          </div>
        ))}
        <div className="absolute inset-y-0 left-6 right-0 flex items-end">
          {DATA.map((d) => (
            <div key={d.label} className="group relative flex h-full flex-1 items-end justify-center">
              <div className="w-[60%] max-w-[16px] rounded-t-[4px] bg-[#2a78d6] transition-opacity group-hover:opacity-80" style={{ height: pct(d.value) }} />
              {d.value === PEAK && (
                <span className="absolute text-[10px] font-semibold text-[#0b0b0b]" style={{ bottom: `calc(${pct(d.value)} + 3px)` }}>{d.value}</span>
              )}
              <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md bg-[#0b0b0b] px-2 py-1 text-[10px] font-medium text-white group-hover:block">
                {d.label} · {d.value} orders
              </span>
            </div>
          ))}
        </div>
      </div>

      <div aria-hidden="true" className="ml-6 mt-1.5 flex">
        {DATA.map((d) => (
          <span key={d.label} className="flex-1 text-center text-[9px] text-[#898781]">{d.tick}</span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Orders by hour, sample data</caption>
        <thead><tr><th scope="col">Hour</th><th scope="col">Orders</th></tr></thead>
        <tbody>{DATA.map((d) => <tr key={d.label}><td>{d.label}</td><td>{d.value}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
