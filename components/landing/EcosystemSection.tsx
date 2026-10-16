import { ArrowLeftRight, Building2, Check, Smartphone } from 'lucide-react';
import { CONTAINER, EYEBROW, H2, LEAD, SECTION } from './landing-styles';

const SIDES = [
  {
    id: 'host',
    icon: Building2,
    tag: 'For owners and staff',
    name: 'Quad Computing',
    blurb: 'The control centre your team runs service from, on any laptop, tablet or phone.',
    points: [
      'Billing and POS with GST-ready bills',
      'Live tables, staff calls and kitchen tickets',
      'Rooms, delivery, reservations and vendors',
      'Raw inventory, recipes and stock control',
      'Dues, A-to-Z analytics and a full profit and loss',
    ],
    dark: true,
  },
  {
    id: 'guest',
    icon: Smartphone,
    tag: 'For your guests',
    name: 'Vibers Connect',
    blurb: 'What guests see when they scan the table QR. It opens in the browser, with nothing to install.',
    points: [
      'Browse the menu, customise and order',
      'Track every dish from kitchen to table',
      'Call the waiter, chef or bill in one tap',
      'Join the Vibers Lobby with the venue’s guests',
      'Earn wallet cashback and redeem it on the bill',
    ],
    dark: false,
  },
];

export function EcosystemSection() {
  return (
    <section id="platform" aria-labelledby="platform-title" className={`${SECTION} border-t border-black/[0.06] bg-white`}>
      <div className={CONTAINER}>
        <p className={EYEBROW}>The ecosystem</p>
        <h2 id="platform-title" className={H2}>One platform, two experiences.</h2>
        <p className={LEAD}>
          Every order, call and payment moves between the two sides in real time. Guests only ever see
          Vibers Connect and your venue&apos;s name; your team works in Quad Computing.
        </p>

        <div className="relative mt-12 grid gap-5 lg:grid-cols-2 lg:gap-8">
          <div aria-hidden="true" className="absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
            <span className="flex items-center gap-1.5 rounded-full border border-[#e6d5b0] bg-white px-3 py-1.5 text-[11px] font-semibold text-black shadow-sm">
              <ArrowLeftRight className="h-3.5 w-3.5" /> Live sync
            </span>
          </div>

          {SIDES.map((s) => (
            <article key={s.id}
              className={`rounded-3xl border p-7 sm:p-9 ${s.dark ? 'border-black bg-black text-white' : 'border-[#e6d5b0] bg-[#fdfbf6] text-black'}`}>
              <div className="flex items-center gap-3">
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${s.dark ? 'bg-white/10' : 'bg-black text-white'}`}>
                  <s.icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${s.dark ? 'text-white/60' : 'text-zinc-500'}`}>{s.tag}</p>
                  <h3 className="font-editorial text-2xl">{s.name}</h3>
                </div>
              </div>
              <p className={`mt-5 text-[15px] leading-relaxed ${s.dark ? 'text-white/75' : 'text-zinc-600'}`}>{s.blurb}</p>
              <ul className="mt-6 space-y-3">
                {s.points.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[14px]">
                    <Check aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${s.dark ? 'text-[#e6d5b0]' : 'text-black'}`} />
                    <span className={s.dark ? 'text-white/90' : 'text-zinc-800'}>{p}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
