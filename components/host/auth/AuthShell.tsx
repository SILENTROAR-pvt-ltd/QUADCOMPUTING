import Link from 'next/link';
import { ChefHat, LayoutGrid, LockKeyhole } from 'lucide-react';

const POINTS = [
  { icon: LayoutGrid, text: 'Live tables, billing and kitchen tickets in one place' },
  { icon: ChefHat, text: 'Menu, rooms, stock and reports that update themselves' },
  { icon: LockKeyhole, text: 'PIN-locked, and every venue sees only its own data' },
];

interface Props { children: React.ReactNode; aside?: React.ReactNode }

/** Host sign-in and sign-up frame: the Quad Computing brand on the left, the form on the right. */
export function AuthShell({ children, aside }: Props) {
  return (
    <div className="min-h-screen bg-[#faf9f6] text-neutral-950 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-neutral-950 p-12 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#c8a96a]/25 blur-3xl" />
        <Brand dark />
        <div className="relative">
          <p className="font-editorial text-4xl leading-tight">Run the whole house from one screen.</p>
          <ul className="mt-10 space-y-5">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-start gap-3 text-[15px] text-white/80">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10"><p.icon aria-hidden="true" className="h-4 w-4 text-[#e6d5b0]" /></span>
                <span className="pt-1.5">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[12px] text-white/50">Quad Computing is a Vibers Connect product.</p>
      </aside>

      <div className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-4 py-5 sm:px-8">
          <div className="lg:invisible"><Brand /></div>
          {aside}
        </div>
        <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:px-8 lg:items-center">{children}</main>
      </div>
    </div>
  );
}

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/quad-computing" className="relative flex items-center gap-2.5" aria-label="Quad Computing home">
      <span aria-hidden="true" className={`grid h-8 w-8 place-items-center rounded-lg text-[11px] font-semibold tracking-wider ${dark ? 'bg-white text-black' : 'bg-black text-white'}`}>QC</span>
      <span className={`font-editorial text-[17px] leading-none ${dark ? 'text-white' : 'text-black'}`}>Quad Computing</span>
    </Link>
  );
}
