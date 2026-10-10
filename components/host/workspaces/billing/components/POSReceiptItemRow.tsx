'use client';

import React from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface Props {
  item: CartItem;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
}

export function POSReceiptItemRow({ item, onIncrement, onDecrement, onRemove }: Props) {
  return (
    <div className="group flex justify-between py-1.5 items-center">
      <div className="flex gap-3 items-center min-w-0">
        <div className="flex items-center rounded-md bg-neutral-100 border border-neutral-200 shrink-0">
          <button
            type="button"
            onClick={() => onDecrement(item.id)}
            className="px-2 py-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 transition-colors rounded-l-md cursor-pointer"
          >
            -
          </button>
          <span className="px-2 py-1 text-neutral-900 font-mono text-[11px] min-w-[20px] text-center">
            {item.qty}
          </span>
          <button
            type="button"
            onClick={() => onIncrement(item.id)}
            className="px-2 py-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 transition-colors rounded-r-md cursor-pointer"
          >
            +
          </button>
        </div>
        <span className="text-neutral-900 text-[13px] truncate">{item.name}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-mono text-[13px] text-neutral-700">
          {(item.price * item.qty).toFixed(2)}
        </span>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="text-[10px] text-neutral-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity p-1 cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
