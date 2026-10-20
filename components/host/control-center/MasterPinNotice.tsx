'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import type { SecurityStatus } from './useSecurityStatus';

const DISMISSED_KEY = 'qc:master-pin-notice:dismissed';

interface MasterPinNoticeProps {
  securityStatus: SecurityStatus | null;
  onOpenSecurity: () => void;
}

/**
 * Shown to an owner whose venue has no master PIN. The retired default PIN was cleared on 2026-10-21 (migration
 * 20261021000001), so a venue that relied on it has no lock until the owner sets one; the bank details, wallet and
 * catalog writes stay unlocked meanwhile. Dismissable for the session only: it returns at the next sign-in.
 */
export function MasterPinNotice({ securityStatus, onOpenSecurity }: MasterPinNoticeProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem(DISMISSED_KEY) === '1'); } catch { setDismissed(false); }
  }, []);

  if (!securityStatus || securityStatus.isAdminPinActive || dismissed) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISSED_KEY, '1'); } catch {}
    setDismissed(true);
  };

  return (
    <div role="status" className="mx-4 mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 md:mx-6">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
      <div className="min-w-0 flex-1 text-sm leading-snug">
        <p className="font-semibold">Set a master PIN before your next shift.</p>
        <p className="mt-0.5 text-amber-900/80">
          This venue has no master PIN, so the wallet, bank details, expenses and menu prices are open to anyone at the till.
          A PIN takes a minute to set.
        </p>
        <button type="button" onClick={onOpenSecurity} className="mt-2 inline-flex h-9 items-center rounded-lg bg-amber-700 px-3 text-sm font-semibold text-white hover:bg-amber-800">
          Set master PIN
        </button>
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss for now" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-amber-800 hover:bg-amber-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
