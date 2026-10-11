import Link from 'next/link';
import { AURA } from '@/components/club/theme';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { JoinHero } from '@/components/club/landing/JoinHero';
import { JoinSections } from '@/components/club/landing/JoinSections';

export const metadata = {
  title: 'Vibers Club · Apply for your Viber Pass',
  description: 'An application-only, verified club for travellers, nomads and creators. Live presence, plans, verified stays and escrow.',
};

/** The single public Vibers Club landing. QR campaigns point here as /join?src=<code>. */
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ src?: string }> }) {
  const { src } = await searchParams;
  return (
    <>
      <header className="border-b border-[#2a1250]/[0.07]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span aria-hidden="true" className={`h-6 w-6 rounded-full ${AURA}`} />
            <span className={`${DISPLAY} text-lg`}>Vibers <em className="font-normal">Club</em></span>
          </Link>
          <Link href="/club" className="text-sm font-semibold underline-offset-4 hover:underline">Sign in</Link>
        </div>
      </header>
      <JoinHero src={typeof src === 'string' ? src : null} />
      <JoinSections />
    </>
  );
}
