'use client';

import type { UseFormReturn } from 'react-hook-form';
import type { HostOnboardingForm } from '@/lib/validations/onboarding';
import { Field, Section, input } from '@/components/host/workspaces/profile/ProfileFields';
import { Chip } from '@/components/host/workspaces/profile/VenueTypeSection';
import { PasswordInput } from '@/components/host/auth/PasswordInput';
import { genderOptions } from './onboarding.constants';

/** Step 1: the owner's account and details. The same fields appear later under "Owner" in My profile. */
export function IdentityStep({ form }: { form: UseFormReturn<HostOnboardingForm> }) {
  const { register, formState: { errors }, watch, setValue } = form;
  const gender = watch('gender');
  const invalid = (k: keyof HostOnboardingForm) => (errors[k] ? true : undefined);

  return (
    <Section id="owner" title="About you" description="You'll sign in with this email. Everything here can be changed later in My profile.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.fullName?.message} className="sm:col-span-2">
          <input className={input} autoComplete="name" placeholder="Your full name" aria-invalid={invalid('fullName')} {...register('fullName')} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input className={input} type="email" autoComplete="email" inputMode="email" placeholder="you@yourvenue.com" aria-invalid={invalid('email')} {...register('email')} />
        </Field>
        <Field label="Password" hint="At least 8 characters." error={errors.password?.message}>
          <PasswordInput autoComplete="new-password" placeholder="Create a password" aria-invalid={invalid('password')} {...register('password')} />
        </Field>
        <Field label="Date of birth" error={errors.dob?.message}>
          <input className={input} type="date" aria-invalid={invalid('dob')} {...register('dob')} />
        </Field>
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-neutral-700" id="gender-label">Gender</span>
          <div role="group" aria-labelledby="gender-label" className="flex flex-wrap gap-2">
            {genderOptions.map(([value, label]) => (
              <Chip key={value} label={label} on={gender === value} onClick={() => setValue('gender', value, { shouldValidate: true })} />
            ))}
          </div>
          {errors.gender && <span role="alert" className="mt-1 block text-xs text-rose-700">{errors.gender.message}</span>}
        </div>
      </div>
    </Section>
  );
}
