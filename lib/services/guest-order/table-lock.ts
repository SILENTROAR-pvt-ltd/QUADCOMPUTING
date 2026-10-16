/**
 * One order at a time per table, within this server instance.
 *
 * Several guests at a table often order within the same second. Each one's request reads "is there an open bill?" before
 * any of them has written, all see none, and each opens its own bill. Running the requests for one table one after another
 * lets the second see the first's bill and add to it, so the table has one bill.
 *
 * This only orders requests that reach the same instance; a second instance is caught by the database, which refuses a
 * stale decision (migration 20261016000005_serialize_table_orders.sql) and makes the order read again.
 */
const tails = new Map<string, Promise<unknown>>();

export async function withTableLock<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve();
  const run = previous.then(work, work);
  const tail = run.catch(() => undefined);
  tails.set(key, tail);
  try {
    return await run;
  } finally {
    // Forget the key once nobody is queued behind this request, so the map does not grow with every table ever used.
    if (tails.get(key) === tail) tails.delete(key);
  }
}

export const tableLockKey = (businessId: string, rawTable: string) =>
  `${businessId}:${rawTable.replace(/^(table|t-)\s*/i, '').trim().toUpperCase()}`;
