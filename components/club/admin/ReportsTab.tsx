'use client';

import React, { useState } from 'react';
import { Badge, Button, Card, Notice, Spinner } from '../ui';
import { clubFetch, shortDate } from '../api';
import { ListState, StatusTabs, useAdminList, useDecision } from './admin-kit';

/** Reported items shown as their text, and the ones staff can hide from everyone. */
const TEXT_TYPES = ['message', 'post', 'comment', 'meetup'];
const HIDEABLE = ['message', 'story', 'post', 'comment', 'meetup'];

/** The Red Flag queue: see the reported item, act on it, then close the report. */
export function ReportsTab() {
  const [status, setStatus] = useState('open');
  const { rows, error, reload } = useAdminList(`/admin/reports?status=${status}`, 'reports');
  const { busy, error: decideError, decide } = useDecision('/admin/reports', reload);
  const [actionError, setActionError] = useState('');

  const moderate = async (body: Record<string, unknown>, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    setActionError('');
    const r = await clubFetch('/admin/members', { body });
    if (!r.ok) setActionError(r.error); else void reload();
  };

  return (
    <div>
      <StatusTabs value={status} options={['open', 'actioned', 'dismissed']} onChange={setStatus} />
      <Notice>{decideError || actionError}</Notice>
      {!rows && !error && <Spinner />}
      <ListState rows={rows} error={error} empty="Nothing flagged. Good vibes." />
      <div className="space-y-3">
        {rows?.map((r: any) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm"><Badge tone="bad">{r.target_type}</Badge> <span className="ml-1">{r.reason}</span></p>
              <span className="text-xs text-[#14261b]/60">{shortDate(r.created_at)}</span>
            </div>
            {r.preview && TEXT_TYPES.includes(r.target_type) && <p className="mt-2 whitespace-pre-wrap rounded-xl bg-[#14261b]/[0.05] px-3 py-2 text-sm">“{r.preview.body}”{r.preview.place ? ` · ${r.preview.place}` : ''} {r.preview.hidden && <Badge tone="warn">hidden</Badge>}</p>}
            {r.preview && r.target_type === 'user' && <p className="mt-2 text-sm">{r.preview.viber_id} · {r.preview.status}{r.preview.shadow_banned ? ' · shadow-banned' : ''}</p>}
            {r.target_type !== 'user' && !TEXT_TYPES.includes(r.target_type) && <p className="mt-2 text-xs text-[#14261b]/65">Item id {r.target_id}</p>}
            {status === 'open' && (
              <div className="mt-3 flex flex-wrap gap-2">
                {HIDEABLE.includes(r.target_type) && !r.preview?.hidden && (
                  <Button tone="quiet" onClick={() => moderate({ content: r.target_type, id: r.target_id, hidden: true }, `Hide this ${r.target_type} from everyone?`)}>Hide {r.target_type}</Button>
                )}
                {(r.target_type === 'user' || r.preview?.sender_id) && (
                  <>
                    <Button tone="quiet" onClick={() => moderate({ user_id: r.preview?.sender_id || r.target_id, action: 'mute', minutes: 1440 }, 'Mute this member for 24 hours?')}>Mute 24h</Button>
                    <Button tone="quiet" onClick={() => moderate({ user_id: r.preview?.sender_id || r.target_id, action: 'shadow_ban' }, 'Shadow-ban this member?')}>Shadow-ban</Button>
                    <Button tone="danger" onClick={() => moderate({ user_id: r.preview?.sender_id || r.target_id, action: 'revoke' }, 'Revoke this member\'s Club Visa?')}>Revoke visa</Button>
                  </>
                )}
                <Button busy={busy === r.id} onClick={() => decide(r.id, { report_id: r.id, outcome: 'actioned' })}>Close as actioned</Button>
                <Button tone="quiet" onClick={() => decide(r.id, { report_id: r.id, outcome: 'dismissed' })}>Dismiss</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
