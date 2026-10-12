import { must } from './http';

/** Every row of a query, read in pages (the API returns at most 1,000 rows per request). */
export async function allRows(make: () => any, page = 1000): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += page) {
    const rows = must(await make().range(from, from + page - 1)) as any[];
    out.push(...rows);
    if (rows.length < page) return out;
  }
}
