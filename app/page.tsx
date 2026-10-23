import type { Metadata } from 'next';
import { LuxeNav } from '@/components/vibers/LuxeNav';
import { LuxeHero } from '@/components/vibers/LuxeHero';
import { WelcomeIntro } from '@/components/vibers/WelcomeIntro';
import { WhoIsAViber } from '@/components/vibers/WhoIsAViber';
import { VibeBreaks } from '@/components/vibers/VibeBreaks';
import { WhyVibers } from '@/components/vibers/WhyVibers';
import { VenuesWithSoul } from '@/components/vibers/VenuesWithSoul';
import { YourStay } from '@/components/vibers/YourStay';
import { SaferAndCashback } from '@/components/vibers/SaferAndCashback';
import { ClubConnect } from '@/components/vibers/ClubConnect';
import { ClosingAndFooter } from '@/components/vibers/ClosingAndFooter';
import { ImageWarmup } from '@/components/vibers/ImageWarmup';
import { BODY } from '@/components/vibers/vibers-fonts';
import { SITE } from '@/components/vibers/vibers-brand';
import { HERO_CLIPS } from '@/components/vibers/vibers-media';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: 'Vibers Connect · Live your vibe, unfiltered',
  description:
    'A Viber-cultured stay and social club: venues with soul, like-minded people, a stay you run from your phone, and Vibers Club to stay connected on your terms.',
  openGraph: {
    title: 'Vibers Connect',
    description: 'Live your vibe, unfiltered. Venues with soul, and people who already understand the vibe.',
    url: SITE.url,
    siteName: SITE.name,
    type: 'website',
    images: [{ url: HERO_CLIPS[0].desktopPoster, width: 1600, height: 900, alt: 'A yacht crossing open water at golden hour' }],
  },
};

/**
 * The Vibers Connect home, told as one story: the arrival, who a Viber is, the moment the vibe breaks, why this place
 * exists, the venues, the stay, two promises, the club, and the welcome.
 */
export default function VibersConnectHome() {
  return (
    <div id="vc-home" className={`${BODY} relative min-h-screen bg-[#f5f1e8] text-[#10231a] antialiased selection:bg-[#d9c193] selection:text-[#10231a]`}>
      <a href="#welcome" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-[#0f2a1e] focus:px-4 focus:py-2 focus:text-sm focus:text-[#f5f1e8]">
        Skip to content
      </a>
      <LuxeNav />
      <main id="main">
        <LuxeHero />
        <WelcomeIntro />
        <WhoIsAViber />
        <VibeBreaks />
        <WhyVibers />
        <VenuesWithSoul />
        <YourStay />
        <SaferAndCashback />
        <ClubConnect />
      </main>
      <ClosingAndFooter />
      <ImageWarmup />
    </div>
  );
}
