'use client';

import React from 'react';
import Link from 'next/link';
import { useSelfCheckIn, type Step } from './useSelfCheckIn';
import { StayShell, StayNotice, StaySpinner, stayButton } from '../StayShell';
import { GuestDetailsFields } from './GuestDetailsFields';
import { IdProofCapture } from './IdProofCapture';
import { RoomTypePicker } from './RoomTypePicker';

const STEPS: Array<{ id: Step; label: string }> = [{ id: 'guest', label: 'Guest' }, { id: 'id', label: 'ID photo' }, { id: 'room', label: 'Room' }];

/** /stay/[venue]/checkin: three short steps, then straight into the room's own page. */
export function SelfCheckInPage({ venueParam }: { venueParam: string }) {
  const c = useSelfCheckIn(venueParam);
  const back = `/stay/${encodeURIComponent(venueParam)}`;

  if (c.loading) return <StayShell><StaySpinner label="Opening the venue" /></StayShell>;
  if (c.loadError || !c.venue) {
    return <StayShell><div className="py-16 text-center"><p className="text-sm text-neutral-400">{c.loadError}</p><button type="button" onClick={() => void c.reload()} className={`${stayButton.ghost} mt-6`}>Try again</button></div></StayShell>;
  }
  if (!c.venue.self_checkin_enabled) {
    return (
      <StayShell eyebrow="Self check-in" title={c.venue.name}>
        <StayNotice tone="warn">This venue checks guests in at the desk. Please ask for the front desk.</StayNotice>
        <Link href={back} className={`${stayButton.ghost} mt-6`}>Back to rooms</Link>
      </StayShell>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === c.step);
  return (
    <StayShell eyebrow="Self check-in" title={c.venue.name} right={<Link href={back} className="text-xs text-neutral-400 hover:text-white">Rooms</Link>}>
      <div className="mx-auto max-w-lg">
        <ol className="mb-6 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex flex-1 items-center gap-2">
              <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${i <= stepIndex ? 'bg-white text-neutral-950' : 'border border-neutral-700 text-neutral-500'}`}>{i + 1}</span>
              <span className={`text-xs ${i === stepIndex ? 'text-white' : 'text-neutral-500'}`}>{s.label}</span>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-neutral-800" />}
            </li>
          ))}
        </ol>

        <h2 className="font-serif text-3xl font-light text-white">
          {c.step === 'guest' && 'Who is staying?'}
          {c.step === 'id' && 'A photo of your ID'}
          {c.step === 'room' && 'Choose your room'}
          {c.step === 'done' && 'Welcome'}
        </h2>
        <p className="mb-6 mt-1 text-sm text-neutral-400">
          {c.step === 'guest' && 'Nothing is paid now. Your bill is settled at checkout.'}
          {c.step === 'id' && 'Required for every stay in India. Seen only by the front desk.'}
          {c.step === 'room' && 'Rooms free right now, or the code from your reservation.'}
          {c.step === 'done' && 'Taking you to your room…'}
        </p>

        {c.error && <StayNotice tone="warn">{c.error}</StayNotice>}
        <div className={c.error ? 'mt-4' : ''}>
          {c.step === 'guest' && <GuestDetailsFields form={c.form} update={c.update} idTypes={c.ID_TYPES} onNext={() => c.setStep('id')} />}
          {c.step === 'id' && <IdProofCapture uploaded={Boolean(c.idProofPath)} uploading={c.uploading} onFile={c.uploadId} onBack={() => c.setStep('guest')} onNext={() => c.setStep('room')} />}
          {c.step === 'room' && <RoomTypePicker types={c.types} form={c.form} update={c.update} busy={c.busy} onBack={() => c.setStep('id')} onSubmit={() => void c.submit()} />}
          {c.step === 'done' && <StaySpinner label="Opening your room" />}
        </div>
      </div>
    </StayShell>
  );
}
