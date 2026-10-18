'use client';

// Sends one message to Vibey and follows its live steps. Steps are revealed at least STEP_MS apart, so a fast answer
// still reads as calm progress instead of a flash; the reply arrives after the last step is shown.
import type { VibeyGuestReply } from '@/lib/vibey/guest/schema';
import { readSse } from './sse';

const STEP_MS = 180;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const OFFLINE = 'Sorry, Vibey can’t connect right now. You can still order straight from the menu.';

export type AskResult = { ok: true; reply: VibeyGuestReply } | { ok: false; error: string };

export async function askVibey(body: unknown, onStep: (step: string) => void): Promise<AskResult> {
  let res: Response;
  try {
    res = await fetch('/api/guest/vibey', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' }, body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: OFFLINE };
  }
  // Refusals (rate limit, venue off, bad input) come back as plain JSON.
  if (!(res.headers.get('content-type') || '').includes('text/event-stream')) {
    const data: any = await res.json().catch(() => null);
    if (res.ok && data?.reply) return { ok: true, reply: data };
    return { ok: false, error: res.status === 429 || res.status === 403 ? data?.error || OFFLINE : OFFLINE };
  }

  let last = Date.now();
  let chain = Promise.resolve();
  let reply: VibeyGuestReply | null = null;
  let failed: string | null = null;
  const reveal = (step: string) => {
    chain = chain.then(async () => {
      const wait = STEP_MS - (Date.now() - last);
      if (wait > 0) await sleep(wait);
      last = Date.now();
      onStep(step);
    });
  };
  try {
    await readSse(res, (event, data) => {
      if (event === 'step' && typeof data?.step === 'string') reveal(data.step);
      else if (event === 'reply') reply = data;
      else if (event === 'error') failed = data?.error || OFFLINE;
    });
  } catch {
    failed = OFFLINE;
  }
  await chain;
  await sleep(60);
  if (reply) return { ok: true, reply };
  return { ok: false, error: failed || OFFLINE };
}
