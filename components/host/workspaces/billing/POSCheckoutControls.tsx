'use client';

import React from 'react';
import type { CatalogItem } from '@/types';
import { 
  POSCatalogGrid, 
  CatalogItemPayload,
} from './controls/POSCatalogGrid';
import { POSCustomAddonBuilder } from './controls/POSCustomAddonBuilder';
import { POSDiscountTaxControls } from './controls/POSDiscountTaxControls';
import { POSWalletRedeemCard } from './components/POSWalletRedeemCard';
import { POSLiveOffersCard } from './components/POSLiveOffersCard';

export type { CatalogItemPayload };

interface Props {
  cafeId?: string | null;
  activeItems?: CatalogItem[];
  cartItems?: Array<{ id: string; name: string; price: number; qty: number }>;
  onAddItemToCart?: (item: CatalogItemPayload) => void;
  onAddCustomItem?: (name: string, price: number) => void;
  addItem?: (id: string) => void;
  customAmount?: string;
  setCustomAmount?: (val: string) => void;
  discountType: 'percentage' | 'flat';
  setDiscountType: (type: 'percentage' | 'flat') => void;
  discountInputValue: string;
  setDiscountInputValue: (val: string) => void;
  gstEnabled: boolean;
  setGstEnabled: (enabled: boolean) => void;
  redemptionCode?: string | null;
  setRedemptionCode?: (code: string | null) => void;
  verifiedRedemption?: any;
  setVerifiedRedemption?: (val: any) => void;
}

export function POSCheckoutControls({
  cafeId, activeItems = [], cartItems = [], onAddItemToCart, onAddCustomItem, addItem,
  setCustomAmount, discountType, setDiscountType, discountInputValue, setDiscountInputValue,
  gstEnabled, setGstEnabled, redemptionCode, setRedemptionCode, verifiedRedemption, setVerifiedRedemption,
}: Props) {
  return (
    <div className="rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white p-4 sm:p-7 shadow-sm space-y-7">
      <POSCatalogGrid cafeId={cafeId} activeItems={activeItems} cartItems={cartItems} onAddItemToCart={onAddItemToCart} addItem={addItem} />
      <hr className="border-zinc-100" />
      <POSCustomAddonBuilder onAddCustomItem={onAddCustomItem} setCustomAmount={setCustomAmount} />
      <POSLiveOffersCard
        cafeId={cafeId}
        onApply={(d) => { setDiscountType(d.type); setDiscountInputValue(String(d.value)); }}
        onClear={() => setDiscountInputValue('')}
      />
      <POSDiscountTaxControls
        discountType={discountType} setDiscountType={setDiscountType}
        discountInputValue={discountInputValue} setDiscountInputValue={setDiscountInputValue}
        gstEnabled={gstEnabled} setGstEnabled={setGstEnabled}
      />
      {setRedemptionCode && (
        <POSWalletRedeemCard
          cafeId={cafeId} redemptionCode={redemptionCode || null} setRedemptionCode={setRedemptionCode}
          verifiedRedemption={verifiedRedemption} setVerifiedRedemption={setVerifiedRedemption || (() => {})}
          onApplyDiscount={(amt, code) => { setDiscountType('flat'); setDiscountInputValue(String(amt)); setRedemptionCode(code); }}
          onClearRedemption={() => { setRedemptionCode(null); setVerifiedRedemption?.(null); setDiscountInputValue(''); }}
        />
      )}
    </div>
  );
}
