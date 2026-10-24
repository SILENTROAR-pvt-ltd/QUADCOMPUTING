// Every row of a query, page by page. The database answers at most 1,000 rows a request, so a plain select would cut
// a platform-wide list short without saying so. Returns { data, error } like a normal query.
import { readAllPages } from '@/lib/services/analytics/fetch-data.service';

export async function readAll(db: any, table: string, columns: string, filter: (q: any) => any = (q) => q): Promise<{ data: any[]; error: any }> {
  const r = await readAllPages((from, to) => filter(db.from(table).select(columns)).range(from, to));
  return { data: r.rows, error: r.error };
}
