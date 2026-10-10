import { DISPLAY } from './vibers-fonts';

const PHRASES = [
  'We cater to the Vibers',
  'Not the public',
  'No vibe viruses',
  'Verified, never assumed',
  'Seven percent, no expiry',
  'From the highest mountains to the deepest oceans',
];

/** A slow ribbon of the manifesto's lines. Decorative: the same lines appear in the sections below. */
export function VibeBand() {
  const row = [...PHRASES, ...PHRASES];
  return (
    <div aria-hidden="true" className="overflow-hidden border-y border-[#1c1714]/10 bg-[#1c1714] py-5">
      <div className="animate-marquee flex w-max gap-10 motion-reduce:animate-none">
        {row.map((p, i) => (
          <span key={i} className={`${DISPLAY} flex items-center gap-10 whitespace-nowrap text-2xl italic text-[#f7f2ea] sm:text-3xl`}>
            {p} <span className="not-italic text-[#ff7a59]">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
