export const isValidUuid = (val?: string | null): boolean => {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

export const normalizeTable = (t: string) => {
  return (t || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^table\s*/i, '')
    .replace(/^t-/i, '')
    .trim()
    .toUpperCase();
};

export function getTableVariants(rawTable: string): string[] {
  if (!rawTable) return [];
  const raw = rawTable.trim(), norm = normalizeTable(raw);
  const unpad = norm.replace(/^0+/, '') || norm;
  const pad = norm.length === 1 ? `0${norm}` : norm;
  const set = new Set<string>([raw, norm, unpad, pad, `T-${norm}`, `T-${unpad}`, `T-${pad}`, `Table ${norm}`, `Table ${unpad}`, `Table ${pad}`, `Table ${raw}`]);
  return Array.from(set).filter(Boolean);
}

export function buildTableOrFilter(rawTable: string, col = 'table_number'): string {
  return getTableVariants(rawTable).map((v) => `${col}.eq.${v}`).join(',');
}

