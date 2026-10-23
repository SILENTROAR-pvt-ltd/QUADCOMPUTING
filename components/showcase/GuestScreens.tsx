'use client';

import React, { useEffect, useState } from 'react';
import { TrackerTimeline } from '@/components/guest/menu/TrackerTimeline';
import { BillLines } from '@/components/guest/menu/bill/BillLines';
import { BillTotals } from '@/components/guest/menu/bill/BillTotals';
import { WalletBalanceCard } from '@/components/guest/lobby/wallet/WalletBalanceCard';
import { DEMO_VENUE } from '@/lib/showcase/demo-orders';
import { GuestMenuScreen } from './GuestMenuScreen';
import { VibeyScreen } from './VibeyScreen';
import { LoungeScreen } from './LoungeScreen';
import { ServicesScreen } from './ServicesScreen';

const lines = [
  { id: 'l1', itemName: 'Cappuccino', quantity: 2, unitPrice: 180, lineTotal: 360, notes: null },
  { id: 'l2', itemName: 'Avocado Toast', quantity: 1, unitPrice: 320, lineTotal: 320, notes: 'No chilli flakes' },
  { id: 'l3', itemName: 'Tiramisu', quantity: 1, unitPrice: 280, lineTotal: 280, notes: null },
];
const STATUS = ['pending', 'cooking', 'ready'];

declare global { interface Window { __showcaseStep?: (step: number) => void } }

/** The live order: the kitchen moves it along (the recorder sets the step through window.__showcaseStep), then the bill. */
const Tracker = () => {
  const [step, setStep] = useState(0);
  useEffect(() => { window.__showcaseStep = setStep; return () => { delete window.__showcaseStep; }; }, []);
  return (
    <div className="min-h-screen space-y-4 bg-white p-4">
      <div className="rounded-3xl border border-zinc-200 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Table T-04 · KOT #142</p>
        <div className="mt-3"><TrackerTimeline currentStep={step} status={STATUS[step]} /></div>
      </div>
      <div className="rounded-3xl border border-zinc-200 p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Your bill</p>
        <BillLines lines={lines} />
        <BillTotals subtotal={960} gst={48} payable={1008} />
      </div>
      <WalletBalanceCard cafeName={DEMO_VENUE.name} tableNumber="T-04"
        wallet={{ id: 'w1', guest_id: 'g1', business_id: DEMO_VENUE.id, balance: 214.4, total_cashback_earned: 284.96, updated_at: '2026-10-15T14:00:00.000Z', wallet_code: 'QW-7J4T2K9A' }} />
    </div>
  );
};

/** Each guest (phone) screen, by its id. */
export const GUEST_SCREENS: Record<string, () => React.ReactElement> = {
  'guest-menu': GuestMenuScreen, 'guest-tracker': Tracker, 'guest-vibey': VibeyScreen, 'guest-lounge': LoungeScreen, 'guest-services': ServicesScreen,
};
