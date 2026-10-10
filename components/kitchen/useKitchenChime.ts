'use client';

import { useCallback, useRef, useState } from 'react';

function tone(ctx: AudioContext, freq: number, start: number, length: number, volume: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + length);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + length);
}

/** The new-ticket chime. Browsers only allow sound after a tap, so the kitchen unlocks it once. */
export function useKitchenChime() {
  const [unlocked, setUnlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);

  const play = useCallback(() => {
    const ctx = ctxRef.current;
    if (muted || !unlocked || !ctx) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      tone(ctx, 880, ctx.currentTime, 0.4, 0.25);
      tone(ctx, 1320, ctx.currentTime + 0.12, 0.48, 0.25);
    } catch (err) {
      console.warn('[Audio Alert Warning]:', err);
    }
  }, [muted, unlocked]);

  const unlock = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!ctxRef.current) ctxRef.current = new AudioCtx();
        const ctx = ctxRef.current;
        if (ctx.state === 'suspended') void ctx.resume();
        tone(ctx, 523.25, ctx.currentTime, 0.2, 0.15);
      }
    } catch (err) {
      console.error('[Audio unlock failed]:', err);
    }
    setUnlocked(true);
    setMuted(false);
  }, []);

  return { unlocked, muted, play, unlock, toggleMute: () => setMuted((m) => !m) };
}
