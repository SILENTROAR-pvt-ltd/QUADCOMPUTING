// In-memory stand-in for the slice of the Supabase query builder this app uses. Tests build one
// with seed rows and hand it to services/routes, so pipelines run for real (filters, updates,
// unique constraints, "update ... returning") without any network or credentials.
//
// It is deliberately small: only the operators the code under test calls are implemented, and an
// unsupported call throws so a test can't silently pass against behaviour the fake doesn't model.

type Row = Record<string, any>;
type DbError = { code: string; message: string };

export interface FakeOptions {
  /**
   * Unique constraints per table; violations fail with code 23505. Use { cols, where } for a partial
   * unique index (e.g. one pending redemption per guest).
   */
  unique?: Record<string, Array<string[] | { cols: string[]; where: (r: Row) => boolean }>>;
  /** Make operations fail: key is `${table}.${op}` ('orders.insert'). Function returns true to fail. */
  failOn?: Record<string, (payload: any) => boolean>;
  rpc?: Record<string, (args: any) => any>;
}

export interface FakeSupabase {
  tables: Record<string, Row[]>;
  calls: { rpc: Array<{ name: string; args: any }> };
  from(table: string): QueryBuilder;
  rpc(name: string, args?: any): Promise<{ data: any; error: DbError | null }>;
}

const uid = () => (globalThis.crypto as Crypto).randomUUID();

function parseInList(raw: string): string[] {
  return raw.replace(/^\(|\)$/g, '').split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
}

// PostgREST LIKE pattern: '*' is the wildcard. Case-insensitive, like ilike.
function likeToRegExp(pattern: string): RegExp {
  const escaped = pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp(`^${escaped}$`, 'i');
}

// Split on commas that are not inside (...), so "in.(a,b)" stays one term, as in PostgREST.
function splitTopLevel(expr: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of expr) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(current); current = ''; } else current += ch;
  }
  out.push(current);
  return out;
}

function parseOr(expr: string): Array<(r: Row) => boolean> {
  return splitTopLevel(expr).map((term) => {
    const [col, op, ...rest] = term.split('.');
    const val = rest.join('.');
    if (op === 'eq') return (r: Row) => String(r[col]) === val;
    if (op === 'neq') return (r: Row) => r[col] != null && String(r[col]) !== val;
    if (op === 'is' && val === 'null') return (r: Row) => r[col] == null;
    if (op === 'ilike') {
      const re = likeToRegExp(val);
      return (r: Row) => r[col] != null && re.test(String(r[col]));
    }
    if (op === 'in') {
      const list = parseInList(val);
      return (r: Row) => list.includes(String(r[col]));
    }
    throw new Error(`fake-supabase: unsupported or() operator "${op}"`);
  });
}

class QueryBuilder implements PromiseLike<{ data: any; error: DbError | null }> {
  private filters: Array<(r: Row) => boolean> = [];
  private orGroups: Array<Array<(r: Row) => boolean>> = [];
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: any = null;
  private returning = false;
  private orderBy: { col: string; asc: boolean } | null = null;
  private limitN: number | null = null;
  private rangeFrom = 0;
  private mode: 'none' | 'single' | 'maybe' = 'none';
  private upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {};

  constructor(private db: FakeSupabase, private table: string, private opts: FakeOptions) {}

  select(_cols?: string, _o?: unknown) { if (this.op !== 'select') this.returning = true; return this; }
  insert(rows: Row | Row[]) { this.op = 'insert'; this.payload = rows; return this; }
  update(patch: Row) { this.op = 'update'; this.payload = patch; return this; }
  delete() { this.op = 'delete'; return this; }
  upsert(rows: Row | Row[], o: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = 'upsert'; this.payload = rows; this.upsertOpts = o; return this;
  }

  eq(col: string, val: any) { this.filters.push((r) => r[col] === val); return this; }
  neq(col: string, val: any) { this.filters.push((r) => r[col] !== val); return this; }
  gt(col: string, val: any) { this.filters.push((r) => r[col] != null && r[col] > val); return this; }
  gte(col: string, val: any) { this.filters.push((r) => r[col] != null && r[col] >= val); return this; }
  lt(col: string, val: any) { this.filters.push((r) => r[col] != null && r[col] < val); return this; }
  lte(col: string, val: any) { this.filters.push((r) => r[col] != null && r[col] <= val); return this; }
  in(col: string, vals: any[]) { this.filters.push((r) => vals.includes(r[col])); return this; }
  ilike(col: string, pattern: string) { const re = likeToRegExp(pattern); this.filters.push((r) => r[col] != null && re.test(String(r[col]))); return this; }
  is(col: string, val: null) { this.filters.push((r) => (val === null ? r[col] == null : r[col] === val)); return this; }
  not(col: string, op: string, val: any) {
    if (op === 'in') { const list = parseInList(String(val)); this.filters.push((r) => !list.includes(String(r[col]))); }
    else if (op === 'is') { this.filters.push((r) => (val === null ? r[col] != null : r[col] !== val)); }
    else throw new Error(`fake-supabase: unsupported not() operator "${op}"`);
    return this;
  }
  or(expr: string) { this.orGroups.push(parseOr(expr)); return this; }
  order(col: string, o: { ascending?: boolean } = {}) { this.orderBy = { col, asc: o.ascending !== false }; return this; }
  limit(n: number) { this.limitN = n; return this; }
  range(from: number, to: number) { this.rangeFrom = from; this.limitN = to - from + 1; return this; }
  maybeSingle() { this.mode = 'maybe'; return this; }
  // Like PostgREST: exactly one row or PGRST116.
  single() { this.mode = 'single'; return this; }

  then<T1 = any, T2 = never>(
    onfulfilled?: ((v: { data: any; error: DbError | null }) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null
  ): Promise<T1 | T2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private matches(r: Row) {
    return this.filters.every((f) => f(r)) && this.orGroups.every((g) => g.some((f) => f(r)));
  }

  private fail(code: string, message: string) {
    return { data: null, error: { code, message } as DbError };
  }

  private shape(rows: Row[]) {
    if (this.mode === 'none') return { data: rows, error: null };
    if (this.mode === 'maybe') {
      if (rows.length > 1) return this.fail('PGRST116', 'multiple rows returned');
      return { data: rows[0] ?? null, error: null };
    }
    if (rows.length !== 1) return this.fail('PGRST116', `expected 1 row, got ${rows.length}`);
    return { data: rows[0], error: null };
  }

  private violatesUnique(row: Row, ignoreId?: Row): boolean {
    const groups = this.opts.unique?.[this.table] || [];
    return groups.some((g) => {
      const cols = Array.isArray(g) ? g : g.cols;
      const where = Array.isArray(g) ? null : g.where;
      if (where && !where(row)) return false;
      return (this.db.tables[this.table] || []).some(
        (existing) =>
          existing !== ignoreId &&
          (!where || where(existing)) &&
          cols.every((c) => row[c] != null && existing[c] === row[c])
      );
    });
  }

  private execute(): { data: any; error: DbError | null } {
    const rows = (this.db.tables[this.table] ||= []);
    const failKey = `${this.table}.${this.op}`;
    if (this.opts.failOn?.[failKey]?.(this.payload)) return this.fail('XX000', `forced failure: ${failKey}`);

    if (this.op === 'select') {
      let out = rows.filter((r) => this.matches(r));
      if (this.orderBy) {
        const { col, asc } = this.orderBy;
        out = [...out].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1));
      }
      out = out.slice(this.rangeFrom, this.limitN == null ? undefined : this.rangeFrom + this.limitN);
      return this.shape(out.map((r) => ({ ...r })));
    }

    if (this.op === 'insert' || this.op === 'upsert') {
      const incoming: Row[] = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted: Row[] = [];
      for (const raw of incoming) {
        const row: Row = { id: raw.id ?? uid(), created_at: raw.created_at ?? new Date().toISOString(), ...raw };
        if (this.op === 'upsert' && this.upsertOpts.onConflict) {
          const key = this.upsertOpts.onConflict;
          const existing = rows.find((r) => r[key] === row[key]);
          if (existing) {
            if (!this.upsertOpts.ignoreDuplicates) Object.assign(existing, raw);
            continue;
          }
        }
        if (this.violatesUnique(row)) return this.fail('23505', `duplicate key value violates unique constraint on ${this.table}`);
        rows.push(row);
        inserted.push({ ...row });
      }
      return this.returning || this.mode !== 'none' ? this.shape(inserted) : { data: null, error: null };
    }

    if (this.op === 'update') {
      const targets = rows.filter((r) => this.matches(r));
      for (const t of targets) {
        const next = { ...t, ...this.payload };
        if (this.violatesUnique(next, t)) return this.fail('23505', `duplicate key value violates unique constraint on ${this.table}`);
      }
      targets.forEach((t) => Object.assign(t, this.payload));
      return this.returning || this.mode !== 'none' ? this.shape(targets.map((t) => ({ ...t }))) : { data: null, error: null };
    }

    // delete
    const keep = rows.filter((r) => !this.matches(r));
    const removed = rows.length - keep.length;
    this.db.tables[this.table] = keep;
    return this.returning ? { data: Array.from({ length: removed }, () => ({})), error: null } : { data: null, error: null };
  }
}

export function createFakeSupabase(seed: Record<string, Row[]> = {}, opts: FakeOptions = {}): FakeSupabase {
  const db: FakeSupabase = {
    tables: Object.fromEntries(Object.entries(seed).map(([k, v]) => [k, v.map((r) => ({ ...r }))])),
    calls: { rpc: [] },
    from(table: string) { return new QueryBuilder(db, table, opts); },
    async rpc(name: string, args: any = {}) {
      db.calls.rpc.push({ name, args });
      const handler = opts.rpc?.[name];
      if (!handler) return { data: null, error: { code: '42883', message: `function ${name} does not exist (not stubbed)` } };
      try {
        return { data: await handler(args), error: null };
      } catch (e: any) {
        return { data: null, error: { code: e?.code || 'XX000', message: e?.message || String(e) } };
      }
    },
  };
  return db;
}
