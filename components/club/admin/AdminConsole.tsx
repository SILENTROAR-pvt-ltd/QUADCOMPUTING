'use client';

import React, { useEffect, useState } from 'react';
import { useClub } from '../club-context';
import { Notice } from '../ui';
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
      <p className="mb-5 text-sm text-[#14261b]/70">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#3c6b2b]">{me.staffRole === 'super_admin' ? 'Super admin' : 'Club admin'}</span> · Every decision here is logged with your name.
      </p>
      <div role="tablist" className="mb-6 flex gap-1 overflow-x-auto pb-1">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold ${tab === key ? 'bg-[#c8da4a] text-[#14261b]' : 'bg-[#14261b]/[0.06] text-[#14261b]/70 hover:text-[#14261b]'}`}>
            {label}{waiting[key] ? <span className={`rounded-full px-1.5 text-[10px] font-bold ${tab === key ? 'bg-[#17301f] text-[#c8da4a]' : 'bg-[#c8da4a] text-[#14261b]'}`}>{waiting[key]}</span> : null}
          </button>
        ))}
      </div>
      <Active />
    </div>
  );
}
