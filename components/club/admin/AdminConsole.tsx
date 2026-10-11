'use client';

import React, { useEffect, useState } from 'react';
import { useClub } from '../club-context';
import { Heading, Notice } from '../ui';
import { clubFetch } from '../api';
import { ApplicationsTab } from './ApplicationsTab';
import { EventsTab } from './EventsTab';
import { PropertiesTab } from './PropertiesTab';
import { ReportsTab } from './ReportsTab';
import { MembersTab } from './MembersTab';
import { PayoutsTab } from './PayoutsTab';
import { CampaignsTab } from './CampaignsTab';
import { SettingsTab } from './SettingsTab';

const TABS = [
  ['applications', 'Applications', ApplicationsTab], ['events', 'Plans', EventsTab], ['properties', 'Properties', PropertiesTab],
  ['reports', 'Red flags', ReportsTab], ['members', 'Members', MembersTab], ['payouts', 'Payouts', PayoutsTab],
  ['campaigns', 'QR campaigns', CampaignsTab], ['settings', 'Settings', SettingsTab],
] as const;
type TabKey = (typeof TABS)[number][0];

/** The Club back office for CLUB_ADMIN and SUPER_ADMIN staff. */
export function AdminConsole() {
  const { me } = useClub();
  const [tab, setTab] = useState<TabKey>('applications');
  const [waiting, setWaiting] = useState<Record<string, number>>({});
  useEffect(() => { void clubFetch('/admin/overview').then((r) => r.ok && setWaiting(r.data.waiting)); }, [tab]);

  if (!me.staffRole) return <Notice>Club staff only.</Notice>;
  const Active = TABS.find(([k]) => k === tab)![2];
  return (
    <div>
      <Heading kicker={me.staffRole === 'super_admin' ? 'Super admin' : 'Club admin'} title="Back office">Every decision here is logged with your name.</Heading>
      <div role="tablist" className="mb-6 flex gap-1 overflow-x-auto pb-1">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold ${tab === key ? 'bg-[#7c3aed] text-white' : 'bg-white text-[#2a1250]/65'}`}>
            {label}{waiting[key] ? <span className="rounded-full bg-[#ff2e88] px-1.5 text-[10px] text-white">{waiting[key]}</span> : null}
          </button>
        ))}
      </div>
      <Active />
    </div>
  );
}
