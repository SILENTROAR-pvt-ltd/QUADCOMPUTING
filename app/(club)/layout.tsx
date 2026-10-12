import type { Metadata, Viewport } from 'next';
import { CLUB_BODY } from '@/components/club/fonts';
import { ClubSessionProvider } from '@/components/club/club-context';
import './club.css';

export const metadata: Metadata = {
  title: 'Vibers Club',
  description: 'An application-only, verified club for travellers, nomads and creators. By Vibers Connect.',
};

export const viewport: Viewport = { themeColor: '#f1efe6' };

/**
 * Vibers Club look: soft luxury. Warm ivory page, white cards, forest-green ink, chartreuse
 * highlights and real travel photography. One session provider for every Club page, so moving
 * between tabs never reloads the member.
 */
export default function ClubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`club-theme ${CLUB_BODY} relative min-h-dvh bg-[#f1efe6] text-[#14261b] antialiased [color-scheme:light] selection:bg-[#c8da4a] selection:text-[#14261b]`}>
      <ClubSessionProvider>{children}</ClubSessionProvider>
    </div>
  );
}
