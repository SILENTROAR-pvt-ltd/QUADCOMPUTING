'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BedDouble, CalendarCheck, Check, ChefHat, ConciergeBell, Receipt, Sparkles, AlertTriangle, ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react';
import type { StaffAlert } from './useStaffAlerts';
import { alertTarget, type AlertTarget } from '@/lib/host/alert-routing';

const TYPE_META: Record<string, { label: string; icon: React.FC<{ className?: string }>; tone: string }> = {
  WAITER: { label: 'Wants the waiter', icon: ConciergeBell, tone: 'bg-sky-50 text-sky-700 border-sky-200' },
  CHEF: { label: 'Wants the chef', icon: ChefHat, tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  BILL: { label: 'Requested the bill', icon: Receipt, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  SERVICE: { label: 'Service request', icon: Sparkles, tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  EVENT_INTEREST: { label: 'Interested in an event', icon: Sparkles, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  STAY_BOOKING: { label: 'New room reservation', icon: CalendarCheck, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  LOW_STOCK_ALERT: { label: 'Low stock', icon: AlertTriangle, tone: 'bg-rose-50 text-rose-700 border-rose-200' },
  WALLET_SUSPENDED_LOW_BALANCE: { label: 'Wallet balance low', icon: AlertTriangle, tone: 'bg-rose-50 text-rose-700 border-rose-200' },
};
const TAB_NAME: Record<AlertTarget['tab'], string> = { accommodations: 'Accommodations', billing: 'Billing', tables: 'Live Tables', kitchen: 'Kitchen', inventory: 'Inventory', wallet: 'Wallet', reservations: 'Reservations' };

function timeAgo(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
}

interface Props {
  alerts: StaffAlert[];
  freshIds: Set<string>;
  onResolve: (id?: string) => void;
  /** Opens where the call came from: the room in Accommodations, the table at the till or on Live Tables, the kitchen. */
  onOpen?: (target: AlertTarget) => void;
}

/** Floating tray of pending guest calls, visible on every host tab. Every call is a bold link to where it came from. */
export function StaffAlertsTray({ alerts, freshIds, onResolve, onOpen }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  // A new call always re-opens the tray.
  useEffect(() => { if (freshIds.size) setCollapsed(false); }, [freshIds]);

  if (alerts.length === 0) return null;

  return (
    <div role="region" aria-label="Guest requests" aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0 z-[60] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-900/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-950 text-white">
        <button type="button" onClick={() => setCollapsed((c) => !c)} className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <Bell className="w-3.5 h-3.5" />
          Guest requests ({alerts.length})
          {collapsed ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
        </button>
        {alerts.length > 1 && (
          <button type="button" onClick={() => onResolve()} className="text-[11px] text-neutral-300 hover:text-white cursor-pointer">Clear all</button>
        )}
      </div>
      {!collapsed && (
        <ul className="max-h-72 overflow-y-auto divide-y divide-neutral-100">
          {alerts.map((a) => {
            const meta = TYPE_META[a.notification_type] || { label: a.notification_type, icon: Bell, tone: 'bg-neutral-50 text-neutral-700 border-neutral-200' };
            const target = alertTarget(a);
            const room = Boolean(target.room);
            const Icon = room ? BedDouble : meta.icon;
            const open = onOpen ? () => onOpen(target) : undefined;
            return (
              <li key={a.id} className={`flex items-start gap-3 px-4 py-3 ${room ? 'bg-emerald-50/70' : freshIds.has(a.id) ? 'bg-amber-50/60' : ''}`}>
                <button type="button" onClick={open} aria-label={`Open ${target.place}`} className={`mt-0.5 h-8 w-8 shrink-0 cursor-pointer rounded-xl border flex items-center justify-center ${room ? 'bg-emerald-600 text-white border-emerald-600' : meta.tone}`}>
                  <Icon className="w-4 h-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={open} className="cursor-pointer text-left text-sm font-bold text-neutral-950 underline-offset-2 hover:underline">
                    {target.place} <span className="font-normal text-neutral-600">· {meta.label}</span>
                  </button>
                  {a.message && <p className={`mt-0.5 break-words rounded-lg px-2 py-1 text-[13px] leading-snug text-neutral-900 ${room ? 'bg-white font-semibold' : 'bg-neutral-50 font-medium'}`}>“{a.message}”</p>}
                  <p className="text-[11px] text-neutral-400">
                    {timeAgo(a.created_at, now)}
                    {open && <> · <button type="button" onClick={open} className="inline-flex cursor-pointer items-center gap-0.5 font-semibold text-emerald-800 hover:underline">Open in {TAB_NAME[target.tab]} <ArrowUpRight className="h-3 w-3" /></button></>}
                  </p>
                </div>
                <button type="button" onClick={() => onResolve(a.id)} aria-label="Mark as handled"
                  className="shrink-0 inline-flex h-10 items-center gap-1 rounded-xl border border-neutral-200 px-3 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-100 active:scale-95 cursor-pointer">
                  <Check className="w-3 h-3" /> Done
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
