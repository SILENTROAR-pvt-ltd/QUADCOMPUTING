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
    <div className="group flex items-center justify-between gap-2 border-b border-neutral-100 py-2 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex shrink-0 items-center rounded-xl border border-neutral-200 bg-neutral-100">
          <button
            type="button"
            onClick={() => onDecrement(item.id)}
            aria-label={`One less ${item.name}`}
            className="grid h-9 w-9 place-items-center rounded-l-xl text-lg leading-none text-neutral-600 transition-colors hover:bg-neutral-200 active:bg-neutral-300 cursor-pointer"
          >
            −
          </button>
          <span className="min-w-[24px] text-center font-mono text-[13px] font-semibold text-neutral-900">
            {item.qty}
          </span>
          <button
            type="button"
            onClick={() => onIncrement(item.id)}
            aria-label={`One more ${item.name}`}
            className="grid h-9 w-9 place-items-center rounded-r-xl text-lg leading-none text-neutral-600 transition-colors hover:bg-neutral-200 active:bg-neutral-300 cursor-pointer"
          >
            +
          </button>
        </div>
        <span className="line-clamp-2 text-[13.5px] leading-tight text-neutral-900">{item.name}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="font-mono text-[13px] text-neutral-700">
          {(item.price * item.qty).toFixed(2)}
        </span>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${item.name}`}
          className="grid h-9 w-9 place-items-center rounded-full text-[12px] text-neutral-400 transition-colors hover:text-red-500 active:bg-neutral-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
