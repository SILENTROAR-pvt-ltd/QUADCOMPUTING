'use client';

import React, { useMemo, useState } from 'react';
import { useGuestWallet } from '@/components/guest/lobby/useGuestWallet';
import { GuestWalletModal } from '@/components/guest/lobby/GuestWalletModal';
import { useGuestAccount } from '@/lib/guest/use-guest-account';
import { signOutGuest } from '@/lib/guest/guest-account-client';
import { GuestAuthSheet } from '@/components/guest/account/GuestAuthSheet';
import { GuestInvoices } from '@/components/guest/me/GuestInvoices';
import { GuestWalletHistory } from '@/components/guest/me/GuestWalletHistory';
import { GuestStays } from '@/components/guest/me/GuestStays';
import { GuestProfileSheet } from '@/components/guest/account/GuestProfileSheet';
import { IdentityCard } from './cards/IdentityCard';
import { VisitCard, WalletCard } from './cards/VisitAndWalletCards';

interface GuestMeViewProps {
  cafeId: string;
  tableNumber: string;
  venueName?: string;
  runningTotal: number;
  hasActiveOrder: boolean;
  billSettled: boolean;
  onOpenBill: () => void;
  onOpenMenu: () => void;
}

/** The guest's own space: who they are here, their wallet, this visit, and their bills and history. */
export function GuestMeView({ cafeId, tableNumber, venueName = 'this venue', runningTotal, hasActiveOrder, billSettled, onOpenBill, onOpenMenu }: GuestMeViewProps) {
  const [showWallet, setShowWallet] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { account, loading: accountLoading } = useGuestAccount(cafeId);
  const { wallet, transactions, loading } = useGuestWallet(cafeId);

  const handle = account?.handle ?? (wallet.guest_handle || null);
  const hasProfile = Boolean(account?.handle && account?.phone_masked);
  const visits = useMemo(
    () => new Set(transactions.filter((t) => t.transaction_type === 'CASHBACK').map((t) => t.order_id || t.id)).size,
    [transactions],
  );

  const logout = async () => {
    setSigningOut(true);
    await signOutGuest();
    window.location.reload();
  };

  return (
    <div className="space-y-4 pb-4 sm:space-y-5">
      <IdentityCard account={account} tableNumber={tableNumber} venueName={venueName} onEdit={() => setShowProfile(true)} />

      <section className="flex items-center justify-between gap-4 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-900">{account ? 'Signed in on this device' : 'Not signed in'}</p>
          <p className="text-xs text-neutral-500">{account ? 'Log out if you are sharing this phone.' : 'Sign in to see your cashback and history on any phone.'}</p>
        </div>
        {account ? (
          <button type="button" onClick={logout} disabled={signingOut} className="shrink-0 cursor-pointer rounded-2xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 disabled:opacity-50">
            {signingOut ? 'Logging out…' : 'Log out'}
          </button>
        ) : (
          <button type="button" onClick={() => setShowAuth(true)} className="shrink-0 cursor-pointer rounded-2xl bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800">Sign in</button>
        )}
      </section>

      <WalletCard venueName={venueName} loading={loading} balance={wallet.balance} totalEarned={wallet.total_cashback_earned} visits={visits}
        canUse={hasProfile && Number(wallet.balance || 0) > 0} onUse={() => setShowWallet(true)} />
      <VisitCard cafeId={cafeId} tableNumber={tableNumber} runningTotal={runningTotal} hasActiveOrder={hasActiveOrder} billSettled={billSettled}
        onOpenBill={onOpenBill} onOpenMenu={onOpenMenu} />

      {/* Stays, bills and history across every venue the guest is connected to. */}
      <GuestStays cafeId={cafeId} signedIn={Boolean(account)} checking={accountLoading} />
      <GuestInvoices handle={handle} currentVenueId={cafeId} />
      <GuestWalletHistory handle={handle} currentVenueId={cafeId} />

      <p className="text-center text-[10px] text-neutral-400">Your details stay on this device and are used only for your wallet at {venueName}.</p>

      {account && <GuestProfileSheet isOpen={showProfile} venueId={cafeId} account={account} onClose={() => setShowProfile(false)} onSaved={() => setShowProfile(false)} />}
      <GuestAuthSheet isOpen={showAuth} venueId={cafeId} tableNumber={tableNumber} initialMode="signin" onClose={() => setShowAuth(false)}
        onSignedIn={() => { setShowAuth(false); window.location.reload(); }} />
      <GuestWalletModal isOpen={showWallet} onClose={() => setShowWallet(false)} wallet={wallet} transactions={transactions}
        currentUserTable={tableNumber} cafeId={cafeId} cafeName={venueName} />
    </div>
  );
}

export default GuestMeView;
