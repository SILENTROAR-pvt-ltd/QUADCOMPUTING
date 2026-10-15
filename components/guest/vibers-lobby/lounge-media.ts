/**
 * The photographs in the Vibers Lobby. Small WebP files served as plain static files (public/media/lounge): nothing is stored in
 * or fetched from the database, and the long cache means a guest downloads each once. File names carry a version.
 */
export const LOUNGE_MEDIA = {
  /** Friends at the cafe, 960x540. The hero. */
  hero: '/media/lounge/lounge-hero-v1.webp',
  /** A toast across the table, 300x375. */
  toast: '/media/lounge/lounge-toast-v1.webp',
  /** Guests photographing a paella, 300x375. */
  feast: '/media/lounge/lounge-feast-v1.webp',
  /** A flat lay of breakfast being photographed, 640x480. */
  flatlay: '/media/lounge/lounge-flatlay-v1.webp',
} as const;

/** The colour each photo is mostly made of, painted behind it so the box is never blank while it loads. */
export const LOUNGE_TINT = {
  hero: '#3b3a37',
  toast: '#8a7d68',
  feast: '#b8b6ae',
  flatlay: '#3a2a20',
} as const;
