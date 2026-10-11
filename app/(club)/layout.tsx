import type { Metadata } from 'next';
import { BODY } from '@/components/vibers/vibers-fonts';

export const metadata: Metadata = {
  title: 'Vibers Club',
  description: 'An application-only, verified club for travellers, nomads and creators. By Vibers Connect.',
};

/**
 * Vibers Club look: Vibers Connect fonts, bright colours. A warm cream page with soft sunset, violet
 * and mint glows behind everything, deep violet text, vivid violet actions.
 */
export default function ClubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${BODY} relative min-h-dvh bg-[#fff7f0] text-[#2a1250] antialiased`}>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(48rem_32rem_at_0%_0%,rgba(255,106,61,0.20),transparent_70%),radial-gradient(44rem_34rem_at_100%_8%,rgba(124,58,237,0.18),transparent_70%),radial-gradient(40rem_30rem_at_85%_100%,rgba(45,212,191,0.16),transparent_70%),radial-gradient(36rem_26rem_at_10%_95%,rgba(255,46,136,0.12),transparent_70%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}
