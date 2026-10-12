'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { ClubShell } from '@/components/club/ClubShell';
import { Screen } from '@/components/club/nav/Screen';
import { useClub } from '@/components/club/club-context';
import { Empty, Spinner } from '@/components/club/ui';
import { clubFetch, timeAgo } from '@/components/club/api';

function Notifications() {
  const { refresh } = useClub();
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => {
    void clubFetch('/notifications').then((r) => {
      setItems(r.ok ? r.data.notifications : []);
      if (r.ok && r.data.notifications.some((n: any) => !n.read_at)) void clubFetch('/notifications', { body: {} }).then(() => refresh());
    });
  }, [refresh]);

  if (!items) return <Spinner />;
  if (items.length === 0) return <Empty title="All quiet">Approvals, plans, comments, offers and payments show up here.</Empty>;
  return (
    <ul className="space-y-2">
      {items.map((n) => {
        const body = (
          <div className={`flex gap-3 rounded-2xl border px-4 py-3.5 transition ${n.read_at ? 'border-[#14261b]/[0.06] bg-[#f7f5ee]' : 'border-[#3c6b2b]/25 bg-[#fbfaf6]'} ${n.link ? 'hover:border-[#14261b]/20' : ''}`}>
            <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? 'bg-[#14261b]/15' : 'bg-[#c8da4a]'}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{n.title}</p>
              {n.body && <p className="mt-0.5 text-sm text-[#14261b]/70">{n.body}</p>}
              <p className="mt-1 text-[11px] text-[#14261b]/60">{timeAgo(n.created_at)}</p>
            </div>
          </div>
        );
        return <li key={n.id}>{n.link?.startsWith('/') ? <Link href={n.link}>{body}</Link> : body}</li>;
      })}
    </ul>
  );
}

export default function NotificationsPage() {
  return <ClubShell><Screen title="Notifications" icon={Bell} back="/club" width="feed"><Notifications /></Screen></ClubShell>;
}
