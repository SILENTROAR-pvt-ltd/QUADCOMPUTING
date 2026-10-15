'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Coins } from 'lucide-react';
import type { GuestAccountSummary } from '@/lib/guest/guest-account-client';
import { initialsOf } from '@/lib/guest/greeting';
import { CASHBACK_PERCENT, rupees } from '@/lib/guest/cashback';

interface CashbackBannerProps {
  /** Cashback on this order, to the paisa. */
  amount: number;
  /** The signed-in guest, or null for a guest who has not signed in. */
  account: GuestAccountSummary | null;
  walletBalance?: number;
  onSignIn: () => void;
}

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

// A soft, warm ivory-to-blush card with a hairline edge: calm and premium, with black as the only strong accent,
// the same black as the Place order button.
const shell =
  'relative w-full overflow-hidden rounded-2xl border border-[#ead7cf] bg-[linear-gradient(135deg,#fffbf9_0%,#fbf1ec_55%,#f6e6df_100%)] p-4 text-left text-zinc-950 shadow-[0_18px_40px_-30px_rgba(120,70,55,0.55)]';

const wordIn = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' as const } },
};

/** The line's words settle in one after another, like live text. Plain text when motion is reduced. */
function EnterText({ text }: { text: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <span className="block truncate">{text}</span>;
  return (
    <motion.span
      key={text}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
      className="block whitespace-nowrap"
    >
      {text.split(' ').map((word, i) => (
        <motion.span key={`${i}-${word}`} variants={wordIn} className="inline-block whitespace-pre">
          {i === 0 ? word : ` ${word}`}
        </motion.span>
      ))}
    </motion.span>
  );
}

/** Rotates through a few short lines, so the banner reads as live without asking for attention. */
function LiveLine({ lines }: { lines: string[] }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce || lines.length < 2) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % lines.length), 3600);
    return () => window.clearInterval(t);
  }, [reduce, lines.length]);
  const line = lines[i % lines.length];
  return (
    <span className="relative mt-1 block h-[18px] overflow-hidden text-[12px] font-normal leading-[18px] text-zinc-600">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={line}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 block"
        >
          <EnterText text={line} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** The amount, which eases into place whenever it changes. */
function Amount({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ y: -4, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="inline-block font-semibold tabular-nums"
    >
      {rupees(value)}
    </motion.span>
  );
}

/**
 * The cashback on this order, at the top of the review. A guest sees what they will get and one tap to claim it; a
 * signed-in guest sees it confirmed to their account. The whole banner is the button for a guest, so it is never a
 * small target.
 */
export function CashbackBanner({ amount, account, walletBalance = 0, onSignIn }: CashbackBannerProps) {
  // A faint light sweep, so the card feels alive without drawing the eye away from the order.
  const sheen = (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-sheen bg-gradient-to-r from-transparent via-white/60 to-transparent"
    />
  );

  if (account) {
    return (
      <div className={shell} role="status">
        {sheen}
        <div className="relative flex items-center gap-3.5">
          <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-zinc-950 text-[15px] text-white" style={serif}>
            {initialsOf(account.display_name || account.handle)}
            <BadgeCheck aria-label="Verified account" className="absolute -bottom-1 -right-1 h-[18px] w-[18px] rounded-full bg-white text-emerald-700" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[10px] font-medium uppercase tracking-[0.2em] text-rose-900/60">
              {CASHBACK_PERCENT}% cashback · {account.handle}
            </span>
            <span className="mt-0.5 block text-[18px] leading-tight text-zinc-950" style={serif}>
              <Amount value={amount} /> comes back to you
            </span>
            <LiveLine
              lines={[
                'Credited when the bill settles',
                walletBalance > 0 ? `Wallet balance now ${rupees(walletBalance)}` : `Earn ${CASHBACK_PERCENT}% back on every bill`,
              ]}
            />
          </span>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSignIn}
      aria-label={`Sign in to claim ${CASHBACK_PERCENT}% cashback on this order`}
      className={`${shell} group cursor-pointer transition-transform duration-200 active:scale-[0.99]`}
    >
      {sheen}
      <span className="relative flex items-center gap-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-zinc-950 shadow-[0_8px_18px_-10px_rgba(0,0,0,0.6)]">
          <Coins className="h-5 w-5 text-white" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[10px] font-medium uppercase tracking-[0.2em] text-rose-900/60">
            Your reward
          </span>
          <span className="mt-0.5 block text-[18px] leading-tight text-zinc-950" style={serif}>
            Get {CASHBACK_PERCENT}% cashback
          </span>
          <LiveLine lines={['Sign in to claim it', 'Use it on your next bill', 'One account, every venue']} />
        </span>
        <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-zinc-950 px-4 text-xs font-medium text-white shadow-[0_8px_16px_-10px_rgba(0,0,0,0.7)] transition-colors group-hover:bg-zinc-800 max-[380px]:px-3">
          Claim
          <ArrowRight className="h-3.5 w-3.5 max-[380px]:hidden" aria-hidden />
        </span>
      </span>
    </button>
  );
}

export default CashbackBanner;
