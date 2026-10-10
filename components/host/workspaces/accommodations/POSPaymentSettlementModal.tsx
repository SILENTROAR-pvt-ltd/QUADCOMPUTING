'use client';

import React, { useState } from 'react';
import type { PhysicalRoom } from '@/types';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { 
  X, 
  CheckCircle2, 
  CreditCard, 
  QrCode, 
  Banknote, 
  Split, 
  Receipt
} from 'lucide-react';
import { TenderUpiView } from './tenders/TenderUpiView';
import { TenderCashView } from './tenders/TenderCashView';
import { TenderCardView } from './tenders/TenderCardView';
import { TenderSplitView } from './tenders/TenderSplitView';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  room: PhysicalRoom;
  grandTotal: number;
  onSettlementSuccess: () => void;
}

type PaymentMethodType = 'CASH' | 'UPI' | 'CARD' | 'SPLIT';

export function POSPaymentSettlementModal({
  isOpen,
  onClose,
  room,
  grandTotal,
  onSettlementSuccess
}: Props) {
  const propertyBranches = useHostWorkspace((state) => state.propertyBranches);
  const profile = useHostWorkspace((state) => state.profile);
  const primaryBranch = propertyBranches[0];
  const upiId = primaryBranch?.upiId || 'singhharshit1224@oksbi';
  const businessName = primaryBranch?.name || profile?.displayName || 'Quad Hospitality';

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Cash state
  const [cashTendered, setCashTendered] = useState<string>(Math.ceil(grandTotal).toString());

  // Card state
  const [cardAuthRef, setCardAuthRef] = useState('');
  const [cardLast4, setCardLast4] = useState('');

  // Split state
  const [splitCash, setSplitCash] = useState<string>(Math.round(grandTotal / 2).toString());
  const [splitOnline, setSplitOnline] = useState<string>((grandTotal - Math.round(grandTotal / 2)).toString());

  // Cash calculations
  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - grandTotal);

  // Split calculations
  const splitCashNum = parseFloat(splitCash) || 0;
  const splitOnlineNum = parseFloat(splitOnline) || 0;
  const splitSum = splitCashNum + splitOnlineNum;
  const splitDiff = grandTotal - splitSum;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleFinalizeSettlement = async () => {
    if (paymentMethod === 'CASH' && tenderedNum < grandTotal) {
      alert(`Tendered cash (₹${tenderedNum}) is less than the bill amount (₹${grandTotal.toFixed(2)})`);
      return;
    }

    if (paymentMethod === 'SPLIT' && Math.abs(splitDiff) > 0.05) {
      alert(`Split amounts (₹${splitSum}) must match the grand total (₹${grandTotal.toFixed(2)})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {
        payment_method: paymentMethod,
        final_amount: grandTotal
      };

      if (paymentMethod === 'CASH') {
        payload.amount_tendered = tenderedNum;
        payload.change_due = changeDue;
      } else if (paymentMethod === 'CARD') {
        payload.card_ref = cardAuthRef;
        payload.card_last4 = cardLast4;
      } else if (paymentMethod === 'SPLIT') {
        payload.split_details = {
          cash: splitCashNum,
          online: splitOnlineNum
        };
      }

      const res = await fetch(`/api/host/accommodations/rooms/${room.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSettlementSuccess();
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to settle folio');
      }
    } catch (err) {
      console.error('Settlement error', err);
      alert('Network error while processing folio checkout');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50/80 px-6 py-4 text-neutral-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-neutral-200 text-neutral-800 shadow-2xs">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-medium text-neutral-900">
                  POS Folio Settlement
                </h3>
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-bold text-neutral-700 border border-neutral-200">
                  Room {room.room_number}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Guest: <span className="text-neutral-900 font-semibold">{room.guest_name || 'In-House'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-zinc-800">
          {/* Total Amount Ribbon */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                Total Folio Balance Due
              </span>
              <span className="text-xs text-zinc-600">
                Includes room rent, add-ons & F&B service
              </span>
            </div>
            <div className="text-right">
              <span className="font-serif text-3xl font-normal text-zinc-950 block">
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Payment Method Tabs */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
              Select Settlement Tender
            </label>

            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                { id: 'CASH', label: 'Cash', icon: Banknote },
                { id: 'CARD', label: 'Card', icon: CreditCard },
                { id: 'SPLIT', label: 'Split', icon: Split }
              ].map(tab => {
                const Icon = tab.icon;
                const isSelected = paymentMethod === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPaymentMethod(tab.id as PaymentMethodType)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-black bg-zinc-900 text-white shadow-xs'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 mb-1" />
                    <span className="text-xs font-semibold">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tender Views */}
          {paymentMethod === 'UPI' && (
            <TenderUpiView
              upiId={upiId}
              grandTotal={grandTotal}
              businessName={businessName}
              copiedUpi={copiedUpi}
              onCopyUpi={handleCopyUpi}
            />
          )}

          {paymentMethod === 'CASH' && (
            <TenderCashView
              cashTendered={cashTendered}
              setCashTendered={setCashTendered}
              changeDue={changeDue}
              grandTotal={grandTotal}
            />
          )}

          {paymentMethod === 'CARD' && (
            <TenderCardView
              cardLast4={cardLast4}
              setCardLast4={setCardLast4}
              cardAuthRef={cardAuthRef}
              setCardAuthRef={setCardAuthRef}
            />
          )}

          {paymentMethod === 'SPLIT' && (
            <TenderSplitView
              splitCash={splitCash}
              setSplitCash={setSplitCash}
              splitOnline={splitOnline}
              setSplitOnline={setSplitOnline}
              grandTotal={grandTotal}
              splitSum={splitSum}
              splitDiff={splitDiff}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 bg-zinc-50 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            type="button"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleFinalizeSettlement}
            disabled={isSubmitting}
            type="button"
            className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Settling Folio...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Confirm Settlement & Checkout
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
