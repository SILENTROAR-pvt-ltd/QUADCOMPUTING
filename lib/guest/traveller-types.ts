// How a guest describes themselves: a traveller type and a one-line intro.
// Shared by the browser and the server, so it has no server-only imports.

export const TRAVELLER_TYPES = [
  { id: 'solo', label: 'Solo traveller', emoji: '🧳', hint: 'Going it alone and meeting people along the way' },
  { id: 'backpacker', label: 'Backpacker', emoji: '🎒', hint: 'Budget-smart, always hunting the next great plate' },
  { id: 'family', label: 'Family trip', emoji: '👨‍👩‍👧', hint: 'Feeding the whole crew, kids included' },
  { id: 'couple', label: 'Couple', emoji: '💑', hint: 'Slow dinners and a table for two' },
  { id: 'business', label: 'Business traveller', emoji: '💼', hint: 'Between meetings, between flights' },
  { id: 'foodie', label: 'Food explorer', emoji: '🍛', hint: 'Tasting my way through the menu' },
  { id: 'group', label: 'Group of friends', emoji: '🎉', hint: 'The more the merrier, bring the bill to the table' },
  { id: 'local', label: 'Local regular', emoji: '📍', hint: 'Here most weeks, know the staff by name' },
] as const;

export type TravellerTypeId = (typeof TRAVELLER_TYPES)[number]['id'];

export const INTRO_MAX = 80;

export function isTravellerType(value: unknown): value is TravellerTypeId {
  return typeof value === 'string' && TRAVELLER_TYPES.some((t) => t.id === value);
}

export function travellerTypeInfo(id: string | null | undefined) {
  return TRAVELLER_TYPES.find((t) => t.id === id) ?? null;
}

/**
 * A guest's intro: plain text, one line, at most INTRO_MAX characters. Angle brackets and control
 * characters are removed, runs of spaces are collapsed, and an empty result means no intro.
 */
export function normalizeIntro(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, INTRO_MAX)
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}
