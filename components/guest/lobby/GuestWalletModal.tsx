// components/guest/lobby/GuestWalletModal.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GuestWallet, WalletTransaction } from './useGuestWallet';
import { WalletHeader } from './wallet/WalletHeader';
import { WalletBalanceCard } from './wallet/WalletBalanceCard';
import { WalletRedeemPass } from './wallet/WalletRedeemPass';
import { WalletTransactionList } from './wallet/WalletTransactionList';

interface GuestWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: GuestWallet;
  transactions: WalletTransaction[];
  currentUserTable: string;
  cafeId?: string;
  cafeName?: string;
}

export function GuestWalletModal({
  isOpen, onClose, wallet, transactions, currentUserTable, cafeId, cafeName,
}: GuestWalletModalProps) {
  if (!isOpen) return null;

  const resolvedCafeName = cafeName || wallet.cafe_name || 'Venue';
  const menuHref = `/menu?table=${encodeURIComponent(currentUserTable)}${
    cafeId ? `&cafe_id=${encodeURIComponent(cafeId)}` : ''
  }&redeem=wallet`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[260] flex items-center justify-center bg-neutral-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#faf9f6] border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] text-neutral-900"
      >
        <WalletHeader cafeName={resolvedCafeName} onClose={onClose} />
        <WalletBalanceCard wallet={wallet} cafeName={resolvedCafeName} tableNumber={currentUserTable} />
        <WalletRedeemPass
          balance={Number(wallet.balance || 0)}
          guestId={wallet.guest_id}
          guestHandle={wallet.guest_handle}
          walletCode={wallet.wallet_code}
          tableNumber={currentUserTable}
          cafeId={cafeId || wallet.cafe_id}
        />
        <WalletTransactionList transactions={transactions} defaultCafeName={resolvedCafeName} />

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-neutral-200 pt-4">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-neutral-700">
              Redeem towards Table {currentUserTable} order
            </p>
            <p className="truncate text-[10px] text-neutral-500">
              Valid exclusively at {resolvedCafeName}
            </p>
          </div>
          <Link
            href={menuHref}
            onClick={onClose}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-bold tracking-wide text-white transition-all hover:bg-neutral-800 active:scale-95"
          >
            <span>Redeem at {resolvedCafeName}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default GuestWalletModal;
