import Link from 'next/link';
import { ArrowUpRight, Building2, QrCode, Sparkles } from 'lucide-react';
import { ACCENT, CONTAINER, SITE, SURFACE } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const PATHS = [
  { icon: QrCode, who: 'At a Vibers Connect property?', action: 'Scan your table or room QR', href: '/onboarding/guest' },
  { icon: Building2, who: 'Run a property?', action: 'Earn the tag with Quad Computing', href: '/quad-computing' },
  { icon: Sparkles, who: 'Want in on the community?', action: 'Apply to Vibers Club', href: '/join' },
];

const FOOTER_LINKS = [
  { href: '/join', label: 'Vibers Club' },
  { href: '/quad-computing', label: 'Quad Computing' },
  { href: '/auth/host', label: 'Host login' },
  { href: '/onboarding/guest', label: 'Guest access' },
];

export function JoinAndFooter() {
  return (
    <>
      <section id="join" aria-labelledby="join-title" className="relative scroll-mt-20 overflow-hidden py-24 sm:py-32">
        <div className={`${CONTAINER} ${s.reveal} relative text-center`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#3c6b2b]">10 · Join the movement</p>
          <h2 id="join-title" className={`${DISPLAY} mx-auto mt-4 max-w-3xl text-[2.6rem] leading-[1.04] tracking-[-0.02em] text-[#14261b] sm:text-[4.2rem]`}>
            Your satisfaction is our <em className={ACCENT}>ultimate achievement.</em>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-[#14261b]/70">
            Choose a Vibers Connect marked property, feel the difference yourself, and join the movement.
          </p>

          <ul className="mx-auto mt-12 grid max-w-5xl gap-4 text-left md:grid-cols-3">
            {PATHS.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className={`group block h-full ${SURFACE} p-7 transition-transform hover:-translate-y-1`}>
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#c8da4a] text-[#14261b]"><p.icon aria-hidden="true" className="h-5 w-5" /></span>
                  <p className="mt-6 text-[13px] font-semibold text-[#14261b]/55">{p.who}</p>
                  <p className={`${DISPLAY} mt-1 flex items-start justify-between gap-3 text-2xl text-[#14261b]`}>
                    {p.action} <ArrowUpRight aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="bg-[#17301f] text-[#f6f4ec]">
        <div className={`${CONTAINER} grid gap-8 py-14 md:grid-cols-[1.4fr_1fr]`}>
          <div>
            <p className={`${DISPLAY} text-3xl`}>Vibers <em className="italic text-[#c8da4a]">Connect</em></p>
            <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-[#f6f4ec]/65">Find your vibe. Find your people. Find yourself.</p>
            <p className="mt-6 text-[14px] text-[#f6f4ec]/80">
              {SITE.domain} · <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">{SITE.handle}</a>
            </p>
          </div>
          <nav aria-label="Footer" className="md:justify-self-end">
            <ul className="space-y-3">
              {FOOTER_LINKS.map((l) => (
                <li key={l.href}><Link href={l.href} className="text-[14px] text-[#f6f4ec]/75 transition-colors hover:text-[#c8da4a]">{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        </div>
        <p className={`${CONTAINER} pb-8 text-[12px] text-[#f6f4ec]/55`}>© {new Date().getFullYear()} {SITE.company}. All rights reserved.</p>
      </footer>
    </>
  );
}
