'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClubShell } from '@/components/club/ClubShell';
import { useClub } from '@/components/club/club-context';
import { Empty, Heading, Spinner } from '@/components/club/ui';
import { clubFetch, shortDate } from '@/components/club/api';

function Notifications() {
  const { refresh } = useClub();
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => {
    void clubFetch('/notifications').then((r) => {
      setItems(r.ok ? r.data.notifications : []);
      if (r.ok && r.data.notifications.some((n: any) => !n.read_at)) void clubFetch('/notifications', { body: {} }).then(() => refresh());
    });
  }, [refresh]);

  return (
    <div className="mx-auto max-w-2xl">
      <Heading kicker="Notifications" title="What's new" />
      {!items ? <Spinner /> : items.length === 0 ? <Empty title="All quiet">Approvals, plans, offers and payments show up here.</Empty> : (
        <ul className="space-y-2">
          {items.map((n) => {
            const body = (
              <div className={`rounded-2xl border px-4 py-3 ${n.read_at ? 'border-[#2a1250]/10 bg-white/70' : 'border-[#2a1250]/20 bg-white'}`}>
                <p className="flex items-center justify-between gap-3 text-sm font-semibold">{n.title}{!n.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-[#ff2e88]" />}</p>
                {n.body && <p className="mt-0.5 text-sm text-[#2a1250]/65">{n.body}</p>}
                <p className="mt-1 text-[11px] text-[#2a1250]/40">{shortDate(n.created_at)}</p>
              </div>
            );
            return <li key={n.id}>{n.link?.startsWith('/') ? <Link href={n.link}>{body}</Link> : body}</li>;
          })}
        </ul>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return <ClubShell><Notifications /></ClubShell>;
}
