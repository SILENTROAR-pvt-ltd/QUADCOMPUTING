import Image from 'next/image';
import { HandHeart, Megaphone, PartyPopper, Trophy } from 'lucide-react';
import { Chapter } from './Chapter';
import { LiveSlides } from './LiveSlides';
import { MOOD } from './mood-photos';
import { ACCENT, CONTAINER, H2, LEAD, SECTION, SURFACE } from './vibers-brand';
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
    <section id="community" aria-labelledby="community-title" className={SECTION}>
      <div className={`${CONTAINER} ${s.reveal}`}>
        <div className="grid items-end gap-10 lg:grid-cols-2">
          <div>
            <Chapter n="08" label="The Vibers community" />
            <h2 id="community-title" className={`${DISPLAY} ${H2}`}>
              Beyond <em className={ACCENT}>hotel walls.</em>
            </h2>
          </div>
          <p className={LEAD}>
            Selected Vibers can join the exclusive Vibers Connect Community: a network of like-minded people exploring the
            world differently, together.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <figure className="relative min-h-[340px] overflow-hidden rounded-[32px]">
            <Image src="/images/landing/vibers-table.jpg" alt="Friends sharing a table and a good time at a café"
              fill sizes="(min-width: 1024px) 600px, 100vw" className="object-cover" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#14261b]/85 via-[#14261b]/20 to-transparent" />
            <figcaption className={`${DISPLAY} absolute bottom-6 left-6 right-6 text-2xl italic leading-snug text-[#f6f4ec] sm:text-3xl`}>
              We always have a reason to connect.
            </figcaption>
          </figure>

          <ul className="grid gap-4 sm:grid-cols-2">
            {PILLARS.map((p) => (
              <li key={p.title} className={`${SURFACE} p-6`}>
                <p.icon aria-hidden="true" className="h-6 w-6 text-[#3c6b2b]" />
                <h3 className={`${DISPLAY} mt-5 text-2xl text-[#14261b]`}>{p.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#14261b]/65">{p.text}</p>
              </li>
            ))}
          </ul>
        </div>

        <figure className="relative mt-20 overflow-hidden rounded-[36px]">
          <LiveSlides ids={MOOD.journey} className="h-[360px] sm:h-[420px]" />
          <div aria-hidden="true" className="absolute inset-0 bg-[#14261b]/45" />
          <blockquote className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#c8da4a]">Our vision</p>
            <p className={`${DISPLAY} mt-5 max-w-4xl text-3xl leading-tight text-[#f6f4ec] sm:text-5xl`}>
              To expand this unfiltered, authentic ecosystem from the <em className="italic text-[#c8da4a]">highest mountains</em> to
              the <em className="italic text-[#c8da4a]">deepest oceans.</em>
            </p>
          </blockquote>
        </figure>
      </div>
    </section>
  );
}
