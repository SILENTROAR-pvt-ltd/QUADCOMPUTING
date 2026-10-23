import { ZodError } from 'zod';

/**
 * A short reference for a failed venue set-up that the host can quote to support: the database error code and the name
 * of the rule, column or function involved (e.g. "23514 profiles_owner_cafe_id_format"), or "FORM" for a form the
 * server refused. Never a value the host entered, so it is safe to show.
 */
export function provisionRef(error: unknown): string | undefined {
  if (error instanceof ZodError) return 'FORM';
  const e = error as any;
  if (typeof e?.code !== 'string' || !e.code) return undefined;
  // The most specific name first: a message like 'relation "profiles" violates check constraint "x"' is about x.
  const text = String(e.message ?? '');
  const rule = ['constraint', 'column', 'function', 'relation']
    .map((kind) => text.match(new RegExp(`${kind} "([\\w.]+)"`))?.[1])
    .find(Boolean);
  return [e.code, rule].filter(Boolean).join(' ').slice(0, 80);
}
