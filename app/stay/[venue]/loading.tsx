import { StayShell, StaySkeleton } from '@/components/stay/StayShell';

/** Shown the instant a guest navigates to a stay page, while the route itself is still on its way. */
export default function StayLoading() {
  return <StayShell eyebrow="Stay"><StaySkeleton rows={3} /></StayShell>;
}
