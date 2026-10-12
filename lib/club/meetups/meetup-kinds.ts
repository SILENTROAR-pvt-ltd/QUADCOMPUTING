// Instant meetups: what kinds there are and the limits on them. Pure, so the server and the screens agree.
export const MEETUP_KINDS = [
  { key: 'coffee', label: 'Coffee & chai' },
  { key: 'food', label: 'Food' },
  { key: 'walk', label: 'Walk-around' },
  { key: 'party', label: 'Party' },
  { key: 'music', label: 'Music' },
  { key: 'sports', label: 'Sports & games' },
  { key: 'dev', label: 'Developer meet' },
  { key: 'creative', label: 'Creative' },
  { key: 'wellness', label: 'Wellness' },
  { key: 'together', label: 'Get-together' },
] as const;

export type MeetupKind = (typeof MEETUP_KINDS)[number]['key'];
export const MEETUP_KEYS: readonly string[] = MEETUP_KINDS.map((k) => k.key);
export const meetupLabel = (key: string) => MEETUP_KINDS.find((k) => k.key === key)?.label ?? 'Meetup';

/** How long a meetup can last, in hours, and how far ahead it can be posted. */
export const MEETUP_HOURS = [1, 2, 3, 6, 12] as const;
export const MAX_MEETUP_HOURS = 12;
export const MAX_AHEAD_DAYS = 14;
/** A member can have this many live or upcoming meetups at once. */
export const MAX_OPEN_MEETUPS = 3;
