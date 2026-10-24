// Shared by every /api/admin route: the super-admin check (role and, when required, the second factor) and the actor
// written to the admin log. Reads use the service client; the caller has already proved who they are.
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import type { AdminActor } from './admin-audit';

export const NO_STORE = { 'Cache-Control': 'no-store' };

export async function adminGate(request: Request): Promise<{ error: NextResponse } | { error: null; actor: AdminActor }> {
  const auth = await requireAdmin(request);
  if (auth.error) return { error: auth.error };
  return { error: null, actor: { id: auth.adminId as string, email: (auth.user as any)?.email ?? null } };
}

export const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status, headers: NO_STORE });
export const ok = (body: Record<string, unknown>) => NextResponse.json({ success: true, ...body }, { headers: NO_STORE });
