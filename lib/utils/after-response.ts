import { after } from 'next/server';

/**
 * Runs follow-up work (stock deduction, fee bookkeeping) once the response has gone out, so the till does not wait
 * for it. Inside a request this uses Next's `after`, which the host keeps alive until the work finishes. Outside a
 * request (tests, scripts) it runs at once. A failure is logged and never reaches the caller.
 */
export function afterResponse(label: string, work: () => Promise<unknown>): void {
  const run = () => work().catch((error) => console.error(`[afterResponse:${label}]`, error));
  try {
    after(run);
  } catch {
    void run();
  }
}
