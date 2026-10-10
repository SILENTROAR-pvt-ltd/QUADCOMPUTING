// Matching agent: proposes which photo shows which dish, then a verifier checks every proposal before
// anything is written. The agent only proposes; the verifier decides. Batched, so cost stays low.
import type { GenerateJson } from './vault-describe';

export interface DishRef { id: string; name: string; category: string }
export interface PhotoRef { id: string; title: string; description: string; tags: string[] }
export interface Proposal { item_id: string; photo_id: string; confidence: 'high' | 'medium' | 'low'; reason: string }
export interface Verdict { accepted: Proposal[]; rejected: { proposal: Proposal; why: string }[] }

export const DISHES_PER_CALL = 40;

export const MATCH_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      item_id: { type: 'string' },
      photo_id: { type: 'string' },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      reason: { type: 'string' },
    },
    required: ['item_id', 'photo_id', 'confidence', 'reason'],
  },
};

export function buildMatchPrompt(dishes: DishRef[], photos: PhotoRef[]): string {
  return [
    'You match restaurant menu dishes to photos.',
    'Propose a pair only when the photo clearly shows that exact dish. Never pair a dish with a photo of a different dish.',
    'Use confidence "high" only for a clear match; otherwise "medium" or "low". Give a short reason.',
    'Use only the ids given. Return an empty list when nothing matches.',
    '',
    'DISHES: ' + JSON.stringify(dishes.map((d) => ({ id: d.id, name: d.name, category: d.category }))),
    'PHOTOS: ' + JSON.stringify(photos.map((p) => ({ id: p.id, title: p.title, description: p.description, tags: p.tags }))),
  ].join('\n');
}

/** The model's proposals, or null when the answer is not a list of the expected shape. */
export function parseProposals(raw: string): Proposal[] | null {
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return null; }
  if (!Array.isArray(data)) return null;
  return data
    .filter((p: any) => p && typeof p.item_id === 'string' && typeof p.photo_id === 'string')
    .map((p: any) => ({
      item_id: p.item_id,
      photo_id: p.photo_id,
      confidence: ['high', 'medium', 'low'].includes(p.confidence) ? p.confidence : 'low',
      reason: typeof p.reason === 'string' ? p.reason.trim().slice(0, 200) : '',
    }));
}

/** The verifier: checks every proposal against the real dishes and photos. Nothing unverified gets through. */
export function verifyProposals(proposals: Proposal[], dishes: DishRef[], photos: PhotoRef[]): Verdict {
  const dishIds = new Set(dishes.map((d) => d.id));
  const photoIds = new Set(photos.map((p) => p.id));
  const usedDish = new Set<string>();
  const usedPhoto = new Set<string>();
  const accepted: Proposal[] = [];
  const rejected: Verdict['rejected'] = [];
  for (const p of proposals) {
    const why =
      !dishIds.has(p.item_id) ? 'unknown dish' :
      !photoIds.has(p.photo_id) ? 'unknown photo' :
      p.confidence !== 'high' ? `confidence is ${p.confidence}` :
      !p.reason ? 'no reason given' :
      usedDish.has(p.item_id) ? 'dish already matched' :
      usedPhoto.has(p.photo_id) ? 'photo already used for another dish' :
      null;
    if (why) { rejected.push({ proposal: p, why }); continue; }
    usedDish.add(p.item_id);
    usedPhoto.add(p.photo_id);
    accepted.push(p);
  }
  return { accepted, rejected };
}

/** Runs the agent in batches of dishes, verifying each batch. Returns the verified pairs and the rejects. */
export async function agentMatch(dishes: DishRef[], photos: PhotoRef[], generate: GenerateJson): Promise<Verdict> {
  const total: Verdict = { accepted: [], rejected: [] };
  if (dishes.length === 0 || photos.length === 0) return total;
  const takenPhotos = new Set<string>();
  for (let i = 0; i < dishes.length; i += DISHES_PER_CALL) {
    const batch = dishes.slice(i, i + DISHES_PER_CALL);
    const available = photos.filter((p) => !takenPhotos.has(p.id));
    if (available.length === 0) break;
    const raw = await generate({ prompt: buildMatchPrompt(batch, available), imageBase64: '', mimeType: '', schema: MATCH_SCHEMA });
    const proposals = parseProposals(raw) ?? [];
    const verdict = verifyProposals(proposals, batch, available);
    for (const a of verdict.accepted) { takenPhotos.add(a.photo_id); total.accepted.push(a); }
    total.rejected.push(...verdict.rejected);
  }
  return total;
}
