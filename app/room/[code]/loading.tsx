import { StayShell, StaySkeleton } from '@/components/stay/StayShell';

/** Shown the instant a guest navigates to their room page, while the route itself is still on its way. */
export default function RoomLoading() {
  return <StayShell eyebrow="Your room"><StaySkeleton rows={3} /></StayShell>;
}
