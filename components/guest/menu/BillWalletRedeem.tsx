'use client';

import React from 'react';
import { useGuestAccount } from '@/lib/guest/use-guest-account';
import { useGuestWallet } from '@/components/guest/lobby/useGuestWallet';
import { WalletRedeemPass } from '@/components/guest/lobby/wallet/WalletRedeemPass';

interface BillWalletRedeemProps {
  cafeId: string;
  tableNumber: string;
}

/** Cashback redeem on the open bill. Signed-in guests only, same host request as the wallet sheet. */
export function BillWalletRedeem({ cafeId, tableNumber }: BillWalletRedeemProps) {
  const { account } = useGuestAccount(cafeId);
  const { wallet } = useGuestWallet(cafeId);
  if (!account) return null;

  return (
    <WalletRedeemPass
      balance={Number(wallet.balance || 0)}
      guestId={account.handle}
      guestHandle={account.handle}
      walletCode={wallet.wallet_code}
      tableNumber={tableNumber}
      cafeId={cafeId}
    />
  );
}

export default BillWalletRedeem;
