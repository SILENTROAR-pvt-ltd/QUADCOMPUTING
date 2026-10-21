'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StayPolicies } from '@/lib/services/stay/stay-policy';

export interface StaySettings {
  self_checkin_enabled: boolean; in_room_dining_enabled: boolean; stay_tagline: string | null; checkin_time: string | null; checkout_time: string | null;
  slug?: string | null; stay_policies: StayPolicies; upi_id: string | null; business_name: string | null;
}

/** The venue's stay switches, early/late fee options and UPI handle, read once for every desk screen that needs them. */
export function useStaySettings() {
  const [settings, setSettings] = useState<StaySettings | null>(null);
  const reload = useCallback(async () => {
    const res = await fetch('/api/host/accommodations/stay-settings', { cache: 'no-store' }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (data?.settings) setSettings(data.settings);
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  return { settings, setSettings, reload };
}
