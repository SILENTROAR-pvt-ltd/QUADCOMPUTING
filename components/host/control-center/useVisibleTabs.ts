'use client';

import { useMemo } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import { businessModel, homeModule, modulesFor, type BusinessModel } from '@/lib/venue/venue-model';
import { CONTROL_CENTER_TABS, type ControlCenterTab } from '../ControlCenterHeader';

// A stay-only venue has no tables, so its POS is just "Billing & POS".
const LABELS: Partial<Record<BusinessModel, Partial<Record<ControlCenterTab, string>>>> = {
  stay: { billing: 'Billing & POS', catalog: 'Services & Add-ons' },
};

/** The sidebar sections for this venue's type (café, stay, or both), in order, with fitting labels. */
export function useVisibleTabs() {
  const profile = useHostWorkspace((s) => s.profile);
  const model = businessModel(profile?.categoriesHandled ?? profile?.categories, profile?.offersAccommodation ?? false);
  return useMemo(() => {
    const order = modulesFor(model);
    const tabs = order
      .map((id) => CONTROL_CENTER_TABS.find((t) => t.id === id))
      .filter((t): t is (typeof CONTROL_CENTER_TABS)[number] => Boolean(t))
      .map((t) => ({ ...t, label: LABELS[model]?.[t.id] || t.label }));
    return { model, tabs, allowed: new Set<string>(order), home: homeModule(model) as ControlCenterTab };
  }, [model]);
}
