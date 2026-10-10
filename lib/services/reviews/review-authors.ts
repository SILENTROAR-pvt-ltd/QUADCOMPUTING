// The profile photo and name of a review's author, read from the account as it is now. Reviews
// written before accounts existed have no author account and keep their typed name.
import { avatarPublicUrl } from '@/lib/services/guest-auth/guest-avatar.service';

export interface ReviewAuthor {
  name: string;
  handle: string;
  avatar: string;
  avatar_url: string | null;
}

export async function loadReviewAuthors(db: any, accountIds: string[]): Promise<Map<string, ReviewAuthor>> {
  const out = new Map<string, ReviewAuthor>();
  const ids = Array.from(new Set(accountIds.filter(Boolean)));
  if (ids.length === 0) return out;

  const { data, error } = await db
    .from('guest_accounts')
    .select('id, handle, display_name, avatar, photo_path')
    .in('id', ids);
  if (error) throw error;

  for (const a of data || []) {
    out.set(a.id, {
      name: a.display_name,
      handle: a.handle,
      avatar: a.avatar || '☕',
      avatar_url: a.photo_path ? avatarPublicUrl(a.photo_path) : null,
    });
  }
  return out;
}
