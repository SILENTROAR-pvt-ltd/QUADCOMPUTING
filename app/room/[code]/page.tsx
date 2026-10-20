import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RoomStayPage } from '@/components/room/RoomStayPage';
import { StayShell, StaySpinner } from '@/components/stay/StayShell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your room · Vibers Connect', robots: { index: false, follow: false } };

/** The in-room page, reached from the QR card: dining to the room, services, and the running bill. */
export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <Suspense fallback={<StayShell><StaySpinner label="Opening your room" /></StayShell>}>
      <RoomStayPage code={decodeURIComponent(code)} />
    </Suspense>
  );
}
