'use client';

import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Notice, Spinner, field } from '../ui';
import { shortDate } from '../api';
import { ListState, useAdminList, useDecision } from './admin-kit';
import { QrDownloads } from './QrDownloads';

/** Acquisition QR campaigns: create, download (PNG/SVG/PDF), rotate a leaked code, see sign-ups per code. */
export function CampaignsTab() {
  const { rows, error, reload } = useAdminList('/admin/campaigns', 'campaigns');
  const { busy, error: decideError, decide } = useDecision('/admin/campaigns', reload);
  const [label, setLabel] = useState('');
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-2">
        <label className="min-w-56 flex-1"><span className="text-xs font-semibold">New campaign</span>
          <input className={`${field} mt-1.5`} placeholder="e.g. Goa hostel posters" value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <Button busy={busy === 'new'} disabled={!label.trim()} onClick={() => { void decide('new', { op: 'create', label }); setLabel(''); }}>Create QR</Button>
      </Card>
      <Notice>{decideError}</Notice>
      {!rows && !error && <Spinner />}
      <ListState rows={rows} error={error} empty="No campaigns yet." />
      <div className="space-y-2">
        {rows?.map((c: any) => (
          <Card key={c.id} className="!p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{c.label} {c.active ? <Badge tone="good">active</Badge> : <Badge>retired</Badge>}</p>
                <p className="font-mono text-xs text-[#2a1250]/55">/join?src={c.code}</p>
                <p className="text-xs text-[#2a1250]/55">{c.applications} application{c.applications === 1 ? '' : 's'} · created {shortDate(c.created_at)}</p>
              </div>
              {c.active && origin && <QrDownloads url={`${origin}/join?src=${c.code}`} label={c.label} code={c.code} />}
            </div>
            {c.active && (
              <div className="mt-3 flex gap-2">
                <Button tone="quiet" busy={busy === c.id} onClick={() => decide(c.id, { op: 'rotate', id: c.id }, 'Retire this code and issue a new one? Printed QRs with the old code stop counting.')}>Rotate code</Button>
                <Button tone="quiet" onClick={() => decide(c.id, { op: 'deactivate', id: c.id })}>Retire</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
