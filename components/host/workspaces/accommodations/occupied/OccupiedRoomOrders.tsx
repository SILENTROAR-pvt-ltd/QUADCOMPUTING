'use client';

import React from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface Props {
  orders: any[];
  tickets: any[];
  roomNumber: string;
}

export function OccupiedRoomOrders({ orders, tickets, roomNumber }: Props) {
  // Filter for actual F&B / room service orders (ignore room_stay master order in the F&B list)
  const fAndBOrders = orders.filter(o => o.order_type !== 'room_stay');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-zinc-400" />
          Live Room Service Orders ({fAndBOrders.length})
        </h4>
        {tickets.length > 0 && (
          <span className="text-[11px] font-bold text-neutral-800 bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 rounded-full">
            {tickets.length} Active KOT
          </span>
        )}
      </div>

      {fAndBOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400">
          No active food orders billed to Room {roomNumber} yet.
        </div>
      ) : (
        <div className="space-y-3">
          {fAndBOrders.map((ord: any) => (
            <div key={ord.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-zinc-900">Order #{ord.id.slice(0, 8)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    ord.status === 'SERVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    'bg-neutral-100 text-neutral-800 border border-neutral-200'
                  }`}>
                    {ord.status}
                  </span>
                </div>
                <span className="font-mono font-bold text-zinc-950 text-sm">
                  ₹{Number(ord.grand_total || ord.total_amount).toFixed(2)}
                </span>
              </div>

              {Array.isArray(ord.items) && (
                <div className="space-y-1 text-zinc-600">
                  {ord.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span>{item.qty}x {item.name}</span>
                      <span className="font-mono">₹{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
