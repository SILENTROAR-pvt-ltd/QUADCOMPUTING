import type { Metadata } from 'next';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingHero } from '@/components/landing/LandingHero';
import { EcosystemSection } from '@/components/landing/EcosystemSection';
import { ProductTour } from '@/components/landing/ProductTour';
import { OrderFlowSection } from '@/components/landing/OrderFlowSection';
import { HostModulesSection } from '@/components/landing/HostModulesSection';
import { VibersConnectSection } from '@/components/landing/VibersConnectSection';
import { TrustSection } from '@/components/landing/TrustSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { LandingFooter } from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'Quad Computing by Vibers Connect · The operating system for restaurants, cafés and stays',
  description:
    'Billing, live tables, kitchen tickets, rooms, delivery, reservations, stock, vendors and A-to-Z analytics with a full profit and loss. You earn 100% of every bill; we earn ₹3 a settled bill.',
};

/** Quad Computing, the Vibers Connect product that venues run on. */
export default function QuadComputingPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6] text-black selection:bg-black selection:text-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:text-white">
        Skip to content
      </a>
      <LandingNav />
      <main id="main">
        <LandingHero />
        <EcosystemSection />
        <ProductTour />
        <OrderFlowSection />
        <HostModulesSection />
        <VibersConnectSection />
        <TrustSection />
        <PricingSection />
      </main>
      <LandingFooter />
    </div>
  );
}
