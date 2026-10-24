'use client';

import React from 'react';
import q from './qc.module.css';

interface Props {
  id: string; label: string; value: number; min: number; max: number; step: number; shown: string;
  /** What a screen reader says for the value, when the slider's own number is a position rather than the value. */
  valueText?: string;
  onChange: (n: number) => void;
  children?: React.ReactNode;
}

/** A labelled slider on a dark card: gold track filled to the thumb, the value read out beside the label. */
export function RangeField({ id, label, value, min, max, step, shown, valueText, onChange, children }: Props) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#f6f3ec]/60">{label}</label>
        <output htmlFor={id} className="font-mono text-[15px] font-semibold tabular-nums text-[#f6f3ec]">{shown}</output>
      </div>
      <div className="relative mt-1">
        <input id={id} type="range" min={min} max={max} step={step} value={value} aria-valuetext={valueText} onChange={(e) => onChange(Number(e.target.value))}
          className={q.range} style={{ ['--fill' as string]: `${fill}%` } as React.CSSProperties} />
        {children}
      </div>
    </div>
  );
}
