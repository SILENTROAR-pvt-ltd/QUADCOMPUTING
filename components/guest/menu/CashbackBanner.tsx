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

const SERIF = { fontFamily: "var(--font-luxe), 'Playfair Display', Georgia, serif" } as const;

// A champagne card with a warm hairline: calm and premium, with the forest of the Place order button as its one
// strong accent.
const SHELL =
  'relative w-full overflow-hidden rounded-[22px] border border-[#e3d3ad] bg-[linear-gradient(135deg,#fdfaf2_0%,#f7eedb_55%,#efe1c1_100%)] p-4 text-left text-[#10231a] shadow-[0_18px_40px_-30px_rgba(138,109,63,0.6)]';
const EYEBROW = 'block truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8a6d3f]';

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
          <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[17px] text-[#d9c193]" style={SERIF}>
            {initialsOf(account.display_name || account.handle)}
            <BadgeCheck aria-label="Verified account" className="absolute -bottom-1 -right-1 h-[18px] w-[18px] rounded-full bg-[#fbf9f4] text-[#173a2a]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className={EYEBROW}>{CASHBACK_PERCENT}% cashback · {account.handle}</span>
            <span className="mt-0.5 block text-[21px] font-medium leading-tight text-[#10231a]" style={SERIF}><Amount value={amount} /> comes back to you</span>
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
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] shadow-[0_8px_18px_-10px_rgba(15,42,30,0.7)]">
          <Coins className="h-5 w-5 text-[#d9c193]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className={EYEBROW}>Your reward</span>
          <span className="mt-0.5 block text-[21px] font-medium leading-tight text-[#10231a]" style={SERIF}>Get {CASHBACK_PERCENT}% cashback</span>
          <LiveLine lines={['Sign in to claim it', 'Use it on your next bill', 'One account, every venue']} />
        </span>
        <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] px-4 text-xs font-medium text-[#f5f1e8] shadow-[0_8px_16px_-10px_rgba(15,42,30,0.75)] max-[380px]:px-3">
          Claim <ArrowRight className="h-3.5 w-3.5 max-[380px]:hidden" aria-hidden />
        </span>
      </span>
    </motion.button>
  );
}

export default CashbackBanner;
