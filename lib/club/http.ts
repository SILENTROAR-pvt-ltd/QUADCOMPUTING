import { NextResponse } from 'next/server';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

// Small response helpers shared by every /api/club route. Nothing here is cached.
export const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Errors that come from a Club table or function that is not created yet. */
const MISSING = new Set(['42P01', '42703', '42883', 'PGRST202', 'PGRST204', 'PGRST205']);

export class ClubError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export function fail(status: number, error: string, code?: string): never {
  throw new ClubError(status, error, code);
}

export function ok(body: Record<string, unknown> = {}, init: ResponseInit = {}) {
  return NextResponse.json({ success: true, ...body }, { ...init, headers: { ...NO_STORE, ...(init.headers || {}) } });
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof ClubError) {
    return NextResponse.json({ success: false, error: e.message, code: e.code }, { status: e.status, headers: NO_STORE });
  }
  if (MISSING.has((e as any)?.code)) {
    return NextResponse.json(
      { success: false, error: 'Vibers Club is not set up yet. Apply the Club migrations (20261011000001–20261012000006), or paste supabase/club_setup_all.sql.', code: 'not_ready' },
      { status: 503, headers: NO_STORE },
    );
  }
  throw e;
}

/** Runs a Club handler: known errors become JSON responses, anything else goes to the error boundary. */
export function clubApi(label: string, handler: (request: Request, ctx: any) => Promise<Response>) {
  return withApiErrorBoundary(async (request: Request, ctx: any) => {
    try {
      return await handler(request, ctx);
    } catch (e) {
      return errorResponse(e);
    }
  }, `Club:${label}`);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A uuid route parameter, or a 404 for anything else. */
export async function idParam(ctx: any, name = 'id'): Promise<string> {
  const params = await ctx?.params;
  const value = String(params?.[name] ?? '');
  if (!UUID.test(value)) fail(404, 'Not found.');
  return value;
}

export function query(request: Request): URLSearchParams {
  return new URL(request.url).searchParams;
}

export async function readBody(request: Request): Promise<Record<string, any>> {
  const body = await request.json().catch(() => null);
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
}

/** Throws a database error so the route returns a clean response; otherwise the row(s). */
export function must(res: { data: any; error: any }): any {
  if (res.error) throw res.error;
  return res.data;
}
