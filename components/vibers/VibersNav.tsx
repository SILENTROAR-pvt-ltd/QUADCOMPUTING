import Link from 'next/link';
import { AURA, CONTAINER } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';

const LINKS = [
  { href: '#vibe', label: 'The Vibe' },
  { href: '#protocol', label: 'Our Promise' },
  { href: '#stay', label: 'Your Stay' },
  { href: '#community', label: 'Community' },
  { href: '#team', label: 'Team' },
];

export function VibersNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#2a1250]/[0.07] bg-white/80 backdrop-blur-md">
      <nav aria-label="Main" className={`${CONTAINER} flex h-16 items-center justify-between gap-3`}>
        <Link href="/" aria-label="Vibers Connect home" className="flex shrink-0 items-center gap-2.5">
          <span aria-hidden="true" className={`h-7 w-7 rounded-full ${AURA} shadow-[0_6px_18px_-6px_rgba(255,46,136,0.7)]`} />
          <span className={`${DISPLAY} text-[21px] leading-none tracking-tight text-[#2a1250]`}>
            Vibers <em className="font-normal">Connect</em>
          </span>
        </Link>

        <ul className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-[13px] font-medium text-[#2a1250]/65 transition-colors hover:text-[#2a1250]">{l.label}</a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/join" className="hidden text-[13px] font-semibold text-[#2a1250] underline-offset-4 hover:underline sm:inline">
            Vibers Club
          </Link>
          <Link href="/quad-computing" className="hidden text-[13px] font-semibold text-[#2a1250] underline-offset-4 hover:underline sm:inline">
            Quad Computing
          </Link>
          <a href="#join"
            className="inline-flex h-10 items-center whitespace-nowrap rounded-full bg-[#7c3aed] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#6d28d9] sm:px-5">
            <span className="sm:hidden">Join us</span>
            <span className="hidden sm:inline">Join the movement</span>
          </a>
        </div>
      </nav>
    </header>
  );
}
