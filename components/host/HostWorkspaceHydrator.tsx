'use client';

import { useEffect } from 'react';
import { useHostWorkspace, type HostWorkspaceSnapshot } from '@/lib/store/host-workspace.store';

export function HostWorkspaceHydrator({
  serverSnapshot,
  businessId,
}: {
  serverSnapshot: HostWorkspaceSnapshot;
  businessId: string;
}) {
  useEffect(() => {
    void Promise.resolve(useHostWorkspace.persist.rehydrate()).then(() => {
      const local = useHostWorkspace.getState();
      // The cached workspace (sessionStorage) belongs to whichever business
      // was last active in this browser tab. If that's not the business the
      // server just resolved for the current session — a different host
      // signed in here, or this host switched venues — the cache must be
      // wiped, not merged: otherwise fields the live fetch doesn't
      // overwrite (banking details, admin PIN, email, phone) leak from the
      // previous business into the new one's forms.
      if (local.businessId && local.businessId !== businessId) {
        local.clearWorkspace();
      }
      if (useHostWorkspace.getState().revision <= serverSnapshot.revision) {
        useHostWorkspace.getState().adoptSnapshot(serverSnapshot);
      }
      // The profile is server-owned (the database is the source of truth for
      // settings like offersAccommodation), so it is always taken from the
      // server, even when the local cache has a newer catalog revision.
      if (serverSnapshot.profile) {
        useHostWorkspace.setState({ profile: serverSnapshot.profile });
      }
      useHostWorkspace.getState().setBusinessId(businessId);
      local._markHydrated();
    });
  }, [serverSnapshot, businessId]);
  return null;
}
