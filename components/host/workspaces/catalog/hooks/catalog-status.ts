import type { CatalogItemStatus } from '@/types/catalog';

/**
 * A catalogue row's status. `sold_out` is a dish switched off the guest menu; `archived` is a dish that was deleted but
 * kept because past bills point at it, and the catalogue list hides it.
 */
export function catalogStatus(row: { is_available?: boolean | null; metadata?: { deleted?: boolean } | null }): CatalogItemStatus {
  if (row.metadata?.deleted) return 'archived';
  return row.is_available === false ? 'sold_out' : 'active';
}
