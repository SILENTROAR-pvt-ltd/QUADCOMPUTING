import { adminDb } from '@/lib/supabase/admin';
import { clubApi, ok, query } from '@/lib/club/http';
import { requireMember } from '@/lib/club/auth';
import { onlineMembers } from '@/lib/club/presence.service';
import type { Generation } from '@/lib/club/types';

export const dynamic = 'force-dynamic';

const GENERATIONS = new Set(['gen_alpha', 'gen_z', 'millennial', 'gen_x', 'boomer']);

/** GET /api/club/presence?generation=&city=&q= — members online now. */
export const GET = clubApi('Presence', async (request) => {
  const db = adminDb();
  const { user } = await requireMember(db);
  const q = query(request);
  const generation = GENERATIONS.has(q.get('generation') || '') ? (q.get('generation') as Generation) : null;
  const members = await onlineMembers(db, user.id, { generation, city: q.get('city')?.slice(0, 60), q: q.get('q')?.slice(0, 40) });
  return ok({ members });
});
