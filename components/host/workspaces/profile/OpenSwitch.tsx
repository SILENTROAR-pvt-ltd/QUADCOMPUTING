'use client';

import React from 'react';

interface Props {
  on: boolean;
  onChange: (on: boolean) => void;
  /** Spoken name for the switch, e.g. "Monday". */
  label: string;
  /** Words beside the knob; the defaults suit opening hours. */
  onText?: string;
  offText?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

/**
 * An on/off switch that reads at a glance: green with "Open" when on, red with "Closed" when off. Used for each day of
 * the week and for "Open 24/7"; a tap flips it, and the keyboard works as it would on any switch.
 */
export function OpenSwitch({ on, onChange, label, onText = 'Open', offText = 'Closed', disabled = false, size = 'md' }: Props) {
  const track = size === 'sm' ? 'h-6 w-11' : 'h-7 w-[3.25rem]';
  const knob = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';
  const shift = size === 'sm' ? 'translate-x-5' : 'translate-x-[1.5rem]';
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={`${label}: ${on ? onText : offText}`} disabled={disabled} onClick={() => onChange(!on)}
      className={`inline-flex shrink-0 cursor-pointer items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50`}>
      <span className={`relative inline-flex ${track} items-center rounded-full p-0.5 transition-colors ${on ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]' : 'bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.16)]'}`}>
        <span aria-hidden className={`${knob} rounded-full bg-white shadow-md transition-transform ${on ? shift : 'translate-x-0'}`} />
      </span>
      <span className={`w-12 text-left text-xs font-semibold ${on ? 'text-emerald-800' : 'text-rose-700'}`}>{on ? onText : offText}</span>
    </button>
  );
}
