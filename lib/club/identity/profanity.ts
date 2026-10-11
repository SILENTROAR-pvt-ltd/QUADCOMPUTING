// The Red Flag Protocol's first line: a small, deliberate word list (English and Hinglish), matched
// after undoing common disguises (l33t digits, symbols, stretched letters, spacing).
//
// WHOLE words count only on their own ("dick" but not "Dickens"). EMBEDDED words are distinctive
// enough to count inside anything ("xfuckx", "f.u.c.k"). Words like "rapist" stay whole-only so
// "therapist" is never flagged.
const WHOLE = new Set([
  'fuck', 'fuk', 'shit', 'bitch', 'cunt', 'dick', 'asshole', 'bastard', 'slut', 'whore', 'pussy', 'cock',
  'motherfucker', 'nigger', 'nigga', 'faggot', 'retard', 'rapist',
  'chutiya', 'chutia', 'madarchod', 'bhenchod', 'behenchod', 'bhosdi', 'bhosdike', 'gaand', 'gandu',
  'randi', 'lund', 'lauda', 'loda', 'harami', 'chod',
]);
const EMBEDDED = ['fuck', 'motherfucker', 'madarchod', 'bhenchod', 'behenchod', 'bhosdi', 'chutiya', 'chutia', 'nigger', 'faggot', 'asshole'];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };

function undisguise(text: string): string {
  return text.toLowerCase().replace(/[013457@$!]/g, (c) => LEET[c] ?? c).replace(/([a-z])\1{2,}/g, '$1');
}

const squash = (text: string) => undisguise(text).replace(/[^a-z]/g, '');
const isBad = (word: string) => WHOLE.has(word) || EMBEDDED.some((bad) => word.includes(bad));

export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const words = undisguise(text).split(/[^a-z]+/).filter(Boolean);
  if (words.some(isBad)) return true;
  const joined = squash(text);
  return EMBEDDED.some((bad) => joined.includes(bad));
}

/** Chat and captions: offending words are starred out instead of refusing the whole message. */
export function maskProfanity(text: string): string {
  return text.replace(/[A-Za-z0-9À-ɏ@$!]+/g, (token) =>
    isBad(squash(token)) ? token[0] + '*'.repeat(Math.max(1, token.length - 1)) : token,
  );
}
