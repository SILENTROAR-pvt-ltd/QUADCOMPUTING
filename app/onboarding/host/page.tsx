'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import type { FieldPath } from 'react-hook-form';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import type { CategoryHandled, HostProfile, PropertyBranch } from '@/types';
import {
  hostOnboardingSchema,
  type HostOnboardingForm,
} from '@/lib/validations/onboarding';

const categories = ['Cafe & Dine', 'Luxury Stays', 'Artisan Retail', 'Exports & Trade', 'Agri-Business'];
const genderOptions = [
  ['male', 'Male'],
  ['female', 'Female'],
  ['other', 'Other'],
  ['prefer_not_to_say', 'Prefer Not to Say'],
] as const;

const emptyBusiness = {
  businessName: '',
  gstNumber: '',
  pincode: '',
  state: '',
  city: '',
  address: '',
};

const inputClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-black focus:outline-none focus:ring-1 focus:ring-black shadow-sm';
const labelClass =
  'mb-2 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500';

export default function HostOnboardingPage() {
  const router = useRouter();
  const adoptSnapshot = useHostWorkspace((state) => state.adoptSnapshot);
  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState('');
  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<HostOnboardingForm>({
    resolver: zodResolver(hostOnboardingSchema),
    defaultValues: {
      fullName: '',
      gender: undefined,
      dob: '',
      categories: [],
      businesses: [emptyBusiness],
    },
    mode: 'onBlur',
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'businesses',
  });
  const selectedCategories = watch('categories');
  const selectedGender = watch('gender');
  const values = watch();

  async function nextStep() {
    const fieldsToValidate: FieldPath<HostOnboardingForm>[] =
      step === 1
        ? ['fullName', 'gender', 'dob']
        : ['categories', 'businesses'];
    const valid = await trigger(fieldsToValidate);
    if (valid) setStep((current) => Math.min(current + 1, 3));
  }

  function toggleCategory(category: string) {
    const next = selectedCategories.includes(category)
      ? selectedCategories.filter((item) => item !== category)
      : [...selectedCategories, category];
    setValue('categories', next, { shouldValidate: true, shouldDirty: true });
  }

  async function handlePincodeChange(index: number, pincodeValue: string) {
    const normalizedPincode = pincodeValue.replace(/\D/g, '').slice(0, 6);
    setValue(`businesses.${index}.pincode`, normalizedPincode, {
      shouldValidate: true,
      shouldDirty: true,
    });
    if (normalizedPincode.length !== 6) return;

    try {
      const response = await fetch(
        `https://api.postalpincode.in/pincode/${normalizedPincode}`,
      );
      const data = await response.json();
      const postOffice = data?.[0]?.PostOffice?.[0];
      if (data?.[0]?.Status === 'Success' && postOffice) {
        setValue(`businesses.${index}.city`, postOffice.District, {
          shouldValidate: true,
        });
        setValue(`businesses.${index}.state`, postOffice.State, {
          shouldValidate: true,
        });
      }
    } catch {
      // Fallback: remains editable
    }
  }

  async function submitForm(data: HostOnboardingForm) {
    setSubmitError('');
    try {
      const response = await fetch('/api/host/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Provisioning request failed');
      const provisioning: ProvisioningResponse = await response.json();
      const now = new Date().toISOString();
      
      const profile: HostProfile = {
        uniqueOwnerCafeId: provisioning.uniqueOwnerCafeId as HostProfile['uniqueOwnerCafeId'],
        displayName: data.fullName,
        legalEntityName: data.businesses[0]?.businessName || data.fullName,
        avatarUrl: null,
        contact: { email: '', phone: null },
        ecosystemStatement: '',
        categoriesHandled: data.categories.map(toCategoryHandled),
        createdAt: now,
        updatedAt: now,
        bannerUrl: null,
      };
      
      const propertyBranches: PropertyBranch[] = provisioning.businesses.map((business, i) => ({
        id: business.locationId as PropertyBranch['id'],
        name: business.businessName,
        category: toCategoryHandled(data.categories[0] || 'cafe'),
        gstNumber: data.businesses[i]?.gstNumber ? (data.businesses[i].gstNumber as PropertyBranch['gstNumber']) : (business.gstNumber ? business.gstNumber as PropertyBranch['gstNumber'] : null),
        bankName: null,
        bankAccountNumber: null,
        bankIfscCode: null,
        upiId: null,
        address: {
          line1: business.address,
          line2: null,
          locality: business.city,
          city: business.city,
          state: business.state,
          postalCode: business.pincode,
          country: 'IN',
        },
        geo: null,
        qrCodeHash: business.qrCodeHash as PropertyBranch['qrCodeHash'],
        status: 'live',
        createdAt: now,
        updatedAt: now,
      }));
      
      adoptSnapshot({ profile, propertyBranches, serviceCatalog: [], revision: 1 });
      router.push(provisioning.controlCenterUrl);
    } catch {
      setSubmitError('We could not initialize the dashboard. Please try again.');
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12 text-zinc-900 md:py-20">
      <div className="mx-auto max-w-4xl rounded-3xl border border-zinc-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-10 md:p-14">
        
        <header className="mb-12 flex flex-col sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
              Quad Computing Ecosystem
            </p>
            <h1 className="mt-3 font-serif text-3xl font-medium tracking-tight text-zinc-900 md:text-4xl">
              Host Onboarding
            </h1>
          </div>
          
          <div className="mt-6 flex items-center gap-3 sm:mt-0">
            {['Identity', 'Topology', 'Review'].map((label, index) => {
              const number = index + 1;
              const active = step === number;
              const completed = step > number;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-medium transition-colors ${
                    active ? 'border-black bg-black text-white' : completed ? 'border-zinc-300 bg-zinc-100 text-zinc-500' : 'border-zinc-200 text-zinc-400'
                  }`}>
                    {completed ? '✓' : number}
                  </div>
                  <span className={`hidden text-[10px] font-bold uppercase tracking-wider sm:block ${
                    active ? 'text-black' : 'text-zinc-400'
                  }`}>
                    {label}
                  </span>
                  {number < 3 && <div className="h-px w-4 bg-zinc-200 sm:w-8" />}
                </div>
              );
            })}
          </div>
        </header>

        <form onSubmit={handleSubmit(submitForm)}>
          <div className="min-h-[400px]">
            {step === 1 && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div>
                  <h2 className="text-xl font-medium text-zinc-900">Step 01: Identity</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Provide the personal details of the primary ecosystem administrator.
                  </p>
                </div>
                
                <div className="grid gap-8 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="fullName">Full Name</label>
                    <input className={inputClass} id="fullName" placeholder="Jane Doe" {...register('fullName')} />
                    {errors.fullName && <ErrorText>{errors.fullName.message}</ErrorText>}
                  </div>
                  
                  <div>
                    <label className={labelClass} htmlFor="dob">Date of Birth</label>
                    <input className={inputClass} id="dob" type="date" {...register('dob')} />
                    {errors.dob && <ErrorText>{errors.dob.message}</ErrorText>}
                  </div>
                  
                  <div className="sm:col-span-2">
                    <span className={labelClass}>Gender</span>
                    <div className="flex flex-wrap gap-3">
                      {genderOptions.map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setValue('gender', value, { shouldValidate: true })}
                          className={`rounded-xl border px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider transition-all ${
                            selectedGender === value
                              ? 'border-black bg-zinc-50 text-black shadow-sm ring-1 ring-black'
                              : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {errors.gender && <ErrorText>{errors.gender.message}</ErrorText>}
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
                <div>
                  <h2 className="text-xl font-medium text-zinc-900">Step 02: Enterprise Topology</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Define the business verticals and physical branches within your ecosystem.
                  </p>
                </div>
                
                <div>
                  <span className={labelClass}>Operating Verticals</span>
                  <div className="flex flex-wrap gap-3">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className={`rounded-xl border px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider transition-all ${
                          selectedCategories.includes(category)
                            ? 'border-black bg-zinc-50 text-black shadow-sm ring-1 ring-black'
                            : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  {errors.categories && <ErrorText>{errors.categories.message}</ErrorText>}
                </div>

                <div className="space-y-6">
                  {fields.map((field, index) => (
                    <div key={field.id} className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 sm:p-8">
                      <div className="mb-6 flex items-center justify-between border-b border-zinc-200 pb-4">
                        <h3 className="font-serif text-lg text-zinc-900">
                          Branch Facility {String(index + 1).padStart(2, '0')}
                        </h3>
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-700"
                          >
                            Remove Branch
                          </button>
                        )}
                      </div>
                      
                      <div className="grid gap-6 sm:grid-cols-2">
                        <Field label="Registered Business Name" error={errors.businesses?.[index]?.businessName?.message}>
                          <input className={inputClass} placeholder="e.g. Venus Cafe Pvt Ltd" {...register(`businesses.${index}.businessName`)} />
                        </Field>
                        <Field label="GST / Tax Number (Optional)" error={errors.businesses?.[index]?.gstNumber?.message}>
                          <input className={inputClass} placeholder="Alphanumeric ID" {...register(`businesses.${index}.gstNumber`)} />
                        </Field>
                        <Field label="Postal / PIN Code" error={errors.businesses?.[index]?.pincode?.message}>
                          <input
                            className={inputClass}
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="6-digit code"
                            {...register(`businesses.${index}.pincode`)}
                            onChange={(event) => handlePincodeChange(index, event.target.value)}
                          />
                        </Field>
                        <Field label="State / Province" error={errors.businesses?.[index]?.state?.message}>
                          <input className={inputClass} placeholder="State" {...register(`businesses.${index}.state`)} />
                        </Field>
                        <Field label="City / District" error={errors.businesses?.[index]?.city?.message}>
                          <input className={inputClass} placeholder="City" {...register(`businesses.${index}.city`)} />
                        </Field>
                        <div className="sm:col-span-2">
                          <Field label="Complete Facility Address" error={errors.businesses?.[index]?.address?.message}>
                            <textarea className={`${inputClass} min-h-24 resize-y`} placeholder="Street, Building, Floor..." {...register(`businesses.${index}.address`)} />
                          </Field>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={() => append(emptyBusiness)}
                  className="w-full rounded-2xl border-2 border-dashed border-zinc-200 bg-white py-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700"
                >
                  + Add Additional Branch Facility
                </button>
              </section>
            )}

            {step === 3 && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div>
                  <h2 className="text-xl font-medium text-zinc-900">Step 03: Cryptographic Review</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Verify your ecosystem topology before we commit records to the secure ledger.
                  </p>
                </div>
                
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8">
                  <div className="grid gap-y-6 sm:grid-cols-2 sm:gap-x-12">
                    <Summary label="Administrator Name" value={values.fullName} />
                    <Summary label="Administrator DOB" value={values.dob} />
                    <Summary label="Selected Verticals" value={values.categories.join(', ')} />
                    <Summary label="Total Facilities" value={String(values.businesses.length)} />
                  </div>
                  
                  <div className="mt-8 border-t border-zinc-200 pt-8">
                    <p className={labelClass}>Facility Directory</p>
                    <div className="mt-4 space-y-4">
                      {values.businesses.map((business, index) => (
                        <div key={index} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                          <p className="font-medium text-zinc-900">{business.businessName || 'Unnamed Facility'}</p>
                          <p className="mt-1 text-sm text-zinc-500">
                            {business.address || 'No address'} • {business.city || 'City pending'}, {business.state || 'State pending'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {submitError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-600">{submitError}</p>
                  </div>
                )}
              </section>
            )}
          </div>

          <div className="mt-12 flex items-center justify-between border-t border-zinc-100 pt-8">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((current) => current - 1)}
                className="rounded-xl border border-zinc-200 px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              >
                Go Back
              </button>
            ) : (
              <span />
            )}
            
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="rounded-xl bg-black px-8 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:bg-zinc-800 hover:shadow-lg hover:shadow-black/10"
              >
                Continue to Next Step
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="relative overflow-hidden rounded-xl bg-black px-8 py-3.5 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:bg-zinc-800 hover:shadow-lg hover:shadow-black/10 disabled:cursor-not-allowed disabled:bg-zinc-400 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-3">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Committing to Ledger...
                  </span>
                ) : (
                  'Deploy Quad Ecosystem'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

type ProvisioningResponse = {
  uniqueOwnerCafeId: string;
  controlCenterUrl: string;
  businesses: Array<HostOnboardingForm['businesses'][number] & {
    locationId: string;
    qrCodeHash: string;
  }>;
};

function toCategoryHandled(category: string | undefined): CategoryHandled {
  const normalized = category?.toLowerCase() || '';
  if (normalized.includes('dine') || normalized.includes('restaurant')) return 'restaurant';
  if (normalized.includes('stay') || normalized.includes('hotel')) return 'resort';
  if (normalized.includes('agri') || normalized.includes('estate')) return 'estate';
  return 'cafe';
}

function ErrorText({ children }: { children?: string }) {
  return <p className="mt-2 text-xs font-medium text-red-500">{children}</p>;
}

function Field({
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

function Summary({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <p className="mt-1 font-medium text-zinc-900">{value || '—'}</p>
    </div>
  );
}
