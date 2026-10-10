import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ResolvedBusinessSuccess {
  success: true;
  businessId: string;
  business: {
    id: string;
    business_name: string;
    name?: string;
    slug?: string;
    [key: string]: any;
  };
  error: null;
}

export interface ResolvedBusinessFailure {
  success: false;
  businessId: null;
  business: null;
  error: NextResponse;
}

export type ResolvedBusinessResult = ResolvedBusinessSuccess | ResolvedBusinessFailure;

export function normalizeSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * resolveBusinessId()
 * Safely maps incoming cafe identifier (UUID, venue slug, or name)
 * to the verified businesses.id UUID.
 *
 * Rules:
 * - NO hardcoded UUID fallbacks.
 * - Missing/empty -> 400 JSON response.
 * - Not found in DB -> 404 JSON response.
 * - Never throws unhandled 500 error.
 */
export async function resolveBusinessId(
  rawIdentifier: string | null | undefined
): Promise<ResolvedBusinessResult> {
  const identifier = (rawIdentifier || '').trim();

  if (!identifier) {
    return {
      success: false,
      businessId: null,
      business: null,
      error: NextResponse.json(
        { error: 'Venue identifier (cafe_id or slug) is required', code: 'VENUE_IDENTIFIER_REQUIRED' },
        { status: 400 }
      ),
    };
  }

  const supabase = adminDb();

  // 1. If it's a valid UUID, query directly by ID
  if (UUID_REGEX.test(identifier)) {
    try {
      const { data: bizById, error: idError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', identifier)
        .maybeSingle();

      if (!idError && bizById) {
        return {
          success: true,
          businessId: bizById.id,
          business: {
            ...bizById,
            name: bizById.business_name || bizById.name || 'Venue',
            business_name: bizById.business_name || bizById.name || 'Venue',
          },
          error: null,
        };
      }


    } catch {
      // Continue to slug resolution if exception
    }
  }

  // 2. Query businesses by slug, business_name, or name
  try {
    const targetSlug = normalizeSlug(identifier);

    // Try finding by exact slug column first if it exists
    const { data: bizBySlug, error: slugErr } = await supabase
      .from('businesses')
      .select('*')
      .eq('slug', targetSlug)
      .maybeSingle();

    if (!slugErr && bizBySlug) {
      return {
        success: true,
        businessId: bizBySlug.id,
        business: {
          ...bizBySlug,
          name: bizBySlug.business_name || bizBySlug.name || 'Venue',
          business_name: bizBySlug.business_name || bizBySlug.name || 'Venue',
        },
        error: null,
      };
    }

    // Try matching across businesses
    const { data: allBusinesses, error: listErr } = await supabase
      .from('businesses')
      .select('*')
      .limit(100);

    if (!listErr && allBusinesses && allBusinesses.length > 0) {
      const matched = allBusinesses.find((b: any) => {
        if (b.id && b.id.toLowerCase() === identifier.toLowerCase()) return true;
        if (b.slug && normalizeSlug(b.slug) === targetSlug) return true;

        const name = (b.business_name || b.name || '').toLowerCase();
        const normName = normalizeSlug(name);

        if (normName === targetSlug) return true;
        // Deliberately exact-match only. Substring matching used to be accepted
        // here ("cafe" matching "Venus Cafe", "Bombay Cafe", ...), which made
        // venue resolution non-deterministic across tenants — a guest could be
        // routed into an unrelated venue's menu, and any order or wallet credit
        // would land on that venue.
        return false;
      });

      if (matched) {
        return {
          success: true,
          businessId: matched.id,
          business: {
            ...matched,
            name: matched.business_name || matched.name || 'Venue',
            business_name: matched.business_name || matched.name || 'Venue',
          },
          error: null,
        };
      }
    }


  } catch {
    // DB query issue handled by graceful 404 below
  }

  // Not found in DB
  return {
    success: false,
    businessId: null,
    business: null,
    error: NextResponse.json(
      { error: `Venue '${identifier}' not found`, code: 'VENUE_NOT_FOUND' },
      { status: 404 }
    ),
  };
}
