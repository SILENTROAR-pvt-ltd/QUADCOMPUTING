'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { AuthShell } from '@/components/host/auth/AuthShell';
import { OnboardingStepper } from '@/components/host/onboarding/OnboardingStepper';
import { IdentityStep } from '@/components/host/onboarding/IdentityStep';
import { VenueStep } from '@/components/host/onboarding/VenueStep';
import { ReviewStep } from '@/components/host/onboarding/ReviewStep';
import { useHostOnboarding } from '@/components/host/onboarding/useHostOnboarding';

export default function HostOnboardingPage() {
  const o = useHostOnboarding();
  const submitting = o.form.formState.isSubmitting;

  return (
    <AuthShell
      aside={
        <p className="text-sm text-neutral-600">
          Already a host?{' '}
          <Link href="/auth/host" className="font-semibold text-neutral-950 underline-offset-4 hover:underline">Sign in</Link>
        </p>
      }
    >
      <div className="w-full max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6d3b]">Create host profile</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-neutral-950">Set up your venue</h1>
        <p className="mt-2 text-sm text-neutral-500">Three short steps. Your control centre opens as soon as you finish.</p>

        <div className="mt-8"><OnboardingStepper step={o.step} /></div>

        <form className="mt-6" onSubmit={(e) => { e.preventDefault(); if (o.step === 3) void o.submit(e); else void o.next(); }} noValidate>
          {o.step === 1 && <IdentityStep form={o.form} />}
          {o.step === 2 && <VenueStep form={o.form} businesses={o.businesses} onPincode={o.onPincode} />}
          {o.step === 3 && (
            <ReviewStep values={o.form.getValues()} startPlan={o.startPlan} onStartPlan={o.setStartPlan} submitError={o.submitError} onEdit={o.setStep} />
          )}

          <div className="sticky bottom-4 z-20 mt-6 flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            {o.step > 1 ? (
              <button type="button" onClick={o.back} disabled={submitting}
                className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 cursor-pointer">
                <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back
              </button>
            ) : (
              <Link href="/quad-computing" className="inline-flex h-11 items-center px-4 text-sm font-semibold text-neutral-500 hover:text-neutral-950">Cancel</Link>
            )}
            <button type="submit" disabled={submitting}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-neutral-950 px-6 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
              {submitting ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Creating your venue…</>
                : o.step === 3 ? 'Create my venue' : <>Continue <ArrowRight aria-hidden="true" className="h-4 w-4" /></>}
            </button>
          </div>
        </form>
      </div>
    </AuthShell>
  );
}
