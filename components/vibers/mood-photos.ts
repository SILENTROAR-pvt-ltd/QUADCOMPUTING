// Mood photography for the Vibers Connect page (Unsplash CDN, which permits hotlinking; the same ids Vibers Club checked
// to load): stays, journeys and people together. No place is claimed for any of them. Plain data, so server sections
// can read it (a 'use client' module only hands server code a reference, not its values).

/** A sized, cropped, compressed Unsplash URL. */
export const unsplash = (id: string, width = 1400) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=72`;

export const MOOD = {
  stay: ['1566073771259-6a8506099945', '1520250497591-112f2f40a3f4', '1582719478250-c89cae4dc85b', '1571896349842-33c89424de2d'],
  journey: ['1506905925346-21bda4d32df4', '1476514525535-07fb3b4ae5f1', '1500530855697-b586d89ba3ee'],
  people: ['1529156069898-49953e39b3ac', '1517457373958-b7bdd4587205'],
} as const;
