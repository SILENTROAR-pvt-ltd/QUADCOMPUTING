import Image from 'next/image';
import { ConciergeBell, Gift, MessagesSquare, QrCode, Star, UtensilsCrossed } from 'lucide-react';
import { LivePhone } from '@/components/landing-shots/LivePhone';
import { CONTAINER, EYEBROW, H2, LEAD, SECTION } from './landing-styles';

const FEATURES = [
  { icon: UtensilsCrossed, title: 'Order and track live', text: 'A clear menu with add-ons, then a live tracker from kitchen to table. Delivery and table booking too.' },
  { icon: ConciergeBell, title: 'Call staff in one tap', text: 'Waiter, chef or the bill, sent straight to the floor team.' },
  { icon: MessagesSquare, title: 'The Vibers Lobby', text: 'A lounge for the venue’s guests: posts, replies and private chats.' },
  { icon: Gift, title: 'Wallet and cashback', text: 'Guests earn on every visit and redeem it on their next bill.' },
  { icon: Star, title: 'Reviews and photos', text: 'Guests review their visit and browse the venue’s photo vault.' },
  { icon: QrCode, title: 'Nothing to install', text: 'One QR per table. It opens in any phone browser in seconds.' },
];

export function VibersConnectSection() {
  return (
    <section id="vibers-connect" aria-labelledby="vibers-title" className={`${SECTION} bg-[#faf9f6]`}>
      <div className={`${CONTAINER} grid gap-14 lg:grid-cols-2 lg:items-center`}>
        <div className="relative">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl sm:aspect-[5/4] lg:aspect-[4/5]">
            <Image src="/images/landing/vibers-table.jpg" alt="Friends at a café table, ordering from their phones"
              fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <p className="absolute bottom-5 left-5 right-5 font-editorial text-xl leading-snug text-white sm:text-2xl">
              The table is the front door. One scan and the guest is in.
            </p>
          </div>

          <div className="absolute -right-2 top-8 hidden gap-3 sm:flex lg:-right-8">
            <LivePhone id="guest-menu" className="w-[160px] lg:w-[180px]" />
            <LivePhone id="guest-tracker" className="mt-16 w-[160px] lg:w-[180px]" />
          </div>
        </div>

        <div>
          <p className={EYEBROW}>Vibers Connect for guests</p>
          <h2 id="vibers-title" className={H2}>Order, connect and earn at your table.</h2>
          <p className={LEAD}>
            Vibers Connect is the guest side of the platform. Guests never see the Quad Computing name, only
            Vibers Connect, your venue, your menu and the people sharing the room tonight.
          </p>
          <ul className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black text-white">
                  <f.icon aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-black">{f.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-zinc-600">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
