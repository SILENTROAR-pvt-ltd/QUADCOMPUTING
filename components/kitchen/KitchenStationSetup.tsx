'use client';

import React, { useEffect, useState } from 'react';
import { Flame, Wine } from 'lucide-react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import type { KitchenStation } from '@/lib/services/kitchen/item-station';

const OPTIONAL: Array<{ id: Exclude<KitchenStation, 'Kitchen'>; label: string; Icon: typeof Wine }> = [
  { id: 'Bar', label: 'Bar', Icon: Wine },
  { id: 'Grill', label: 'Grill', Icon: Flame },
];

/** Which stations this venue runs. A station that is off sends its items to the Kitchen instead. */
export function KitchenStationSetup({ onChange }: { onChange?: (stations: KitchenStation[]) => void }) {
  const [running, setRunning] = useState<KitchenStation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ stations: KitchenStation[] }>('/api/host/kitchen/stations', { cache: 'no-store' }).then((r) => {
      if (r.ok && r.data) setRunning(r.data.stations);
      else setError(r.error);
    });
  }, []);

  const toggle = async (station: KitchenStation) => {
    if (!running) return;
    const next = running.includes(station) ? running.filter((s) => s !== station) : [...running, station];
    setSaving(station);
    setError(null);
    const r = await apiRequest<{ stations: KitchenStation[] }>('/api/host/kitchen/stations', jsonRequest('PATCH', { stations: next }));
    setSaving(null);
    if (r.ok && r.data) {
      setRunning(r.data.stations);
      onChange?.(r.data.stations);
    } else {
      setError(r.error);
    }
  };

  return (
    <section aria-label="Stations this venue runs" className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Stations you run</p>
        <p className="text-[11px] text-neutral-500">Kitchen is always on. An item for a station that is off is cooked in the Kitchen.</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <span className="flex h-10 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800">Kitchen</span>
        {OPTIONAL.map(({ id, label, Icon }) => {
          const on = running?.includes(id) ?? false;
          return (
            <button
              key={id}
              type="button"
              onClick={() => void toggle(id)}
              disabled={!running || saving !== null}
              aria-pressed={on}
              className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer ${
                on ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 bg-white text-neutral-500'
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label} {on ? 'on' : 'off'}
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="text-xs font-medium text-rose-600 sm:basis-full">{error}</p>}
    </section>
  );
}

export default KitchenStationSetup;
