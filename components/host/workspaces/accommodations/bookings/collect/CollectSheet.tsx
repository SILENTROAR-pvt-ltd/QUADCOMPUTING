'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { RoomCategory } from '@/types';
import type { StaySettings } from '../useStaySettings';
import { useCollect, type CollectSpec, type Step } from './useCollect';
import { WalkInForm } from './WalkInForm';
import { ReviewStep } from './ReviewStep';
import { PayStep } from './PayStep';
import { DoneStep } from './DoneStep';

interface Props {
  spec: CollectSpec; categories: RoomCategory[]; settings: StaySettings | null; onClose: () => void; onToast: (msg: string) => void;
  /** Called once money has been recorded, so the lists behind the sheet refresh. */
  onRecorded: () => void;
}

const TITLE: Record<Step, string> = { details: 'New stay', review: 'Room payment', pay: 'Take payment', done: 'Bill & check-in link' };
const ROOM_TITLE: Record<Step, string> = { details: 'Payment', review: 'What is owed now', pay: 'Take payment', done: 'Payment recorded' };
const ORDER: Step[] = ['details', 'review', 'pay', 'done'];

/** The desk takes a room payment: review what is owed, take it direct (UPI, cash, card), confirm, and hand the guest their check-in link. */
export function CollectSheet({ spec, categories, settings, onClose, onToast, onRecorded }: Props) {
  const c = useCollect(spec);
  const isPass = spec.kind === 'pass';
  const name = settings?.business_name || 'the venue';
  const code = c.booking?.confirmation_code || '';
  const steps = ORDER.filter((s) => (isPass && !c.booking ? true : s !== 'details'));
  const title = (spec.kind === 'room' ? ROOM_TITLE : TITLE)[c.step];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !c.busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, c.busy]);
  useEffect(() => { if (c.step === 'done' && c.receipt && !(isPass && spec.showLink)) onRecorded(); }, [c.step, c.receipt]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-neutral-950/40 p-0 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-6">
      <div className="fixed inset-0" onClick={() => { if (!c.busy) onClose(); }} />
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`relative z-10 flex max-h-[94vh] w-full ${c.step === 'done' ? 'max-w-2xl' : 'max-w-lg'} flex-col overflow-hidden rounded-t-3xl border border-neutral-200 bg-neutral-50 text-neutral-900 shadow-2xl sm:rounded-3xl`}>
        <header className="flex items-start justify-between gap-4 border-b border-neutral-200 bg-white px-6 py-4">
          <div>
            <h2 className="font-serif text-xl text-neutral-950">{title}</h2>
            <ol className="mt-1.5 flex items-center gap-1.5" aria-label="Progress">
              {steps.map((s) => <li key={s} aria-current={s === c.step ? 'step' : undefined} className={`h-1.5 w-8 rounded-full ${steps.indexOf(s) <= steps.indexOf(c.step) ? 'bg-neutral-950' : 'bg-neutral-200'}`} />)}
            </ol>
          </div>
          <button type="button" onClick={onClose} disabled={c.busy} aria-label="Close" className="cursor-pointer rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 disabled:opacity-40"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {c.step === 'details' && <WalkInForm walk={c.walk} categories={categories} onChange={c.setWalk} onNext={() => c.setStep('review')} />}
          {c.step === 'review' && (
            <ReviewStep quote={c.quote} error={c.error} policies={settings?.stay_policies || null} earlyId={c.earlyId} canPickEarly={isPass} onEarly={c.setEarlyId} onRetry={() => void c.requote()} onNext={() => (c.quote && c.quote.amount === 0 ? void c.confirm() : c.setStep('pay'))} />
          )}
          {c.step === 'pay' && c.quote && (
            <PayStep quote={c.quote} tender={c.tender} reference={c.reference} received={c.received} busy={c.busy} error={c.error} upiId={settings?.upi_id || null} businessName={name} code={code}
              cashGiven={c.cashGiven} onCashGiven={c.setCashGiven}
              onTender={c.setTender} onReference={c.setReference} onReceived={c.setReceived} onBack={() => c.setStep('review')} onConfirm={() => void c.confirm()} />
          )}
          {c.step === 'done' && <DoneStep receipt={c.receipt} businessName={name} upiId={settings?.upi_id || null} onCopy={onToast} onClose={onClose} />}
          {c.step === 'done' && !c.receipt && c.error && <p role="alert" className="mt-3 text-sm text-rose-700">{c.error}</p>}
        </div>
      </div>
    </div>
  );
}
