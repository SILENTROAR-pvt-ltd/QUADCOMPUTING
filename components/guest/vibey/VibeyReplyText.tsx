'use client';

import React from 'react';

type Block = { kind: 'p'; text: string } | { kind: 'rows'; items: string[] };

/** Vibey writes lists one dish per line, starting "• "; everything else is a paragraph. */
function blocks(text: string): Block[] {
  const out: Block[] = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('• ')) {
      const last = out[out.length - 1];
      if (last?.kind === 'rows') last.items.push(line.slice(2)); else out.push({ kind: 'rows', items: [line.slice(2)] });
    } else if (line.trim()) out.push({ kind: 'p', text: line });
  }
  return out;
}

/** "2 × Paneer Pakora · ₹480" -> quantity, name, price (each part optional but the name). */
function parts(item: string) {
  const m = /^(?:(\d+)\s*×\s*)?(.*?)(?:\s+·\s+(\S.*))?$/.exec(item);
  return { qty: m?.[1] ?? null, name: m?.[2] || item, price: m?.[3] ?? null };
}

/**
 * Vibey's words as the guest reads them: paragraphs with room between them, and each listed dish as its own soft tile
 * (quantity in a forest badge, the name, the price on the right), so a long list never runs on as one line. Works on a
 * reply that is still typing out; `caret` puts the gold caret after the last word shown.
 */
export function VibeyReplyText({ text, caret }: { text: string; caret?: boolean }) {
  const all = blocks(text);
  const tail = (i: number) => (caret && i === all.length - 1 ? <span className="vibey-caret" /> : null);
  return (
    <>
      {all.map((b, i) => (b.kind === 'p' ? (
        <p key={i} className="[&+*]:mt-2.5">{b.text}{tail(i)}</p>
      ) : (
        <ul key={i} className="my-2.5 space-y-1.5">
          {b.items.map((item, j) => {
            const { qty, name, price } = parts(item);
            return (
              <li key={j} className="flex items-center gap-2.5 rounded-xl bg-[#f6f0e3] px-3 py-2 text-[13.5px] leading-snug">
                {qty && <span className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-[#0f2a1e] px-1.5 text-[11px] font-semibold tabular-nums text-[#e6cf9c]">{qty}×</span>}
                <span className="min-w-0 flex-1 font-medium text-[#10231a]">{name}</span>
                {price && <span className="shrink-0 font-semibold tabular-nums text-[#8a6d3f]">{price}</span>}
                {j === b.items.length - 1 && tail(i)}
              </li>
            );
          })}
        </ul>
      )))}
    </>
  );
}
