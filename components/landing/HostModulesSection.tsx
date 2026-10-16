import { BarChart3, Banknote, BedDouble, BookOpen, Boxes, CalendarDays, ChefHat, CreditCard, LayoutGrid, ReceiptText, Store, Truck, UserRound, Users, Wallet } from 'lucide-react';
import { CONTAINER, EYEBROW, H2, LEAD, SECTION } from './landing-styles';

// The control centre's workspaces, in the order of its navigation bar.
const MODULES = [
  { icon: UserRound, name: 'My Profile', text: 'Venue details, hours, delivery and booking terms, and a PIN lock for shared screens.' },
  { icon: Wallet, name: 'Subscription & Wallet', text: 'Yearly plans or pay-as-you-go from prepaid credit, with a clear statement.' },
  { icon: Banknote, name: 'Dues', text: 'You earn against we earn, daily 10 AM to 10 PM slips, and every invoice a tap away.' },
  { icon: BarChart3, name: 'Analytics & COGS', text: 'A-to-Z reports for any range and a full profit and loss with every expense.' },
  { icon: BookOpen, name: 'Menu Catalog', text: 'Categories, add-ons, dish photos and recipes linked to raw stock.' },
  { icon: CreditCard, name: 'Billing & Tables', text: 'Counter and table billing with GST-ready receipts, cash, UPI or card.' },
  { icon: LayoutGrid, name: 'Live Tables', text: 'Every table’s guests, orders and bill requests; free a table in one tap.' },
  { icon: CalendarDays, name: 'Reservations', text: 'Table bookings from the guest menu: confirm, seat or cancel from one list.' },
  { icon: Truck, name: 'Delivery', text: 'Orders inside your radius, COD or UPI in advance, tracked to the door.' },
  { icon: BedDouble, name: 'Accommodations', text: 'Front desk, check-in, room services and check-out in one place.' },
  { icon: ChefHat, name: 'Live Kitchen (KOT)', text: 'Tickets route to stations and move from new to preparing to ready.' },
  { icon: Boxes, name: 'Raw Inventory', text: 'Stock with reorder levels, wastage and counts, deducted by recipes.' },
  { icon: ReceiptText, name: 'Staff & Expenses', text: 'Team, salaries, advances and daily bills, all inside the P&L.' },
  { icon: Users, name: 'My Guests', text: 'Every connected guest: visits, spend and who keeps coming back.' },
  { icon: Store, name: 'Vendors', text: 'Partners’ QR and WhatsApp, with guest orders shared in one tap.' },
];

export function HostModulesSection() {
  return (
    <section id="workspaces" aria-labelledby="modules-title" className={`${SECTION} border-t border-black/[0.06] bg-[#faf9f6]`}>
      <div className={CONTAINER}>
        <p className={EYEBROW}>Quad Computing for hosts</p>
        <h2 id="modules-title" className={H2}>Fifteen workspaces. One login.</h2>
        <p className={LEAD}>Everything a restaurant, café or stay needs to run a day of service, from the first order to the last report.</p>

        <ul className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-black/[0.08] bg-black/[0.08] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {MODULES.map((m) => (
            <li key={m.name} className="group bg-white p-6 transition-colors hover:bg-[#fdfbf6]">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 text-black transition-colors group-hover:border-[#c8a96a]">
                <m.icon aria-hidden="true" className="h-[18px] w-[18px]" />
              </span>
              <h3 className="mt-5 text-[15px] font-semibold text-black">{m.name}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">{m.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
