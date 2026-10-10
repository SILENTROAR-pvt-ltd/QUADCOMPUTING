'use client';

import { BedDouble, Check, Coffee } from 'lucide-react';
import { FOOD_TYPES, STAY_TYPES, businessModel, modulesFor } from '@/lib/venue/venue-model';
import { CONTROL_CENTER_TABS } from '@/components/host/ControlCenterHeader';
import { Section } from './ProfileFields';

interface Props { types: string[]; onChange: (types: string[]) => void; error: string | null; preselectedStay: boolean }

const MODEL_TEXT = {
  food: 'Food & drinks: menu, billing with tables, kitchen tickets and stock. No rooms section.',
  stay: 'Stays only: rooms and check-ins, billing, add-on services and expenses. No kitchen, tables or stock.',
  both: 'Food and stays: everything, from tables and kitchen to rooms and check-ins.',
};

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-medium transition-colors cursor-pointer ${on ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'}`}>
      {on && <Check className="h-3.5 w-3.5" />}{label}
    </button>
  );
}

/** What the venue is. This decides which sections appear in the sidebar. */
export function VenueTypeSection({ types, onChange, error, preselectedStay }: Props) {
  const toggle = (id: string) => onChange(types.includes(id) ? types.filter((t) => t !== id) : [...types, id]);
  const model = businessModel(types);
  const sections = modulesFor(model).map((id) => CONTROL_CENTER_TABS.find((t) => t.id === id)?.label).filter(Boolean);

  return (
    <Section id="venue-type" title="What do you run?" description="Pick everything that applies. The sidebar shows only what your business needs.">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-900"><Coffee className="h-4 w-4 text-neutral-500" /> Food &amp; drinks</p>
          <div className="flex flex-wrap gap-2">{FOOD_TYPES.map((t) => <Chip key={t.id} label={t.label} on={types.includes(t.id)} onClick={() => toggle(t.id)} />)}</div>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-900"><BedDouble className="h-4 w-4 text-neutral-500" /> Stays</p>
          <div className="flex flex-wrap gap-2">{STAY_TYPES.map((t) => <Chip key={t.id} label={t.label} on={types.includes(t.id)} onClick={() => toggle(t.id)} />)}</div>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
      {preselectedStay && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Rooms were switched on for this venue, so Hotel is selected. Change it if another stay type fits better, then save.
        </p>
      )}
      {types.length > 0 && (
        <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
          <p className="text-sm text-neutral-800">{MODEL_TEXT[model]}</p>
          <p className="mt-2 text-xs text-neutral-500">Sidebar: {sections.join(' · ')}</p>
        </div>
      )}
    </Section>
  );
}
