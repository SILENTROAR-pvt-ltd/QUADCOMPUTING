'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Loader2, Plus, Search, Sparkles, X } from 'lucide-react';
import type { CatalogItem, FoodBeverageItem } from '@/types';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import { FEATURED_MAX } from '@/lib/services/menu-info/menu-info';

interface Props { items: CatalogItem[] }

const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
const same = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

/**
 * The dishes the venue wants guests to see first: up to five, picked from the menu catalogue and put in order. Guests see them
 * on the menu under the live offers, with a one-tap add.
 */
export function TopPicksCard({ items }: Props) {
  const dishes = useMemo(
    () => items.filter((i): i is FoodBeverageItem => i.kind === 'food_beverage' && i.status !== 'archived' && i.status !== 'sold_out'),
    [items],
  );
  const byId = useMemo(() => new Map(dishes.map((d) => [String(d.id).toLowerCase(), d])), [dishes]);

  const [saved, setSaved] = useState<string[]>([]);
  const [picks, setPicks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    apiRequest<any>('/api/host/menu-info', { cache: 'no-store' }).then((res) => {
      if (res.ok && Array.isArray(res.data?.info?.featured)) {
        setSaved(res.data.info.featured);
        setPicks(res.data.info.featured);
      } else if (!res.ok) setMessage({ kind: 'err', text: res.error || 'Could not load your top picks.' });
      setLoading(false);
    });
  }, []);

  const dirty = !same(picks, saved);
  const full = picks.length >= FEATURED_MAX;
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dishes.filter((d) => !q || d.name.toLowerCase().includes(q) || (d.category || '').toLowerCase().includes(q)).slice(0, 60);
  }, [dishes, query]);

  const toggle = (id: string) => {
    const key = id.toLowerCase();
    setMessage(null);
    setPicks((cur) => (cur.includes(key) ? cur.filter((x) => x !== key) : cur.length >= FEATURED_MAX ? cur : [...cur, key]));
  };
  const move = (i: number, dir: -1 | 1) => setPicks((cur) => {
    const j = i + dir;
    if (j < 0 || j >= cur.length) return cur;
    const next = [...cur];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const res = await apiRequest<any>('/api/host/menu-info', jsonRequest('PUT', { info: { featured: picks } }));
    setSaving(false);
    if (!res.ok) return setMessage({ kind: 'err', text: res.error || 'Could not save. Please try again.' });
    const stored: string[] = res.data?.info?.featured ?? picks;
    setSaved(stored);
    setPicks(stored);
    setMessage({ kind: 'ok', text: stored.length ? 'Saved. Guests see these first on the menu.' : 'Cleared. Guests no longer see top picks.' });
  };

  return (
    <section className="mb-5 rounded-2xl border border-[#d9d0f2] bg-gradient-to-br from-[#faf7ff] to-white shadow-xs">
      <div className="flex items-start gap-3 px-4 pt-4 sm:px-5">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#4a3a8c] text-white"><Sparkles className="h-4 w-4" aria-hidden /></span>
        <div className="min-w-0">
          <p className="font-serif text-base text-zinc-950">Top picks</p>
          <p className="text-xs text-zinc-500">Choose up to {FEATURED_MAX} dishes from your menu. Guests see them first, right under the live offers.</p>
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
        ) : (
          <>
            {picks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#d9d0f2] bg-white/70 px-4 py-5 text-center text-sm text-zinc-500">No top picks yet. Add the dishes you want guests to try first.</p>
            ) : (
              <ol className="space-y-2">
                {picks.map((id, i) => {
                  const dish = byId.get(id);
                  return (
                    <li key={id} className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white p-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#efe9fd] text-[13px] font-bold text-[#4a3a8c]">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-950">{dish ? dish.name : 'Dish no longer on the menu'}</p>
                        <p className="truncate text-[11px] text-zinc-500">{dish ? `${dish.category || 'Dish'} · ${inr(dish.price.amountMinor)}` : 'It will be removed when you save.'}</p>
                      </div>
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${dish?.name ?? 'dish'} up`} className="grid h-10 w-10 place-items-center rounded-lg text-zinc-600 active:bg-zinc-100 disabled:opacity-30 cursor-pointer"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === picks.length - 1} aria-label={`Move ${dish?.name ?? 'dish'} down`} className="grid h-10 w-10 place-items-center rounded-lg text-zinc-600 active:bg-zinc-100 disabled:opacity-30 cursor-pointer"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" onClick={() => toggle(id)} aria-label={`Remove ${dish?.name ?? 'dish'}`} className="grid h-10 w-10 place-items-center rounded-lg text-rose-600 active:bg-rose-50 cursor-pointer"><X className="h-4 w-4" /></button>
                    </li>
                  );
                })}
              </ol>
            )}

            <button type="button" onClick={() => setAdding((a) => !a)} disabled={full && !adding}
              className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#cfc3f0] bg-white text-[13px] font-semibold text-[#3b2f78] active:bg-[#f6f2ff] disabled:opacity-50 sm:w-auto sm:px-5">
              <Plus className="h-4 w-4" aria-hidden /> {adding ? 'Done choosing' : full ? `Top ${FEATURED_MAX} chosen` : 'Add a dish from your menu'}
            </button>

            {adding && (
              <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-2.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-400" aria-hidden />
                  <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your dishes" aria-label="Search your dishes"
                    className="h-11 w-full rounded-xl border border-zinc-200 pl-9 pr-3 text-[16px] outline-none focus:border-zinc-900 sm:text-sm" />
                </div>
                <ul className="max-h-[46dvh] divide-y divide-zinc-100 overflow-y-auto overscroll-contain">
                  {results.map((d) => {
                    const on = picks.includes(String(d.id).toLowerCase());
                    const blocked = !on && full;
                    return (
                      <li key={d.id}>
                        <button type="button" onClick={() => toggle(String(d.id))} disabled={blocked} aria-pressed={on}
                          className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-2 py-2 text-left active:bg-zinc-50 disabled:opacity-40">
                          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${on ? 'border-[#4a3a8c] bg-[#4a3a8c] text-white' : 'border-zinc-300 text-transparent'}`}><Check className="h-3.5 w-3.5" aria-hidden /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-zinc-950">{d.name}</span>
                            <span className="block truncate text-[11px] text-zinc-500">{d.category || 'Dish'}</span>
                          </span>
                          <span className="font-mono text-xs text-zinc-700">{inr(d.price.amountMinor)}</span>
                        </button>
                      </li>
                    );
                  })}
                  {results.length === 0 && <li className="px-2 py-6 text-center text-sm text-zinc-500">No dish matches.</li>}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <p role={message?.kind === 'err' ? 'alert' : 'status'} className={`text-xs ${message?.kind === 'err' ? 'text-rose-700' : 'text-emerald-700'}`}>
                {message?.text ?? (dirty ? 'Unsaved changes' : '')}
              </p>
              <button type="button" onClick={save} disabled={saving || !dirty}
                className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white disabled:opacity-40">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save top picks
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default TopPicksCard;
