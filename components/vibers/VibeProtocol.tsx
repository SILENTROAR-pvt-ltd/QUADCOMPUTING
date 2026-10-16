import { BadgeCheck, Flag, Gem, HeartHandshake } from 'lucide-react';
import { Chapter } from './Chapter';
import { ACCENT, CONTAINER, H2, KICKER, LEAD, SECTION, SURFACE } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const TAG = [
  { icon: BadgeCheck, title: 'Verified reality', text: 'What you see is exactly what you get. Every picture, amenity and service standard is 100% genuine.' },
  { icon: Gem, title: 'Optimal returns', text: 'Before a property earns our tag, it commits to its best service, so every penny you spend becomes a premium experience.' },
  { icon: HeartHandshake, title: 'The guarantee', text: 'Properties under our tag deliver the best service within their capability, fully aligned with the Vibers Connect culture.' },
];

export function VibeProtocol() {
  return (
    <section id="protocol" aria-labelledby="protocol-title" className={`${SECTION} bg-[#e1efe3]/60`}>
      <div className={`${CONTAINER} ${s.reveal}`}>
        <Chapter n="02" label="Our philosophy" />
        <h2 id="protocol-title" className={`${DISPLAY} ${H2} max-w-3xl`}>
          Your environment shapes your experience. <em className={ACCENT}>So we protect it.</em>
        </h2>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1fr_1.15fr]">
          <article className="relative overflow-hidden rounded-[32px] bg-[#17301f] p-8 text-[#f6f4ec] sm:p-10">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#c8da4a] text-[#14261b]">
              <Flag aria-hidden="true" className="h-5 w-5" />
            </span>
            <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.24em] text-[#c8da4a]">No vibe viruses allowed</p>
            <h3 className={`${DISPLAY} mt-2 text-4xl`}>The Red Flag Protocol</h3>
            <p className="mt-4 text-[15px] leading-relaxed text-[#f6f4ec]/75">
              Zero tolerance for loud, bossy, inappropriate or toxic behaviour, or any criminal activity. People who disrupt
              the harmony are marked as &ldquo;red flag&rdquo; personalities, and we and our partner properties guarantee
              they are not entertained. Your space stays yours: for exploration, goals and peace of mind.
            </p>
          </article>

          <article className={`${SURFACE} p-8 sm:p-10`}>
            <p className={KICKER}>The tag</p>
            <h3 className={`${DISPLAY} mt-2 text-4xl text-[#14261b]`}>A promise of authenticity</h3>
            <p className={`${LEAD} mt-4`}>
              We never assign the Vibers Connect tag blindly. <strong className="font-semibold text-[#14261b]">Every property is
              physically visited, audited and onboarded by our team.</strong>
            </p>
            <ul className="mt-8 space-y-6">
              {TAG.map((t) => (
                <li key={t.title} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e1efe3] text-[#17301f]">
                    <t.icon aria-hidden="true" className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <h4 className="text-[15px] font-bold text-[#14261b]">{t.title}</h4>
                    <p className="mt-1 text-[14px] leading-relaxed text-[#14261b]/65">{t.text}</p>
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
