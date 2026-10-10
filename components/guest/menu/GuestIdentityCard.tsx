'use client';

import React from 'react';
import { Sparkles, Check, Phone, Edit3, ShieldCheck } from 'lucide-react';

interface Props {
  name?: string; handle?: string; phone?: string; avatar?: string;
  estimatedCashback?: number; onOpenEdit: () => void;
}

export const GuestIdentityCard: React.FC<Props> = ({
  name, handle, phone, avatar = '🎩', estimatedCashback = 0, onOpenEdit,
}) => {
  const cleanHandle = handle?.trim() ? (handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`) : '';
  const hasProfile = Boolean(cleanHandle || (name?.trim() && phone?.trim()));

  if (!hasProfile) {
    return (
      <div onClick={onOpenEdit} className="group cursor-pointer rounded-2xl border border-[#ece7de] bg-[#fcfbf9] p-3.5 transition-all hover:border-zinc-400 hover:shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#f5f2eb] border border-[#e5dfd3] flex items-center justify-center text-lg shadow-inner">
              {avatar}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-editorial text-sm font-semibold text-zinc-950">Claim Guest Identity & Wallet</span>
                <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <p className="text-[11px] text-zinc-500 font-light mt-0.5">
                Set unique @handle & phone to earn 7% cashback {estimatedCashback > 0 ? `(+₹${estimatedCashback})` : ''}
              </p>
            </div>
          </div>
          <button type="button" className="px-3.5 py-1.5 rounded-xl bg-zinc-950 text-white text-[10px] font-semibold uppercase tracking-wider hover:bg-zinc-800 transition-colors shrink-0">
            Activate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#ece7de] bg-[#fcfbf9] p-3.5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0 w-11 h-11 rounded-2xl bg-[#f5f2eb] border border-[#e5dfd3] flex items-center justify-center text-xl select-none">
            {avatar}
            <div className="absolute -bottom-1 -right-1 bg-zinc-950 text-white p-0.5 rounded-full shadow-xs">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-editorial font-semibold text-sm text-zinc-950 truncate">{name || 'Guest Member'}</span>
              <span className="font-sans text-xs font-medium text-zinc-600 bg-[#f0ece1] border border-[#e2ddd0] px-2 py-0.5 rounded-md truncate">{cleanHandle || '@member'}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
              {phone && <span className="flex items-center gap-1 truncate font-sans text-xs text-zinc-600"><Phone className="w-3 h-3 text-zinc-400 shrink-0" /> {phone}</span>}
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full shrink-0"><ShieldCheck className="w-2.5 h-2.5" /> Wallet Active</span>
            </div>
          </div>
        </div>
        <button type="button" onClick={onOpenEdit} className="p-2 rounded-xl text-zinc-400 hover:text-zinc-950 hover:bg-[#f0ece1] transition-colors shrink-0 cursor-pointer" title="Edit Guest Profile">
          <Edit3 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
