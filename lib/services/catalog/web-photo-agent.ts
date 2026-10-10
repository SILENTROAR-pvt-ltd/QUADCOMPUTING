// The photo agent for one dish. It reads each candidate as text (title, snippet, site) and picks the single
// most authentic photo of that exact dish. It cannot see the images, so it judges by wording and source.
// A pick is accepted only at high confidence, with a reason, and only from a real candidate.
import type { GenerateJson } from './vault-describe';
import type { DishRef } from './dish-matcher-agent';
import type { StockPhoto } from './stock-providers';

const BLOCKED_SITES = /(^|\.)(shutterstock|gettyimages|istockphoto|freepik|dreamstime|alamy|123rf|depositphotos)\./i;
const MAX_CANDIDATES = 8;

export const PICK_SCHEMA = {
  type: 'object',
  properties: {
    candidate: { type: 'integer', description: 'The number of the best photo, or 0 when no photo clearly shows this dish.' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reason: { type: 'string', description: 'One short sentence on why this photo shows this dish.' },
  },
  required: ['candidate', 'confidence', 'reason'],
};

const siteOf = (c: StockPhoto) => {
  try { return new URL(c.sourceUrl ?? c.url).hostname; } catch { return ''; }
};

function buildPrompt(dish: DishRef, list: StockPhoto[]): string {
  const lines = list.map((c, i) => `${i + 1}. "${c.title}" — site: ${siteOf(c) || 'unknown'}${c.text ? ` — ${c.text.slice(0, 160)}` : ''}`);
  return [
    `Menu item: "${dish.name}"${dish.category ? ` (category: ${dish.category})` : ''}.`,
    'Pick the ONE photo that most authentically shows this exact dish, as a restaurant would serve it: a real photo of the food,',
    'named after this dish, from a restaurant, food or reputable source. Reject graphics, logos, menu cards, people-only photos,',
    'and photos of a different dish.',
    'Photos:',
    ...lines,
    'Reply with JSON only: candidate (the number, or 0 if none clearly shows this dish), confidence (high, medium or low), reason.',
  ].join('\n');
}

export type PickResult = { ok: true; photo: StockPhoto; reason: string } | { ok: false; why: string };

/** Asks the agent for one photo and accepts it only when every check passes. */
export async function pickPhotoFor(dish: DishRef, candidates: StockPhoto[], generate: GenerateJson): Promise<PickResult> {
  const list = candidates.filter((c) => !BLOCKED_SITES.test(siteOf(c))).slice(0, MAX_CANDIDATES);
  if (list.length === 0) return { ok: false, why: 'No usable photos were found.' };

  let verdict: any;
  try {
    verdict = JSON.parse(await generate({ prompt: buildPrompt(dish, list), imageBase64: '', mimeType: '', schema: PICK_SCHEMA }));
  } catch {
    return { ok: false, why: 'The agent did not return a clear answer.' };
  }
  const n = Number(verdict?.candidate);
  if (!Number.isInteger(n) || n < 1 || n > list.length) return { ok: false, why: 'No photo clearly shows this dish.' };
  if (verdict.confidence !== 'high') return { ok: false, why: `The agent was not sure enough (${verdict.confidence}).` };
  const reason = String(verdict.reason ?? '').trim();
  if (!reason) return { ok: false, why: 'The agent gave no reason.' };
  return { ok: true, photo: list[n - 1] as StockPhoto, reason };
}
