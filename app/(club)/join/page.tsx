import { JoinHeader } from '@/components/club/landing/JoinHeader';
import { JoinHero } from '@/components/club/landing/JoinHero';
import { Marquee } from '@/components/club/landing/Marquee';
import { Destinations } from '@/components/club/landing/Destinations';
import { Posters } from '@/components/club/landing/Posters';
import { JoinSections } from '@/components/club/landing/JoinSections';
import { JoinFooter } from '@/components/club/landing/JoinFooter';

export const metadata = {
  title: 'Vibers Club · Apply for your Club Visa',
  description: 'An application-only, verified club for travellers, nomads and creators. Post plans, find travel buddies, join in a tap, book verified stays with escrow.',
};

/** The single public Vibers Club landing. QR campaigns point here as /join?src=<code>. */
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ src?: string }> }) {
  const { src } = await searchParams;
  return (
    <>
      <JoinHeader />
      <main>
        <JoinHero src={typeof src === 'string' ? src : null} />
        <Marquee />
        <Destinations />
        <Posters />
        <JoinSections />
        <JoinFooter />
      </main>
    </>
  );
}
