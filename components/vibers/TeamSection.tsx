import { Chapter } from './Chapter';
import { ACCENT, CONTAINER, H2, LEAD, SECTION, SURFACE } from './vibers-brand';
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
    <section id="team" aria-labelledby="team-title" className={`${SECTION} bg-[#e1efe3]/60`}>
      <div className={`${CONTAINER} ${s.reveal}`}>
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <Chapter n="09" label="The visionaries · Est. 2026" />
            <h2 id="team-title" className={`${DISPLAY} ${H2}`}>
              The people behind <em className={ACCENT}>the vibe.</em>
            </h2>
          </div>
          <p className={LEAD}>
            Vibers Connect began with a trio of friends who wanted to rewrite the rules of hospitality and networking,
            later joined by the backbone of our execution strategy.
          </p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((m) => (
            <li key={m.name} className={m.backbone ? 'rounded-[28px] bg-[#17301f] p-7 text-[#f6f4ec]' : `${SURFACE} p-7 text-[#14261b]`}>
              <span aria-hidden="true"
                className={`${DISPLAY} grid h-16 w-16 place-items-center rounded-full text-2xl italic ${m.backbone ? 'bg-[#c8da4a] text-[#14261b]' : 'bg-[#17301f] text-[#c8da4a]'}`}>
                {m.initials}
              </span>
              <h3 className={`${DISPLAY} mt-8 text-2xl`}>{m.name}</h3>
              <p className={`mt-1 text-[13px] font-semibold ${m.backbone ? 'text-[#c8da4a]' : 'text-[#14261b]/55'}`}>{m.role}</p>
            </li>
          ))}
        </ul>

        <figure className={`${SURFACE} mt-12 p-8 sm:p-12`}>
          <blockquote className={`${DISPLAY} text-2xl italic leading-snug text-[#14261b] sm:text-[2.1rem]`}>
            &ldquo;We cater to the Vibers, empowering you to fly beyond limitations in a space tailored to your authentic energy.&rdquo;
          </blockquote>
          <figcaption className="mt-5 text-[13px] font-semibold text-[#14261b]/55">Vibers Connect Pvt. Ltd.</figcaption>
        </figure>
      </div>
    </section>
  );
}
