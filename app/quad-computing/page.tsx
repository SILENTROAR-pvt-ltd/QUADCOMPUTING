import type { Metadata } from 'next';
import { BODY } from '@/components/vibers/vibers-fonts';
import { QcNav } from '@/components/qc-landing/QcNav';
import { QcHero } from '@/components/qc-landing/hero/QcHero';
import { LiveOrderFlow } from '@/components/qc-landing/flow/LiveOrderFlow';
import { PlaySection } from '@/components/qc-landing/play/PlaySection';
import { GrowthSection } from '@/components/qc-landing/growth/GrowthSection';
import { TourSection } from '@/components/qc-landing/tour/TourSection';
import { WorkspacesSection } from '@/components/qc-landing/workspaces/WorkspacesSection';
import { GuestSection } from '@/components/qc-landing/guests/GuestSection';
import { PricingSection } from '@/components/qc-landing/pricing/PricingSection';
import { LegacyCompare } from '@/components/qc-landing/compare/LegacyCompare';
import { QcClosing } from '@/components/qc-landing/closing/QcClosing';

export const metadata: Metadata = {
  title: 'Quad Computing by Vibers Connect · The operating system for restaurants, cafés and stays',
  description:
    'Billing, live tables, kitchen tickets, rooms, delivery, reservations, stock, vendors and A-to-Z analytics with a full profit and loss. You earn 100% of every bill; we earn ₹3 a settled bill, or one yearly fee.',
};

/** Quad Computing, the Vibers Connect product that venues run on. */
export default function QuadComputingPage() {
  return (
    <div className={`${BODY} min-h-screen bg-[#f6f3ec] text-[#0c0f0d] antialiased selection:bg-[#d9c193] selection:text-[#0c0f0d]`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-[#0c0f0d] focus:px-4 focus:py-2 focus:text-sm focus:text-white">
        Skip to content
      </a>
      <QcNav />
      <main id="main">
        <QcHero />
        <LiveOrderFlow />
        <PlaySection />
        <GrowthSection />
        <TourSection />
        <WorkspacesSection />
        <GuestSection />
        <PricingSection />
        <LegacyCompare />
      </main>
      <QcClosing />
    </div>
  );
}
