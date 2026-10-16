import Link from 'next/link';
import { ArrowUpRight, BarChart3, Boxes, Scale, Users } from 'lucide-react';
import { BrowserShot, SAMPLE_NOTE } from '@/components/landing-shots/ShotFrames';
import { Chapter } from './Chapter';
import { ACCENT, BTN, CONTAINER, H2, LEAD, PRIMARY, SECTION, SURFACE } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';
import s from './vibers.module.css';

const INSIGHTS = [
  { icon: BarChart3, title: 'Reports, A to Z', text: 'Sales by hour, weekday, channel and category for any day or range, with the busiest hour named and a CSV to export.' },
  { icon: Scale, title: 'Profit and loss, every expense', text: 'Revenue without GST, ingredients used, wastage, salaries, rent, power and platform fees, down to one net profit.' },
  { icon: Users, title: 'Connected guests', text: 'Who came in, who is new, who keeps coming back, and the guests who spend the most, straight from My Guests.' },
  { icon: Boxes, title: 'Stock control', text: 'What is out, critical or low, and how much to buy to reach the reorder level, before the kitchen runs short.' },
];

/** Chapter 05: the venue side. Every Vibers property runs on Quad Computing, and its analytics tell the truth. */
export function VenueEngine() {
  return (
    <section id="venues" aria-labelledby="venues-title" className={`${SECTION} bg-[#e1efe3]/60`}>
      <div className={`${CONTAINER} ${s.reveal}`}>
        <div className="grid items-end gap-8 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <Chapter n="05" label="For venues · Quad Computing" />
            <h2 id="venues-title" className={`${DISPLAY} ${H2}`}>
              The engine behind <em className={ACCENT}>every stay.</em>
            </h2>
          </div>
          <p className={LEAD}>
            Our properties run on Quad Computing: billing, live tables, kitchen tickets, rooms, delivery, reservations,
            stock, staff and vendors in one control centre. Its analytics show the owner where every rupee came from and where it went.
          </p>
        </div>

        <BrowserShot id="overview" className="mt-12" />
        <p className="mt-3 text-center text-[11px] text-[#14261b]/50">{SAMPLE_NOTE}</p>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {INSIGHTS.map((i) => (
            <li key={i.title} className={`${SURFACE} !rounded-3xl p-4 sm:p-6`}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#17301f] text-[#c8da4a] sm:h-10 sm:w-10"><i.icon aria-hidden="true" className="h-4 w-4 sm:h-[18px] sm:w-[18px]" /></span>
              <h3 className={`${DISPLAY} mt-4 text-[17px] leading-snug text-[#14261b] sm:text-xl`}>{i.title}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-[#14261b]/65 sm:text-[13px]">{i.text}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8 grid items-start gap-5 lg:grid-cols-[1fr_1.25fr]">
          <BrowserShot id="pnl" url="Analytics · Profit & loss" crop={0.95} />
          <BrowserShot id="items-stock" url="Analytics · Top items & stock" />
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/quad-computing" className={`${BTN} ${PRIMARY}`}>
            Explore Quad Computing <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
