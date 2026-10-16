'use client';

import { useSearchParams } from 'next/navigation';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** What the QR link says: which table, which venue, and which section or tab to open. */
export function useMenuRoute() {
  const params = useSearchParams();
  const rawTable = params.get('table') || params.get('table_number') || 'T-01';
  const tableParam = rawTable.match(/[a-zA-Z0-9-]+/)?.[0] ?? 'T-01';

  const rawCafe = params.get('business_id') || params.get('cafe_id') || params.get('venue') || params.get('cafe') || '';
  const cafeParam = rawCafe.match(UUID)?.[0] ?? (rawCafe.trim() ? rawCafe.trim().split(/[\s,]+/)[0] : '');

  return { tableParam, cafeParam, sectionParam: params.get('section'), tabParam: params.get('tab') };
}
