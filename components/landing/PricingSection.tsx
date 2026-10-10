import Link from 'next/link';
import { Check } from 'lucide-react';
import { PAYG_FEES, PLANS } from '@/lib/services/wallet/plans';
import { BTN_PRIMARY, BTN_SECONDARY, CONTAINER, EYEBROW, H2, LEAD, SECTION } from './landing-styles';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** Prices come from the same plan catalogue the Wallet uses, so this page can never disagree with checkout. */
export function PricingSection() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className={`${SECTION} bg-white`}>
      <div className={CONTAINER}>
        <p className={EYEBROW}>Pricing</p>
        <h2 id="pricing-title" className={H2}>Simple yearly plans.</h2>
        <p className={LEAD}>Each plan covers 12 months, with free months added on top. Plans are activated from the Wallet in your control centre.</p>

        <ul className="mt-12 grid gap-5 lg:grid-cols-3">
          {PLANS.map((p) => (
            <li key={p.id}
              className={`relative flex flex-col rounded-3xl border p-7 ${p.popular ? 'border-[#c8a96a] bg-[#fdfbf6] shadow-[0_20px_50px_-30px_rgba(138,109,59,0.55)]' : 'border-black/10 bg-white'}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-editorial text-2xl text-black">{p.name}</h3>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${p.popular ? 'bg-black text-white' : 'border border-black/10 text-zinc-600'}`}>{p.badge}</span>
              </div>
              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="font-editorial text-4xl text-black">{inr(p.price)}</span>
                <span className="text-[13px] text-zinc-500">/ year</span>
              </p>
              <p className="mt-1 text-[13px] font-medium text-[#8a6d3b]">12 months + {p.bonusMonths} months free</p>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[14px] text-zinc-800">
                    <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-black" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/onboarding/host" className={`mt-8 ${p.popular ? BTN_PRIMARY : BTN_SECONDARY}`}>Start with {p.name}</Link>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-3xl border border-black/10 bg-[#faf9f6] p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <h3 className="text-[15px] font-semibold text-black">No plan? Pay as you go.</h3>
            <p className="text-[13px] text-zinc-500">Small fees from your prepaid credit wallet. No monthly charge.</p>
          </div>
          <ul className="mt-5 flex flex-wrap gap-2">
            {PAYG_FEES.map((f) => (
              <li key={f.label} className="rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-[13px] text-zinc-700">
                {f.label} <span className="font-semibold text-black">{f.amount > 0 ? inr(f.amount) : 'Free'}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
