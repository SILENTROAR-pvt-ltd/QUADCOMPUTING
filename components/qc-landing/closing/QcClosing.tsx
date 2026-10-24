import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, LockKeyhole, Radio, ShieldCheck, Zap } from 'lucide-react';
import { PAYG_BILL_FEE, SETUP_FEE } from '@/lib/services/wallet/plans';
import { Reveal } from '@/components/vibers/Reveal';
import { DISPLAY, SCRIPT } from '@/components/vibers/vibers-fonts';
import { BTN_GHOST, BTN_INK, CONTAINER, H2, KICKER, TURN } from '../qc-brand';

const TRUST = [
  { icon: LockKeyhole, title: 'PIN-locked control centre', text: 'Lock the screen between shifts; only the owner’s PIN opens it.' },
  { icon: ShieldCheck, title: 'Your data stays yours', text: 'Every venue sees only its own menu, orders, guests and money.' },
  { icon: Zap, title: 'Safe when things go wrong', text: 'If billing cannot be checked, the action waits rather than guessing.' },
  { icon: Radio, title: 'Live on every device', text: 'Orders, tickets and calls sync across floor, kitchen and counter.' },
];

const STEPS = ['Create your host profile', 'Add your menu, or let us enter it', 'Print your table QRs', 'Take the first order tonight'];

const LINKS = [
  { href: '/auth/host', label: 'Host login' },
  { href: '/onboarding/host', label: 'Create host profile' },
  { href: '/onboarding/guest', label: 'Guest access' },
  { href: '/', label: 'Vibers Connect' },
];

/** Why it holds up on a full Saturday, the four steps to the first order, and the footer. */
export function QcClosing() {
  return (
    <>
      <section aria-labelledby="start-title" className="relative scroll-mt-20 bg-[#f6f3ec] py-20 text-[#0c0f0d] sm:py-28">
        <div className={CONTAINER}>
          <ul className="grid gap-px overflow-hidden rounded-[24px] border border-[#e6dfcf] bg-[#e6dfcf] sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map((t, i) => (
              <Reveal as="li" key={t.title} index={i} className="bg-[#fbf9f4] p-6">
                <t.icon aria-hidden="true" className="h-5 w-5 text-[#8a6d3f]" />
                <h3 className="mt-4 text-[15px] font-semibold">{t.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#0c0f0d]/60">{t.text}</p>
              </Reveal>
            ))}
          </ul>

          <div className="mt-24 grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <Reveal><p className={KICKER}>Start tonight</p></Reveal>
              <Reveal index={1}><h2 id="start-title" className={`${DISPLAY} ${H2}`}>Bring your venue online <em className={TURN}>before service.</em></h2></Reveal>
              <Reveal index={2}>
                <p className="mt-6 max-w-lg text-[15.5px] leading-[1.85] text-[#0c0f0d]/65">
                  ₹{SETUP_FEE} once for your profile, menu entry, design and QR codes, then ₹{PAYG_BILL_FEE} a settled bill, or a yearly plan
                  whenever it pays for itself.
                </p>
              </Reveal>
              <Reveal index={3} className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/onboarding/host" className={BTN_INK}>Create host profile <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
                <Link href="/auth/host" className={BTN_GHOST}>Host login</Link>
              </Reveal>
            </div>
            <ol className="space-y-3">
              {STEPS.map((step, i) => (
                <Reveal as="li" key={step} index={i} className="flex items-center gap-5 rounded-2xl border border-[#e6dfcf] bg-[#fbf9f4] px-5 py-4">
                  <span className={`${DISPLAY} text-[1.6rem] italic leading-none text-[#b08d57]`}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-[15px] font-medium">{step}</span>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <footer className="bg-[#0c0f0d] text-[#f6f3ec]">
        <div className={`${CONTAINER} flex flex-col gap-8 py-12 sm:flex-row sm:items-end sm:justify-between`}>
          <div>
            <p className="flex items-center gap-2.5">
              <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-[#f6f3ec] text-[11px] font-semibold text-[#0c0f0d]">QC</span>
              <span className={`${DISPLAY} text-[22px]`}>Quad Computing</span>
            </p>
            <p className="mt-3 text-[13px] text-[#f6f3ec]/55">The venue side of <span className={`${SCRIPT} text-[18px] text-[#d9c193]`}>Vibers Connect</span></p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="group inline-flex items-center gap-1 text-[13px] text-[#f6f3ec]/65 transition-colors hover:text-[#d9c193]">
                    {l.label} <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className={`${CONTAINER} border-t border-white/10 py-6 text-[12px] text-[#f6f3ec]/40`}>© {new Date().getFullYear()} Vibers Connect Pvt. Ltd. All rights reserved.</p>
      </footer>
    </>
  );
}
