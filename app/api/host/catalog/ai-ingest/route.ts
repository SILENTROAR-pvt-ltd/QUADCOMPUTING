import { safeMessage } from '@/lib/utils/safe-message';
import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { checkRateLimit, rateLimitResponse } from '@/lib/middleware/rate-limiter';
import { generateJson, llmConfigured } from '@/lib/services/catalog/llm-json';

const MENU_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'The name of the food, beverage, or service item.' },
      category: { type: 'string', description: 'The printed category, e.g. Starters, Main Course, Beverages.' },
      item_type: { type: 'string', enum: ['food', 'room', 'service'], description: "Use 'food' for all food and beverages." },
      price: { type: 'number', description: 'The price as a number. Use 0 when no price is printed.' },
      description: { type: 'string', description: 'A brief description. Do not include the price.' },
      stock: { type: 'integer', description: 'Always 50.' },
    },
    required: ['name', 'category', 'item_type', 'price', 'description', 'stock'],
  },
};

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;

    const { image, mimeType } = await request.json();
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }
    // base64 length; ~6 MB of image data.
    if (image.length > 8_000_000) {
      return NextResponse.json({ error: 'Image too large. Please upload a photo under 6 MB.' }, { status: 413 });
    }

    const limit = await checkRateLimit({ key: `ratelimit:ai_ingest:${auth.businessId}`, limit: 10, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) {
      return rateLimitResponse(limit, 'Menu scan limit reached (10 per hour). Please try again later.');
    }
    if (!llmConfigured()) {
      return NextResponse.json({ error: 'Menu scan is not configured: LLM_API_KEY is not set.' }, { status: 500 });
    }

    const text = await generateJson({
      prompt: 'Extract every item from this menu card as a JSON array.',
      imageBase64: image,
      mimeType: mimeType || 'image/jpeg',
      schema: MENU_SCHEMA,
    });
    const items = JSON.parse(text);
    if (!Array.isArray(items)) throw new Error('The model did not return a list of items.');
    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('AI Ingest Error:', error);
    return NextResponse.json({ error: safeMessage(error, 'Internal Server Error') }, { status: 500 });
  }
}, 'HostCatalogAiIngestPOST');
