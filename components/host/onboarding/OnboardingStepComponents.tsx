'use client';

import React from 'react';
import { UseFormRegister, FieldErrors, UseFieldArrayReturn } from 'react-hook-form';
import type { HostOnboardingForm } from '@/lib/validations/onboarding';
import {
  categories,
  genderOptions,
  emptyBusiness,
  inputClass,
  labelClass,
} from './onboarding.constants';

export function ErrorText({ children }: { children?: string }) {
  return <p className="mt-2 text-xs text-rose-400">{children}</p>;
}

export function Field({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      {children}
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

export function Summary({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <p className="text-neutral-300">{value || 'Not provided'}</p>
    </div>
  );
}

interface IdentityStepProps {
  register: UseFormRegister<HostOnboardingForm>;
  errors: FieldErrors<HostOnboardingForm>;
  selectedGender?: string;
  onSelectGender: (val: any) => void;
}

export function IdentityStep({
  register,
  errors,
  selectedGender,
  onSelectGender,
}: IdentityStepProps) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-serif text-xl text-white">Identity</h2>
        <p className="mt-2 text-sm text-neutral-400">Tell us who will manage this ecosystem.</p>
      </div>
      <div>
        <label className={labelClass} htmlFor="fullName">
          Full Name
        </label>
        <input
          className={inputClass}
          id="fullName"
          placeholder="Your full name"
          {...register('fullName')}
        />
        {errors.fullName && <ErrorText>{errors.fullName.message}</ErrorText>}
      </div>
      <div>
        <label className={labelClass} htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className={inputClass}
          id="email"
          placeholder="you@business.com"
          type="email"
          {...register('email')}
        />
        {errors.email && <ErrorText>{errors.email.message}</ErrorText>}
      </div>
      <div>
        <label className={labelClass} htmlFor="password">
          Password
        </label>
        <input
          autoComplete="new-password"
          className={inputClass}
          id="password"
          placeholder="At least 8 characters"
          type="password"
          {...register('password')}
        />
        {errors.password && <ErrorText>{errors.password.message}</ErrorText>}
      </div>
      <div>
        <span className={labelClass}>Gender</span>
        <div className="flex flex-wrap gap-2">
          {genderOptions.map(([value, label]) => (
            <button
              className={`rounded-xl border px-4 py-3 text-[10px] uppercase tracking-[0.12em] transition-colors cursor-pointer ${
                selectedGender === value
                  ? 'border-white bg-white text-neutral-950 font-bold'
                  : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700 hover:text-white'
              }`}
              key={value}
              onClick={() => onSelectGender(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        {errors.gender && <ErrorText>{errors.gender.message}</ErrorText>}
      </div>
      <div>
        <label className={labelClass} htmlFor="dob">
          Date of Birth
        </label>
        <input className={inputClass} id="dob" type="date" {...register('dob')} />
        {errors.dob && <ErrorText>{errors.dob.message}</ErrorText>}
      </div>
    </section>
  );
}

interface EnterprisePortfolioStepProps {
  register: UseFormRegister<HostOnboardingForm>;
  errors: FieldErrors<HostOnboardingForm>;
  selectedCategories: string[];
  onToggleCategory: (cat: string) => void;
  fields: UseFieldArrayReturn<HostOnboardingForm, 'businesses'>['fields'];
  append: UseFieldArrayReturn<HostOnboardingForm, 'businesses'>['append'];
  remove: UseFieldArrayReturn<HostOnboardingForm, 'businesses'>['remove'];
  onPincodeChange: (index: number, val: string) => void;
}

export function EnterprisePortfolioStep({
  register,
  errors,
  selectedCategories,
  onToggleCategory,
  fields,
  append,
  remove,
  onPincodeChange,
}: EnterprisePortfolioStepProps) {
  return (
    <section className="space-y-8">
      <div>
        <h2 className="font-serif text-xl text-white">Enterprise Portfolio</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Add every business or branch you want to manage.
        </p>
      </div>
      <div>
        <span className={labelClass}>Business Categories</span>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              className={`rounded-xl border px-4 py-3 text-[10px] uppercase tracking-[0.12em] transition-colors cursor-pointer ${
                selectedCategories.includes(category)
                  ? 'border-white bg-white text-neutral-950 font-bold'
                  : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700 hover:text-white'
              }`}
              key={category}
              onClick={() => onToggleCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
        {errors.categories && <ErrorText>{errors.categories.message}</ErrorText>}
      </div>

      <div className="space-y-6">
        {fields.map((field, index) => (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6" key={field.id}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-serif text-lg text-white">
                Location {String(index + 1).padStart(2, '0')}
              </h3>
              {index > 0 && (
                <button
                  className="text-[10px] uppercase tracking-[0.15em] text-neutral-500 hover:text-rose-400 cursor-pointer"
                  onClick={() => remove(index)}
                  type="button"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Business Name" error={errors.businesses?.[index]?.businessName?.message}>
                <input
                  className={inputClass}
                  placeholder="Business name"
                  {...register(`businesses.${index}.businessName`)}
                />
              </Field>
              <Field label="GST Number (Optional)" error={errors.businesses?.[index]?.gstNumber?.message}>
                <input
                  className={inputClass}
                  placeholder="GST number"
                  {...register(`businesses.${index}.gstNumber`)}
                />
              </Field>
              <Field label="PIN Code" error={errors.businesses?.[index]?.pincode?.message}>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit PIN code"
                  {...register(`businesses.${index}.pincode`)}
                  onChange={(e) => onPincodeChange(index, e.target.value)}
                />
              </Field>
              <Field label="State" error={errors.businesses?.[index]?.state?.message}>
                <input className={inputClass} placeholder="State" {...register(`businesses.${index}.state`)} />
              </Field>
              <Field label="City" error={errors.businesses?.[index]?.city?.message}>
                <input className={inputClass} placeholder="City" {...register(`businesses.${index}.city`)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Full Address" error={errors.businesses?.[index]?.address?.message}>
                  <textarea
                    className={`${inputClass} min-h-24 resize-y`}
                    placeholder="Full address"
                    {...register(`businesses.${index}.address`)}
                  />
                </Field>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        className="w-full rounded-xl border border-dashed border-neutral-800 py-3 text-xs uppercase tracking-widest text-neutral-300 transition-colors hover:border-neutral-600 cursor-pointer"
        onClick={() => append(emptyBusiness)}
        type="button"
      >
        + Add Another Business / Branch
      </button>
    </section>
  );
}

interface ReviewProvisioningStepProps {
  values: HostOnboardingForm;
  submitError?: string;
}

export function ReviewProvisioningStep({ values, submitError }: ReviewProvisioningStepProps) {
  return (
    <section className="space-y-7">
      <div>
        <h2 className="font-serif text-xl text-white">Review &amp; Provisioning</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Confirm your details before initializing the dashboard.
        </p>
      </div>
      <div className="space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-sm">
        <Summary label="Full Name" value={values.fullName} />
        <Summary label="Gender" value={values.gender?.replaceAll('_', ' ')} />
        <Summary label="Date of Birth" value={values.dob} />
        <Summary label="Categories" value={values.categories.join(', ')} />
        <Summary label="Total Businesses" value={String(values.businesses.length)} />
        <div>
          <p className={labelClass}>Business Locations</p>
          <div className="space-y-3 text-neutral-300">
            {values.businesses.map((business, index) => (
              <p key={`${business.businessName}-${index}`}>
                <span className="text-white font-medium">{business.businessName || 'Untitled business'}</span>
                <span className="text-neutral-500">
                  {' '}
                  / {business.city || 'City pending'}, {business.state || 'State pending'}
                </span>
              </p>
            ))}
          </div>
        </div>
      </div>
      {submitError && <ErrorText>{submitError}</ErrorText>}
    </section>
  );
}
