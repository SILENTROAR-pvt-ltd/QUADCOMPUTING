'use client';

// The guest menu's one confirmation line ("Added Masala Pav to order"). It lives in its own small store, so showing and
// hiding it redraws only the toast: it used to be state of the whole menu page, so every add redrew all the dishes twice
// (once to show the toast and once more to hide it), and taps felt late.
import { create } from 'zustand';

export const TOAST_MS = 3600;
/** A quick add confirms and gets out of the way. */
export const QUICK_TOAST_MS = 1800;

interface ToastState {
  message: string | null;
  /** Changes with every toast, so the same message twice in a row still plays again. */
  seq: number;
  durationMs: number;
}

export const useGuestToast = create<ToastState>(() => ({ message: null, seq: 0, durationMs: TOAST_MS }));

let timer: ReturnType<typeof setTimeout> | null = null;

/** Shows a message; a newer one replaces it at once and gets its own full time (an older timer never cuts it short). */
export function showGuestToast(message: string, durationMs = TOAST_MS) {
  if (timer) clearTimeout(timer);
  useGuestToast.setState((s) => ({ message, seq: s.seq + 1, durationMs }));
  timer = setTimeout(() => { timer = null; useGuestToast.setState({ message: null }); }, durationMs);
}
