import { Chapter } from './Chapter';
import { ACCENT, CONTAINER, H2, LEAD, SECTION, SURFACE } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const GLANCE = [
  { value: '100%', label: 'physically visited and audited properties' },
  { value: '1 QR', label: 'to order, track and call staff, no app' },
  { value: '0', label: 'tolerance for red-flag behaviour' },
];

export function WhoWeAre() {
  return (
    <section id="story" aria-labelledby="vibe-title" className={SECTION}>
      <div className={`${CONTAINER} ${s.reveal} grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16`}>
        <div>
          <Chapter n="01" label="Who we are" />
          <h2 id="vibe-title" className={`${DISPLAY} ${H2}`}>
            We cater to the Vibers. <em className={ACCENT}>Not the public.</em>
          </h2>
        </div>
        <div className="space-y-5 lg:pt-12">
          <p className={LEAD}>
            Vibers Connect Pvt. Ltd. is not just a tech solutions company. We are the architects of a complete,
            cultured ecosystem, built on one belief: <strong className="font-semibold text-[#14261b]">hospitality and
            networking should elevate your true self, not force you into a box.</strong>
          </p>
          <p className={LEAD}>
            In a world of forced conversations and fake aesthetics, we built a movement to change that: a safe,
            transparent ecosystem that gives you the freedom to fly beyond your limitations.
          </p>
        </div>
      </div>

      <div className={`${CONTAINER} mt-16`}>
        <h3 className="sr-only">Vibers Connect at a glance</h3>
        <dl className="grid gap-4 sm:grid-cols-3">
          {GLANCE.map((g) => (
            <div key={g.label} className={`${SURFACE} p-8`}>
              <dt className="sr-only">{g.label}</dt>
              <dd className={`${DISPLAY} text-6xl leading-none tracking-tight text-[#17301f]`}>{g.value}</dd>
              <dd aria-hidden="true" className="mt-3 text-[14px] font-medium text-[#14261b]/65">{g.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
