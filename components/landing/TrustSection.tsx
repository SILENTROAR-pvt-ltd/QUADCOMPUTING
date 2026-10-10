import { LockKeyhole, Radio, ShieldCheck, Zap } from 'lucide-react';
import { CONTAINER, EYEBROW, H2, SECTION } from './landing-styles';

const POINTS = [
  { icon: LockKeyhole, title: 'PIN-locked control centre', text: 'Lock the screen between shifts; only the owner’s PIN unlocks it.' },
  { icon: ShieldCheck, title: 'Your data stays yours', text: 'Every venue sees only its own menu, orders, guests and money.' },
  { icon: Zap, title: 'Safe when things go wrong', text: 'If billing cannot be checked, actions are blocked rather than guessed.' },
  { icon: Radio, title: 'Live on every device', text: 'Orders, tickets and calls sync across the floor, kitchen and counter.' },
];

export function TrustSection() {
  return (
    <section aria-labelledby="trust-title" className={`${SECTION} bg-black text-white`}>
      <div className={CONTAINER}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e6d5b0]">Built for real service</p>
        <h2 id="trust-title" className={`${H2} !text-white`}>Dependable on a full Saturday night.</h2>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((p) => (
            <li key={p.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p.icon aria-hidden="true" className="h-5 w-5 text-[#e6d5b0]" />
              <h3 className="mt-4 text-[15px] font-semibold">{p.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-white/70">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
