'use client';

import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Coins } from 'lucide-react';
import type { GuestAccountSummary } from '@/lib/guest/guest-account-client';
import { initialsOf } from '@/lib/guest/greeting';
import { CASHBACK_PERCENT, rupees } from '@/lib/guest/cashback';
import { Amount, LiveLine } from './cashback/LiveLine';
import { pressSoft } from './motion';

interface CashbackBannerProps {
  /** Cashback on this order, to the paisa. */
  amount: number;
  /** The signed-in guest, or null for a guest who has not signed in. */
  account: GuestAccountSummary | null;
  walletBalance?: number;
  onSignIn: () => void;
}

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

// A soft, warm ivory-to-blush card with a hairline edge: calm and premium, with black as the only strong accent,
// the same black as the Place order button.
const SHELL =
  'relative w-full overflow-hidden rounded-2xl border border-[#ead7cf] bg-[linear-gradient(135deg,#fffbf9_0%,#fbf1ec_55%,#f6e6df_100%)] p-4 text-left text-zinc-950 shadow-[0_18px_40px_-30px_rgba(120,70,55,0.55)]';
const EYEBROW = 'block truncate text-[10px] font-medium uppercase tracking-[0.2em] text-rose-900/60';

/** A faint light sweep, so the card feels alive without drawing the eye away from the order. */
const Sheen = () => (
  <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-sheen bg-gradient-to-r from-transparent via-white/60 to-transparent" />
);

/**
 * The cashback on this order, at the top of the review. A guest sees what they will get and one tap to claim it; a
 * signed-in guest sees it confirmed to their account. The whole banner is the button for a guest, so it is never a
 * small target.
 */
export function CashbackBanner({ amount, account, walletBalance = 0, onSignIn }: CashbackBannerProps) {
  if (account) {
    return (
      <div className={SHELL} role="status">
        <Sheen />
        <div className="relative flex items-center gap-3.5">
          <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-zinc-950 text-[15px] text-white" style={SERIF}>
            {initialsOf(account.display_name || account.handle)}
            <BadgeCheck aria-label="Verified account" className="absolute -bottom-1 -right-1 h-[18px] w-[18px] rounded-full bg-white text-emerald-700" />
          </span>
          <span className="min-w-0 flex-1">
            <span className={EYEBROW}>{CASHBACK_PERCENT}% cashback · {account.handle}</span>
            <span className="mt-0.5 block text-[18px] leading-tight text-zinc-950" style={SERIF}><Amount value={amount} /> comes back to you</span>
            <LiveLine lines={['Credited when the bill settles', walletBalance > 0 ? `Wallet balance now ${rupees(walletBalance)}` : `Earn ${CASHBACK_PERCENT}% back on every bill`]} />
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.button type="button" onClick={onSignIn} {...pressSoft} aria-label={`Sign in to claim ${CASHBACK_PERCENT}% cashback on this order`} className={`${SHELL} group cursor-pointer`}>
      <Sheen />
      <span className="relative flex items-center gap-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-zinc-950 shadow-[0_8px_18px_-10px_rgba(0,0,0,0.6)]">
          <Coins className="h-5 w-5 text-white" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className={EYEBROW}>Your reward</span>
          <span className="mt-0.5 block text-[18px] leading-tight text-zinc-950" style={SERIF}>Get {CASHBACK_PERCENT}% cashback</span>
          <LiveLine lines={['Sign in to claim it', 'Use it on your next bill', 'One account, every venue']} />
        </span>
        <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-zinc-950 px-4 text-xs font-medium text-white shadow-[0_8px_16px_-10px_rgba(0,0,0,0.7)] group-hover:bg-zinc-800 max-[380px]:px-3">
          Claim <ArrowRight className="h-3.5 w-3.5 max-[380px]:hidden" aria-hidden />
        </span>
      </span>
    </motion.button>
  );
}

export default CashbackBanner;
