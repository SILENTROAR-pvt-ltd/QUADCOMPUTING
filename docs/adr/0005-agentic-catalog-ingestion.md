# ADR 0005: Agentic catalog and stock ingestion on LangGraph

Status: Proposed (23 Oct 2026). For team review; no code yet.

## Decision

Replace the one-shot menu scan (`/api/host/catalog/ai-ingest` then `/api/host/catalog/bulk-insert`) with a LangGraph
pipeline of narrow LLM agents and plain-code checks. The graph only ever produces a **plan**; the host approves it,
and a separate, model-free step writes it in one database transaction. The same pattern later fills the supplier-bill
scan that `/api/host/inventory/ocr-ingest` refuses today (501).

LangGraph is already a dependency (`@langchain/langgraph` 1.4.19) and Vibey's co-pilot is built on it
(`lib/vibey/host/graph.ts`), so this adds no new framework, only a second graph in the same style.

## Why

What the current pipeline does, and where it falls short (read from the code on 23 Oct 2026):

| Today | Problem |
|---|---|
| One vision call reads the whole menu photo (`lib/services/catalog/llm-json.ts`, `max_tokens: 900`) | A long menu runs out of tokens mid-array; the reply is not valid JSON and the scan fails as a whole. |
| The reply is parsed with `JSON.parse` and an `Array.isArray` check | No field-level validation; a wrong type or a missing price reaches the review screen as is. |
| Items are always inserted as new | No comparison with the existing catalog: rescanning a menu duplicates every dish; a price change cannot be applied as a change. |
| `bulk-insert` writes `catalog_items`, then `inventory_stock`, then the fee, in three steps | A failed stock insert is only logged and a failed fee is swallowed, so items can exist without stock rows or without being billed. `rules.md` §2.2 asks for one transaction. |
| Prices like "₹250 / ₹350" or "Half / Full" | Squashed into one number by the model, or 0. |
| Bill scanning for raw stock | Not built (`ocr-ingest` returns `NOT_IMPLEMENTED`). |

## Design

### Shape

```
intake ──► extract (one branch per page) ──► normalize ──► reconcile ──► verify ──► plan (returned to the host)
                 ▲                                                         │
                 └──────── re-extract one page, once, on low confidence ◄──┘

host approves (edits allowed) ──► commit (no model, one RPC) ──► enrich (optional, background)
```

Two routes, not one paused graph:

- `POST /api/host/catalog/ingest/plan` runs intake to verify and returns the plan. Nothing is written.
- `POST /api/host/catalog/ingest/commit` takes the approved plan, re-validates it with the same Zod schema, re-checks
  that every `update` target still belongs to the venue, and calls the commit RPC.

Pausing the graph for approval with `interrupt()` would need a durable checkpointer, because Vercel functions keep no
state between requests. That means `@langchain/langgraph-checkpoint-postgres` plus a table. The two-route split
gives the same result with neither; it can be revisited if a step ever needs to resume mid-run.

### Nodes

| Node | Model | Does | Reuses |
|---|---|---|---|
| intake | no | File type (JPG, PNG, WebP, PDF), size (6 MB a page), page cap (`INGEST_MAX_PAGES`, default 6), splits pages. | `vault-ingest.ts` limits |
| extract | vision | One call per page, run in parallel with LangGraph `Send`. Zod schema per item, one repair retry, hard timeout. Each item carries `page`, the printed text it came from (`source_text`) and a `confidence`. | `lib/vibey/core/llm.ts` pattern (needs an image variant, see below) |
| normalize | rules first, text model only for what rules leave | Price variants ("250/350", "Half/Full", "S/M/L") into `metadata.variants`; diet tag; category mapped to the venue's existing categories; `item_type`; default GST from the item type. | `lib/utils/menu-categories.ts`, `lib/utils/gst-rates.ts`, `create-item.service.ts` metadata shape |
| reconcile | rules first, text model for fuzzy names | Compares with the venue's `catalog_items`: each item becomes `new`, `update` (price, description or category changed), `duplicate`, or `skip`. | `planMenuImport()` in `scripts/lib/menu-import.mjs` (move the pure logic into `lib/` so the script and the graph share it) |
| verify | no | Rejects empty names and duplicate names within the batch; flags price 0 when the source text shows a number, prices outside the venue's range, and items below the confidence threshold. Flagged items are listed for review, never guessed, the same rule the photo matcher follows (`photo-autofill.ts`). | |
| commit | no | One RPC (below). | |
| enrich | yes, optional | Dish photos for the new items through the existing `runSmartPhotos`. Recipe suggestions are out of scope for the first version. | `smart-photos.ts` |

### Plan contract

```ts
interface IngestPlan {
  planId: string;                       // random id; the commit route refuses a plan id it has already committed
  businessId: string;                   // from requireHost, never from the body
  items: Array<{
    action: 'new' | 'update' | 'duplicate' | 'skip';
    targetId?: string;                  // catalog_items.id for update/duplicate
    name: string; category: string; itemType: 'food' | 'service' | 'room';
    price: number; variants?: Array<{ label: string; price: number }>;
    description?: string; diet?: 'veg' | 'non_veg' | 'egg' | 'vegan';
    confidence: number; flags: string[]; sourceText: string; page: number;
  }>;
  usage: { modelCalls: number; tokensIn: number; tokensOut: number; ms: number };
}
```

The review screen (`AiIngestModal`, split into smaller components to stay near the 90-line rule) shows the plan
grouped by action, with flagged items first, and lets the host edit or untick lines before commit.

### Commit RPC

New migration `YYYYMMDDHHMMSS_ingest_catalog_batch.sql` adding `public.ingest_catalog_batch(p_business_id uuid,
p_plan_id text, p_items jsonb)`:

- `SECURITY DEFINER`, `SET search_path = public`, `SET LOCAL statement_timeout = '4000ms'` and
  `SET LOCAL lock_timeout = '2500ms'` (`rules.md` §2.2).
- Inserts new `catalog_items` with their `inventory_stock` rows and applies updates scoped by `business_id`, all in
  one transaction.
- Records `p_plan_id` in a small `catalog_ingest_runs` table with a unique constraint, so a double tap or a replayed
  request cannot insert twice (the route also keeps `withIdempotency`).
- `EXECUTE` revoked from `anon` and `authenticated`; the route calls it with the service role after `requireHost`.
- Batch size capped (200 items).

The per-item fee: see open question 1.

### Model calls

- **Vision.** `lib/vibey/core/llm.ts` sends text only. Add an image-capable sibling (for example
  `lib/services/catalog/ingest/llm-vision.ts`) with the same contract: JSON mode where the provider supports it, a Zod
  check, one repair retry, a timeout, typed `LlmError`s. It reads `LLM_VISION_MODEL` like today's scan. Vibey's model
  (`qwen/qwen3.8-27b`, ADR 0004) does not read images, so the two stay configured separately.
- **Text** (normalize and reconcile fallbacks) uses the existing `chatJson` and `LLM_TEXT_MODEL`.
- **Budget.** A per-venue daily allowance, shared through Redis when configured, in the style of Vibey's
  `reserveModel` / `VIBEY_DAILY_MODEL_CALLS`, plus the existing hourly rate limit on the route. When the budget is
  spent, the scan says so; manual entry is unaffected.
- **Model-free fallback.** Without `LLM_API_KEY` the plan route returns `503` with a clear message, as today.

### Security

- The menu image and its text are data. Every prompt says so, and no node gives the model tools, ids or the database.
  A menu that says "ignore previous instructions" can at worst produce a wrong item, which verify and the host review
  catch.
- `business_id` comes only from `requireHost`. Staff PIN sessions cannot reach these routes (`staff-roles.ts` gives
  no role catalog writes), and the routes stay under `app/api/host`, so `audit:guards` checks them.
- Images are sent to the configured LLM provider, as they are today. They are not stored unless the host also adds
  them to the Photo Vault.

### Supplier bills (phase 2)

Same shape on a second graph: intake, extract the bill lines (name, quantity, unit, unit cost, supplier, bill number),
match each line to `raw_inventory_items` (rules, then a text model for fuzzy names), verify (units, totals against the
bill total), plan, host approval, then commit through the existing `record_inventory_movement` RPC per line inside one
new wrapper RPC so a bill posts entirely or not at all. Replaces the 501 in `ocr-ingest`.

## Files

| Path | Change |
|---|---|
| `lib/services/catalog/ingest/graph.ts` | The graph, built from injected dependencies like `buildHostGraph` |
| `lib/services/catalog/ingest/schema.ts` | Zod schemas for extracted items and the plan |
| `lib/services/catalog/ingest/nodes/*.ts` | One file per node; pure where possible |
| `lib/services/catalog/ingest/llm-vision.ts` | Image-capable JSON call |
| `lib/services/catalog/menu-plan.ts` | Pure reconcile logic moved from `scripts/lib/menu-import.mjs` |
| `app/api/host/catalog/ingest/plan/route.ts`, `.../commit/route.ts` | The two routes |
| `supabase/migrations/<timestamp>_ingest_catalog_batch.sql` | Commit RPC and `catalog_ingest_runs` |
| `components/host/workspaces/catalog/ingest/*` | Plan review UI |
| `tests/pipelines/menu-ingest-graph.pipeline.test.ts` | Whole graph on `createFakeSupabase` with a fake model |
| `tests/catalog-ingest/golden/` | Golden menus (see below) |

`ai-ingest` and `bulk-insert` stay in place until the new flow is live; `ServiceIngestForm` keeps using `bulk-insert`.

## Testing

- **Unit:** each node with fixed inputs; the model is injected, so no network.
- **Pipeline:** the graph end to end on the in-memory database: a rescan produces `duplicate`s, not new rows; a price
  change produces one `update`; a failed commit leaves nothing behind.
- **Golden set:** about 20 menu photos and PDFs (made-up or with the venue's permission) with hand-written expected
  items, run like the Vibey eval (`vitest.vibey-eval.config.ts`). Hard gates before a model or prompt change ships:
  zero invented dishes, and every price that is printed read correctly. Recorded model answers let the golden test run
  offline in CI.
- `npm run verify` stays green; `check:migrations` covers the new migration.

## Rollout

1. Phase 1: menu graph, plan and commit routes, migration, review UI, behind a flag (`INGEST_GRAPH_ENABLED`), on for
   the pilot venue only.
2. Compare with the old scan on the golden set and the pilot venue's real menus; then make it the default and remove
   `ai-ingest`.
3. Phase 2: supplier bills.

## Consequences

- One more graph to maintain, in the same style as Vibey's, so reviewers already know the pattern.
- More model calls per scan (one per page, plus occasional text fallbacks). Mitigated by rules-first normalize and
  reconcile, the page cap and the per-venue budget.
- A new migration and a new table must be applied in the Supabase SQL editor before the flag is turned on.
- Rescanning a menu becomes a safe way to update prices.

## Open questions for the team

1. **Fee in the same transaction?** Today the fee is charged after the insert through `evaluateFeeGuard`, which
   calls `deduct_venue_wallet_credits`. Should the commit RPC charge it inside the same transaction (items and fee
   together, or neither), and can that function be called from inside another `SECURITY DEFINER` function given its
   caller checks?
2. **Vision model and provider.** Which model and key for `LLM_VISION_MODEL` in production, and what daily budget
   per venue?
3. **PDF menus.** Convert pages to images on the server (new dependency) or accept images only in phase 1?
4. **Variants.** Is `metadata.variants` the right home for sizes, or does the POS need a column or table it can price
   from? This needs checking against the POS and receipt code before it is built.
5. **Golden set.** Can we use real partner menus for it, or only made-up ones?
6. **Checkpointer.** Is the two-route split acceptable, or does the team want resumable runs (Postgres checkpointer)
   from the start?
