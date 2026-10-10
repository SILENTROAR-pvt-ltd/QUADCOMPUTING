import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { AVATAR_OPTIONS, isAvatarOption, isPhotoType, PHOTO_MAX_BYTES } from '@/lib/guest/avatar-options';
import { avatarPublicUrl, clearGuestPhoto, detectPhotoType, saveGuestPhoto, type PhotoStore } from '@/lib/services/guest-auth/guest-avatar.service';
import { updateGuestProfile, summarize, type GuestAccount } from '@/lib/services/guest-auth/guest-account.service';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50]);
const ACCOUNT_ID = 'acc-1';

function store() {
  const files = new Map<string, { bytes: Uint8Array; type: string }>();
  const removed: string[] = [];
  const s: PhotoStore & { files: typeof files; removed: string[] } = {
    files,
    removed,
    async put(path, bytes, type) { files.set(path, { bytes, type }); },
    async remove(paths) { for (const p of paths) { files.delete(p); removed.push(p); } },
  };
  return s;
}

function db(photo: string | null = null) {
  return createFakeSupabase({
    guest_accounts: [{
      id: ACCOUNT_ID, business_id: 'biz', handle: '@asha', display_name: 'Asha', avatar: '☕',
      photo_path: photo, traveller_type: null, intro: null, pin_hash: 'h', pin_salt: 's', failed_attempts: 0, locked_until: null,
    }],
  });
}

const account = (photo: string | null = null): GuestAccount => ({
  id: ACCOUNT_ID, business_id: 'biz', handle: '@asha', display_name: 'Asha', phone: null, avatar: '☕',
  photo_path: photo, traveller_type: null, intro: null, pin_hash: 'h', pin_salt: 's', failed_attempts: 0, locked_until: null,
});

describe('Photo types', () => {
  it('recognises JPEG, PNG and WebP from their bytes', () => {
    expect(detectPhotoType(JPEG)).toBe('image/jpeg');
    expect(detectPhotoType(PNG)).toBe('image/png');
    expect(detectPhotoType(WEBP)).toBe('image/webp');
  });

  it('does not trust a file that only claims to be an image', () => {
    expect(detectPhotoType(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
    expect(detectPhotoType(new Uint8Array([]))).toBeNull();
  });

  it('accepts only the listed content types', () => {
    expect(isPhotoType('image/jpeg')).toBe(true);
    expect(isPhotoType('image/svg+xml')).toBe(false);
    expect(isPhotoType('text/html')).toBe(false);
  });
});

describe('Saving a photo', () => {
  it('stores the photo under the account and points the account at it', async () => {
    const d = db();
    const s = store();
    const res = await saveGuestPhoto(d, s, account(), JPEG, 'image/jpeg');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.photo_path).toMatch(new RegExp(`^${ACCOUNT_ID}/[^/]+\\.jpg$`));
    expect(s.files.has(res.photo_path)).toBe(true);
    expect(d.tables.guest_accounts[0].photo_path).toBe(res.photo_path);
  });

  it('removes the previous photo only after the new one is recorded', async () => {
    const d = db('acc-1/old.jpg');
    const s = store();
    s.files.set('acc-1/old.jpg', { bytes: JPEG, type: 'image/jpeg' });
    const res = await saveGuestPhoto(d, s, account('acc-1/old.jpg'), PNG, 'image/png');
    expect(res.ok && res.replaced).toBe('acc-1/old.jpg');
    expect(s.removed).toContain('acc-1/old.jpg');
  });

  it('refuses a file that is not an image, whatever its declared type', async () => {
    const res = await saveGuestPhoto(db(), store(), account(), new TextEncoder().encode('hello'), 'image/jpeg');
    expect(res).toEqual({ ok: false, status: 415, error: 'Upload a JPEG, PNG or WebP photo.' });
  });

  it('refuses a declared type that does not match the bytes', async () => {
    const res = await saveGuestPhoto(db(), store(), account(), PNG, 'image/jpeg');
    expect(res).toEqual({ ok: false, status: 415, error: 'The photo type does not match the file.' });
  });

  it('refuses an oversized photo and an empty one', async () => {
    const big = new Uint8Array(PHOTO_MAX_BYTES + 1);
    big.set(JPEG, 0);
    expect((await saveGuestPhoto(db(), store(), account(), big, 'image/jpeg')).ok).toBe(false);
    expect((await saveGuestPhoto(db(), store(), account(), new Uint8Array(0), 'image/jpeg')).ok).toBe(false);
  });

  it('removes the new file again if recording it fails, so nothing is orphaned', async () => {
    const d = createFakeSupabase({ guest_accounts: [{ id: ACCOUNT_ID }] }, { failOn: { 'guest_accounts.update': () => true } });
    const s = store();
    await expect(saveGuestPhoto(d, s, account(), JPEG, 'image/jpeg')).rejects.toBeDefined();
    expect(s.files.size).toBe(0);
  });
});

describe('Clearing the photo, and the emoji avatar', () => {
  it('clearing removes the file and the pointer; nothing to clear is a no-op', async () => {
    const d = db('acc-1/a.jpg');
    const s = store();
    s.files.set('acc-1/a.jpg', { bytes: JPEG, type: 'image/jpeg' });
    expect(await clearGuestPhoto(d, s, account('acc-1/a.jpg'))).toBe('acc-1/a.jpg');
    expect(d.tables.guest_accounts[0].photo_path).toBeNull();
    expect(await clearGuestPhoto(d, s, account(null))).toBeNull();
  });

  it('choosing an emoji replaces the photo and reports which file to remove', async () => {
    const d = db('acc-1/a.jpg');
    const res = await updateGuestProfile(d, account('acc-1/a.jpg'), { avatar: '🎒' });
    expect(res.ok && res.account).toMatchObject({ avatar: '🎒', photo_path: null });
    expect(res.ok && res.removed_photo_path).toBe('acc-1/a.jpg');
  });

  it('saving a name alone keeps the photo', async () => {
    const d = db('acc-1/a.jpg');
    const res = await updateGuestProfile(d, account('acc-1/a.jpg'), { name: 'Asha R' });
    expect(res.ok && res.account.photo_path).toBe('acc-1/a.jpg');
    expect(res.ok && res.removed_photo_path).toBeNull();
  });

  it('refuses an emoji that is not in the list', async () => {
    const res = await updateGuestProfile(db(), account(), { avatar: '💩' });
    expect(res).toEqual({ ok: false, status: 400, error: 'Choose an avatar from the list.' });
    expect(isAvatarOption('☕')).toBe(true);
    expect(AVATAR_OPTIONS.length).toBeGreaterThanOrEqual(12);
  });
});

describe('What the browser gets', () => {
  it('gets a public URL for the photo, and nothing when there is no photo', () => {
    const base = 'https://proj.supabase.co';
    expect(avatarPublicUrl('acc-1/a.jpg', base)).toBe('https://proj.supabase.co/storage/v1/object/public/guest-avatars/acc-1/a.jpg');
    expect(avatarPublicUrl('acc-1/a.jpg', '')).toBeNull();
    expect(summarize(account()).avatar_url).toBeNull();
  });
});
