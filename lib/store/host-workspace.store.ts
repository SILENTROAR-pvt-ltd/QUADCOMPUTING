'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CatalogItem, HostProfile, PropertyBranch } from '@/types';
import { calculateCompletionStatus } from '@/lib/utils/completion';

export interface HostWorkspaceSnapshot {
  profile: HostProfile | null;
  propertyBranches: PropertyBranch[];
  serviceCatalog: CatalogItem[];
  revision: number;
}
interface HostWorkspaceState extends HostWorkspaceSnapshot {
  hydrated: boolean;
  adoptSnapshot: (snapshot: HostWorkspaceSnapshot) => void;
  patchProfile: (patch: Partial<Omit<HostProfile, 'uniqueOwnerCafeId' | 'createdAt'>>) => void;
  upsertBranch: (branch: PropertyBranch) => void;
  removeBranch: (id: PropertyBranch['id']) => void;
  upsertCatalogItem: (item: CatalogItem) => void;
  archiveCatalogItem: (id: CatalogItem['id']) => void;
  clearWorkspace: () => void;
  _markHydrated: () => void;
}
const upsertById = <T extends { id: string }>(list: T[], next: T) => list.some((item) => item.id === next.id) ? list.map((item) => item.id === next.id ? next : item) : [...list, next];

export const useHostWorkspace = create<HostWorkspaceState>()(persist((set) => ({
  profile: null, propertyBranches: [], serviceCatalog: [], revision: 0, hydrated: false,
  adoptSnapshot: (snapshot) => set({ ...snapshot }),
  patchProfile: (patch) => set((state) => state.profile ? { profile: { ...state.profile, ...patch, updatedAt: new Date().toISOString() }, revision: state.revision + 1 } : state),
  upsertBranch: (branch) => set((state) => ({ propertyBranches: upsertById(state.propertyBranches, branch), revision: state.revision + 1 })),
  removeBranch: (id) => set((state) => ({ propertyBranches: state.propertyBranches.filter((branch) => branch.id !== id), serviceCatalog: state.serviceCatalog.filter((item) => item.branchId !== id), revision: state.revision + 1 })),
  upsertCatalogItem: (item) => set((state) => ({ serviceCatalog: upsertById(state.serviceCatalog, item), revision: state.revision + 1 })),
  archiveCatalogItem: (id) => set((state) => ({ serviceCatalog: state.serviceCatalog.map((item) => item.id === id ? { ...item, status: 'archived' } : item), revision: state.revision + 1 })),
  clearWorkspace: () => set({ profile: null, propertyBranches: [], serviceCatalog: [], revision: 0 }),
  _markHydrated: () => set({ hydrated: true }),
}), { name: 'quad.host-workspace.v1', storage: createJSONStorage(() => sessionStorage), skipHydration: true, partialize: (state) => ({ profile: state.profile, propertyBranches: state.propertyBranches, serviceCatalog: state.serviceCatalog, revision: state.revision }), onRehydrateStorage: () => (state) => state?._markHydrated() }));

export function useCompletionStatus() {
  const profile = useHostWorkspace((state) => state.profile);
  const propertyBranches = useHostWorkspace((state) => state.propertyBranches);
  const serviceCatalog = useHostWorkspace((state) => state.serviceCatalog);
  return calculateCompletionStatus({ profile, propertyBranches, serviceCatalog });
}
