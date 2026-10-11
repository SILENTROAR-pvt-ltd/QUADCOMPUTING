import Link from 'next/link';
import { AURA } from '@/components/club/theme';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { ApplyFlow } from '@/components/club/apply/ApplyFlow';

export const metadata = { title: 'Apply · Vibers Club' };

export default function ApplyPage() {
  return (
    <>
      <header className="border-b border-[#2a1250]/[0.07]">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <Link href="/join" className="flex items-center gap-2">
            <span aria-hidden="true" className={`h-6 w-6 rounded-full ${AURA}`} />
            <span className={`${DISPLAY} text-lg`}>Vibers <em className="font-normal">Club</em></span>
          </Link>
        </div>
      </header>
      <main className="px-4 py-10 sm:px-6"><ApplyFlow /></main>
    </>
  );
}
