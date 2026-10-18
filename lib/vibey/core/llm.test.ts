import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { chatJson, LlmError, reasoningParams } from './llm';

const schema = z.object({ intent: z.enum(['add', 'ask']) });
const reply = (content: string, status = 200) => new Response(JSON.stringify({ choices: [{ message: { content } }], usage: { prompt_tokens: 7, completion_tokens: 3 } }), { status });

describe('vibey llm client', () => {
  beforeEach(() => { process.env.LLM_API_KEY = 'test-key'; process.env.VIBEY_ENABLED = '1'; });
  afterEach(() => { delete process.env.LLM_API_KEY; delete process.env.VIBEY_ENABLED; });

  it('returns schema-checked data and sends JSON mode', async () => {
    const fetchImpl = vi.fn(async () => reply('{"intent":"add"}'));
    const out = await chatJson({ system: 's', user: 'u', schema, model: 'openai/gpt-oss-20b', fetchImpl: fetchImpl as any });
    expect(out.data).toEqual({ intent: 'add' });
    expect(out.usage.tokensIn).toBe(7);
    const body = JSON.parse((fetchImpl.mock.calls[0] as any)[1].body);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.reasoning_effort).toBe('low');
  });

  it('repairs one invalid answer, then gives up', async () => {
    const fixed = vi.fn().mockResolvedValueOnce(reply('{"intent":"order"}')).mockResolvedValueOnce(reply('```json\n{"intent":"ask"}\n```'));
    expect((await chatJson({ system: 's', user: 'u', schema, fetchImpl: fixed as any })).data).toEqual({ intent: 'ask' });
    const broken = vi.fn(async () => reply('not json'));
    await expect(chatJson({ system: 's', user: 'u', schema, fetchImpl: broken as any })).rejects.toMatchObject({ code: 'invalid_output' });
    expect(broken).toHaveBeenCalledTimes(2);
  });

  it('maps provider failures to error codes', async () => {
    await expect(chatJson({ system: 's', user: 'u', schema, fetchImpl: (async () => reply('{}', 429)) as any })).rejects.toMatchObject({ code: 'rate_limited' });
    await expect(chatJson({ system: 's', user: 'u', schema, fetchImpl: (async () => reply('{}', 503)) as any })).rejects.toMatchObject({ code: 'http' });
    const hang = (_: any, init: any) => new Promise<Response>((_r, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('a'), { name: 'AbortError' }))));
    await expect(chatJson({ system: 's', user: 'u', schema, timeoutMs: 300, fetchImpl: hang as any })).rejects.toMatchObject({ code: 'timeout' });
  });

  it('honours the kill switch and a missing key', async () => {
    process.env.VIBEY_ENABLED = '0';
    await expect(chatJson({ system: 's', user: 'u', schema })).rejects.toBeInstanceOf(LlmError);
    process.env.VIBEY_ENABLED = '1';
    delete process.env.LLM_API_KEY;
    await expect(chatJson({ system: 's', user: 'u', schema })).rejects.toMatchObject({ code: 'no_key' });
  });

  it('asks reasoning models for as little thinking as allowed', () => {
    expect(reasoningParams('qwen/qwen3.8-27b')).toEqual({ reasoning_effort: 'none' });
    expect(reasoningParams('some-other-model')).toEqual({});
  });
});
