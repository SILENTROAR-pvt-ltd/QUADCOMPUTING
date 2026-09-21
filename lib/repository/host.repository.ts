import type { HostWorkspaceSnapshot } from '@/lib/store/host-workspace.store';

export const hostRepository = {
  async load(): Promise<HostWorkspaceSnapshot> {
    return { profile: null, propertyBranches: [], serviceCatalog: [], revision: 0 };
  },
};
