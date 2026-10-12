'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Heading, Notice, Spinner } from '../ui';
import { AuthPanel } from '../AuthPanel';
import { clubFetch } from '../api';
import { useClubMeLoader } from '../club-context';
import { CAMPAIGN_KEY } from '../landing/JoinHero';
import { EMPTY_FORM, STEPS, stepError, type ApplyForm } from './apply-form';
import { StepAbout, adultCutoff } from './StepAbout';
import { StepPhone } from './StepPhone';
import { StepIdentity } from './StepIdentity';

/** The gated application: account → about you (18+) → verified phone → identity → review. */
export function ApplyFlow() {
  const { state, refresh } = useClubMeLoader();
  const [form, setForm] = useState<ApplyForm>(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [askPin, setAskPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (patch: Partial<ApplyForm>) => setForm((f) => ({ ...f, ...patch }));

  const me = state.status === 'ready' ? state.me : null;
  useEffect(() => {
    if (me?.viberId) set({ viber_id: me.viberId });
    const p = me?.profile;
    if (p) set({ city: p.city || '', state: p.state || '', country: p.country || 'India', account_type: p.account_type, business_name: p.business_name || '', alias: p.alias || '', alias_masked: Boolean(p.alias_masked), vibe_line: p.vibe_line || '' });
  }, [me?.viberId, me?.profile]);

  if (state.status === 'loading') return <Spinner />;
  if (state.status === 'error') return <Notice>{state.error}</Notice>;
  if (!me?.signedIn) return <AuthPanel onDone={refresh} intro="Step 1 of 4: your Vibers account. If you use Quad Computing or a Vibers property, sign in with the same email." />;
  if (done || (me.profile && me.profile.status !== 'rejected')) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <Heading level={1} kicker="Application" title={me.profile?.status === 'approved' ? 'You are already in' : 'Application received'}>
          {me.profile?.status === 'approved' ? 'Your Club Visa is waiting.' : 'A real person will review it soon. We will notify you in the club.'}
        </Heading>
        <Link href="/club"><Button tone="aura">Go to the club</Button></Link>
      </Card>
    );
  }

  const next = async () => {
    const problem = stepError(step, form, adultCutoff());
    if (problem) return setError(problem);
    setError('');
    if (step < STEPS.length - 1) return setStep(step + 1);
    setBusy(true);
    let campaign: string | null = null;
    try { campaign = localStorage.getItem(CAMPAIGN_KEY); } catch {}
    const res = await clubFetch('/apply', { body: { ...form, viber_id: form.viber_id.replace(/^@/, ''), campaign, legacy_pin: askPin ? form.legacy_pin : undefined } });
    setBusy(false);
    if (res.ok) { setDone(true); void refresh(); return; }
    if (res.code === 'legacy_pin_required') setAskPin(true);
    if (res.code === 'phone_unverified') { set({ phone_verified: false }); setStep(1); }
    setError(res.error);
  };

  return (
    <div className="mx-auto max-w-xl">
      <Heading level={1} kicker={`Step ${step + 2} of 4 · ${STEPS[step]}`} title="Apply for your Club Visa">
        Signed in as {me.user?.email}. Your answers stay private; members see only what is on your profile.
      </Heading>
      <ol aria-label="Progress" className="mb-6 flex gap-1.5">
        {STEPS.map((s, i) => <li key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-[#c8da4a]' : 'bg-[#14261b]/10'}`}><span className="sr-only">{s}</span></li>)}
      </ol>
      {process.env.NODE_ENV !== 'production' && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-[#3c6b2b]/25 bg-[#e1efe3] p-3 text-xs text-[#14261b]/80">
          <div>
            <span className="font-bold text-[#3c6b2b]">⚡ Localhost Dev:</span> Skip application & enter club directly
          </div>
          <Button
            type="button"
            tone="aura"
            className="text-xs shrink-0 py-1.5 px-3"
            busy={busy}
            onClick={async () => {
              setBusy(true);
              const res = await clubFetch('/dev-bypass');
              setBusy(false);
              if (res.ok) {
                await refresh();
                window.location.href = '/club';
              } else {
                setError(res.error);
              }
            }}
          >
            Enter Club Directly ➔
          </Button>
        </div>
      )}
      <Card>
        {step === 0 && <StepAbout form={form} set={set} />}
        {step === 1 && <StepPhone form={form} set={set} />}
        {step === 2 && <StepIdentity form={form} set={set} lockedId={me.viberId ?? null} askPin={askPin} />}
        <div className="mt-5 space-y-3">
          <Notice>{error}</Notice>
          <div className="flex items-center justify-between gap-3">
            <Button type="button" tone="quiet" onClick={() => { setError(''); setStep(Math.max(0, step - 1)); }} disabled={step === 0}>Back</Button>
            <Button type="button" tone={step === STEPS.length - 1 ? 'aura' : 'ink'} busy={busy} onClick={next}>{step === STEPS.length - 1 ? 'Submit application' : 'Continue'}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
