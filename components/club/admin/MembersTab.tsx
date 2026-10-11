'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Badge, Card, Notice, Spinner, field } from '../ui';
import { GENERATION_LABEL } from '../api';
import { ListState, useAdminList, useDecision } from './admin-kit';

const ACTIONS: Array<[string, string, string]> = [
  ['mute', 'Mute 24h', 'Mute this member for 24 hours?'], ['unmute', 'Unmute', ''], ['shadow_ban', 'Shadow-ban', 'Shadow-ban this member?'],
  ['unshadow_ban', 'Lift shadow-ban', ''], ['revoke', 'Revoke pass', 'Revoke this Viber Pass?'], ['reinstate', 'Reinstate', 'Reinstate this pass?'],
];

/** Find a member (staff see real names behind masks) and apply Red Flag actions. */
export function MembersTab() {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const { rows, error, reload } = useAdminList(`/admin/members?q=${encodeURIComponent(term)}`, 'members');
  const { busy, error: actError, decide } = useDecision('/admin/members', reload);

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); setTerm(q); }} className="mb-4 flex max-w-md gap-2">
        <span className="relative flex-1">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2a1250]/40" />
          <input aria-label="Search members" className={`${field} pl-9`} placeholder="Viber ID or club name" value={q} onChange={(e) => setQ(e.target.value)} />
        </span>
      </form>
      <Notice>{actError}</Notice>
      {!rows && !error && <Spinner />}
      <ListState rows={rows} error={error} empty="No members found." />
      <div className="space-y-2">
        {rows?.map((m: any) => {
          const muted = m.muted_until && Date.parse(m.muted_until) > Date.now();
          return (
            <Card key={m.user_id} className="!p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm"><span className="font-semibold">{m.display_name}</span> {m.viber_id}{m.alias && <span className="text-[#2a1250]/55"> · “{m.alias}”{m.alias_masked ? ' (masked)' : ''}</span>}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge tone={m.status === 'approved' ? 'good' : 'bad'}>{m.status}</Badge>
                  <Badge>{GENERATION_LABEL[m.generation]}</Badge>
                  {muted && <Badge tone="warn">muted</Badge>}
                  {m.shadow_banned && <Badge tone="warn">shadow-banned</Badge>}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {ACTIONS.filter(([a]) => (a === 'reinstate' ? m.status === 'revoked' : a === 'revoke' ? m.status === 'approved' : a === 'unmute' ? muted : a === 'mute' ? !muted : a === 'unshadow_ban' ? m.shadow_banned : a === 'shadow_ban' ? !m.shadow_banned : true))
                  .map(([action, label, confirm]) => (
                    <button key={action} type="button" disabled={busy === m.user_id} onClick={() => decide(m.user_id, { user_id: m.user_id, action, minutes: 1440 }, confirm || undefined)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${action === 'revoke' ? 'border-rose-200 text-rose-700' : 'border-[#2a1250]/15'}`}>{label}</button>
                  ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
