import { AURA_TEXT, CONTAINER, KICKER, LEAD, SECTION } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const GLANCE = [
  { value: '7%', label: 'flat cashback on every expense' },
  { value: '0', label: 'expiry on your wallet vouchers' },
  { value: '100%', label: 'physically visited and audited properties' },
];

export function WhoWeAre() {
  return (
    <section id="vibe" aria-labelledby="vibe-title" className={SECTION}>
      <div className={`${CONTAINER} ${s.reveal} grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16`}>
        <div>
          <p className={KICKER}>Who we are</p>
          <h2 id="vibe-title" className={`${DISPLAY} mt-4 text-[2.6rem] leading-[1.02] tracking-[-0.02em] text-[#1c1714] sm:text-[3.6rem]`}>
            We cater to the Vibers. <em className={`font-normal ${AURA_TEXT}`}>Not the public.</em>
          </h2>
        </div>
        <div className="space-y-5 lg:pt-10">
          <p className={LEAD}>
            Vibers Connect Pvt. Ltd. is not just a tech solutions company. We are the architects of a complete,
            cultured ecosystem, built on one belief: <strong className="font-semibold text-[#1c1714]">hospitality and
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
            <div key={g.label} className="rounded-[28px] border border-[#1c1714]/[0.08] bg-white/70 p-8 shadow-[0_20px_50px_-35px_rgba(28,23,20,0.4)]">
              <dt className="sr-only">{g.label}</dt>
              <dd className={`${DISPLAY} text-6xl leading-none tracking-tight ${AURA_TEXT}`}>{g.value}</dd>
              <dd aria-hidden="true" className="mt-3 text-[14px] font-medium text-[#1c1714]/70">{g.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
