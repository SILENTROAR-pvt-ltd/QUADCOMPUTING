'use client';

import React from 'react';
import { Receipt } from 'lucide-react';
import { POSReceiptItemRow, type CartItem } from './components/POSReceiptItemRow';
import { POSCashbackToggle } from './components/POSCashbackToggle';

export type { CartItem };

interface Props {
  selectedItems: CartItem[];
  incrementItem: (id: string) => void;
  decrementItem: (id: string) => void;
  removeItem: (id: string) => void;
  customAmount: string;
  subtotal: number;
  discountAmount: number;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  gstEnabled: boolean;
  gstAmount: number;
  /** Rates actually applied, e.g. "5%" or "5% + 18%". */
  gstRateLabel?: string;
  grandTotal: number;
  handleGenerateBill: () => void;
  activeSessionId?: string | null;
  activeSessionStatus?: 'open' | 'bill_requested' | null;
  selectedTableNumber?: string;
  cashbackEnabled?: boolean;
  onToggleCashback?: (enabled: boolean) => void;
  cashbackAmount?: number;
  guestHandle?: string | null;
}

export function POSDigitalReceipt({
  selectedItems, incrementItem, decrementItem, removeItem,
  customAmount, subtotal, discountAmount, discountType, discountValue,
  gstEnabled, gstAmount, gstRateLabel = '5%', grandTotal, handleGenerateBill,
  activeSessionId, activeSessionStatus, selectedTableNumber,
  cashbackEnabled = true, onToggleCashback, cashbackAmount = 0, guestHandle,
}: Props) {
  const isSessionActive = Boolean(activeSessionId);
  const isBillRequested = activeSessionStatus === 'bill_requested';

  return (
    <div className="rounded-3xl bg-white p-4 text-neutral-900 shadow-sm border border-neutral-200 sm:p-6 lg:p-7">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Digital Receipt</h3>
        {isSessionActive && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            isBillRequested
              ? 'bg-sky-50 text-sky-950 border-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.35)] animate-pulse'
              : 'bg-neutral-100 text-neutral-600 border-neutral-200'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isBillRequested ? 'bg-sky-500 animate-ping' : 'bg-neutral-400'}`} />
            <span>{isBillRequested ? 'Bill Requested' : 'Active Table'}</span>
          </span>
        )}
      </div>

      {isSessionActive && (
        <div className="mt-3 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 flex items-center justify-between">
          <span className="font-bold text-neutral-900">{selectedTableNumber}</span>
          <span className="text-[10px] text-neutral-400 font-mono">QR Session Linked</span>
        </div>
      )}

      <div className="mt-4 min-h-[96px] space-y-1 text-sm text-neutral-700 lg:mt-5 lg:min-h-[140px] lg:space-y-3">
        {selectedItems.map((item) => (
          <POSReceiptItemRow key={item.id} item={item} onIncrement={incrementItem} onDecrement={decrementItem} onRemove={removeItem} />
        ))}
        {Number(customAmount) > 0 && (
          <div className="flex justify-between py-1 font-mono text-xs">
            <span className="text-neutral-600">Custom Entry</span>
            <span className="text-neutral-900 font-semibold">{Number(customAmount).toFixed(2)}</span>
          </div>
        )}
        {selectedItems.length === 0 && !customAmount && <p className="text-center text-neutral-400 py-8 text-xs">No items added to bill.</p>}
      </div>

      <div className="mt-6 space-y-2 border-t border-neutral-200 pt-4 text-xs">
        <div className="flex justify-between text-neutral-500">
          <span>Subtotal</span>
          <span className="font-mono">{subtotal.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-rose-600 font-medium">
            <span>Discount ({discountType === 'percentage' ? `${discountValue}%` : `Flat ₹`})</span>
            <span className="font-mono">-{discountAmount.toFixed(2)}</span>
          </div>
        )}
        {gstEnabled && (
          <div className="flex justify-between text-neutral-500">
            <span>GST ({gstRateLabel})</span>
            <span className="font-mono">{gstAmount.toFixed(2)}</span>
          </div>
        )}

        {onToggleCashback && (
          <POSCashbackToggle enabled={cashbackEnabled} onToggle={onToggleCashback} cashbackAmount={cashbackAmount} guestHandle={guestHandle} />
        )}

        <div className="flex justify-between border-t border-neutral-200 pt-3 font-serif text-2xl text-neutral-900">
          <span>Total</span>
          <span className="font-mono tracking-tight font-semibold">₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <button
        type="button" onClick={handleGenerateBill} disabled={selectedItems.length === 0 && !customAmount}
        className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 text-[14px] font-semibold text-white shadow-[0_14px_24px_-14px_rgba(0,0,0,0.6)] transition-all hover:bg-neutral-800 active:scale-[0.99] disabled:bg-neutral-300 disabled:shadow-none cursor-pointer"
      >
        <Receipt className="h-4 w-4" />
        <span>{isBillRequested ? 'Review & settle (bill requested)' : isSessionActive ? 'Review & settle table bill' : 'Generate & finalize bill'}</span>
      </button>
    </div>
  );
}
