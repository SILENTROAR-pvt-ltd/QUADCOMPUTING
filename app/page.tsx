import type { Metadata } from 'next';
import { VibersNav } from '@/components/vibers/VibersNav';
import { VibersHero } from '@/components/vibers/VibersHero';
import { VibeBand } from '@/components/vibers/VibeBand';
import { WhoWeAre } from '@/components/vibers/WhoWeAre';
import { VibeProtocol } from '@/components/vibers/VibeProtocol';
import { StayJourney } from '@/components/vibers/StayJourney';
import { SevenPercentPromise } from '@/components/vibers/SevenPercentPromise';
import { VenueEngine } from '@/components/vibers/VenueEngine';
import { EarnTogether } from '@/components/vibers/EarnTogether';
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
    'Verified stays, honest prices, 7% cashback with no expiry and a toxic-free community. Venues run on Quad Computing: you earn 100% of every bill, we earn ₹3 a bill.',
  openGraph: {
    title: 'Vibers Connect',
    description: 'Find your vibe. Find your people. Find yourself.',
    url: SITE.url,
    siteName: SITE.name,
    type: 'website',
  },
};

/** The Vibers Connect home, told as one story in ten chapters: the people, the promise, the stay, and the venue side. */
export default function VibersConnectHome() {
  return (
    <div className={`${BODY} relative min-h-screen bg-[#f1efe6] text-[#14261b] selection:bg-[#c8da4a] selection:text-[#14261b]`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[#17301f] focus:px-4 focus:py-2 focus:text-sm focus:text-[#f6f4ec]">
        Skip to content
      </a>
      <VibersNav />
      <main id="main">
        <VibersHero />
        <VibeBand />
        <WhoWeAre />
        <VibeProtocol />
        <StayJourney />
        <SevenPercentPromise />
        <VenueEngine />
        <EarnTogether />
        <BeyondCheckout />
        <CommunitySection />
        <TeamSection />
      </main>
      <JoinAndFooter />
    </div>
  );
}
