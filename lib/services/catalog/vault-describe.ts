// Reads a dish photo with a vision model: which dishes it shows, and tags for matching.
// One call per photo, at ingest time. The model call is injected, so the parsing rules are tested
// without a network. Parsing is strict: anything malformed is rejected, not guessed.

export interface PhotoReading {
  title: string;
  dish_names: string[];
  tags: string[];
  description: string;
  is_food: boolean;
}

export type GenerateJson = (args: { prompt: string; imageBase64: string; mimeType: string; schema: object }) => Promise<string>;

export const PHOTO_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short name of the main dish or drink shown, e.g. "Misal Pav".' },
    dish_names: { type: 'array', items: { type: 'string' }, description: 'Every dish or drink name visible or clearly implied.' },
    tags: { type: 'array', items: { type: 'string' }, description: 'Up to 8 plain words describing the food (ingredients, style).' },
    description: { type: 'string', description: 'One sentence describing the photo.' },
    is_food: { type: 'boolean', description: 'True when the photo shows food or drink.' },
  },
  required: ['title', 'dish_names', 'tags', 'description', 'is_food'],
};

const PROMPT = 'You label photos for a restaurant menu. Name only dishes or drinks you can actually see. ' +
  'If the photo is not food or drink, set is_food to false and leave the names empty.';

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const list = (v: unknown, max: number, count: number) =>
  (Array.isArray(v) ? v.map((x) => clean(x, max)).filter(Boolean) : []).slice(0, count);

/** Parses the model's JSON. Returns null when it is not the shape we asked for. */
export function parseReading(raw: string): PhotoReading | null {
  let data: any;
  try { data = JSON.parse(raw); } catch { return null; }
  if (!data || typeof data !== 'object' || typeof data.is_food !== 'boolean') return null;
  return {
    title: clean(data.title, 80),
    dish_names: list(data.dish_names, 80, 8),
    tags: list(data.tags, 40, 8),
    description: clean(data.description, 240),
    is_food: data.is_food,
  };
}

export async function describePhoto(generate: GenerateJson, imageBase64: string, mimeType: string): Promise<PhotoReading | null> {
  const raw = await generate({ prompt: PROMPT, imageBase64, mimeType, schema: PHOTO_SCHEMA });
  return parseReading(raw);
}
