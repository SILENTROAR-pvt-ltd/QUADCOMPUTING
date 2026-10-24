'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { hostOnboardingSchema, type HostOnboardingForm } from '@/lib/validations/onboarding';
import { emptyBusiness } from './onboarding.constants';
import { createHostAccount } from './create-host-account';
import { lookupPincode } from './pincode-lookup';
import { defaultStartPlan, type StartPlan } from '@/lib/services/wallet/start-plan';

const STEP_FIELDS: Record<number, FieldPath<HostOnboardingForm>[]> = {
  1: ['fullName', 'email', 'password', 'gender', 'dob'],
  2: ['categories', 'businesses'],
};

/** State and actions for the three-step host sign-up. */
export function useHostOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitError, setSubmitError] = useState('');

  const form = useForm<HostOnboardingForm>({
    resolver: zodResolver(hostOnboardingSchema),
    defaultValues: { fullName: '', email: '', password: '', gender: undefined, dob: '', categories: [], businesses: [emptyBusiness] },
    mode: 'onBlur',
  });
  const businesses = useFieldArray({ control: form.control, name: 'businesses' });

  async function next() {
    if (await form.trigger(STEP_FIELDS[step])) {
      setStep((s) => Math.min(s + 1, 3));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  const back = () => setStep((s) => Math.max(s - 1, 1));

  async function onPincode(index: number, raw: string) {
    const pincode = raw.replace(/\D/g, '').slice(0, 6);
    form.setValue(`businesses.${index}.pincode`, pincode, { shouldValidate: pincode.length === 6, shouldDirty: true });
    const place = await lookupPincode(pincode);
    if (!place) return;
    form.setValue(`businesses.${index}.city`, place.city, { shouldValidate: true });
    form.setValue(`businesses.${index}.state`, place.state, { shouldValidate: true });
  }

  const submit = form.handleSubmit(async (data) => {
    setSubmitError('');
    try {
      const result = await createHostAccount(data);
      if (!result.ok) return setSubmitError(result.error);
      router.push(result.url);
    } catch (err: any) {
      setSubmitError(err?.message || 'We could not set up your venue. Please try again.');
    }
  });

  // The first month: what the host picked, else the default for the venue type (rooms start on Rhodium).
  const startPlan = form.watch('startPlan') ?? defaultStartPlan(form.watch('categories'));
  const setStartPlan = (plan: StartPlan) => form.setValue('startPlan', plan, { shouldDirty: true });

  return { form, businesses, step, setStep, next, back, onPincode, submit, submitError, startPlan, setStartPlan };
}
