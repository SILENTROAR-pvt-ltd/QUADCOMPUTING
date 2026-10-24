import React from 'react';
import { AlertTriangle, CheckCircle2, MinusCircle, XCircle } from 'lucide-react';

export type Level = 'good' | 'warning' | 'critical' | 'off';

// Status colours are reserved for state and always come with an icon and a word, never colour alone.
const LOOK: Record<Level, { icon: typeof CheckCircle2; text: string; cls: string }> = {
  good: { icon: CheckCircle2, text: 'Normal', cls: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  warning: { icon: AlertTriangle, text: 'Slow', cls: 'border-amber-200 bg-amber-50 text-amber-900' },
  critical: { icon: XCircle, text: 'Down', cls: 'border-rose-200 bg-rose-50 text-rose-800' },
  off: { icon: MinusCircle, text: 'Not set up', cls: 'border-neutral-200 bg-neutral-50 text-neutral-600' },
};

export function StatusPill({ level, label }: { level: Level; label?: string }) {
  const l = LOOK[level];
  const Icon = l.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${l.cls}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden /> {label ?? l.text}
    </span>
  );
}
