import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const CHIPS = [
  { text: '7% cashback, no expiry', pos: 'left-[-4%] top-[14%]', motion: s.float },
  { text: 'No vibe viruses', pos: 'right-[-6%] top-[44%]', motion: s.floatLate },
  { text: '100% verified stays', pos: 'left-[6%] bottom-[8%]', motion: s.floatLater },
];

/** Decorative art: a glassy aura sphere with an orbit ring and three floating promise chips. */
export function AuraSphere() {
  return (
    <div aria-hidden="true" className={`relative mx-auto aspect-square w-full max-w-[460px] ${s.stage}`}>
      <div className={`absolute inset-[18%] rounded-full bg-[#ff2e88]/30 ${s.aura}`} />
      <div className={s.orbit}>
        <div className={s.ring} />
      </div>
      <div className={s.sphere} />
      <div className={s.sheen} />
      {CHIPS.map((c) => (
        <span key={c.text}
          className={`absolute ${c.pos} ${c.motion} whitespace-nowrap rounded-full border border-white/70 bg-white/70 px-4 py-2 text-[13px] font-semibold text-[#2a1250] shadow-[0_12px_30px_-12px_rgba(42,18,80,0.35)] backdrop-blur-md`}>
          <span className={`${DISPLAY} mr-1.5 italic text-[#be185d]`}>✦</span>{c.text}
        </span>
      ))}
    </div>
  );
}
