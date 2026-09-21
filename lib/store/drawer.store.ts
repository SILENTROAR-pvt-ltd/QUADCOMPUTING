'use client';

import { create } from 'zustand';

export type DrawerIntent = { kind: 'edit-profile' } | { kind: 'edit-branch'; branchId: string | null } | { kind: 'add-food'; branchId: string; itemId?: string } | { kind: 'add-room'; branchId: string; itemId?: string };
interface DrawerState { intent: DrawerIntent | null; open: (intent: DrawerIntent) => void; close: () => void; }
export const useDrawer = create<DrawerState>((set) => ({ intent: null, open: (intent) => set({ intent }), close: () => set({ intent: null }) }));
