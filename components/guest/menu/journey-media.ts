/**
 * The chef stickers on the "Pick dishes / Send to kitchen / Track & pay" cards. Small transparent WebP files served as plain
 * static files (public/media/stickers): nothing is stored in or fetched from the database, and the long cache means a guest
 * downloads each one once. The names carry a version, so a changed picture gets a new name.
 */
export const JOURNEY_STICKERS = [
  '/media/stickers/chef-pick-v1.webp',
  '/media/stickers/chef-send-v1.webp',
  '/media/stickers/chef-track-v1.webp',
] as const;
