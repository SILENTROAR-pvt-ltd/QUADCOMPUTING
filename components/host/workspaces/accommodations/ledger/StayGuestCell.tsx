'use client';

import React from 'react';
import type { HistoricalStayRecord } from '@/types';
import { Phone, ShieldCheck, Mail } from 'lucide-react';

interface Props {
  stay: HistoricalStayRecord;
}

export function StayGuestCell({ stay }: Props) {
  const idType = stay.id_type || (stay.guest_id_proof?.includes(':') ? stay.guest_id_proof.split(':')[0].trim() : null);
  const idNumber = stay.id_number || (stay.guest_id_proof?.includes(':') ? stay.guest_id_proof.split(':').slice(1).join(':').trim() : stay.guest_id_proof || null);

  return (
    <div className="space-y-1 min-w-0">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="font-semibold text-neutral-900 block truncate">{stay.guest_name}</span>
        {idType && (
          <span className="shrink-0 rounded bg-neutral-100 border border-neutral-200/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-600">
            {idType}
          </span>
        )}
      </div>

      <div className="text-[11px] text-neutral-500 font-mono flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="flex items-center gap-1">
          <Phone className="h-3 w-3 text-neutral-400 shrink-0" />
          <span className="truncate">{stay.guest_phone || 'N/A'}</span>
        </span>
        {idNumber && (
          <span className="flex items-center gap-1 text-neutral-700">
            <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
            <span className="truncate font-medium">{idNumber}</span>
          </span>
        )}
      </div>

      {stay.guest_email && (
        <div className="text-[10px] text-neutral-400 flex items-center gap-1 truncate max-w-[200px]">
          <Mail className="h-2.5 w-2.5 text-neutral-300 shrink-0" />
          <span className="truncate">{stay.guest_email}</span>
        </div>
      )}
    </div>
  );
}
