import React from 'react';

/** Subtotal, GST (or "Not charged"), and what is payable. Discounts and wallet credit are applied on the final bill. */
export function BillTotals({ subtotal, gst, payable }: { subtotal: number; gst: number; payable: number }) {
  return (
    <div className="space-y-2 border-t border-zinc-100 pt-4 text-xs">
      <div className="flex justify-between font-medium text-zinc-500">
        <span>Item Subtotal</span>
        <span className="font-mono text-zinc-900">₹{subtotal.toFixed(0)}</span>
      </div>
      <div className="flex justify-between font-medium text-zinc-500">
        <span>GST</span>
        <span className={`font-mono ${gst > 0 ? 'text-zinc-900' : 'text-zinc-500'}`}>{gst > 0 ? `₹${gst.toFixed(2)}` : 'Not charged'}</span>
      </div>
      <div className="flex justify-between border-t border-zinc-100 pt-2 text-sm font-bold text-zinc-950">
        <span>Total Payable</span>
        <span className="font-mono text-base">₹{payable.toFixed(0)}</span>
      </div>
      <p className="text-[10px] text-zinc-400">Discounts and wallet credit are applied on your final bill.</p>
    </div>
  );
}
