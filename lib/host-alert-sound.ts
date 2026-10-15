'use client';

// The bell that rings on a host screen when a kitchen order arrives or a guest calls the waiter or chef. One shared audio
// element for the whole app, so the kitchen board and the control center never ring twice for one event. There is no
// mute: a missed order costs more than a loud bell.

export const ALERT_SOUND_SRC = '/media/sounds/school-bell-v1.mp3';
/** Two events within this many ms ring once. */
export const RING_GAP_MS = 1500;

type Listener = () => void;
const listeners = new Set<Listener>();
let audio: HTMLAudioElement | null = null;
let unlocked = false;
let lastRing = 0;
let autoUnlockInstalled = false;

/** Pure, so it is tested: whether a ring at `now` is a repeat of the one at `last`. */
export const isRepeatRing = (now: number, last: number, gap = RING_GAP_MS) => now - last < gap;

const notify = () => listeners.forEach((l) => l());

function element(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!audio) {
    audio = new Audio(ALERT_SOUND_SRC);
    audio.preload = 'auto';
    audio.volume = 1;
  }
  return audio;
}

/** A bell made of two tones, used only if the sound file cannot be played. */
function fallbackTone() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1320, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + i * 0.35;
      osc.frequency.setValueAtTime(freq, at);
      gain.gain.setValueAtTime(0.5, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.5);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(at); osc.stop(at + 0.5);
    });
  } catch { /* nothing more can be done */ }
}

/**
 * Allows sound on this device. Browsers only permit it after a tap, so this runs from one: it plays the bell silently once,
 * which marks the page as allowed to play sound from then on, including when its tab is in the background.
 */
export async function unlockAlertSound(): Promise<boolean> {
  const el = element();
  if (!el) return false;
  try {
    el.muted = true;
    await el.play();
    el.pause();
    el.currentTime = 0;
    el.muted = false;
    unlocked = true;
  } catch {
    el.muted = false;
    unlocked = false;
  }
  notify();
  return unlocked;
}

/** The first tap anywhere on the page unlocks the sound, so the host never has to find a button. */
export function installAutoUnlock() {
  if (autoUnlockInstalled || typeof window === 'undefined') return;
  autoUnlockInstalled = true;
  const events = ['pointerdown', 'keydown', 'touchend'] as const;
  const handler = () => {
    void unlockAlertSound().then((ok) => {
      if (ok) events.forEach((e) => window.removeEventListener(e, handler, true));
    });
  };
  events.forEach((e) => window.addEventListener(e, handler, true));
}

/** Rings the bell now. Returns false when it was skipped as a repeat of one that just rang. */
export function ringAlert(): boolean {
  const now = Date.now();
  if (isRepeatRing(now, lastRing)) return false;
  lastRing = now;
  const el = element();
  if (!el) return false;
  try {
    el.muted = false;
    el.volume = 1;
    el.currentTime = 0;
    void el.play().catch(() => fallbackTone());
  } catch {
    fallbackTone();
  }
  return true;
}

export const isAlertSoundUnlocked = () => unlocked;
export function subscribeAlertSound(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
