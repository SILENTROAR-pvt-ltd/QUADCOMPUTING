import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BTN_PRIMARY, BTN_SECONDARY, CONTAINER } from './landing-styles';

const LINKS = [
  { href: '/auth/host', label: 'Host login' },
  { href: '/onboarding/host', label: 'Create host profile' },
  { href: '/onboarding/guest', label: 'Guest access' },
];

/** The closing call to action and the site footer. */
export function LandingFooter() {
  return (
    <>
      <section aria-labelledby="cta-title" className="border-t border-black/[0.06] bg-[#faf9f6] py-20 sm:py-24">
        <div className={`${CONTAINER} text-center`}>
          <h2 id="cta-title" className="font-editorial mx-auto max-w-2xl text-3xl leading-tight text-black sm:text-[2.6rem]">
            Bring your venue online tonight.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-600">
            Create your host profile, add your menu, print your table QRs and start taking orders.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/onboarding/host" className={BTN_PRIMARY}>
              Create host profile <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href="/auth/host" className={BTN_SECONDARY}>Host login</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/[0.06] bg-white">
        <div className={`${CONTAINER} flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-md bg-black text-[10px] font-semibold text-white">QC</span>
            <span className="text-[13px] text-zinc-600">
              <span className="font-semibold text-black">Quad Computing</span> · a{' '}
              <Link href="/" className="underline-offset-4 hover:text-black hover:underline">Vibers Connect</Link> product
            </span>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {LINKS.map((l) => (
                <li key={l.href}><Link href={l.href} className="text-[13px] text-zinc-600 transition-colors hover:text-black">{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        </div>
        <p className={`${CONTAINER} pb-8 text-[12px] text-zinc-500`}>© {new Date().getFullYear()} Vibers Connect Pvt. Ltd. All rights reserved.</p>
      </footer>
    </>
  );
}
