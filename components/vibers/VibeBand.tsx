import { DISPLAY } from './vibers-fonts';

const PHRASES = [
  'We cater to the Vibers',
  'Not the public',
  'No vibe viruses',
  'Verified, never assumed',
  'Rewards that never expire',
  'You earn, we earn, fairly',
  'From the highest mountains to the deepest oceans',
];

/** A slow ribbon of the manifesto's lines. Decorative: the same lines appear in the sections below. */
export function VibeBand() {
  const row = [...PHRASES, ...PHRASES];
  return (
    <div aria-hidden="true" className="overflow-hidden border-y border-[#14261b]/10 bg-[#17301f] py-5">
      <div className="animate-marquee flex w-max gap-10 motion-reduce:animate-none">
        {row.map((p, i) => (
          <span key={i} className={`${DISPLAY} flex items-center gap-10 whitespace-nowrap text-2xl italic text-[#f6f4ec] sm:text-3xl`}>
            {p} <span className="not-italic text-[#c8da4a]">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
