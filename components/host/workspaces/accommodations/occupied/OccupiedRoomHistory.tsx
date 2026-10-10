'use client';

import React from 'react';
import type { RoomStayLog } from '@/types';

interface Props {
  stayLogs: RoomStayLog[];
  guestName: string;
  roomNumber: string;
}

export function OccupiedRoomHistory({ stayLogs, guestName, roomNumber }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-serif text-xl font-medium text-zinc-950">
          Guest & Room Booking History
        </h4>
        <p className="text-xs text-zinc-500 mt-1">
          Historical stay logs and repeat ledger for guest {guestName || 'In-House'} and Room {roomNumber}.
        </p>
      </div>

      {stayLogs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-xs text-zinc-400">
          No historical stay records archived for this room or guest yet.
        </div>
      ) : (
        <div className="space-y-3">
          {stayLogs.map((log) => {
            const isCurrent = !log.check_out_time;

            return (
              <div
                key={log.id}
                className={`rounded-2xl border p-4.5 text-xs transition-all ${
                  isCurrent
                    ? 'border-rose-200 bg-rose-50/40 shadow-xs'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-zinc-900 text-sm">{log.guest_name}</span>
                    {isCurrent ? (
                      <span className="rounded-full bg-rose-100 text-rose-800 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5">
                        Current Active Stay
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 text-zinc-600 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5">
                        Completed Stay
                      </span>
                    )}
                  </div>

                  {log.total_billed_amount && (
                    <span className="font-mono font-bold text-zinc-950 text-sm">
                      ₹{Number(log.total_billed_amount).toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 text-[11px] text-zinc-500">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Check-In</span>
                    <span className="font-medium text-zinc-800">
                      {new Date(log.check_in_time).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Check-Out</span>
                    <span className="font-medium text-zinc-800">
                      {log.check_out_time ? new Date(log.check_out_time).toLocaleDateString() : 'In-House'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Guests</span>
                    <span className="font-medium text-zinc-800">{log.total_guests || 1} Guests</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Purpose</span>
                    <span className="font-medium text-zinc-800 truncate block">
                      {log.purpose_of_visit || 'Leisure'}
                    </span>
                  </div>
                </div>

                {log.is_celebration && (
                  <div className="mt-2 text-[10px] text-neutral-800 bg-neutral-100 px-2.5 py-1 rounded-lg">
                    🎉 Celebrated {log.celebration_type || 'Special Event'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
