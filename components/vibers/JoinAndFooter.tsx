import Link from 'next/link';
import { ArrowUpRight, AtSign, Building2, QrCode, Sparkles } from 'lucide-react';
import { AURA, AURA_TEXT, CONTAINER, SITE } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const PATHS = [
  { icon: QrCode, who: 'At a Vibers Connect property?', action: 'Scan your table or room QR', href: '/onboarding/guest', external: false },
  { icon: Building2, who: 'Run a property?', action: 'Earn the tag with Quad Computing', href: '/quad-computing', external: false },
  { icon: Sparkles, who: 'Want in on the community?', action: 'Apply to Vibers Club', href: '/join', external: false },
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
        <div aria-hidden="true" className={`absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full ${AURA} ${s.aura}`} />
        <div className={`${CONTAINER} ${s.reveal} relative text-center`}>
          <h2 id="join-title" className={`${DISPLAY} mx-auto max-w-3xl text-[2.8rem] leading-[1.02] tracking-[-0.02em] text-[#2a1250] sm:text-[4.4rem]`}>
            Your satisfaction is our <em className={`font-normal ${AURA_TEXT}`}>ultimate achievement.</em>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-[#2a1250]/70">
            Choose a Vibers Connect marked property, feel the difference yourself, and join the movement.
          </p>

          <ul className="mx-auto mt-12 grid max-w-5xl gap-4 text-left md:grid-cols-3">
            {PATHS.map((p) => {
              const body = (
                <>
                  <p.icon aria-hidden="true" className="h-6 w-6 text-[#be185d]" />
                  <p className="mt-6 text-[13px] font-semibold text-[#2a1250]/55">{p.who}</p>
                  <p className={`${DISPLAY} mt-1 flex items-start justify-between gap-3 text-2xl text-[#2a1250]`}>
                    {p.action} <ArrowUpRight aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </p>
                </>
              );
              const cls = 'group block h-full rounded-[28px] border border-white/80 bg-white/75 p-7 shadow-[0_24px_50px_-36px_rgba(42,18,80,0.5)] backdrop-blur-md transition-transform hover:-translate-y-1';
              return (
                <li key={p.href}>
                  {p.external
                    ? <a href={p.href} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a>
                    : <Link href={p.href} className={cls}>{body}</Link>}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <footer className="border-t border-[#2a1250]/10 bg-gradient-to-br from-[#2a1250] via-[#4c1d95] to-[#6d28d9] text-white">
        <div className={`${CONTAINER} grid gap-8 py-14 md:grid-cols-[1.4fr_1fr]`}>
          <div>
            <p className={`${DISPLAY} text-3xl`}>Vibers <em className="font-normal">Connect</em></p>
            <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-white/65">
              Find your vibe. Find your people. Find yourself.
            </p>
            <p className="mt-6 text-[14px] text-white/80">
              {SITE.domain} · <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">{SITE.handle}</a>
            </p>
          </div>
          <nav aria-label="Footer" className="md:justify-self-end">
            <ul className="space-y-3">
              {FOOTER_LINKS.map((l) => (
                <li key={l.href}><Link href={l.href} className="text-[14px] text-white/75 transition-colors hover:text-white">{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        </div>
        <p className={`${CONTAINER} pb-8 text-[12px] text-white/55`}>© {new Date().getFullYear()} {SITE.company}. All rights reserved.</p>
      </footer>
    </>
  );
}
