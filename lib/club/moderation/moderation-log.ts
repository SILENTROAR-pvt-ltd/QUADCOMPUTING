import { must } from '../http';

export interface ModerationEntry {
  actorId: string;
  action: string;
  targetUserId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  note?: string | null;
}

/** Append-only audit trail of every staff decision. */
export async function logModeration(db: any, e: ModerationEntry) {
  must(await db.from('club_moderation_log').insert({
    actor_id: e.actorId, action: e.action, target_user_id: e.targetUserId ?? null,
    target_type: e.targetType ?? null, target_id: e.targetId ?? null, note: e.note ?? null,
  }));
}
