'use client';

import React, { useState } from 'react';
import type { PhysicalRoom, RoomAddon } from '@/types';
import { User, Phone, ShieldCheck, PlusCircle, Copy, Check } from 'lucide-react';

interface Props {
  room: PhysicalRoom;
}

const istDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });
const istTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });

export function OccupiedGuestDossier({ room }: Props) {
  const [copiedPhone, setCopiedPhone] = useState(false);

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const selectedAddons: RoomAddon[] = Array.isArray(room.selected_addons) ? room.selected_addons : [];

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
      {/* Guest Profile Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 pb-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-800 font-serif text-2xl font-bold">
            {(room.guest_name || 'G')[0].toUpperCase()}
          </div>
          <div>
            <h3 className="font-serif text-2xl font-medium text-zinc-950">
              {room.guest_name || 'In-House Guest'}
            </h3>
            <div className="mt-1 flex items-center gap-3">
              {room.guest_phone && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-mono">
                  <Phone className="h-3.5 w-3.5 text-zinc-400" />
                  <a href={`tel:${room.guest_phone}`} className="hover:underline">
                    {room.guest_phone}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyPhone(room.guest_phone!)}
                    className="rounded p-1 text-zinc-400 hover:text-zinc-800 transition-colors"
                    title="Copy Phone"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  {copiedPhone && <span className="text-[10px] text-emerald-600 font-sans font-bold">Copied!</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {room.guest_id_proof && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3.5 py-2 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Government ID Proof
            </span>
            <span className="font-mono font-bold text-zinc-900 flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              {room.guest_id_proof}
            </span>
          </div>
        )}
      </div>

      {/* Stay Credentials Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Check-In Time
          </span>
          <span className="font-medium text-zinc-900 block">{room.check_in_time ? istDate(room.check_in_time) : 'Today'}</span>
          <span className="font-mono text-zinc-500 text-[11px]">{room.check_in_time ? istTime(room.check_in_time) : ''}</span>
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Expected Check-Out
          </span>
          <span className="font-medium text-zinc-900 block">{room.check_out_time ? istDate(room.check_out_time) : 'Not set'}</span>
          <span className="font-mono text-zinc-500 text-[11px]">{room.check_out_time ? istTime(room.check_out_time) : ''}</span>
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Stay Occupancy
          </span>
          <span className="font-medium text-zinc-900 block">
            {room.total_guests || 1} Guest{(room.total_guests || 1) > 1 ? 's' : ''}
          </span>
          <span className="text-zinc-500 text-[11px]">In-House</span>
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Purpose of Visit
          </span>
          <span className="font-medium text-zinc-900 block truncate">
            {room.purpose_of_visit || 'Leisure & Tourism'}
          </span>
          <span className="text-zinc-500 text-[11px]">Declared</span>
        </div>
      </div>

      {/* Selected Add-ons Badge Strip */}
      {selectedAddons.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-zinc-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Active Selected Add-Ons ({selectedAddons.length})
          </span>
          <div className="flex flex-wrap gap-2">
            {selectedAddons.map((addon) => (
              <span
                key={addon.id || addon.name}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-900 shadow-xs"
              >
                <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />
                <span>{addon.name}</span>
                <span className="font-mono font-bold text-zinc-950">₹{addon.price}</span>
                <span className="text-[10px] text-zinc-400">
                  ({String(addon.billingType || 'per_stay').replace(/_/g, ' ')}{addon.persons ? ` · ${addon.persons} people` : ''})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
