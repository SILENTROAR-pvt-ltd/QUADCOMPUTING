import type { Metadata } from 'next';
import { VibersNav } from '@/components/vibers/VibersNav';
import { VibersHero } from '@/components/vibers/VibersHero';
import { VibeBand } from '@/components/vibers/VibeBand';
import { WhoWeAre } from '@/components/vibers/WhoWeAre';
import { VibeProtocol } from '@/components/vibers/VibeProtocol';
import { StayJourney } from '@/components/vibers/StayJourney';
import { SevenPercentPromise } from '@/components/vibers/SevenPercentPromise';
import { BeyondCheckout } from '@/components/vibers/BeyondCheckout';
import { CommunitySection } from '@/components/vibers/CommunitySection';
import { TeamSection } from '@/components/vibers/TeamSection';
import { JoinAndFooter } from '@/components/vibers/JoinAndFooter';
import { BODY } from '@/components/vibers/vibers-fonts';
import { SITE } from '@/components/vibers/vibers-brand';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: 'Vibers Connect · Find your vibe. Find your people. Find yourself.',
  description:
    'Verified stays, honest prices, 7% cashback with no expiry and a toxic-free community. The place where you don’t have to fit in. You just have to be you.',
  openGraph: {
    title: 'Vibers Connect',
    description: 'Find your vibe. Find your people. Find yourself.',
    url: SITE.url,
    siteName: SITE.name,
    type: 'website',
  },
};

export default function VibersConnectHome() {
  return (
    <div className={`${BODY} relative min-h-screen bg-[#fff7f0] bg-[radial-gradient(60rem_40rem_at_0%_0%,rgba(255,106,61,0.14),transparent_70%),radial-gradient(50rem_40rem_at_100%_10%,rgba(124,58,237,0.12),transparent_70%)] text-[#2a1250] selection:bg-[#ff2e88] selection:text-white`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[#7c3aed] focus:px-4 focus:py-2 focus:text-sm focus:text-white">
        Skip to content
      </a>
      <div className="relative z-10">
        <VibersNav />
        <main id="main">
          <VibersHero />
          <VibeBand />
          <WhoWeAre />
          <VibeProtocol />
          <StayJourney />
          <SevenPercentPromise />
          <BeyondCheckout />
          <CommunitySection />
          <TeamSection />
        </main>
        <JoinAndFooter />
      </div>
    </div>
  );
}
