import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

if (typeof globalThis.WebSocket === 'undefined') {
  try {
    const ws = require('ws');
    (globalThis as any).WebSocket = ws;
  } catch {}
}

let adminClientInstance: SupabaseClient<any, 'public', any> | null = null;

/** Service-role key is mandatory: falling back to the anon key silently runs "admin" writes under RLS. */
function validateServiceRoleConfig(): { url: string; serviceKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('[adminDb] Missing NEXT_PUBLIC_SUPABASE_URL.');
  }
  if (!serviceKey) {
    throw new Error(
      '[adminDb] Missing SUPABASE_SERVICE_ROLE_KEY. The anon key is never used as a fallback for admin operations; set it in .env.local and in the production environment.'
    );
  }
  return { url, serviceKey };
}

/**
 * adminDb() - Server-Side Privileged Supabase Client
 * 
 * Bypasses RLS to execute trusted mutations (guest order ingestion,
 * financial ledgers, fee guards, top-up approvals).
 * NEVER expose or import this in client-side components.
 */
export function adminDb(): SupabaseClient<any, 'public', any> {
  if (adminClientInstance) return adminClientInstance;

  const { url, serviceKey } = validateServiceRoleConfig();

  if (!adminClientInstance) {
    adminClientInstance = createSupabaseClient<any, 'public', any>(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClientInstance;
}

export const getAdminClient = adminDb;
