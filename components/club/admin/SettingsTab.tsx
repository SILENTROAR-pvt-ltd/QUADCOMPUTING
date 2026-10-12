'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Notice, Spinner, field } from '../ui';
import { clubFetch } from '../api';

/** Platform fee, deposit share and payout approval (super admin), business categories, and staff. */
export function SettingsTab() {
  const [data, setData] = useState<any>(null);
  const [cats, setCats] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [newCat, setNewCat] = useState('');
  const [staff, setStaff] = useState({ viber_id: '', role: 'club_admin' });

  const load = useCallback(async () => {
    const [s, c] = await Promise.all([clubFetch('/admin/settings'), clubFetch('/admin/categories')]);
    if (s.ok) setData(s.data); else setMsg({ ok: false, text: s.error });
    if (c.ok) setCats(c.data.categories);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const post = async (path: string, body: unknown, ok: string) => {
    const r = await clubFetch(path, { body });
    setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.error });
    if (r.ok) void load();
  };
  if (!data) return msg ? <Notice>{msg.text}</Notice> : <Spinner />;
  const superAdmin = data.role === 'super_admin';
  const s = data.settings;

  return (
    <div className="space-y-4">
      {msg && <Notice tone={msg.ok ? 'good' : 'bad'}>{msg.text}</Notice>}
      <Card className="space-y-3">
        <p className="font-semibold">Money {!superAdmin && <Badge>super admin only</Badge>}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[['platform_fee_bps', 'Platform fee %', s.platform_fee_bps], ['deposit_bps', 'Deal deposit %', s.deposit_bps]].map(([key, label, bps]) => (
            <label key={key as string} className="text-xs font-semibold">{label as string}
              <input className={`${field} mt-1.5`} disabled={!superAdmin} defaultValue={(bps as number) / 100} inputMode="decimal"
                onBlur={(e) => { const v = Math.round(Number(e.target.value) * 100); if (v !== bps) void post('/admin/settings', { key, value: v }, 'Saved.'); }} />
            </label>
          ))}
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[#17301f]" disabled={!superAdmin} checked={s.payout_requires_approval}
              onChange={(e) => post('/admin/settings', { key: 'payout_requires_approval', value: e.target.checked }, 'Saved.')} />
            Staff approve verified-vendor payouts
          </label>
        </div>
      </Card>
      <Card className="space-y-3">
        <p className="font-semibold">Business categories</p>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c.slug} type="button" onClick={() => post('/admin/categories', { slug: c.slug, label: c.label, active: !c.active, sort: c.sort }, c.active ? 'Category retired.' : 'Category active.')}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${c.active ? 'border-[#17301f] bg-[#c8da4a] text-[#14261b]' : 'border-[#14261b]/15 text-[#14261b]/60 line-through'}`}>{c.label}</button>
          ))}
        </div>
        <div className="flex gap-2"><input aria-label="New category" className={field} placeholder="e.g. Hostel" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <Button disabled={!newCat.trim()} onClick={() => { void post('/admin/categories', { label: newCat, sort: cats.length + 1 }, 'Category added.'); setNewCat(''); }}>Add</Button></div>
      </Card>
      <Card className="space-y-3">
        <p className="font-semibold">Staff</p>
        <ul className="space-y-1 text-sm">{data.staff.map((m: any) => <li key={m.user_id}>{m.display_name || m.user_id} · <Badge>{m.role.replace('_', ' ')}</Badge></li>)}</ul>
        {superAdmin && (
          <div className="flex flex-wrap gap-2">
            <input aria-label="Viber ID" className={`${field} w-48`} placeholder="@viber_id" value={staff.viber_id} onChange={(e) => setStaff({ ...staff, viber_id: e.target.value })} />
            <select aria-label="Role" className={`${field} w-44`} value={staff.role} onChange={(e) => setStaff({ ...staff, role: e.target.value })}>
              <option value="club_admin">Club admin</option><option value="super_admin">Super admin</option><option value="none">Remove staff</option>
            </select>
            <Button onClick={() => post('/admin/staff', staff, 'Staff updated.')}>Save</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
