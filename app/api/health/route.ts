import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const DB_TIMEOUT_MS = 3000;

// Post-deploy health check. Public, so it reports only coarse states, never configuration values.
// 200 = serving normally, 503 = a dependency the app cannot work without is down or missing.
export async function GET() {
  const checks: Record<string, 'ok' | 'fail' | 'degraded'> = {};

  checks.config = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'ok' : 'fail';

  if (checks.config === 'ok') {
    try {
      const probe = adminDb().from('businesses').select('id', { head: true, count: 'exact' }).limit(1);
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), DB_TIMEOUT_MS));
      const { error } = (await Promise.race([probe, timeout])) as { error: unknown };
      checks.database = error ? 'fail' : 'ok';
    } catch {
      checks.database = 'fail';
    }
  } else {
    checks.database = 'fail';
  }

  // Without Redis, rate limits are per-instance: the app works, but limits are weaker.
  checks.rateLimiter = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? 'ok' : 'degraded';

  const healthy = checks.config === 'ok' && checks.database === 'ok';
  return NextResponse.json(
    {
      status: healthy ? (checks.rateLimiter === 'ok' ? 'ok' : 'degraded') : 'fail',
      checks,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
