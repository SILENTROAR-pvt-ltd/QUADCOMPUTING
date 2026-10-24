'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Panel, Stat, ErrorNote } from '../ui/Panel';
import { StatusPill, type Level } from '../ui/StatusPill';
import { ago, count } from '../ui/format';
import { useAdminData } from '../ui/useAdminData';
import { Broadcast } from './Broadcast';

interface SystemAnswer {
  health: { overall: Level; at: string; checks: Array<{ id: string; label: string; level: Level; ms: number | null; detail: string }> };
  volumes: Array<{ table: string; rows: number }>;
  vibey: { turns24h: number; guest: number; host: number; avgMs: number | null; errors: number; modelShare: number | null };
  connections: { openTables: number; guestsOnline: number; staffScreens: number };
  links: Record<string, string | null>;
}

const LINKS: Array<[string, string, string]> = [
  ['supabaseCompute', 'Supabase compute & disk', 'Scale Micro → Small → Large (changes the bill)'],
  ['supabaseRealtime', 'Realtime inspector', 'Live channels and connection limits'],
  ['supabase', 'Supabase project', 'Database, logs, backups'],
  ['vercel', 'Vercel', 'Deployments, functions, regions'],
  ['upstash', 'Upstash', 'Redis for rate limits and Vibey budgets'],
];

/** /admin/system: live health (every 15 s), connection estimate, consoles, data volumes, Vibey, and broadcasts. */
export function SystemPage() {
  const { data, error } = useAdminData<SystemAnswer>('/api/admin/system', 15_000);
  return (
    <div className="space-y-5">
      {error && <ErrorNote>{error}</ErrorNote>}
      {!data ? <div className="h-48 animate-pulse rounded-2xl bg-white" /> : (
        <>
          <Panel title="Service health" note={`Measured from this server ${ago(data.health.at)} · refreshed every 15 s`} actions={<StatusPill level={data.health.overall} label={data.health.overall === 'good' ? 'All systems normal' : undefined} />}>
            <ul className="grid gap-3 md:grid-cols-3">
              {data.health.checks.map((c) => (
                <li key={c.id} className="rounded-xl border border-[#ebebe8] p-4">
                  <div className="flex items-center justify-between gap-2"><p className="text-[13.5px] font-semibold text-neutral-900">{c.label}</p><StatusPill level={c.level} /></div>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-neutral-950">{c.ms === null ? '—' : `${c.ms} ms`}</p>
                  <p className="mt-1 text-[11px] text-neutral-500">{c.detail}</p>
                </li>
              ))}
            </ul>
          </Panel>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Tables open (guest phones)" value={count(data.connections.openTables)} hint="Each has guests on its live channel" />
            <Stat label="Guests online" value={count(data.connections.guestsOnline)} hint="Seen in the last 15 minutes" />
            <Stat label="Staff screens" value={count(data.connections.staffScreens)} hint="Signed in during the last 12 hours" />
          </div>
          <p className="-mt-2 text-[11px] text-neutral-500">An estimate from live sessions. The exact websocket count (against the realtime limit) is in the Supabase Realtime inspector.</p>
          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Infrastructure consoles" note="Compute and limits change in the provider's console, where the bill is shown">
              <ul className="divide-y divide-[#f0f0ed]">
                {LINKS.map(([key, label, note]) => data.links[key] && (
                  <li key={key}><a href={data.links[key]!} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 py-2.5 hover:text-[#2a78d6]">
                    <span><span className="block text-[13.5px] font-medium">{label}</span><span className="block text-[11px] text-neutral-500">{note}</span></span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                  </a></li>
                ))}
              </ul>
            </Panel>
            <Panel title="Vibey AI · last 24 hours" note="Guest chat and owner co-pilot">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Turns" value={count(data.vibey.turns24h)} hint={`${data.vibey.guest} guest · ${data.vibey.host} owner`} />
                <Stat label="Average reply" value={data.vibey.avgMs === null ? '—' : `${data.vibey.avgMs} ms`} />
                <Stat label="Errors" value={count(data.vibey.errors)} hint={data.vibey.turns24h ? `${Math.round((data.vibey.errors / data.vibey.turns24h) * 100)}% of turns` : undefined} />
                <Stat label="Used the AI model" value={data.vibey.modelShare === null ? '—' : `${data.vibey.modelShare}%`} hint="The rest answered by rules" />
              </div>
            </Panel>
          </div>
          <Panel title="Data held" note="Rows per table, live">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-3 lg:grid-cols-4">
              {data.volumes.map((v) => <li key={v.table} className="flex justify-between gap-3 border-b border-[#f3f3f0] py-1.5"><span className="text-neutral-600">{v.table}</span><b className="tabular-nums text-neutral-950">{v.rows.toLocaleString('en-IN')}</b></li>)}
            </ul>
          </Panel>
        </>
      )}
      <Broadcast />
    </div>
  );
}
