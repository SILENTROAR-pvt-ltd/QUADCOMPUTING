'use client';

import { useEffect } from 'react';
import { useHostWorkspace, type HostWorkspaceSnapshot } from '@/lib/store/host-workspace.store';

export function HostWorkspaceHydrator({ serverSnapshot }: { serverSnapshot: HostWorkspaceSnapshot }) {
  useEffect(() => {
    void Promise.resolve(useHostWorkspace.persist.rehydrate()).then(() => {
      const local = useHostWorkspace.getState();
      if (local.revision <= serverSnapshot.revision) local.adoptSnapshot(serverSnapshot);
      local._markHydrated();
    });
  }, [serverSnapshot]);
  return null;
}
