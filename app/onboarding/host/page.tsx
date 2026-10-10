'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import type { FieldPath } from 'react-hook-form';
import {
  hostOnboardingSchema,
  type HostOnboardingForm,
} from '@/lib/validations/onboarding';
import { createClient } from '@/lib/supabase/client';
import { emptyBusiness } from '@/components/host/onboarding/onboarding.constants';
import {
  IdentityStep,
  EnterprisePortfolioStep,
  ReviewProvisioningStep,
} from '@/components/host/onboarding/OnboardingStepComponents';

export default function HostOnboardingPage() {
  const router = useRouter();
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
      email: '',
      password: '',
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
      step === 1 ? ['fullName', 'email', 'password', 'gender', 'dob'] : ['categories', 'businesses'];
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
      const response = await fetch(`https://api.postalpincode.in/pincode/${normalizedPincode}`);
      const data = await response.json();
      const postOffice = data?.[0]?.PostOffice?.[0];
      if (data?.[0]?.Status === 'Success' && postOffice) {
        setValue(`businesses.${index}.city`, postOffice.District, { shouldValidate: true });
        setValue(`businesses.${index}.state`, postOffice.State, { shouldValidate: true });
      }
    } catch {
      // The fields remain editable if lookup fails
    }
  }

  async function submitForm(data: HostOnboardingForm) {
    setSubmitError('');
    try {
      const supabase = createClient();

      // 1. Create the real account first — provisioning needs a genuine
      // auth.users row to attach profiles/businesses to (see guards.ts).
      // Skip this if the browser already carries a session for a user that
      // STILL EXISTS: a signed-in host with zero businesses yet (e.g.
      // redirected here from Control Center) should go straight to
      // provisioning rather than attempting signUp again. Deliberately using
      // getUser() here, not getSession() — getSession() only reads the
      // locally cached token and returns "truthy" even after the underlying
      // auth.users row has been deleted (e.g. a DB reset), which then made
      // provisioning fail with a confusing 401 for a session that looked
      // valid client-side but wasn't anymore.
      const { data: existingUser, error: existingUserErr } = await supabase.auth.getUser();

      if (existingUserErr || !existingUser.user) {
        // Clear any stale local session before signing up fresh, so a
        // leftover cookie from a deleted account can't interfere.
        await supabase.auth.signOut();
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        });

        if (signUpError) {
          setSubmitError(
            signUpError.message?.toLowerCase().includes('already registered')
              ? 'An account already exists for this email. Please sign in instead.'
              : signUpError.message || 'We could not create your account. Please try again.'
          );
          return;
        }

        if (!signUpData.session) {
          // Supabase project requires email confirmation before a session is
          // issued — there is no session yet to provision a business under.
          setSubmitError(
            'Check your email to confirm your account, then sign in to finish setting up your venue.'
          );
          return;
        }
      }

      // 2. Provision the business under the now-real, session-backed host id.
      const response = await fetch('/api/host/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const provisioning = await response.json();
      if (!response.ok || !provisioning.success) {
        throw new Error(provisioning.error || 'Provisioning request failed');
      }
      sessionStorage.setItem('quad-provisioning', JSON.stringify(provisioning));
      router.push(provisioning.controlCenterUrl || provisioning.dashboardUrl || '/host/control-center');
    } catch (err: any) {
      setSubmitError(err?.message || 'We could not initialize the dashboard. Please try again.');
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white md:py-16 selection:bg-white selection:text-black">
      <div className="mx-auto max-w-3xl rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-xl md:p-10">
        <header className="border-b border-neutral-800 pb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400">
            Quad Computing / Host Entry
          </p>
          <h1 className="mt-4 font-serif text-2xl font-normal text-white md:text-3xl">
            Create Host Profile
          </h1>
          <div className="mt-8 grid grid-cols-3 gap-2">
            {['Identity', 'Enterprise', 'Provision'].map((label, index) => {
              const number = index + 1;
              const active = number <= step;
              return (
                <div key={label} className="flex items-center gap-2 rounded-full border border-neutral-800 px-3 py-2">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                      active ? 'border-white bg-white text-neutral-950 font-bold' : 'border-neutral-700 text-neutral-500'
                    }`}
                  >
                    {number}
                  </span>
                  <span
                    className={`hidden text-[10px] uppercase tracking-[0.12em] sm:block ${
                      active ? 'text-white' : 'text-neutral-500'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </header>

        <form className="pt-8" onSubmit={handleSubmit(submitForm)}>
          {step === 1 && (
            <IdentityStep
              register={register}
              errors={errors}
              selectedGender={selectedGender}
              onSelectGender={(val) => setValue('gender', val, { shouldValidate: true })}
            />
          )}

          {step === 2 && (
            <EnterprisePortfolioStep
              register={register}
              errors={errors}
              selectedCategories={selectedCategories}
              onToggleCategory={toggleCategory}
              fields={fields}
              append={append}
              remove={remove}
              onPincodeChange={handlePincodeChange}
            />
          )}

          {step === 3 && <ReviewProvisioningStep values={values} submitError={submitError} />}

          <div className="mt-10 flex items-center justify-between border-t border-neutral-800 pt-6">
            {step > 1 ? (
              <button
                className="h-11 rounded-xl border border-neutral-800 px-5 text-[10px] uppercase tracking-[0.18em] text-neutral-400 hover:border-neutral-700 hover:text-white cursor-pointer"
                onClick={() => setStep((current) => current - 1)}
                type="button"
              >
                Back
              </button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <button
                className="h-11 rounded-xl bg-white px-6 text-[10px] uppercase tracking-[0.18em] font-bold text-neutral-950 hover:bg-neutral-200 cursor-pointer"
                onClick={nextStep}
                type="button"
              >
                Continue
              </button>
            ) : (
              <button
                className="h-11 rounded-xl bg-white px-6 text-[10px] uppercase tracking-[0.18em] font-bold text-neutral-950 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border border-neutral-950/30 border-t-neutral-950" />
                    Initializing...
                  </span>
                ) : (
                  'Initialize Quad Ecosystem'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
