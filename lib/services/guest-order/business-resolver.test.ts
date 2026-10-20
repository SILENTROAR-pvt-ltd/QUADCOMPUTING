import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';

const admin = vi.hoisted(() => ({ client: null as any }));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: () => admin.client, getAdminClient: () => admin.client }));

import { resolveBusinessId, normalizeSlug } from './business-resolver.service';

const VENUE_ID = '11111111-2222-4333-8444-555555555555';

describe('Task 1: Business & Slug Resolver Service', () => {
  beforeEach(() => {
    admin.client = createFakeSupabase({
      businesses: [{ id: VENUE_ID, business_name: 'Venus Cafe Oldmanali', slug: 'venus-cafe-oldmanali' }],
    });
  });

  it('normalizes venue slugs accurately', () => {
    expect(normalizeSlug('Venus Cafe')).toBe('venus-cafe');
    expect(normalizeSlug('venus-cafe-oldmanali')).toBe('venus-cafe-oldmanali');
    expect(normalizeSlug('  Himalayan Kitchen / Old Manali  ')).toBe('himalayan-kitchen-old-manali');
  });

  it('rejects missing or empty cafe identifier with 400 JSON response', async () => {
    const resEmpty = await resolveBusinessId('');
    expect(resEmpty.success).toBe(false);
    expect(resEmpty.businessId).toBeNull();
    const jsonEmpty = await resEmpty.error!.json();
    expect(resEmpty.error!.status).toBe(400);
    expect(jsonEmpty.code).toBe('VENUE_IDENTIFIER_REQUIRED');

    const resNull = await resolveBusinessId(null);
    expect(resNull.success).toBe(false);
    expect(resNull.error!.status).toBe(400);
  });

  it('resolves a venue by its UUID and by its slug', async () => {
    const byId = await resolveBusinessId(VENUE_ID);
    expect(byId.success && byId.businessId).toBe(VENUE_ID);

    const bySlug = await resolveBusinessId('Venus Cafe Oldmanali');
    expect(bySlug.success && bySlug.businessId).toBe(VENUE_ID);
  });

  it('does not match a venue by partial name (no cross-tenant routing)', async () => {
    const res = await resolveBusinessId('cafe');
    expect(res.success).toBe(false);
    expect(res.error!.status).toBe(404);
  });

  it('resolves a slug only against the slug column: a venue is never reached under another venue\'s name', async () => {
    admin.client = createFakeSupabase({
      businesses: [
        // Renamed: its slug still says "venus-cafe", its name no longer does.
        { id: VENUE_ID, business_name: 'Venus Garden', slug: 'venus-cafe' },
        // A newer venue that holds the name "Venus Cafe" but a different slug, and one with no slug at all.
        { id: '22222222-2222-4333-8444-555555555555', business_name: 'Venus Cafe', slug: 'venus-cafe-2' },
        { id: '33333333-2222-4333-8444-555555555555', business_name: 'Lotus Cafe', slug: null },
      ],
    });
    const bySlug = await resolveBusinessId('venus-cafe');
    expect(bySlug.success && bySlug.businessId).toBe(VENUE_ID);
    const byName = await resolveBusinessId('Lotus Cafe');
    expect(byName.success).toBe(false);
    expect(byName.error!.status).toBe(404);
  });

  it('a UUID that matches no venue is not retried as a slug', async () => {
    const res = await resolveBusinessId('99999999-2222-4333-8444-555555555555');
    expect(res.success).toBe(false);
    expect(res.error!.status).toBe(404);
  });

  it('returns explicit 404 JSON response when venue is not found in database', async () => {
    const resNotFound = await resolveBusinessId('unknown-venue-slug-xyz');
    expect(resNotFound.success).toBe(false);
    expect(resNotFound.businessId).toBeNull();
    const jsonNotFound = await resNotFound.error!.json();
    expect(resNotFound.error!.status).toBe(404);
    expect(jsonNotFound.code).toBe('VENUE_NOT_FOUND');
    expect(jsonNotFound.error).toContain('unknown-venue-slug-xyz');
  });

  it('never throws unhandled 500 error on invalid UUID format or unusual slug', async () => {
    const resInvalid = await resolveBusinessId('not-a-uuid-999-invalid');
    expect(resInvalid.success).toBe(false);
    expect(resInvalid.error!.status).toBe(404);
  });
});
