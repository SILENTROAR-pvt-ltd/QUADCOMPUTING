'use client';

import { useDrawer } from '@/lib/store/drawer.store';
import AddFoodDrawer from '@/components/host/AddFoodDrawer';
import AddRoomDrawer from '@/components/host/AddRoomDrawer';
import EditProfileDrawer from '@/components/host/EditProfileDrawer';

export function DrawerHost() {
  const intent = useDrawer((state) => state.intent);
  if (!intent) return null;
  if (intent.kind === 'edit-profile') return <EditProfileDrawer />;
  if (intent.kind === 'add-food') return <AddFoodDrawer branchId={intent.branchId} />;
  if (intent.kind === 'add-room') return <AddRoomDrawer branchId={intent.branchId} />;
  return null;
}
