import Link from 'next/link';
import { Check } from 'lucide-react';
import { PAYG_BILL_FEE, PER_BILL_PLAN, PLANS } from '@/lib/services/wallet/plans';
import { BTN_PRIMARY, BTN_SECONDARY, CONTAINER, EYEBROW, H2, LEAD, SECTION } from './landing-styles';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const PAYG_POINTS = [
  'You earn 100% of every bill: no commission on sales',
  'No monthly or yearly charge; the fee comes from prepaid credit',
  'Every feature: rooms, events, delivery, Viber Club and Vibey AI',
  'A due slip for every billing day, and every fee on the Dues screen',
];

/** Prices come from the same plan catalogue the Wallet uses, so this page can never disagree with checkout. */
export function PricingSection() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className={`${SECTION} bg-white`}>
      <div className={CONTAINER}>
        <p className={EYEBROW}>Pricing</p>
        <h2 id="pricing-title" className={H2}>You earn. We earn {inr(PAYG_BILL_FEE)} a bill.</h2>
        <p className={LEAD}>Start on {PER_BILL_PLAN.name}, ₹3 a bill with no monthly charge, or take a yearly plan that removes the bill fee. Plans are activated from the Wallet in your control centre.</p>

        <div className="mt-12 grid gap-6 rounded-3xl border border-[#c8a96a] bg-[#fdfbf6] p-7 shadow-[0_20px_50px_-30px_rgba(138,109,59,0.55)] sm:p-9 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-editorial text-3xl text-black">{PER_BILL_PLAN.name}</h3>
              <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">{PER_BILL_PLAN.badge}</span>
            </div>
            <p className="mt-5 flex items-baseline gap-2">
              <span className="font-editorial text-6xl text-black">{inr(PAYG_BILL_FEE)}</span>
              <span className="text-[14px] text-zinc-600">per settled bill. No monthly fee.</span>
            </p>
            <p className="mt-2 text-[13px] font-medium text-[#8a6d3b]">{inr(PER_BILL_PLAN.setupFee)} one-time setup: profile, menu entry, design and QR</p>
            <Link href="/onboarding/host" className={`mt-7 ${BTN_PRIMARY}`}>Start with {PER_BILL_PLAN.name}</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {PAYG_POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 text-[14px] text-zinc-800">
                <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#8a6d3b]" /> {p}
              </li>
            ))}
          </ul>
        </div>

        <h3 className="font-editorial mt-16 text-2xl text-black">Yearly plans</h3>
        <p className="mt-2 text-[14px] text-zinc-600">Each plan covers 12 months with no bill fee. M¹-Pro and M²-Pro start with a free month; every plan has the {inr(PER_BILL_PLAN.setupFee)} setup once.</p>
        <ul className="mt-6 grid gap-5 lg:grid-cols-3">
          {PLANS.map((p) => (
            <li key={p.id} className="relative flex flex-col rounded-3xl border border-black/10 bg-white p-7">
              <div className="flex items-center justify-between">
                <h4 className="font-editorial text-2xl text-black">{p.name}</h4>
                <span className="rounded-full border border-black/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">{p.badge}</span>
              </div>
              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="font-editorial text-4xl text-black">{inr(p.price)}</span>
                <span className="text-[13px] text-zinc-500">/ year</span>
              </p>
              <p className="mt-1 text-[13px] font-medium text-[#8a6d3b]">
                {[p.trialDays ? `${Math.round(p.trialDays / 30)}-month free trial` : 'Unlimited, one flat fee', p.setupFee ? `₹${p.setupFee} one-time setup` : ''].filter(Boolean).join(' · ')}
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[14px] text-zinc-800">
                    <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-black" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/onboarding/host" className={`mt-8 ${BTN_SECONDARY}`}>Start with {p.name}</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
