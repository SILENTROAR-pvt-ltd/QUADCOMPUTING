// Guest words and dish names reduced to comparable tokens. Hinglish words map to one canonical English word on both
// sides (chai and tea are the same token), and a typo still matches. Pure functions; the resolver is built on these.

const ALIAS_GROUPS: Record<string, string[]> = {
  tea: ['chai', 'chay', 'chaay', 'chaai'],
  coffee: ['coffe', 'cofee', 'kofi', 'kaafi', 'kafi'],
  cold: ['thanda', 'thandi', 'thande', 'chilled', 'iced'],
  hot: ['garam', 'garma'],
  sugar: ['cheeni', 'chini', 'shakkar'],
  milk: ['doodh', 'dudh'],
  water: ['pani', 'paani'],
  lime: ['nimbu', 'lemon', 'limbu'],
  potato: ['aloo', 'alu'],
  cauliflower: ['gobi', 'gobhi'],
  onion: ['pyaz', 'pyaaz', 'kanda'],
  chilli: ['mirchi', 'chili', 'chilly'],
  chicken: ['murg', 'murgh'],
  egg: ['anda', 'ande'],
  curd: ['dahi'],
  butter: ['makhan', 'makkhan'],
  rice: ['chawal'],
  cheese: ['cheez'],
  paneer: ['panir'],
  ginger: ['adrak'],
  cardamom: ['elaichi', 'ilaichi'],
  mint: ['pudina'],
  sweet: ['meetha', 'mitha', 'meethi', 'meethe'],
  without: ['bina', 'no'],
  less: ['kam', 'thoda'],
  extra: ['zyada', 'jyada', 'jada'],
};

const ALIAS = new Map<string, string>();
for (const [canonical, words] of Object.entries(ALIAS_GROUPS)) for (const w of words) ALIAS.set(w, canonical);

export const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, chhah: 6, saat: 7, aath: 8, nau: 9, das: 10,
};

/** Words that never name a dish: requests, politeness, fillers in English and Hinglish. */
export const FILLER = new Set([
  'the', 'please', 'pls', 'plz', 'bhai', 'bhaiya', 'bro', 'dena', 'de', 'dedo', 'dijiye', 'do', 'and', 'aur', 'with', 'mujhe',
  'hume', 'humein', 'chahiye', 'want', 'wanna', 'i', 'id', 'we', 'me', 'us', 'give', 'get', 'add', 'can', 'could', 'have',
  'some', 'of', 'for', 'kar', 'karo', 'kardo', 'lao', 'laao', 'le', 'lena', 'also', 'bhi', 'more', 'another', 'like', 'would',
  'order', 'my', 'to', 'tray', 'cart', 'just', 'only', 'ok', 'okay', 'hai', 'ho', 'wala', 'wali', 'wale', 'ki', 'ka', 'ke',
  'one', 'a', 'an', 'x', 'pcs', 'pc', 'piece', 'pieces', 'plate', 'plates', 'cup', 'cups', 'glass', 'glasses', 'bottle',
  'yaar', 'yar', 'jaldi', 'bhej', 'bhejo', 'bhejna', 'abhi', 'zara', 'sir', 'madam', 'boss', 'mere', 'liye', 'hum', 'ko', 'se',
  'na', 'ji', 'quickly', 'fast', 'now', 'kindly',
]);

const NOT_WORD = new RegExp('[^\\p{L}\\p{N}\\s]', 'gu');

/** Lower case, accents and punctuation gone, single spaces. Keeps digits and letters of any script. */
export function normalise(text: string): string {
  return String(text ?? '')
    .toLowerCase()
    // "non veg" / "non-veg" is one word, so the "veg" inside it never matches a veg dish.
    .replace(/\bnon[\s-]*veg(etarian)?\b/g, 'nonveg')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(NOT_WORD, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const singular = (w: string) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

/** The canonical token for one word: alias first, then a plural trimmed. */
export const canonical = (word: string) => ALIAS.get(word) ?? singular(ALIAS.get(singular(word)) ?? word);

/** Canonical tokens of a phrase, fillers and numbers removed. */
export function dishTokens(text: string): string[] {
  return normalise(text).split(' ').filter((w) => w && !FILLER.has(w) && !(w in NUMBER_WORDS) && !/^\d+$/.test(w)).map(canonical);
}

/** Every canonical token of a phrase, nothing removed (for grounding checks). */
export const allTokens = (text: string) => normalise(text).split(' ').filter(Boolean).map(canonical);

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= b.length; j += 1) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** Hinglish spellings of one sound folded together: jamoon/jamun, paneer/panir, chaawal/chawal, coffee/cofee. */
const fold = (w: string) => w.replace(/oo/g, 'u').replace(/ee/g, 'i').replace(/aa/g, 'a').replace(/(.)\1+/g, '$1').replace(/(?<=[^aeiou])h/g, '');

/**
 * How well a typed token matches a known one: 1 equal, 0.9 a typo or spelling variant, 0.85 when the typed token is a
 * long-enough start of the known one ("cappu" for cappuccino), else 0. Only that direction: "cheesecake" is not "cheese".
 */
export function tokenMatch(typed: string, known: string): number {
  if (typed === known) return 1;
  if (typed.length >= 4 && known.length >= 4 && fold(typed) === fold(known)) return 0.9;
  const short = Math.min(typed.length, known.length);
  if (short >= 4) {
    const d = editDistance(typed, known);
    // On four-letter words a swapped letter is another word (time/lime, cake/coke); a missing letter is a typo (lasi).
    if ((d === 1 && (short >= 5 || typed.length !== known.length)) || (short >= 7 && d === 2)) return 0.9;
    if (known.startsWith(typed)) return 0.85;
  }
  return 0;
}

/** The best match of a typed `token` against any known token in `pool`. */
export const bestMatch = (token: string, pool: string[]) => pool.reduce((best, p) => Math.max(best, tokenMatch(token, p)), 0);

/** The best match of a known token against any typed token in `typed`. */
export const bestTypedMatch = (known: string, typed: string[]) => typed.reduce((best, t) => Math.max(best, tokenMatch(t, known)), 0);
