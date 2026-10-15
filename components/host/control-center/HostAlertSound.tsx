'use client';

import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { BellRing } from 'lucide-react';
import { installAutoUnlock, isAlertSoundUnlocked, ringAlert, subscribeAlertSound, unlockAlertSound } from '@/lib/host-alert-sound';
import type { StaffAlert } from './useStaffAlerts';

/** The guest calls that ring. System notices (low stock, wallet) do not. */
export const RINGING_TYPES = new Set(['WAITER', 'CHEF', 'BILL', 'SERVICE']);
/** A call nobody has handled rings again this often. */
export const REPEAT_MS = 60_000;
/** Only a call at least this old is repeated, so a fresh one never rings twice at once. */
const REPEAT_AFTER_MS = 50_000;

const LABEL: Record<string, string> = { WAITER: 'wants the waiter', CHEF: 'wants the chef', BILL: 'asked for the bill', SERVICE: 'asked for a service' };

/** The calls still waiting that are old enough to ring about again. Pure, so it is tested. */
export const callsToRepeat = (alerts: Array<Pick<StaffAlert, 'notification_type' | 'created_at'>>, now: number) =>
  alerts.filter((a) => RINGING_TYPES.has(a.notification_type) && now - Date.parse(a.created_at) >= REPEAT_AFTER_MS);

interface Props {
  alerts: StaffAlert[];
  freshIds: Set<string>;
  /** Counts kitchen tickets that arrived since the page opened. */
  kotArrivals: number;
}

let savedTitle: string | null = null;
/** The tab title says something is waiting while the tab is behind another. */
function flashTitle(text: string) {
  if (!document.hidden) return;
  if (savedTitle === null) savedTitle = document.title;
  document.title = `🔔 ${text}`;
}
function restoreTitle() {
  if (!document.hidden && savedTitle !== null) { document.title = savedTitle; savedTitle = null; }
}
const useUnlocked = () => useSyncExternalStore(subscribeAlertSound, isAlertSoundUnlocked, () => false);

function announce(title: string, body: string, tag: string) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !document.hidden) return;
    const n = new Notification(title, { body, tag, renotify: true } as NotificationOptions);
    n.onclick = () => { window.focus(); n.close(); };
  } catch { /* a system notice is a bonus; the bell is the alert */ }
}

/**
 * Rings the bell on every host screen, whichever tab of the control center is open and whether or not the browser tab is in
 * front: a new kitchen order, a guest calling the waiter or chef (with their message), and an unanswered call again every
 * minute. It also asks the phone to stay awake. There is no mute.
 */
export function HostAlertSound({ alerts, freshIds, kotArrivals }: Props) {
  const unlocked = useUnlocked();
  const lastKot = useRef(0);

  useEffect(() => { installAutoUnlock(); }, []);

  // A new kitchen order.
  useEffect(() => {
    if (kotArrivals > lastKot.current) {
      lastKot.current = kotArrivals;
      ringAlert();
      announce('New order', 'A new order has reached the kitchen.', 'kot');
      flashTitle('New order');
    }
  }, [kotArrivals]);

  // A new guest call.
  useEffect(() => {
    const fresh = alerts.filter((a) => freshIds.has(a.id) && RINGING_TYPES.has(a.notification_type));
    if (!fresh.length) return;
    ringAlert();
    const a = fresh[0];
    const who = a.table_number ? `Table ${a.table_number}` : 'A guest';
    announce(`${who} ${LABEL[a.notification_type] || 'needs you'}`, a.message || '', `call-${a.id}`);
    flashTitle(`${who} needs you`);
  }, [alerts, freshIds]);

  // A call that is still waiting rings again.
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;
  useEffect(() => {
    const timer = setInterval(() => { if (callsToRepeat(alertsRef.current, Date.now()).length) ringAlert(); }, REPEAT_MS);
    return () => clearInterval(timer);
  }, []);

  // The tab title is put back when the host returns to the tab.
  useEffect(() => {
    document.addEventListener('visibilitychange', restoreTitle);
    return () => document.removeEventListener('visibilitychange', restoreTitle);
  }, []);

  // A phone that goes to sleep stops listening: keep the screen on while alerts are on.
  useEffect(() => {
    if (!unlocked || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let live = true;
    const hold = async () => { try { if (live && !document.hidden) lock = await navigator.wakeLock.request('screen'); } catch { /* not allowed here */ } };
    void hold();
    const onVisible = () => { if (!document.hidden) void hold(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { live = false; document.removeEventListener('visibilitychange', onVisible); void lock?.release().catch(() => {}); };
  }, [unlocked]);

  if (unlocked) return null;

  const turnOn = async () => {
    await unlockAlertSound();
    // One tap also asks for system notices, which show when this tab is behind another.
    try { if (typeof Notification !== 'undefined' && Notification.permission === 'default') await Notification.requestPermission(); } catch { /* optional */ }
    ringAlert();
  };

  return (
    <button
      type="button"
      onClick={() => void turnOn()}
      className="fixed inset-x-3 top-3 z-[130] flex items-center gap-3 rounded-2xl bg-amber-500 px-4 py-3 text-left text-neutral-950 shadow-2xl shadow-amber-900/25 active:scale-[0.99] cursor-pointer sm:inset-x-auto sm:right-4 sm:max-w-sm"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neutral-950 text-amber-400"><BellRing className="h-5 w-5 animate-pulse" aria-hidden /></span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold leading-tight">Tap to turn on order alerts</span>
        <span className="block text-[12px] leading-snug text-neutral-900/80">So new orders and guest calls ring on this device.</span>
      </span>
    </button>
  );
}
