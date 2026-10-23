import { Reveal } from './Reveal';
import { PHOTOS } from './vibers-media';
import { KICKER_LIGHT, TURN_LIGHT } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './luxe.module.css';

const TILES = [
  { photo: PHOTOS.raveBeach, where: 'The beaches', line: 'Fire, sand and a sunset set' },
  { photo: PHOTOS.raveHills, where: 'The Himalayas', line: 'Bass under the Milky Way' },
];

/**
 * Rave culture, the headline experience: one large open-air festival photo beside two smaller ones, the sea and the
 * mountains, and a gold route that draws itself from one to the other.
 */
export function RaveFeature() {
  const rave = PHOTOS.rave;
  return (
    <div className="mt-14 sm:mt-16">
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Reveal settle className="group relative overflow-hidden rounded-[2px] bg-[#0f2a1e]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={rave.src} alt={rave.alt} width={rave.width} height={rave.height} loading="lazy" decoding="async"
            className={`${s.settle} aspect-[5/4] w-full object-cover object-[52%_30%] sm:aspect-[15/8]`} />
          <div className="absolute inset-0 bg-[linear-gradient(200deg,transparent_35%,rgba(8,22,15,0.92)_100%)]" />
          <p className="absolute left-5 top-5 inline-flex items-center gap-2.5 rounded-full bg-[#10231a]/60 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f5f1e8] sm:left-7 sm:top-7">
            <span aria-hidden="true" className={`${s.pulse} h-1.5 w-1.5 rounded-full bg-[#e2c46b]`} /> Open air, sunset to sunrise
          </p>
          <div className="absolute inset-x-0 bottom-0 p-6 text-[#f5f1e8] sm:p-9">
            <p className={KICKER_LIGHT}>Rave culture</p>
            <h3 className={`${DISPLAY} mt-3 max-w-[22ch] text-[2rem] font-light leading-[1.02] sm:text-[2.7rem] lg:text-[3rem]`}>
              Rave parties, <em className={TURN_LIGHT}>from beaches to the Himalayas.</em>
            </h3>
            <p className="mt-3 hidden max-w-md text-[14px] leading-relaxed text-[#f5f1e8]/75 sm:block">
              Open-air stages, sunrise sets, and a crowd that dances like nobody is keeping score.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:grid-rows-2">
          {TILES.map((t, i) => (
            <Reveal key={t.where} index={i + 1} className={`${s.lift} group relative aspect-[4/5] overflow-hidden rounded-[2px] bg-[#0f2a1e] lg:aspect-auto`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.photo.src} alt={t.photo.alt} width={t.photo.width} height={t.photo.height} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(8,22,15,0.88)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-[#f5f1e8] sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#d9c193]">{t.where}</p>
                <p className={`${DISPLAY} mt-1.5 text-[1.2rem] italic leading-tight sm:text-[1.45rem]`}>{t.line}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <Reveal className="mt-6 flex items-center gap-4 text-[10.5px] font-semibold uppercase tracking-[0.3em] text-[#10231a]/55">
        <span>Beaches</span>
        <span aria-hidden="true" className="relative h-px flex-1 bg-[#10231a]/15">
          <span className={`${s.route} absolute inset-0 bg-[#b08d57]`} />
          <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[#b08d57]" />
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full border border-[#b08d57] bg-[#f5f1e8]" />
        </span>
        <span>Himalayas</span>
      </Reveal>
    </div>
  );
}
