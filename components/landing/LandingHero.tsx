import Link from 'next/link';
import { ArrowRight, QrCode } from 'lucide-react';
import { HeroProductPreview } from './HeroProductPreview';
import { BTN_PRIMARY, BTN_SECONDARY, CONTAINER, GOLD } from './landing-styles';

const FACTS = [
  { value: '10', label: 'host workspaces' },
  { value: '1 QR', label: 'per table, no app' },
  { value: 'Live', label: 'sync across devices' },
];

export function LandingHero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(55%_60%_at_50%_0%,rgba(200,169,106,0.16),transparent_70%)]" />
      <div className={`${CONTAINER} relative grid gap-14 pb-20 pt-14 md:pt-20 lg:grid-cols-[1.02fr_1fr] lg:items-center`}>
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#e6d5b0] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
            Restaurants · Cafés · Stays
          </p>
          <h1 id="hero-title" className="font-editorial mt-6 text-[2.5rem] leading-[1.06] text-black sm:text-[3.6rem]">
            Run the whole house from one screen.
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-zinc-600 sm:text-base">
            Quad Computing is the operating system for hospitality: billing, live tables, kitchen tickets, rooms,
            inventory and reports in one control centre. Your guests get <strong className="font-semibold text-black">Vibers Connect</strong>:
            scan the table QR to order, track every dish, call staff, join the lounge and earn cashback.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/onboarding/host" className={BTN_PRIMARY}>
              Create host profile <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href="/auth/host" className={BTN_SECONDARY}>Host login</Link>
          </div>
          <Link href="/onboarding/guest"
            className="mt-5 inline-flex items-center gap-2 text-[13px] text-zinc-600 underline-offset-4 transition-colors hover:text-black hover:underline">
            <QrCode aria-hidden="true" className="h-4 w-4" /> I&apos;m a guest: open Vibers Connect
          </Link>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-black/[0.07] pt-6">
            {FACTS.map((f) => (
              <div key={f.label}>
                <dt className="sr-only">{f.label}</dt>
                <dd className="font-editorial text-2xl text-black">{f.value}</dd>
                <dd aria-hidden="true" className="mt-1 text-[12px] leading-snug text-zinc-500">{f.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <HeroProductPreview />
      </div>
    </section>
  );
}
