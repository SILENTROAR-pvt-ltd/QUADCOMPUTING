import { describe, it, expect, vi, afterEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { extractJson, generateJson, llmConfigured } from '@/lib/services/catalog/llm-json';
import { ingestDishPhotos } from '@/lib/services/catalog/vault-ingest';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.LLM_API_KEY;
  delete process.env.LLM_BASE_URL;
  delete process.env.LLM_VISION_MODEL;
  delete process.env.LLM_TEXT_MODEL;
});

const reply = (content: string) => ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) });

describe('The free language model client', () => {
  it('finds the JSON inside prose and code fences', () => {
    expect(extractJson('Sure! ```json\n{"a": 1}\n``` done')).toBe('{"a": 1}');
    expect(extractJson('Here: [{"item_id":"x"}] thanks')).toBe('[{"item_id":"x"}]');
    expect(extractJson('no json here')).toBeNull();
    expect(extractJson('{broken')).toBeNull();
  });

  it('is off until a key is set', async () => {
    expect(llmConfigured()).toBe(false);
    await expect(generateJson({ prompt: 'x', imageBase64: '', mimeType: '', schema: {} })).rejects.toThrow(/LLM_API_KEY/);
  });

  it('sends one OpenAI-compatible request, with the image as a data URL, to the configured model', async () => {
    process.env.LLM_API_KEY = 'free-key';
    process.env.LLM_BASE_URL = 'https://api.groq.com/openai/v1/';
    process.env.LLM_VISION_MODEL = 'vision-model';
    const fetchSpy = vi.fn(async () => reply('{"title":"Misal Pav","is_food":true}'));
    vi.stubGlobal('fetch', fetchSpy);
    const out = await generateJson({ prompt: 'Describe.', imageBase64: 'QUJD', mimeType: 'image/png', schema: { type: 'object' } });
    expect(JSON.parse(out).title).toBe('Misal Pav');
    const [url, init] = fetchSpy.mock.calls[0] as any;
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('vision-model');
    expect(body.messages[0].content[1]).toEqual({ type: 'image_url', image_url: { url: 'data:image/png;base64,QUJD' } });
    expect(init.headers.Authorization).toBe('Bearer free-key');
  });

  it('uses the text model when there is no image, and fails clearly on a bad reply', async () => {
    process.env.LLM_API_KEY = 'free-key';
    process.env.LLM_TEXT_MODEL = 'text-model';
    const fetchSpy = vi.fn(async () => reply('just words, no json'));
    vi.stubGlobal('fetch', fetchSpy);
    await expect(generateJson({ prompt: 'Match.', imageBase64: '', mimeType: '', schema: {} })).rejects.toThrow(/did not return JSON/);
    expect(JSON.parse((fetchSpy.mock.calls[0] as any)[1].body).model).toBe('text-model');
  });

  it('reports a provider outage without leaking the key', async () => {
    process.env.LLM_API_KEY = 'free-key';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) })));
    const err = await generateJson({ prompt: 'x', imageBase64: '', mimeType: '', schema: {} }).catch((e) => e);
    expect(err.message).toMatch(/unavailable \(429\)/);
    expect(err.message).not.toMatch(/free-key/);
  });
});

describe('Ingest keeps the photo when the free model cannot read it', () => {
  it('stores the photo with its file-name title and says why', async () => {
    const db = createFakeSupabase({ venue_photo_vault: [] });
    const rows = await ingestDishPhotos(db, BIZ, [{ filename: 'misal-pav.png', mimeType: 'image/png', base64: 'aGk=' }], {
      generate: async () => { throw new Error('The language model is unavailable (429).'); },
      upload: async (p) => `https://store/${p}`,
    });
    expect(rows[0]).toMatchObject({ status: 'added', title: 'misal pav' });
    expect(rows[0]?.note).toMatch(/file name/);
    expect(db.tables.venue_photo_vault).toHaveLength(1);
  });
});
