import { BadgeCheck, Flag, Gem, HeartHandshake } from 'lucide-react';
import { AURA_TEXT, CONTAINER, KICKER, LEAD, SECTION } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const TAG = [
  { icon: BadgeCheck, title: 'Verified reality', text: 'What you see is exactly what you get. Every picture, amenity and service standard is 100% genuine.' },
  { icon: Gem, title: 'Optimal returns', text: 'Before a property earns our tag, it commits to its best service, so every penny you spend becomes a premium experience.' },
  { icon: HeartHandshake, title: 'The guarantee', text: 'Properties under our tag deliver the best service within their capability, fully aligned with the Vibers Connect culture.' },
];

export function VibeProtocol() {
  return (
    <section id="protocol" aria-labelledby="protocol-title" className={`${SECTION} bg-[#efe6d8]/60`}>
      <div className={`${CONTAINER} ${s.reveal}`}>
        <p className={KICKER}>Our philosophy</p>
        <h2 id="protocol-title" className={`${DISPLAY} mt-4 max-w-3xl text-[2.6rem] leading-[1.02] tracking-[-0.02em] text-[#1c1714] sm:text-[3.6rem]`}>
          Your environment shapes your experience. <em className={`font-normal ${AURA_TEXT}`}>So we protect it.</em>
        </h2>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1fr_1.15fr]">
          <article className="relative overflow-hidden rounded-[32px] bg-[#1d1420] p-8 text-[#f7f2ea] sm:p-10">
            <div aria-hidden="true" className={`absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#f0508a] ${s.aura}`} />
            <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
              <Flag aria-hidden="true" className="h-5 w-5 text-[#ff9b80]" />
            </span>
            <p className="relative mt-8 text-[11px] font-bold uppercase tracking-[0.24em] text-[#ff9b80]">No vibe viruses allowed</p>
            <h3 className={`${DISPLAY} relative mt-2 text-4xl`}>The Red Flag Protocol</h3>
            <p className="relative mt-4 text-[15px] leading-relaxed text-[#f7f2ea]/75">
              Zero tolerance for loud, bossy, inappropriate or toxic behaviour, or any criminal activity. People who disrupt
              the harmony are marked as &ldquo;red flag&rdquo; personalities, and we and our partner properties guarantee
              they are not entertained. Your space stays yours: for exploration, goals and peace of mind.
            </p>
          </article>

          <article className="rounded-[32px] border border-[#1c1714]/[0.08] bg-white/80 p-8 sm:p-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#c2410c]">The tag</p>
            <h3 className={`${DISPLAY} mt-2 text-4xl text-[#1c1714]`}>A promise of authenticity</h3>
            <p className={`${LEAD} mt-4`}>
              We never assign the Vibers Connect tag blindly. <strong className="font-semibold text-[#1c1714]">Every property is
              physically visited, audited and onboarded by our team.</strong>
            </p>
            <ul className="mt-8 space-y-6">
              {TAG.map((t) => (
                <li key={t.title} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f7f2ea] text-[#c2410c]">
                    <t.icon aria-hidden="true" className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <h4 className="text-[15px] font-bold text-[#1c1714]">{t.title}</h4>
                    <p className="mt-1 text-[14px] leading-relaxed text-[#1c1714]/65">{t.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
