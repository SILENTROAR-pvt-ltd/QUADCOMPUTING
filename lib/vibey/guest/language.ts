// Which language a guest wrote in, so Vibey can answer in it. Read by rules, no model: the writing system first (Hebrew,
// Arabic, Devanagari, Tamil, Cyrillic, Chinese…), then the everyday words of the common Latin-script languages. English
// and Hinglish ("kuch thanda chahiye") are both "en": Vibey's own words are English, and Hinglish guests read them.
import type { GuestRequest, VibeyContext } from './schema';

const SCRIPTS: Array<[RegExp, string]> = [
  [/[֐-׿]/, 'he'], [/[ٹڈڑںھہے]/, 'ur'], [/[؀-ۿ]/, 'ar'],
  [/[ऀ-ॿ]/, 'hi'], [/[ঀ-৿]/, 'bn'], [/[਀-੿]/, 'pa'], [/[઀-૿]/, 'gu'],
  [/[଀-୿]/, 'or'], [/[஀-௿]/, 'ta'], [/[ఀ-౿]/, 'te'], [/[ಀ-೿]/, 'kn'],
  [/[ഀ-ൿ]/, 'ml'], [/[඀-෿]/, 'si'], [/[฀-๿]/, 'th'], [/[Ⴀ-ჿ]/, 'ka'],
  [/[԰-֏]/, 'hy'], [/[Ͱ-Ͽ]/, 'el'], [/[Ѐ-ӿ]/, 'ru'], [/[가-힯]/, 'ko'],
  [/[぀-ヿ]/, 'ja'], [/[一-鿿]/, 'zh'],
];

const WORDS: Record<string, string[]> = {
  en: ['the', 'a', 'an', 'i', 'want', 'please', 'with', 'and', 'what', 'is', 'some', 'can', 'you', 'me', 'have', 'my', 'for', 'to', 'of', 'it', 'something', 'show', 'add', 'how', 'much', 'do', 'any', 'get', 'need', 'would', 'like', 'thanks', 'hi', 'hello',
    'kya', 'hai', 'chahiye', 'kuch', 'aur', 'ek', 'bhai', 'karo', 'dikhao', 'mujhe', 'nahi', 'thanda', 'meetha', 'dedo', 'kar'],
  fr: ['je', 'le', 'les', 'des', 'une', 'est', 'pour', 'avec', 'et', 'vous', 'merci', 'bonjour', 'voudrais', 'du', 'au', 'quelque', 'chose', 'plait', 'avez', 'boire', 'manger'],
  es: ['el', 'los', 'las', 'una', 'para', 'con', 'por', 'quiero', 'gracias', 'hola', 'favor', 'que', 'tienes', 'tiene', 'algo', 'beber', 'comer', 'quisiera', 'cuenta'],
  de: ['ich', 'und', 'die', 'der', 'das', 'ein', 'eine', 'mit', 'bitte', 'danke', 'hallo', 'möchte', 'haben', 'sie', 'etwas', 'trinken', 'essen', 'gibt', 'ist'],
  it: ['il', 'lo', 'gli', 'per', 'vorrei', 'grazie', 'ciao', 'prego', 'che', 'qualcosa', 'bere', 'mangiare', 'avete', 'conto', 'della'],
  pt: ['eu', 'os', 'uma', 'obrigado', 'obrigada', 'olá', 'quero', 'você', 'tem', 'alguma', 'coisa', 'beber', 'comer', 'conta', 'gostaria'],
  nl: ['ik', 'het', 'een', 'met', 'voor', 'alstublieft', 'dank', 'graag', 'wil', 'iets', 'drinken', 'eten', 'rekening'],
  id: ['saya', 'mau', 'dan', 'dengan', 'terima', 'kasih', 'tolong', 'ini', 'itu', 'yang', 'minum', 'makan', 'ada'],
  tr: ['ve', 'bir', 'bu', 'için', 'lütfen', 'teşekkürler', 'merhaba', 'istiyorum', 'hesap', 'içecek'],
};
// Built at run time: the project's TypeScript target rejects the `u` flag in a regex literal.
const NOT_A_LETTER = new RegExp("[^\\p{L}']+", 'u');
const MARKS: Array<[RegExp, string]> = [[/[ñ¿¡]/, 'es'], [/[äöüß]/, 'de'], [/[ãõ]/, 'pt'], [/[ışğ]/, 'tr'], [/[çéèêàù]/, 'fr']];

/** The language of one message, or null when it is too short or mixed to tell ("2 momos"). */
export function detectLang(text: string): string | null {
  for (const [re, code] of SCRIPTS) if (re.test(text)) return code;
  const words = text.toLowerCase().normalize('NFC').split(NOT_A_LETTER).filter(Boolean);
  if (!words.length) return null;
  const score: Record<string, number> = {};
  for (const [code, list] of Object.entries(WORDS)) score[code] = words.filter((w) => list.includes(w)).length;
  for (const [re, code] of MARKS) if (re.test(text)) score[code] = (score[code] ?? 0) + 1;
  const [best, second] = Object.entries(score).sort((a, b) => b[1] - a[1]);
  if (!best || best[1] === 0 || best[1] === second?.[1]) return null;
  if (best[0] !== 'en' && best[1] < 2) return null;
  return best[0];
}

/**
 * The language to answer this turn in: the guest's own words when they tell, else the conversation's language so far. A
 * tapped suggestion is sent in English behind a translated label, so it never switches the language.
 */
export function replyLang(req: Pick<GuestRequest, 'text' | 'chip'> & { context?: VibeyContext }): string {
  const before = req.context?.lang || 'en';
  if (req.chip) return before;
  return detectLang(req.text) ?? before;
}

export const LANG_NAME: Record<string, string> = {
  he: 'Hebrew', ar: 'Arabic', ur: 'Urdu', hi: 'Hindi (Devanagari script)', bn: 'Bengali', pa: 'Punjabi (Gurmukhi)', gu: 'Gujarati',
  or: 'Odia', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam', si: 'Sinhala', th: 'Thai', ka: 'Georgian', hy: 'Armenian',
  el: 'Greek', ru: 'Russian', ko: 'Korean', ja: 'Japanese', zh: 'Chinese (Simplified)', fr: 'French', es: 'Spanish', de: 'German',
  it: 'Italian', pt: 'Portuguese', nl: 'Dutch', id: 'Indonesian', tr: 'Turkish',
};
