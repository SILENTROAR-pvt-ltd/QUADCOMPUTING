'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Receipt, Sparkles, UtensilsCrossed, Wallet } from 'lucide-react';
import { useGuestWallet, type WalletTransaction } from '@/components/guest/lobby/useGuestWallet';
import { GuestWalletModal } from '@/components/guest/lobby/GuestWalletModal';
import { BillWalletRedeem } from '@/components/guest/menu/BillWalletRedeem';
import { GUEST_BRAND } from '@/lib/brand';
import { useGuestAccount } from '@/lib/guest/use-guest-account';
import { signOutGuest } from '@/lib/guest/guest-account-client';
import { GuestAuthSheet } from '@/components/guest/account/GuestAuthSheet';
import { GuestInvoices } from '@/components/guest/me/GuestInvoices';
import { GuestWalletHistory } from '@/components/guest/me/GuestWalletHistory';
import { GuestProfileSheet } from '@/components/guest/account/GuestProfileSheet';
import { travellerTypeInfo } from '@/lib/guest/traveller-types';

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

interface Identity { name: string; handle: string; phone: string; avatar: string }

const NO_IDENTITY: Identity = { name: '', handle: '', phone: '', avatar: '☕' };

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** The guest's own space: who they are here, their wallet, and their history. */
export function GuestMeView({
  cafeId, tableNumber, venueName = 'this venue', runningTotal, hasActiveOrder, billSettled, onOpenBill, onOpenMenu,
}: GuestMeViewProps) {
  const [showWallet, setShowWallet] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { account } = useGuestAccount(cafeId);
  const { wallet, transactions, loading } = useGuestWallet(cafeId);

  // The identity shown is the server-verified account (or nothing when signed out).
  const identity: Identity = useMemo(
    () => (account ? { name: account.display_name, handle: account.handle, phone: account.phone_masked || '', avatar: account.avatar || '☕' } : NO_IDENTITY),
    [account]
  );

  const hasProfile = Boolean(identity.handle && identity.phone);
  const travel = travellerTypeInfo(account?.traveller_type);
  const sorted = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [transactions]
  );
  const visits = useMemo(() => new Set(sorted.filter((t) => t.transaction_type === 'CASHBACK').map((t) => t.order_id || t.id)).size, [sorted]);
  const maskedPhone = identity.phone;

  const logout = async () => {
    setSigningOut(true);
    await signOutGuest();
    window.location.reload();
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-4">
      {/* Identity */}
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-[#e8e2d5] bg-[#faf8f5] flex items-center justify-center text-2xl">
            {account?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              identity.avatar
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-semibold">{GUEST_BRAND.name}</p>
            <h2 className="font-serif text-2xl text-neutral-950 leading-tight truncate">{identity.name || 'Guest'}</h2>
            <p className="text-xs text-neutral-500 truncate">
              {identity.handle || 'No wallet handle yet'}{maskedPhone ? ` · ${maskedPhone}` : ''} · Table {tableNumber}
            </p>
          </div>
          {account && (
            <button type="button" onClick={() => setShowProfile(true)} className="shrink-0 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 cursor-pointer">
              Edit
            </button>
          )}
        </div>
        {travel && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-800">
              <span aria-hidden="true">{travel.emoji}</span> {travel.label}
            </span>
          </div>
        )}
        {account?.intro && (
          <p className="mt-3 font-serif text-base italic text-neutral-700 leading-snug">&ldquo;{account.intro}&rdquo;</p>
        )}
        {account && !travel && !account.intro && (
          <p className="mt-3 text-xs text-neutral-500">Add how you travel and a line about you. Tap Edit.</p>
        )}
        {!hasProfile && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-900 leading-relaxed">
              Earn 7% back on every bill at {venueName}. Add your name and mobile number when you place your next order.
            </p>
          </div>
        )}
      </section>

      {/* Account */}
      <section className="flex items-center justify-between gap-4 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-900">{account ? 'Signed in on this device' : 'Not signed in'}</p>
          <p className="text-xs text-neutral-500">
            {account ? 'Log out if you are sharing this phone.' : 'Sign in to see your cashback and history on any phone.'}
          </p>
        </div>
        {account ? (
          <button type="button" onClick={logout} disabled={signingOut} className="shrink-0 rounded-2xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 disabled:opacity-50 cursor-pointer">
            {signingOut ? 'Logging out…' : 'Log out'}
          </button>
        ) : (
          <button type="button" onClick={() => setShowAuth(true)} className="shrink-0 rounded-2xl bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 cursor-pointer">
            Sign in
          </button>
        )}
      </section>

      {/* Wallet */}
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-neutral-500 flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Wallet at {venueName}</p>
            <p className="mt-1 font-serif text-4xl text-neutral-950 tracking-tight">{loading ? '—' : inr(wallet.balance)}</p>
            <p className="mt-1 text-xs text-neutral-500">
              {inr(wallet.total_cashback_earned)} earned in total{visits > 0 ? ` · ${visits} ${visits === 1 ? 'visit' : 'visits'}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowWallet(true)}
            disabled={!hasProfile || Number(wallet.balance || 0) <= 0}
            className="shrink-0 rounded-2xl bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Use balance
          </button>
        </div>
      </section>

      {/* This visit */}
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">
        <p className="text-xs font-medium text-neutral-500">This visit · Table {tableNumber}</p>
        {hasActiveOrder ? (
          <div className="mt-2 flex items-center justify-between gap-4">
            <div>
              <p className="font-serif text-2xl text-neutral-950">{inr(runningTotal)}</p>
              <p className="text-xs text-neutral-500">Running bill, before tax</p>
            </div>
            <button type="button" onClick={onOpenBill} className="inline-flex items-center gap-1.5 rounded-2xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 cursor-pointer">
              <Receipt className="h-3.5 w-3.5" /> View bill
            </button>
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between gap-4">
            <p className="text-sm text-neutral-600">{billSettled ? 'Your bill is settled. Thank you for visiting!' : 'Nothing ordered yet.'}</p>
            {!billSettled && (
              <button type="button" onClick={onOpenMenu} className="inline-flex items-center gap-1.5 rounded-2xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 cursor-pointer">
                <UtensilsCrossed className="h-3.5 w-3.5" /> Browse menu
              </button>
            )}
          </div>
        )}
        {hasActiveOrder && <BillWalletRedeem cafeId={cafeId} tableNumber={tableNumber} />}
      </section>

      {/* Bills (renders nothing when signed out) */}
      <GuestInvoices handle={account?.handle ?? (wallet.guest_handle || null)} currentVenueId={cafeId} />

      {/* History across every venue the guest has a wallet at */}
      <GuestWalletHistory handle={account?.handle ?? (wallet.guest_handle || null)} currentVenueId={cafeId} />

      <p className="text-center text-[10px] text-neutral-400">
        Your details stay on this device and are used only for your wallet at {venueName}.
      </p>

      {account && (
        <GuestProfileSheet
          isOpen={showProfile}
          venueId={cafeId}
          account={account}
          onClose={() => setShowProfile(false)}
          onSaved={() => setShowProfile(false)}
        />
      )}

      <GuestAuthSheet
        isOpen={showAuth}
        venueId={cafeId}
        tableNumber={tableNumber}
        initialMode="signin"
        onClose={() => setShowAuth(false)}
        onSignedIn={() => { setShowAuth(false); window.location.reload(); }}
      />

      <GuestWalletModal
        isOpen={showWallet}
        onClose={() => setShowWallet(false)}
        wallet={wallet}
        transactions={transactions}
        currentUserTable={tableNumber}
        cafeId={cafeId}
        cafeName={venueName}
      />
    </div>
  );
}

export default GuestMeView;
