import { PhoneReel } from '@/components/landing-shots/PhoneReel';
import { Reveal } from './Reveal';
import { PHOTOS } from './vibers-media';
import { CONTAINER, H2, KICKER, LEAD, SECTION, TURN } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './luxe.module.css';

const FEATURES = [
  { n: 'I', title: 'Digital log book', text: 'Every expense at the venue, tracked with full clarity, from the first coffee to the last bill.' },
  { n: 'II', title: 'Self-managed stay', text: 'Beyond digital check-in and check-out: choose an early check-in or a late check-out yourself.' },
  { n: 'III', title: 'Events at your fingertips', text: 'Every connected and in-house event in one list, so you plan your day or evening exactly as you like.' },
];

/** The stay itself: the hustle and the paperwork removed by one interface. Real Vibers Connect screens over the view. */
export function YourStay() {
  const p = PHOTOS.stay;
  return (
    <section id="stay" aria-labelledby="stay-title" className={`${SECTION} bg-[#f5f1e8] text-[#10231a]`}>
      <div className={CONTAINER}>
        <div className="mx-auto max-w-3xl text-center">
          <Reveal><p className={`${KICKER} justify-center after:h-px after:w-8 after:bg-[#b08d57]`}>The digital stay</p></Reveal>
          <Reveal index={1}><h2 id="stay-title" className={`${DISPLAY} ${H2}`}>Your stay, <em className={TURN}>your way.</em></h2></Reveal>
          <Reveal index={2}>
            <p className={`${LEAD} mt-7`}>
              An end-to-end digital interface removes the everyday hustle and unnecessary venue interference, so you spend
              your time on the vibe, not the paperwork.
            </p>
          </Reveal>
        </div>

        <Reveal index={1} className="relative mt-16 overflow-hidden rounded-[2px] bg-[#0f2a1e] sm:mt-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.src} alt={p.alt} width={p.width} height={p.height} loading="lazy" decoding="async" className={`${s.parallax} absolute inset-0 h-full w-full object-cover`} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,22,15,0.82)_0%,rgba(8,22,15,0.35)_55%,rgba(8,22,15,0.1)_100%)]" />
          <div className="relative grid min-h-[560px] items-center gap-10 p-7 sm:p-12 lg:grid-cols-[1fr_1.1fr] lg:p-16">
            <div className="max-w-sm text-[#f5f1e8]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#d9c193]">Real Vibers Connect screens</p>
              <p className={`${DISPLAY} mt-4 text-[2.2rem] font-light leading-[1.05] sm:text-[2.8rem]`}>Order, track and settle, <em className="italic text-[#d9c193]">without waiting for anyone.</em></p>
              <p className="mt-4 text-[14.5px] leading-relaxed text-[#f5f1e8]/70">
                Scan the table or room QR: the menu opens and your order goes straight to the kitchen. Or just tell Vibey what
                you feel like, and leave a postcard on the lounge wall before you go.
              </p>
            </div>
            <div className="relative flex justify-center gap-4 text-[#f5f1e8]/75 sm:gap-6 lg:justify-end">
              <PhoneReel ids={['guest-menu', 'guest-tracker']} captions={['The menu', 'Your order, live']} className="w-[46%] max-w-[230px] translate-y-6" />
              <PhoneReel ids={['guest-vibey', 'guest-lounge']} captions={['Vibey fills your tray', 'The lounge wall']} className="w-[46%] max-w-[230px] -translate-y-6" startDelayMs={900} />
            </div>
          </div>
        </Reveal>

        <ul className="mt-16 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {FEATURES.map((f, i) => (
            <Reveal as="li" key={f.title} index={i} className="border-t border-[#10231a]/10 pt-7">
              <span className={`${DISPLAY} text-[15px] italic text-[#b08d57]`}>{f.n}</span>
              <h3 className={`${DISPLAY} mt-2 text-[1.75rem] font-normal leading-tight`}>{f.title}</h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-[#10231a]/65">{f.text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
