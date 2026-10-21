'use client';

import React from 'react';
import Link from 'next/link';
import { useSelfCheckIn, type Step } from './useSelfCheckIn';
import { StayShell, StayNotice, StaySkeleton, stayButton } from '../StayShell';
import { PassGate } from './PassGate';
import { PaidSummary } from './PaidSummary';
import { GuestDetailsFields } from './GuestDetailsFields';
import { IdProofCapture } from './IdProofCapture';
import { ConfirmStep } from './ConfirmStep';

const STEPS: Array<{ id: Step; label: string }> = [{ id: 'guest', label: 'Guest' }, { id: 'id', label: 'ID photo' }, { id: 'confirm', label: 'Confirm' }];
const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

/** /stay/[venue]/checkin: for a guest whose room is paid. Three short steps, then straight into the room's own page. */
export function SelfCheckInPage({ venueParam }: { venueParam: string }) {
  const c = useSelfCheckIn(venueParam);
  const back = `/stay/${encodeURIComponent(venueParam)}`;
  const title = c.venue?.name;

  if (c.phase === 'loading') return <StayShell eyebrow="Check-in" title={title}><StaySkeleton rows={3} /></StayShell>;
  if (c.phase === 'blocked') {
    return (
      <StayShell eyebrow="Check-in" title={title}>
        <StayNotice tone="warn">{c.message}</StayNotice>
        <div className="mt-6 flex gap-3"><Link href={back} className={stayButton.ghost}>Back to rooms</Link><button type="button" onClick={() => void c.reload()} className={stayButton.ghost}>Try again</button></div>
      </StayShell>
    );
  }
  if (c.phase === 'gate' && c.venue) {
    return (
      <StayShell eyebrow="Check-in" title={title} right={<Link href={back} className="text-xs text-neutral-500 hover:text-neutral-950">Rooms</Link>}>
        <div className="mx-auto max-w-lg"><PassGate venueId={c.venue.id} venueName={c.venue.name} onToken={c.acceptToken} /></div>
      </StayShell>
    );
  }
  if (c.phase === 'used' && c.pass) {
    return (
      <StayShell eyebrow="Check-in" title={title}>
        <div className="mx-auto max-w-lg space-y-4">
          <StayNotice tone="good">You are already checked in. Open your room page with the QR card in the room{c.roomCode ? ', or here:' : '.'}</StayNotice>
          {c.roomCode && <Link href={`/room/${encodeURIComponent(c.roomCode)}`} className={`${stayButton.primary} w-full`}>Open my room</Link>}
        </div>
      </StayShell>
    );
  }
  if (!c.pass) return null;

  const stepIndex = STEPS.findIndex((s) => s.id === c.step);
  return (
    <StayShell eyebrow="Check-in" title={title} right={<Link href={back} className="text-xs text-neutral-500 hover:text-neutral-950">Rooms</Link>}>
      <div className="mx-auto max-w-lg space-y-6">
        <PaidSummary pass={c.pass} venue={c.venue} />
        <ol className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex flex-1 items-center gap-2">
              <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${i <= stepIndex ? 'bg-neutral-950 text-white' : 'border border-neutral-300 text-neutral-500'}`}>{i + 1}</span>
              <span className={`text-xs ${i === stepIndex ? 'text-neutral-950' : 'text-neutral-500'}`}>{s.label}</span>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-neutral-200" />}
            </li>
          ))}
        </ol>
        <div>
          <h2 className="text-3xl font-medium text-neutral-950" style={serif}>
            {c.step === 'guest' && `Welcome, ${c.pass.guest_first_name}`}
            {c.step === 'id' && 'A photo of your ID'}
            {c.step === 'confirm' && 'Ready to check in'}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {c.step === 'guest' && 'Your room is paid. Tell us who is staying.'}
            {c.step === 'id' && 'Required for every stay in India. Seen only by the front desk.'}
            {c.step === 'confirm' && 'One last confirmation, and your room opens.'}
          </p>
        </div>
        {c.error && <StayNotice tone="warn">{c.error}</StayNotice>}
        {c.step === 'guest' && <GuestDetailsFields form={c.form} update={c.update} onNext={() => c.setStep('id')} />}
        {c.step === 'id' && <IdProofCapture uploaded={Boolean(c.idProofPath)} uploading={c.uploading} onFile={c.uploadId} onBack={() => c.setStep('guest')} onNext={() => c.setStep('confirm')} />}
        {c.step === 'confirm' && <ConfirmStep pass={c.pass} form={c.form} update={c.update} busy={c.busy} onBack={() => c.setStep('id')} onSubmit={() => void c.submit()} />}
      </div>
    </StayShell>
  );
}
