// Small pure helpers for how the menu greets a guest. Kept apart from the components so they are tested directly.

/** "Good morning" from five until noon, "Good afternoon" until five, "Good evening" after (and late at night). */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** The guest's name for the greeting: nothing for the default "Guest", the first word when a full name is long. */
export function greetingName(name: string | undefined | null): string {
  const n = (name ?? '').trim();
  if (!n || n.toLowerCase() === 'guest') return '';
  return n.length > 18 ? n.split(/\s+/)[0] : n;
}

/** Initials for an avatar: "Bombay Rasoi" → "BR", "harshit" → "H", "@vibe" → "V". */
export function initialsOf(name: string | undefined | null): string {
  const words = (name ?? '').replace(/^@/, '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '·';
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0][0]).toUpperCase();
}
