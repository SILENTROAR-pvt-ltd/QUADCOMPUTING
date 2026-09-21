import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            try { cookieStore.set({ name, value, ...options }); } catch (error) {}
          },
          remove(name: string, options: CookieOptions) {
            try { cookieStore.set({ name, value: '', ...options }); } catch (error) {}
          },
        },
      }
    );

    // Enforce auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { image, mimeType } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Initialize Google GenAI
    // The API Key MUST be in environment variables: GEMINI_API_KEY
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Server misconfiguration: Missing GEMINI_API_KEY environment variable.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const responseSchema: Schema = {
      type: Type.ARRAY,
      description: "List of items extracted from the menu.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "The name of the food, beverage, or service item.",
          },
          category: {
            type: Type.STRING,
            description: "The category of the item (e.g., Starters, Main Course, Dessert, Beverages).",
          },
          item_type: {
            type: Type.STRING,
            description: "Must be exactly 'food', 'room', or 'service'. Use 'food' for all food and beverages.",
          },
          price: {
            type: Type.NUMBER,
            description: "The price of the item as a number.",
          },
          description: {
            type: Type.STRING,
            description: "A brief, appetizing description of the item. Do not include price here.",
          },
          stock: {
            type: Type.INTEGER,
            description: "Default stock quantity. Always return 50.",
          }
        },
        required: ["name", "category", "item_type", "price", "description", "stock"],
      }
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: "Extract all items from this menu card. Map them to the provided schema." },
            {
              inlineData: {
                data: image,
                mimeType: mimeType || 'image/jpeg',
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No output generated from Vision model.");
    }

    const extractedItems = JSON.parse(textOutput);

    return NextResponse.json({ items: extractedItems });
  } catch (error: any) {
    console.error('AI Ingest Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
