import type { Metadata, Viewport } from 'next';
import { ClubComingSoon, CLUB_COMING_SOON_PHOTO } from '@/components/vibers/coming-soon/ClubComingSoon';
import { SITE } from '@/components/vibers/vibers-brand';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: 'Vibers Club · Arriving soon',
  description: 'Vibers Club, a members-only club for travellers, creators and the curious, opens soon. The first invitations go to the Vibers already with us.',
  openGraph: {
    title: 'Vibers Club · Arriving soon',
    description: 'A members-only club for travellers, creators and the curious, being finished with care.',
    url: `${SITE.url}/vibers-club`,
    siteName: SITE.name,
    type: 'website',
    images: [{ url: CLUB_COMING_SOON_PHOTO, width: 1152, height: 2048, alt: 'A black sports car with glowing headlights before a cargo plane in a dark hangar' }],
  },
};

export const viewport: Viewport = { themeColor: '#07090b' };

/** /vibers-club: where every "Join the Club" leads (and /join and /club redirect) until Vibers Club opens. */
export default function VibersClubComingSoonPage() {
  return <ClubComingSoon />;
}
