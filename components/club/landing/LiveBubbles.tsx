'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Avatar } from '../ui';
import { GENERATION_LABEL } from '../api';
import styles from '../club.module.css';

interface Bubble { key: string; name: string; generation: string; avatar_url: string | null; vibe_line: string | null }

// Spots around the hero, as percentages of the stage. Enough for 14 members on screen at once.
const SPOTS = [[8, 18], [22, 62], [34, 12], [12, 78], [48, 70], [62, 16], [74, 58], [86, 22], [90, 74], [56, 40], [28, 38], [80, 42], [42, 88], [66, 86]];

// Decorative colour orbs shown while nobody is online (no fake members): x%, y%, size px, gradient.
const ORBS: Array<[number, number, number, string]> = [
  [20, 22, 74, 'from-[#ff9a5a] to-[#ff2e88]'], [70, 16, 56, 'from-[#a78bfa] to-[#7c3aed]'], [84, 58, 82, 'from-[#5eead4] to-[#38bdf8]'],
  [30, 76, 60, 'from-[#fde68a] to-[#fb923c]'], [56, 84, 44, 'from-[#f9a8d4] to-[#c084fc]'], [12, 52, 40, 'from-[#86efac] to-[#2dd4bf]'],
  [48, 30, 36, 'from-[#fda4af] to-[#fb7185]'], [90, 86, 34, 'from-[#c4b5fd] to-[#f0abfc]'],
];

/** Members online right now, floating; tap one for a preview that leads into the club chat. */
export function LiveBubbles() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [open, setOpen] = useState<Bubble | null>(null);

  useEffect(() => {
    let live = true;
    const load = () => fetch('/api/club/bubbles', { cache: 'no-store' }).then((r) => r.json()).then((d) => live && d?.bubbles && setBubbles(d.bubbles)).catch(() => {});
    load();
    const t = setInterval(load, 20_000);
    return () => { live = false; clearInterval(t); };
  }, []);

  return (
    <div className="relative h-[360px] w-full sm:h-[440px]" aria-label={`${bubbles.length} members online now`}>
      <div aria-hidden="true" className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle_at_30%_30%,#ff6a3d_0%,transparent_45%),radial-gradient(circle_at_70%_40%,#ff2e88_0%,transparent_45%),radial-gradient(circle_at_50%_75%,#7c3aed_0%,transparent_50%)] opacity-40 blur-3xl" />
      {bubbles.slice(0, SPOTS.length).map((b, i) => (
        <button key={b.key} type="button" onClick={() => setOpen(b)} aria-label={`${b.name}, ${GENERATION_LABEL[b.generation] || ''}`}
          className={`${styles.bubble} absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-1 shadow-[0_12px_30px_-14px_rgba(42,18,80,0.5)] ring-1 ring-[#2a1250]/10 transition hover:scale-110`}
          style={{ left: `${SPOTS[i][0]}%`, top: `${SPOTS[i][1]}%`, ['--dur' as any]: `${7 + (i % 5)}s`, ['--delay' as any]: `${-i * 0.7}s`, ['--dx' as any]: `${(i % 2 ? -1 : 1) * (6 + i)}px` }}>
          <Avatar url={b.avatar_url} name={b.name} size={i % 3 === 0 ? 64 : 48} />
          <span aria-hidden="true" className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
        </button>
      ))}
      {bubbles.length === 0 && (
        <>
          {ORBS.map(([x, y, size, colors], i) => (
            <span key={i} aria-hidden="true" className={`${styles.bubble} absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br ${colors} opacity-80 shadow-[0_18px_40px_-18px_rgba(124,58,237,0.6)]`}
              style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, ['--dur' as any]: `${6 + (i % 4)}s`, ['--delay' as any]: `${-i}s`, ['--dx' as any]: `${(i % 2 ? -1 : 1) * 12}px` }} />
          ))}
          <p className="absolute left-1/2 top-1/2 w-max max-w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-4 py-2 text-center text-sm font-medium text-[#2a1250]/75 shadow-[0_10px_30px_-12px_rgba(124,58,237,0.45)]">
            Members light up here when they&apos;re online ✨
          </p>
        </>
      )}
      {open && (
        <div role="dialog" aria-label={`${open.name}'s preview`} className="absolute left-1/2 top-1/2 w-[min(320px,90%)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[#2a1250]/10 bg-white p-5 shadow-2xl">
          <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="absolute right-3 top-3 rounded-full p-1 text-[#2a1250]/50 hover:bg-[#2a1250]/[0.05]"><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-3">
            <Avatar url={open.avatar_url} name={open.name} size={52} />
            <div>
              <p className="font-semibold">{open.name}</p>
              <p className="text-xs text-[#2a1250]/55">{GENERATION_LABEL[open.generation]} · online now</p>
            </div>
          </div>
          {open.vibe_line && <p className="mt-3 text-sm italic text-[#2a1250]/75">“{open.vibe_line}”</p>}
          <Link href="/club/chat" className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full bg-[#7c3aed] text-sm font-semibold text-white">Say hi in the live club chat</Link>
          <p className="mt-2 text-center text-[11px] text-[#2a1250]/45">Members only. Sign in or apply first.</p>
        </div>
      )}
    </div>
  );
}
