/**
 * Reads of `orders` that also want the daily order number (ORD-001, migration 20261018000001).
 *
 * The column only exists once that migration has been applied, and a read that names a missing column fails outright.
 * So: ask for it, and if the database says it is not there, read again without it and remember that for a minute
 * (then ask again, so applying the migration takes effect without a restart). The invoices, slips and bill pages keep
 * working on a database that has not been migrated yet; they simply show no order number.
 */
let missingUntil = 0;

const isMissingColumn = (error: any) => Boolean(error) && (error.code === '42703' || error.code === 'PGRST204' || /order_number/i.test(String(error.message ?? '')));

export const withOrderNumber = (columns: string) => (Date.now() < missingUntil ? columns : `${columns}, order_number`);

/** Runs `build(columns)` with the order number; on a missing column, runs it again without. */
export async function selectOrders<D = any>(columns: string, build: (columns: string) => PromiseLike<{ data: D; error: any }>): Promise<{ data: D; error: any }> {
  const result = await build(withOrderNumber(columns));
  if (result.error && isMissingColumn(result.error) && Date.now() >= missingUntil) {
    missingUntil = Date.now() + 60_000;
    return build(columns);
  }
  return result;
}
