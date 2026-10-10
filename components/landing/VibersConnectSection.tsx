import Image from 'next/image';
import { ConciergeBell, Gift, MessagesSquare, QrCode, Star, UtensilsCrossed } from 'lucide-react';
import { CONTAINER, EYEBROW, H2, LEAD, SECTION } from './landing-styles';

const FEATURES = [
  { icon: UtensilsCrossed, title: 'Order and track live', text: 'A clear menu with add-ons, then a live tracker from kitchen to table.' },
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

          <div aria-hidden="true" className="absolute -right-2 top-8 hidden w-48 rounded-[1.75rem] border-[6px] border-black bg-white p-3 shadow-2xl sm:block lg:-right-6">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8a6d3b]">Vibers Connect</p>
            <p className="font-editorial mt-1 text-[15px] leading-tight text-black">Table 4 · Your order</p>
            <ul className="mt-3 space-y-1.5 text-[11px] text-zinc-700">
              <li className="flex justify-between"><span>Misal Pav × 2</span><span>Ready</span></li>
              <li className="flex justify-between"><span>Masala Chai × 2</span><span>Preparing</span></li>
            </ul>
            <div className="mt-3 rounded-xl bg-[#fbf6ea] px-2.5 py-2 text-[10px] text-[#5c4520]">Cashback ready to use on this bill</div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-center text-[10px] font-semibold">
              <span className="rounded-lg bg-black py-1.5 text-white">Call waiter</span>
              <span className="rounded-lg border border-black/15 py-1.5 text-black">Get bill</span>
            </div>
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
