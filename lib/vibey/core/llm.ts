// Vibey's one door to the language model: the configured OpenAI-compatible provider (Groq), JSON mode, a Zod check on
// every answer, one repair retry, a hard timeout and the kill switch. Callers get typed data or an LlmError, never prose.
import type { ZodType } from 'zod';
import { extractJson } from '@/lib/services/catalog/llm-json';

export type LlmErrorCode = 'disabled' | 'no_key' | 'timeout' | 'rate_limited' | 'http' | 'invalid_output';

export class LlmError extends Error {
  constructor(public code: LlmErrorCode, message: string, public status?: number) {
    super(message);
    this.name = 'LlmError';
  }
}

export interface LlmUsage { model: string; ms: number; tokensIn: number; tokensOut: number }

export interface ChatJsonInput<T> {
  system: string;
  user: string;
  schema: ZodType<T>;
  model?: string;
  timeoutMs?: number;
  maxTokens?: number;
  /** For tests and the eval harness. */
  fetchImpl?: typeof fetch;
}

export const vibeyEnabled = () => process.env.VIBEY_ENABLED !== '0';
export const vibeyModelConfigured = () => vibeyEnabled() && Boolean(process.env.LLM_API_KEY?.trim());
/** Chosen by the Phase 0 eval (docs/adr/0004-vibey-model.md); VIBEY_MODEL overrides it. Separate from the catalog's model. */
export const VIBEY_DEFAULT_MODEL = 'qwen/qwen3.8-27b';
export const vibeyModel = () => process.env.VIBEY_MODEL?.trim() || VIBEY_DEFAULT_MODEL;

/** Reasoning models think before answering; Vibey's tasks are small, so it asks for as little thinking as allowed. */
export function reasoningParams(model: string): Record<string, string> {
  if (/gpt-oss/i.test(model)) return { reasoning_effort: 'low' };
  if (/qwen3/i.test(model)) return { reasoning_effort: 'none' };
  return {};
}

async function callOnce(messages: Array<{ role: string; content: string }>, model: string, maxTokens: number, timeoutMs: number, fetchImpl: typeof fetch) {
  const base = (process.env.LLM_BASE_URL?.trim() || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${base}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.LLM_API_KEY?.trim()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, temperature: 0, max_tokens: maxTokens, response_format: { type: 'json_object' }, messages, ...reasoningParams(model),
      }),
      signal: controller.signal,
      cache: 'no-store',
    } as RequestInit);
    if (res.status === 429) throw new LlmError('rate_limited', 'The language model is busy.', 429);
    if (!res.ok) throw new LlmError('http', `The language model answered ${res.status}.`, res.status);
    const json: any = await res.json();
    return {
      text: String(json?.choices?.[0]?.message?.content ?? ''),
      tokensIn: Number(json?.usage?.prompt_tokens) || 0,
      tokensOut: Number(json?.usage?.completion_tokens) || 0,
    };
  } catch (err: any) {
    if (err instanceof LlmError) throw err;
    if (err?.name === 'AbortError') throw new LlmError('timeout', 'The language model took too long.');
    throw new LlmError('http', 'The language model could not be reached.');
  } finally {
    clearTimeout(timer);
  }
}

function parse<T>(text: string, schema: ZodType<T>): { ok: true; data: T } | { ok: false; problem: string } {
  const jsonText = extractJson(text);
  if (!jsonText) return { ok: false, problem: 'The reply was not JSON.' };
  const result = schema.safeParse(JSON.parse(jsonText));
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, problem: result.error.issues.slice(0, 5).map((i) => `${i.path.join('.') || 'root'}: ${i.message}`).join('; ') };
}

/** One structured answer from the model, checked against `schema`. A malformed answer gets one chance to repair itself. */
export async function chatJson<T>(input: ChatJsonInput<T>): Promise<{ data: T; usage: LlmUsage }> {
  if (!vibeyEnabled()) throw new LlmError('disabled', 'Vibey is switched off.');
  if (!process.env.LLM_API_KEY?.trim()) throw new LlmError('no_key', 'No language model is configured.');
  const model = input.model || vibeyModel();
  const fetchImpl = input.fetchImpl ?? fetch;
  const started = Date.now();
  const messages = [{ role: 'system', content: input.system }, { role: 'user', content: input.user }];
  let tokensIn = 0;
  let tokensOut = 0;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const left = (input.timeoutMs ?? 4000) - (Date.now() - started);
    if (left <= 200) throw new LlmError('timeout', 'The language model took too long.');
    const reply = await callOnce(messages, model, input.maxTokens ?? 500, left, fetchImpl);
    tokensIn += reply.tokensIn;
    tokensOut += reply.tokensOut;
    const parsed = parse(reply.text, input.schema);
    if (parsed.ok) return { data: parsed.data, usage: { model, ms: Date.now() - started, tokensIn, tokensOut } };
    messages.push({ role: 'assistant', content: reply.text.slice(0, 2000) });
    messages.push({ role: 'user', content: `That reply was invalid (${parsed.problem}). Answer again with corrected JSON only.` });
  }
  throw new LlmError('invalid_output', 'The language model did not return valid JSON.');
}
