'use client';

import { Pencil } from 'lucide-react';
import type { HostOnboardingForm } from '@/lib/validations/onboarding';
import { FOOD_TYPES, STAY_TYPES } from '@/lib/venue/venue-model';
import { Section } from '@/components/host/workspaces/profile/ProfileFields';
import { genderOptions } from './onboarding.constants';

const TYPE_LABEL = new Map<string, string>([...FOOD_TYPES, ...STAY_TYPES].map((t) => [t.id, t.label]));
const GENDER_LABEL = new Map<string, string>(genderOptions.map(([v, l]) => [v, l]));

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid gap-1 border-b border-neutral-100 py-3 last:border-0 sm:grid-cols-[160px_1fr]">
      <dt className="text-xs font-semibold text-neutral-500">{label}</dt>
      <dd className="text-sm text-neutral-950">{value || <span className="text-neutral-400">Not provided</span>}</dd>
    </div>
  );
}

interface Props { values: HostOnboardingForm; submitError?: string; onEdit: (step: number) => void }

/** Step 3: everything at a glance before the venue is created. */
export function ReviewStep({ values, submitError, onEdit }: Props) {
  const edit = (step: number) => (
    <button type="button" onClick={() => onEdit(step)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 cursor-pointer">
      <Pencil aria-hidden="true" className="h-3.5 w-3.5" /> Edit
    </button>
  );

  return (
    <div className="space-y-6">
      <Section id="review-owner" title="About you" aside={edit(1)}>
        <dl>
          <Row label="Full name" value={values.fullName} />
          <Row label="Email" value={values.email} />
          <Row label="Gender" value={values.gender ? GENDER_LABEL.get(values.gender) : undefined} />
          <Row label="Date of birth" value={values.dob} />
        </dl>
      </Section>

      <Section id="review-venue" title="Your venue" aside={edit(2)}>
        <dl>
          <Row label="What you run" value={values.categories.map((c) => TYPE_LABEL.get(c) || c).join(' · ')} />
          {values.businesses.map((b, i) => (
            <Row key={i} label={values.businesses.length > 1 ? `Venue ${i + 1}` : 'Venue'}
              value={[b.businessName, [b.address, b.city, b.state, b.pincode].filter(Boolean).join(', ')].filter(Boolean).join(' — ')} />
          ))}
        </dl>
      </Section>

      <p className="rounded-2xl bg-neutral-100/80 px-4 py-3 text-sm text-neutral-600">
        You can add GST, FSSAI, bank and UPI details, and set your PINs, in <span className="font-semibold text-neutral-900">My profile</span> once you&apos;re in.
      </p>
      {submitError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{submitError}</p>}
    </div>
  );
}
