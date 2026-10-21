import { MenuSkeleton } from '@/components/guest/menu/MenuSkeleton';

/** Shown the instant a guest navigates to the menu, while the route itself is still on its way. */
export default function GuestMenuLoading() {
  return <MenuSkeleton />;
}
