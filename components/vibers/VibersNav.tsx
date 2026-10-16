import Link from 'next/link';
import { CONTAINER, PRIMARY } from './vibers-brand';
import { DISPLAY } from './vibers-fonts';

const LINKS = [
  { href: '#story', label: 'The Vibe' },
  { href: '#stay', label: 'Your Stay' },
  { href: '#venues', label: 'For Venues' },
  { href: '#earn', label: 'You earn · We earn' },
  { href: '#community', label: 'Community' },
];

export function VibersNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#14261b]/[0.07] bg-[#f1efe6]/85 backdrop-blur-md">
      <nav aria-label="Main" className={`${CONTAINER} flex h-16 items-center justify-between gap-3`}>
        <Link href="/" aria-label="Vibers Connect home" className="flex shrink-0 items-center gap-2.5">
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-[#17301f]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#c8da4a]" />
          </span>
          <span className={`${DISPLAY} text-[21px] leading-none tracking-tight text-[#14261b]`}>
            Vibers <em className="italic text-[#3c6b2b]">Connect</em>
          </span>
        </Link>

        <ul className="hidden items-center gap-5 xl:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="whitespace-nowrap text-[13px] font-medium text-[#14261b]/65 transition-colors hover:text-[#14261b]">{l.label}</a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/join" className="hidden whitespace-nowrap text-[13px] font-semibold text-[#14261b] underline-offset-4 hover:underline sm:inline">Vibers Club</Link>
          <Link href="/quad-computing" className="hidden whitespace-nowrap text-[13px] font-semibold text-[#14261b] underline-offset-4 hover:underline sm:inline">Quad Computing</Link>
          <a href="#join" className={`inline-flex h-10 items-center whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors sm:px-5 ${PRIMARY}`}>
            <span className="sm:hidden">Join us</span>
            <span className="hidden sm:inline">Join the movement</span>
          </a>
        </div>
      </nav>
    </header>
  );
}
