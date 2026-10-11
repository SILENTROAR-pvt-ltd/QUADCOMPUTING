import Image from 'next/image';
import { HandHeart, Megaphone, PartyPopper, Trophy } from 'lucide-react';
import { AURA_TEXT, CONTAINER, KICKER, LEAD, SECTION } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const PILLARS = [
  { icon: Megaphone, title: 'Social drives', text: 'Collective social drives with like-minded people.' },
  { icon: HandHeart, title: 'Charity initiatives', text: 'Helping hands across the community, in our capacity.' },
  { icon: Trophy, title: 'Success parties', text: 'Exclusive celebrations for selected members.' },
  { icon: PartyPopper, title: 'House parties & events', text: 'We always have a reason to connect and celebrate.' },
];

export function CommunitySection() {
  return (
    <section id="community" aria-labelledby="community-title" className={`${SECTION} bg-[#f3ebff]/60`}>
      <div className={`${CONTAINER} ${s.reveal}`}>
        <div className="grid items-end gap-10 lg:grid-cols-2">
          <div>
            <p className={KICKER}>The Vibers community</p>
            <h2 id="community-title" className={`${DISPLAY} mt-4 text-[2.6rem] leading-[1.02] tracking-[-0.02em] text-[#2a1250] sm:text-[3.6rem]`}>
              Beyond <em className={`font-normal ${AURA_TEXT}`}>hotel walls.</em>
            </h2>
          </div>
          <p className={LEAD}>
            Selected Vibers can join the exclusive Vibers Connect Community: a network of like-minded people exploring the
            world differently, together.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <figure className="relative min-h-[320px] overflow-hidden rounded-[32px]">
            <Image src="/images/landing/vibers-table.jpg" alt="Friends sharing a table and a good time at a café"
              fill sizes="(min-width: 1024px) 600px, 100vw" className="object-cover" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-tr from-[#4c1d95]/80 via-[#ff2e88]/20 to-transparent" />
            <figcaption className={`${DISPLAY} absolute bottom-6 left-6 right-6 text-2xl italic leading-snug text-white sm:text-3xl`}>
              We always have a reason to connect.
            </figcaption>
          </figure>

          <ul className="grid gap-4 sm:grid-cols-2">
            {PILLARS.map((p) => (
              <li key={p.title} className="rounded-[28px] border border-[#2a1250]/[0.08] bg-white/80 p-6">
                <p.icon aria-hidden="true" className="h-6 w-6 text-[#be185d]" />
                <h3 className={`${DISPLAY} mt-5 text-2xl text-[#2a1250]`}>{p.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#2a1250]/65">{p.text}</p>
              </li>
            ))}
          </ul>
        </div>

        <blockquote className="mx-auto mt-20 max-w-4xl text-center">
          <p className={KICKER}>Our vision</p>
          <p className={`${DISPLAY} mt-5 text-3xl leading-tight text-[#2a1250] sm:text-5xl`}>
            To expand this unfiltered, authentic ecosystem from the <em className={`font-normal ${AURA_TEXT}`}>highest mountains</em> to
            the <em className={`font-normal ${AURA_TEXT}`}>deepest oceans.</em>
          </p>
        </blockquote>
      </div>
    </section>
  );
}
