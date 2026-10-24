'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { sharedGet } from '@/lib/utils/shared-get';
import type { Feature } from '@/lib/services/wallet/plans';
import type { PlanPhase } from '@/lib/services/wallet/subscription-state';

export interface HostPlan {
  plan: string;
  planName: string;
  phase: PlanPhase;
  onTrial: boolean;
  perBill: boolean;
  daysLeft: number | null;
  endsAt: string | null;
  features: Feature[];
  vibeyUntil: string | null;
}

export const PLAN_REFRESH_EVENT = 'plan:refresh';
const FRESH_MS = 60_000;

// One copy for every panel on the screen (the lock cards, the reminder), read at most once a minute; a plan change in
// Wallet asks for it again and every panel shows the new one together.
let store: Record<string, { at: number; plan: HostPlan }> = {};
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => store;

async function load(url: string, force: boolean) {
  const hit = store[url];
  if (!force && hit && Date.now() - hit.at < FRESH_MS) return;
  const res = await sharedGet<HostPlan & { success?: boolean }>(url);
  if (!res.ok || !res.data?.success) return;
  store = { ...store, [url]: { at: Date.now(), plan: res.data } };
  listeners.forEach((l) => l());
}

export function usePlanFeatures(venueId?: string) {
  const url = `/api/host/plan${venueId ? `?venue_id=${encodeURIComponent(venueId)}` : ''}`;
  const plan = useSyncExternalStore(subscribe, snapshot, snapshot)[url]?.plan ?? null;

  useEffect(() => {
    void load(url, false);
    const refresh = () => void load(url, true);
    window.addEventListener(PLAN_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(PLAN_REFRESH_EVENT, refresh);
  }, [url]);

  // Until the plan is known nothing shows as locked: the server refuses what the plan lacks either way.
  const has = (feature: Feature) => !plan || plan.features.includes(feature);
  return { plan, has };
}
