'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Info, X, XCircle } from 'lucide-react';

interface Notice { id: string; title: string; body: string | null; severity: 'info' | 'warning' | 'critical' }
const LOOK = {
  info: { icon: Info, cls: 'border-sky-200 bg-sky-50 text-sky-900' },
  warning: { icon: AlertTriangle, cls: 'border-amber-300 bg-amber-50 text-amber-900' },
  critical: { icon: XCircle, cls: 'border-rose-300 bg-rose-50 text-rose-900' },
};
const HIDDEN_KEY = 'quad_hidden_notices';

function hiddenIds(): string[] {
  try { return JSON.parse(sessionStorage.getItem(HIDDEN_KEY) || '[]'); } catch { return []; }
}

/** Notices from the Vibers team (maintenance, updates), above every section; read every minute, each can be put away. */
export function AnnouncementBanner() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);

  useEffect(() => {
    setHidden(hiddenIds());
    let live = true;
    const load = () => fetch('/api/host/announcements', { cache: 'no-store' }).then((r) => r.json()).then((d) => { if (live && d?.success) setNotices(d.announcements || []); }).catch(() => {});
    void load();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 60_000);
    return () => { live = false; clearInterval(timer); };
  }, []);

  const hide = (id: string) => {
    const next = [...hidden, id];
    setHidden(next);
    try { sessionStorage.setItem(HIDDEN_KEY, JSON.stringify(next)); } catch { /* this visit only */ }
  };

  const shown = notices.filter((n) => !hidden.includes(n.id)).slice(0, 2);
  if (shown.length === 0) return null;
  return (
    <div className="mb-4 space-y-2">
      {shown.map((n) => {
        const look = LOOK[n.severity] || LOOK.info;
        const Icon = look.icon;
        return (
          <div key={n.id} role={n.severity === 'critical' ? 'alert' : 'status'} className={`relative flex gap-3 rounded-2xl border py-3 pl-4 pr-11 ${look.cls}`}>
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{n.title}</p>
              {n.body && <p className="mt-0.5 text-xs opacity-90">{n.body}</p>}
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider opacity-60">From the Vibers team</p>
            </div>
            <button type="button" onClick={() => hide(n.id)} aria-label="Hide notice" className="absolute right-2 top-2.5 rounded-lg p-1.5 opacity-60 hover:opacity-100 cursor-pointer"><X className="h-4 w-4" /></button>
          </div>
        );
      })}
    </div>
  );
}
