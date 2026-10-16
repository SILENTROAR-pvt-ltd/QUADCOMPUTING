import { KICKER } from './vibers-brand';

/** The chapter mark that runs down the page ("03 · Your stay"), so the sections read as one story. */
export function Chapter({ n, label, light = false }: { n: string; label: string; light?: boolean }) {
  return (
    <p className={`flex items-center gap-3 ${KICKER} ${light ? '!text-[#c8da4a]' : ''}`}>
      <span className={`grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-[10px] tracking-normal ${light ? 'bg-[#c8da4a] text-[#14261b]' : 'bg-[#17301f] text-[#f6f4ec]'}`}>{n}</span>
      {label}
      <span aria-hidden="true" className={`h-px w-10 ${light ? 'bg-[#c8da4a]/50' : 'bg-[#3c6b2b]/30'}`} />
    </p>
  );
}
