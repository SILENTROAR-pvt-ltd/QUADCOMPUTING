// What an API route may tell the browser about a failure. A database or infrastructure error carries table names,
// column names, constraint names and SQL fragments: those are logged on the server and the client gets a plain
// sentence. A validation message a person can act on ("Invalid table format") passes through unchanged.

const DB_CODE = /^(PGRST\w*|[0-9][0-9A-Z]{4})$/; // PostgREST codes and 5-character SQLSTATE codes
const INTERNAL = /(relation|column|constraint|violates|syntax error|permission denied|row-level security|rls|jwt|schema cache|pg_|postgres|supabase|duplicate key|deadlock|statement timeout|connection|econn|etimedout|fetch failed|undefined|cannot read|is not a function|stack)/i;

/** True when the error looks like it came from the database or runtime rather than from a rule the caller broke. */
export function isInternalError(error: unknown): boolean {
  const e = error as any;
  if (!e) return false;
  if (typeof e.code === 'string' && DB_CODE.test(e.code)) return true;
  if (e.hint || e.details) return true;
  return INTERNAL.test(String(e.message ?? ''));
}

/**
 * The message to put in a response body. Logs the real error once, server-side, when it is hidden.
 * @param fallback what the client sees instead of an internal error
 */
export function safeMessage(error: unknown, fallback = 'Internal Server Error'): string {
  const message = typeof (error as any)?.message === 'string' ? (error as any).message.trim() : '';
  if (!message || isInternalError(error)) {
    if (message) console.error('[API] hidden from the client:', error);
    return fallback;
  }
  return message.slice(0, 300);
}
