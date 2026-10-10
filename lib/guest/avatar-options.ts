// A guest's picture: either one of these emoji avatars, or an uploaded photo.
// Shared by the browser and the server (no server-only imports).

export const AVATAR_OPTIONS = [
  '☕', '🧳', '🎒', '🍛', '🌶️', '🍜', '🍕', '🏔️',
  '🌴', '🚗', '🛵', '🎧', '📸', '🦊', '🐼', '🌟',
] as const;

export type AvatarOption = (typeof AVATAR_OPTIONS)[number];

export function isAvatarOption(value: unknown): value is AvatarOption {
  return typeof value === 'string' && (AVATAR_OPTIONS as readonly string[]).includes(value);
}

/** Photos are resized in the browser to a square of this size before upload. */
export const PHOTO_SIZE_PX = 256;
/** The largest photo the server accepts after resizing. */
export const PHOTO_MAX_BYTES = 300 * 1024;

export const PHOTO_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type PhotoType = keyof typeof PHOTO_TYPES;

export function isPhotoType(value: unknown): value is PhotoType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PHOTO_TYPES, value);
}
