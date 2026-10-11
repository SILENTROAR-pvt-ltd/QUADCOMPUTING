'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { UseFieldArrayReturn, UseFormReturn } from 'react-hook-form';
import type { HostOnboardingForm } from '@/lib/validations/onboarding';
import { Field, Section, input } from '@/components/host/workspaces/profile/ProfileFields';
import { VenueTypeSection } from '@/components/host/workspaces/profile/VenueTypeSection';
import { emptyBusiness } from './onboarding.constants';

interface Props {
  form: UseFormReturn<HostOnboardingForm>;
  businesses: UseFieldArrayReturn<HostOnboardingForm, 'businesses'>;
  onPincode: (index: number, value: string) => void;
}

/** Step 2: what the venue is (the same picker as My profile, so the sidebar is right from day one) and where. */
export function VenueStep({ form, businesses, onPincode }: Props) {
  const { register, watch, setValue, formState: { errors } } = form;
  const types = watch('categories');

  return (
    <div className="space-y-6">
      <VenueTypeSection types={types} preselectedStay={false} error={errors.categories?.message ?? null}
        onChange={(t) => setValue('categories', t, { shouldValidate: true, shouldDirty: true })} />

      {businesses.fields.map((field, i) => {
        const e = errors.businesses?.[i];
        return (
          <Section key={field.id} id={`location-${i}`} title={businesses.fields.length > 1 ? `Venue ${i + 1}` : 'Your venue'}
            description="Shown on your bills and your guest menu."
            aside={i > 0 ? (
              <button type="button" onClick={() => businesses.remove(i)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-neutral-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer">
                <Trash2 aria-hidden="true" className="h-4 w-4" /> Remove
              </button>
            ) : undefined}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name" error={e?.businessName?.message}>
                <input className={input} placeholder="e.g. Bombay Rasoi" aria-invalid={e?.businessName ? true : undefined} {...register(`businesses.${i}.businessName`)} />
              </Field>
              <Field label="GST number" hint="Optional. Printed on your bills." error={e?.gstNumber?.message}>
                <input className={input} placeholder="27ABCDE1234F1Z5" {...register(`businesses.${i}.gstNumber`)} />
              </Field>
              <Field label="PIN code" hint="Fills in your city and state." error={e?.pincode?.message}>
                <input className={input} inputMode="numeric" maxLength={6} placeholder="6 digits" aria-invalid={e?.pincode ? true : undefined}
                  {...register(`businesses.${i}.pincode`)} onChange={(ev) => onPincode(i, ev.target.value)} />
              </Field>
              <Field label="City" error={e?.city?.message}>
                <input className={input} placeholder="City" aria-invalid={e?.city ? true : undefined} {...register(`businesses.${i}.city`)} />
              </Field>
              <Field label="State" error={e?.state?.message}>
                <input className={input} placeholder="State" aria-invalid={e?.state ? true : undefined} {...register(`businesses.${i}.state`)} />
              </Field>
              <Field label="Full address" error={e?.address?.message} className="sm:col-span-2">
                <textarea className={`${input} h-auto min-h-[88px] py-2.5`} placeholder="Street, area, landmark" aria-invalid={e?.address ? true : undefined}
                  {...register(`businesses.${i}.address`)} />
              </Field>
            </div>
          </Section>
        );
      })}

      <button type="button" onClick={() => businesses.append(emptyBusiness)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-white text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-500 cursor-pointer">
        <Plus aria-hidden="true" className="h-4 w-4" /> Add another venue or branch
      </button>
    </div>
  );
}
