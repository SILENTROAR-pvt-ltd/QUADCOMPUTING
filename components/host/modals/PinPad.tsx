'use client';

import { Delete } from 'lucide-react';

interface PinPadProps {
  /** Digits entered so far (0–4). */
  pin: string;
  disabled?: boolean;
  error?: string | null;
  onKey: (key: string) => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];
const LABEL: Record<string, string> = { C: 'Clear', '⌫': 'Delete' };

/** Dot indicators and keypad for a 4-digit PIN. Pure view: the parent owns the digits. */
export function PinPad({ pin, disabled, error, onKey }: PinPadProps) {
  return (
    <div>
      <div className="flex justify-center gap-3" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-3 w-3 rounded-full transition-colors ${pin.length > i ? 'bg-neutral-950' : 'bg-neutral-200'}`} />
        ))}
      </div>
      <span className="sr-only">{pin.length} of 4 digits entered</span>
      <p role="alert" className="mt-3 min-h-[18px] text-center text-xs font-medium text-rose-700">{error}</p>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={disabled}
            aria-label={LABEL[k] ?? k}
            onClick={() => onKey(k)}
            className="flex h-14 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-lg font-medium text-neutral-900 shadow-2xs transition-all hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {k === '⌫' ? <Delete className="h-5 w-5" /> : k}
          </button>
        ))}
      </div>
    </div>
  );
}
