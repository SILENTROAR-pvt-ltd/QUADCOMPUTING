import { AURA, AURA_TEXT, CONTAINER, KICKER, LEAD, SECTION } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const TEAM = [
  { name: 'Arpit Kaushal', role: 'Co-Founder', initials: 'AK' },
  { name: 'Harshit Choudhary', role: 'Co-Founder', initials: 'HC' },
  { name: 'Alexander', role: 'Co-Founder', initials: 'A' },
  { name: 'Mr. Sahil Bawa', role: 'Our foundational backbone', initials: 'SB', backbone: true },
];

export function TeamSection() {
  return (
    <section id="team" aria-labelledby="team-title" className={SECTION}>
      <div className={`${CONTAINER} ${s.reveal}`}>
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className={KICKER}>The visionaries · Est. 2026</p>
            <h2 id="team-title" className={`${DISPLAY} mt-4 text-[2.6rem] leading-[1.02] tracking-[-0.02em] text-[#1c1714] sm:text-[3.6rem]`}>
              The people behind <em className={`font-normal ${AURA_TEXT}`}>the vibe.</em>
            </h2>
          </div>
          <p className={LEAD}>
            Vibers Connect began with a trio of friends who wanted to rewrite the rules of hospitality and networking,
            later joined by the backbone of our execution strategy.
          </p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((m) => (
            <li key={m.name}
              className={`rounded-[28px] p-7 ${m.backbone ? 'bg-[#1d1420] text-[#f7f2ea]' : 'border border-[#1c1714]/[0.08] bg-white/80 text-[#1c1714]'}`}>
              <span aria-hidden="true"
                className={`${DISPLAY} grid h-16 w-16 place-items-center rounded-full text-2xl italic text-white ${AURA} shadow-[0_14px_30px_-14px_rgba(240,80,138,0.8)]`}>
                {m.initials}
              </span>
              <h3 className={`${DISPLAY} mt-8 text-2xl`}>{m.name}</h3>
              <p className={`mt-1 text-[13px] font-semibold ${m.backbone ? 'text-[#ffb59f]' : 'text-[#1c1714]/55'}`}>{m.role}</p>
            </li>
          ))}
        </ul>

        <figure className="mt-12 rounded-[32px] border border-[#1c1714]/[0.08] bg-white/60 p-8 sm:p-12">
          <blockquote className={`${DISPLAY} text-2xl italic leading-snug text-[#1c1714] sm:text-[2.1rem]`}>
            &ldquo;We cater to the Vibers, empowering you to fly beyond limitations in a space tailored to your authentic energy.&rdquo;
          </blockquote>
          <figcaption className="mt-5 text-[13px] font-semibold text-[#1c1714]/55">Vibers Connect Pvt. Ltd.</figcaption>
        </figure>
      </div>
    </section>
  );
}
