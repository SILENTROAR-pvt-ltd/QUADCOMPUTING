import Link from 'next/link';
import { CONTAINER } from './landing-styles';

const LINKS = [
  { href: '#platform', label: 'Platform' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#vibers-connect', label: 'Vibers Connect' },
  { href: '#pricing', label: 'Pricing' },
];

/** The sticky top bar: brand, section links and the two host entry points. */
export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#faf9f6]/85 backdrop-blur-md">
      <nav aria-label="Main" className={`${CONTAINER} flex h-16 items-center justify-between gap-3`}>
        <div className="flex shrink-0 items-center gap-2.5">
          <Link href="/quad-computing" aria-label="Quad Computing home" className="flex items-center gap-2.5">
            <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-black text-[11px] font-semibold tracking-wider text-white">QC</span>
            <span className="font-editorial text-[17px] leading-none text-black">Quad Computing</span>
          </Link>
          <Link href="/" className="hidden text-[12px] text-zinc-500 underline-offset-4 transition-colors hover:text-black hover:underline lg:inline">
            by Vibers Connect
          </Link>
        </div>

        <ul className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-[13px] text-zinc-600 transition-colors hover:text-black">{l.label}</a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link href="/auth/host"
            className="inline-flex h-9 items-center rounded-full border border-zinc-300 bg-white px-4 text-[13px] font-semibold text-black transition-colors hover:border-black">
            Host login
          </Link>
          <Link href="/onboarding/host"
            className="hidden h-9 items-center rounded-full bg-black px-4 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-800 sm:inline-flex">
            Create host profile
          </Link>
        </div>
      </nav>
    </header>
  );
}
