import { BarChart3, BedDouble, BookOpen, Boxes, ChefHat, LayoutGrid, LockKeyhole, Receipt, Users, Wallet } from 'lucide-react';
import { CONTAINER, EYEBROW, H2, LEAD, SECTION } from './landing-styles';

const MODULES = [
  { icon: Receipt, name: 'Billing & POS', text: 'Fast counter and table billing with GST-ready printed receipts.' },
  { icon: LayoutGrid, name: 'Live tables', text: 'Every table’s guests, orders and bill requests; free a table in one tap.' },
  { icon: ChefHat, name: 'Kitchen (KOT)', text: 'Tickets route to stations and move from new to preparing to ready.' },
  { icon: BookOpen, name: 'Menu & recipes', text: 'Categories, add-ons, dish photos and recipes linked to raw stock.' },
  { icon: BedDouble, name: 'Rooms & stays', text: 'Front desk, check-in, room services and check-out in one place.' },
  { icon: Boxes, name: 'Inventory & purchasing', text: 'Raw stock with low-stock alerts and purchase lists for vendors.' },
  { icon: Users, name: 'Staff & expenses', text: 'Team, payroll and daily expenses, so profit is never a guess.' },
  { icon: BarChart3, name: 'Analytics & Z-report', text: 'Revenue by hour, day or month, best sellers and a Z-report.' },
  { icon: Wallet, name: 'Wallet & plans', text: 'Yearly plans or pay-as-you-go credits, with a clear ledger.' },
  { icon: LockKeyhole, name: 'Profile & PIN lock', text: 'Venue details and a PIN that locks the control centre on shared screens.' },
];

export function HostModulesSection() {
  return (
    <section aria-labelledby="modules-title" className={`${SECTION} border-t border-black/[0.06] bg-white`}>
      <div className={CONTAINER}>
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className={EYEBROW}>Quad Computing for hosts</p>
            <h2 id="modules-title" className={H2}>Ten workspaces. One login.</h2>
            <p className={LEAD}>Everything a restaurant, café or stay needs to run a night of service, from the first order to the last report.</p>
          </div>
        </div>

        <ul className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-black/[0.08] bg-black/[0.08] sm:grid-cols-2 lg:grid-cols-5">
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
