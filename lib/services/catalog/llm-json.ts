// The one place the catalog pipeline talks to a language model. Uses the OpenAI-compatible chat API,
// which free providers offer (OpenRouter, Groq). Configure with environment variables, not code:
//   LLM_API_KEY       the provider key (free tier)
//   LLM_BASE_URL      default https://openrouter.ai/api/v1  (Groq: https://api.groq.com/openai/v1)
//   LLM_VISION_MODEL  model for reading photos   (default openrouter/free, which routes to a free model)
//   LLM_TEXT_MODEL    model for matching         (default openrouter/free)
import type { GenerateJson } from './vault-describe';

const DEFAULT_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'openrouter/free';

export function llmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY?.trim());
}

/** The first JSON value in a model's reply. Models often wrap JSON in prose or code fences. */
export function extractJson(text: string): string | null {
  const cleaned = text.replace(/```(?:json)?/gi, '');
  const start = cleaned.search(/[\[{]/);
  if (start < 0) return null;
  const open = cleaned[start];
  const close = open === '[' ? ']' : '}';
  const end = cleaned.lastIndexOf(close);
  if (end <= start) return null;
  const candidate = cleaned.slice(start, end + 1);
  try { JSON.parse(candidate); return candidate; } catch { return null; }
}

/** Sends a prompt (and optionally one image) and returns the JSON the model answered with. */
export const generateJson: GenerateJson = async ({ prompt, imageBase64, mimeType, schema }) => {
  const key = process.env.LLM_API_KEY?.trim();
  if (!key) throw new Error('No language model is configured (LLM_API_KEY is not set).');
  const base = (process.env.LLM_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, '');
  const model = (imageBase64 ? process.env.LLM_VISION_MODEL : process.env.LLM_TEXT_MODEL)?.trim() || DEFAULT_MODEL;

  const content: any[] = [{ type: 'text', text: `${prompt}\n\nReply with JSON only, matching this schema: ${JSON.stringify(schema)}` }];
  if (imageBase64) content.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } });

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature: 0, max_tokens: 900, messages: [{ role: 'user', content }] }),
    cache: 'no-store',
  } as RequestInit);
  if (!res.ok) throw new Error(`The language model is unavailable (${res.status}).`);
  const json: any = await res.json();
  const text: string = json?.choices?.[0]?.message?.content || '';
  const jsonText = extractJson(text);
  if (!jsonText) throw new Error('The model did not return JSON.');
  return jsonText;
};
