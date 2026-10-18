# Vibey — Agent Layer Plan (refined)

**Status:** Phases 0, 1 and 2 built and verified (18 Oct 2026); Phases 3 and 4 not started · **Supersedes:** `vibey_ai_agent_integration_blueprint.md`
**Scope:** (1) a guest ordering assistant on the QR menu, (2) a read-only analytics co-pilot for the host control centre.

## Delivery status (18 Oct 2026)

| Phase | State | Evidence |
|---|---|---|
| 0 · Prove | Done | Model inventory and limits measured (1,000 req/day, 8,000 tokens/min per model); 155-case golden set; live eval of 3 models; ADR `docs/adr/0004-vibey-model.md` picks `qwen/qwen3.8-27b`; LangGraph pinned at 1.4.19 / core 1.2.14 (≥ 14 days old), `npm audit` 0 |
| 1 · Guest MVP | Done | `lib/vibey/guest/*`, `app/api/guest/vibey`, `components/guest/vibey/*`; golden set 100% intent / 100% exact / 0 wrong adds (recorded model), property test, route isolation tests; checked live on a 90-dish menu |
| 2 · Host co-pilot | Done (UI not clicked through: needs a signed-in host) | `lib/vibey/host/*`, `app/api/host/vibey`, `components/host/vibey/*`; `computeEodReport` takes the guard's venue; cashier-only staff rule; locks enforced server-side for staff |
| 3 · Voice + streaming | Not started | Groq offers `whisper-large-v3(-turbo)` on this key |
| 4 · Act with a human in the loop | Not started | Needs the open decisions in §13 (dietary tags, unlock token) |

To switch on: run `supabase/apply-pending-20261018-vibey.sql`, then set `vibey_guest_enabled` / `vibey_host_enabled` on a venue,
or list its id in `VIBEY_PILOT_VENUES`. Kill switch: `VIBEY_ENABLED=0`. Model: `VIBEY_MODEL` (default in the ADR).
Daily model calls per venue: `VIBEY_DAILY_MODEL_CALLS` (default 1500). Re-run the live eval:
`npx vitest run --config vitest.vibey-eval.config.ts`. Decisions taken where §13 was open: one pilot venue (flag off by
default), no raw-text logging, no voice yet, no dietary answers (handed to staff).

Every statement below is marked by how it is known:
- **[code]** checked in this repository today (file named).
- **[npm]** read from the npm registry today.
- **[verify]** a fact about an outside service that must be measured in Phase 0 before anything depends on it. No number in this plan is guessed.

---

## 1. The one-paragraph version

Vibey is two small, closed-world agents on one shared core. The **guest agent** turns "2 cold coffee aur ek masala chai, less sugar" into a *proposed* tray change. Every dish it names is resolved against the venue's own live menu by deterministic code, never by the model. The guest always confirms with the existing **Place order** button, and the server already re-prices every order from the catalog. The **host co-pilot** answers "how did we do today?" or "what do I owe?" by calling the same services the dashboard already uses, scoped to the signed-in venue, read-only. Its numbers come from those services, not from model text. The model is used for what it is good at: understanding messy Hinglish, choosing a tool, and phrasing a reply. Code does everything that must be exactly right: which dish, what price, which venue, which numbers. Orchestration is a LangGraph.js state graph. Both agents still work, in a reduced mode, when the model is slow, rate-limited or down.

---

## 2. What the codebase already gives us (audit)

| Area | What exists | Source |
|---|---|---|
| LLM provider | Groq's OpenAI-compatible API is already configured: `LLM_BASE_URL=https://api.groq.com/openai/v1`, `LLM_TEXT_MODEL=openai/gpt-oss-120b`. | `.env.local` (names and base URL only read) |
| LLM client | `generateJson()`: one non-streaming `chat/completions` call, `temperature 0`, `max_tokens 900`, JSON pulled out of the reply by `extractJson()` (no structured-output mode, no retry). | [code] `lib/services/catalog/llm-json.ts` |
| Agent pattern | "The agent only proposes; a verifier decides": model proposals are checked against real ids before anything is written. **Vibey copies this pattern.** | [code] `lib/services/catalog/dish-matcher-agent.ts` |
| Menu data | Per-instance cache of venue + tables + available dishes (`id, name, description, price, category, item_type, image_url`), single-flight, serve-stale on error, 15 s fresh. | [code] `lib/services/guest-menu/venue-menu-cache.ts` (`loadVenueMenu`) |
| Dish options | Add-ons live in `item_options` (two schemas in deployed databases, normalised by the catalog route). | [code] `app/api/guest/catalog/route.ts` |
| Dietary data | **None.** No veg / allergen / spice fields in the catalog or migrations. | [code] grep of `supabase/migrations`, `components/guest/menu/types.ts` |
| Guest cart | Client-side Zustand store (`addToCart`, `incrementQuantity`, `decrementQuantity`, `setItemNote`, `clearCart`), saved to `localStorage`. Dishes with options open the customisation drawer. | [code] `lib/store/cart.store.ts`, `components/guest/menu/hooks/useGuestCartHandlers.ts` |
| Order safety | The order service ignores client prices and loads them from `catalog_items` by id and business id, so a client-side cart cannot set a price. | [code] `lib/services/guest-order/submit-order.service.ts` (called by `app/api/guest/order/route.ts`) |
| Upsell logic | Deterministic pairing suggestions (`suggestForCart`, `kindOf`). | [code] `lib/guest/cart-suggestions.ts` |
| Guest checks | `validateGuestAccess(cafe_id, table)`: venue must exist, table must match `/^[A-Za-z0-9 -]{1,12}$/`. | [code] `lib/auth/guest-validate.ts` |
| Rate limiting | `enforceRateLimit()` uses a Redis sliding window when Upstash is configured, otherwise in-memory; counting checks run atomically (fixed in the audit). | [code] `lib/middleware/rate-limiter.ts` |
| Host auth | `requireHost(request)` resolves the venue from the session; staff PIN sessions are limited by `staffMayCall(role, method, path)`, which denies any path not on its list. | [code] `lib/auth/guards.ts`, `lib/services/staff-auth/staff-roles.ts` |
| PIN lock | Locked sections (`dashboard`, `payments`, `wallet`, `guests`, …) are a **client-side** gate on shared screens; no API checks the unlock state. | [code] `lib/services/security/protected-modules.ts` (only profile/status routes read it) |
| Host data the co-pilot can wrap | `computeEodReport` (sales, P&L, top items, stock, guests), `fetchInvoiceSummary` / `fetchDaySlips` / `fetchInvoiceDetail` (dues), `getHostTables`, `listDeliveryOrders`, `listVendors`, `fetchKitchenTickets`, `listReservations`, `recordLedgerVisit` / ledger (My Guests). | [code] all present under `lib/services/**` |
| Host shell | One client workspace with tab routing and an `onNavigate` callback; a co-pilot can mount once and appear on every tab. | [code] `components/host/ControlCenterWorkspace.tsx` |
| Observability | `@sentry/nextjs` is installed; e2e reports are written under `docs/`. | [code] `package.json` |

### What the blueprint gets wrong (and the fix)

| Blueprint says | Reality | Fix in this plan |
|---|---|---|
| Table `venues(id)` | Venues are `public.businesses`. | FKs point at `businesses(id)`. |
| `menu_cache` table | There is no such table; the cache is in memory, per instance. | Retrieval reads `loadVenueMenu()` (+ options from the catalog query). |
| "Next.js Edge Functions" | The service-role client, `node:crypto` and LangGraph's async context need the **Node** runtime. | `export const runtime = 'nodejs'` on both agent routes. |
| New SQL RPCs (`get_daily_sales_summary`, …) | The same numbers already exist as tested TypeScript services that the dashboard uses. A second implementation in SQL would drift. | Co-pilot tools **wrap the existing services**. |
| `/analytics/vibey`, `app/(host)/…`, `app/(guest)/components/…` | The host lives at `/host/control-center?tab=…`; components live in `components/guest/**` and `components/host/**`. | Paths in §9 follow the real layout. |
| Llama-3.1-8b-instant | The project already runs `openai/gpt-oss-120b` on Groq. The model is a Phase 0 measurement, not an assumption. | Eval-driven choice (§7). |
| "< 300 ms" voice → cart | One network round trip to a hosted model, plus speech recognition, cannot be promised at 300 ms. | Budgets per stage (§8), measured in Phase 0. |
| "Show Veg starters" chip | The catalog has no veg data, so the agent would have to guess. | No dietary answers until hosts can tag dishes (Phase 4); until then the agent says to ask the staff. |
| Log raw prompts | Guests type names, phone numbers and allergies; storing raw text is a privacy liability (India's DPDP Act). | Store structured outcomes, not text, by default (§10). |
| Dark neon-purple widget | The guest menu is a light, editorial design (white, zinc, Playfair). | Vibey uses the menu's own design language (§6). |
| Co-pilot reads locked data | The PIN lock is client-side today; a chat panel would bypass it. | The co-pilot honours the lock (§5.4). |
| `computeEodReport` as is | It finds the venue with `host_id = user.id … .single()`, so it fails for hosts with two venues and ignores the venue in the URL. | Refactor to take `businessId` (Phase 2 prerequisite). |

---

## 3. Framework decision

Checked on npm today [npm]:

| Package | Latest | Role it could play |
|---|---|---|
| `@langchain/langgraph` | 1.5.1 | State-graph orchestration, conditional edges, `interrupt()` for human-in-the-loop, checkpointers, streaming. Peer deps: `zod ^3.25.32 \|\| ^4.2.0`, `@langchain/core ^1.1.48` (this repo has `zod ^4.6.5`, so it is compatible). |
| `@langchain/core` | 1.2.18 | Required peer of LangGraph. |
| `ai` (Vercel AI SDK) | 7.0.143 | Provider-agnostic model calls, tool calling, streaming helpers. |
| `@ai-sdk/groq` | 4.0.63 | Groq provider for the AI SDK. |
| `@openai/agents` | 0.20.0 | Agent loop, handoffs, guardrails (0.x API). |
| `@mastra/core` | 1.78.0 | Full agent framework: workflows, memory, evals. |
| `groq-sdk` | 1.6.0 | Groq's official client. |

**Decision:**
1. **Orchestration: LangGraph.js.** The two agents are explicit graphs with branches: act, clarify, answer, hand off. LangGraph makes those edges first-class and testable node by node. It adds `interrupt()` and checkpointers exactly when Phase 4 needs confirm-before-write host actions.
2. **Model calls: a thin, owned OpenAI-compatible client.** This extends the existing `llm-json.ts` rather than adding LangChain model wrappers. It keeps one place for timeouts, retries, structured output, telemetry and the kill switch, and avoids two abstractions over one HTTP call.
3. **Not chosen now:** Mastra and the OpenAI Agents SDK (more framework than two closed-world agents need; `@openai/agents` is still 0.x), and the AI SDK (a fine choice, but redundant next to LangGraph plus an owned client). Revisit if we add many agents or need its UI streaming hooks.
4. **Supply-chain hygiene:** each of these packages published a new version in the last few days. Pin an **exact** version that has been public for at least 14 days, commit the lockfile, and run `npm audit` in CI.

Phase 0 verifies in the installed type definitions, not from memory, that the graph API used in §4 exists as written: `StateGraph`, `Annotation`, `START`/`END`, `addConditionalEdges`, `interrupt`, and the Postgres checkpointer package.

---

## 4. Architecture

```
Guest phone (menu)                                Host control centre
  VibeySheet ──POST /api/guest/vibey──┐   ┌──POST /api/host/vibey── CopilotDrawer
  (text · voice*)  stream (SSE)       │   │   stream (SSE)          (every tab)
                                      ▼   ▼
                         ┌──────── lib/vibey/core ────────┐
                         │ llm client (Groq, JSON, timeout,│
                         │ retry, budget, kill switch)     │
                         │ telemetry (structured, no text) │
                         └────────────────────────────────┘
        guest graph                                   host graph
  guard → retrieve → fastpath? ─┐             guard → route(tools) → run tools → compose
                │ no            │ yes                        (existing services, venue
                ▼               ▼                             injected from session)
           understand(LLM) → resolve(code) → decide → respond
                                   │
                    ACT · CLARIFY · ANSWER · HANDOFF
```
\* voice in Phase 3.

### 4.1 Guest graph (one HTTP turn, stateless server)
The client sends the last ≤ 6 turns, the current tray (ids and quantities only), `cafe_id` and `table`. The server keeps no session.

| Node | Does | Model? |
|---|---|---|
| `guard` | `validateGuestAccess`; rate limit per venue+table and per IP; text ≤ 300 chars; history ≤ 6 turns; feature flag on for this venue. | no |
| `retrieve` | `loadVenueMenu(venue)` plus option flags; builds a candidate list for this utterance by **hybrid lexical retrieval**: token overlap, a Hinglish alias map (*chai/tea, thanda/cold, do=2, teen=3*), and fuzzy edit-distance. Top-k (≈ 20) dishes go to the prompt, not the whole menu. | no |
| `fastpath` | A rule parser for the commonest shapes ("2 cold coffee", "one more chai", "remove the pasta"). If every mention resolves with high confidence, it **skips the model**. | no |
| `understand` | Structured output: `intent` (`add`, `remove`, `set_qty`, `ask`, `browse`, `checkout`, `call_staff`, `smalltalk`), `mentions[] {text, qty, note}`, `question`. **The schema has no item id or price fields.** | yes |
| `resolve` | Closed-world matcher: maps each mention to catalog ids with a score. ≥ high threshold: accepted. In the ambiguous band: top-3 options. Below: "not on the menu" plus the nearest dishes. Quantity clamped 1–20, ≤ 10 lines per turn. | no |
| `decide` | Conditional edge to `ACT` (all resolved), `CLARIFY` (any ambiguous), `ANSWER` (question about listed dishes), or `HANDOFF` (call staff, dietary or allergy questions, anything outside the menu). | no |
| `respond` | Builds the reply from templates plus data from the catalog. An optional one-line model phrasing must not contain a number, price or dish name that is not in the payload; if it does, the template is used. | optional |

Output (validated with Zod before it leaves the server):
```ts
type VibeyGuestReply = {
  reply: string;
  actions: Array<
    | { type: 'add'; itemId: string; qty: number; note?: string }   // client opens the options drawer if the dish has options
    | { type: 'remove'; itemId: string; qty?: number }
    | { type: 'set_qty'; itemId: string; qty: number }
    | { type: 'open_tray' }
    | { type: 'call_staff'; reason: 'help' | 'dietary' | 'other' }>;
  cards: Array<{ itemId: string }>;                 // the client renders name, price and photo from its own menu
  chips: string[];                                   // next suggestions, built by code
  meta: { path: 'fastpath' | 'model' | 'fallback'; ms: number };
};
```
The client applies `actions` to the existing cart store and shows an **Undo** for the agent's last change. The agent never places an order. The guest taps **Review & place order**, which opens the existing cart review, and the server re-prices from the catalog as it does today.

### 4.2 Host graph (read-only in Phases 1–3)
| Node | Does |
|---|---|
| `guard` | `requireHost`; staff roles: owner and cashier only (`staffMayCall` gets an explicit rule; waiter and chef are refused). The lock check is in §5.4. Rate limit per venue. |
| `route` | Chooses ≤ 2 tools and their arguments from a fixed allowlist (structured output). A keyword router is the fallback when the model is unavailable. **The venue id is never an argument**: the server injects it from the session. |
| `tools` | Run in parallel, each a thin wrapper over an existing service (table below), each with a timeout. |
| `compose` | Returns **cards** with the tool's numbers verbatim (KPI tiles, a top-items list, a dues box, invoice rows), each with a deep link into the right tab. An optional summary sentence passes a **number verifier**: every number in it must appear in the tool output after normalisation, or the template sentence is used. |

| Tool | Wraps | Arguments (enum/bounded) |
|---|---|---|
| `sales_summary` | `computeEodReport` (after the `businessId` refactor) | `timeframe: daily, yesterday, weekly, 30d, mtd, monthly` |
| `profit_and_loss` | `computeEodReport().pnl` | timeframe |
| `top_items` | `computeEodReport().reports.items` | timeframe, `limit ≤ 10` |
| `stock_alerts` | `computeEodReport().critical_items` | none |
| `dues` | `fetchInvoiceSummary` + `fetchDaySlips` | `range: today, 7d, all` |
| `find_invoice` | `fetchInvoiceDetail` | `orderNumber` (ORD-xxx) or invoice number, matched by code |
| `live_tables` | `getHostTables` | none |
| `deliveries` | `listDeliveryOrders` | none |
| `reservations` | `listReservations` | `day: today, tomorrow` |
| `guests` | ledger / `computeEodReport().reports.guests` | timeframe |

---

## 5. Safety, isolation and "no hallucinations" — how it is guaranteed

### 5.1 Closed world (guest)
- The model never outputs an item id, a price or a total. Ids come from `resolve`; prices and totals come from the catalog and the cart store.
- An unresolved dish is never added. The agent asks or says it is not on the menu.
- Order placement stays a guest tap, and the server re-prices it.
- **Dietary, allergy and "is it spicy" questions are refused politely and handed to staff** until the catalog has tagged fields (Phase 4). The agent must not infer them from dish names.

### 5.2 Grounded numbers (host)
- Cards render tool JSON directly. Free text carrying a number must pass the number verifier, or it is replaced by the template.
- Every answer shows its scope: "Today, 10 AM–10 PM · settled bills · as of 14:32".

### 5.3 Tenant isolation
- The guest venue comes from `validateGuestAccess(cafe_id)` and the host venue from `requireHost`. Neither is ever taken from model output or chat text.
- Tests send forged `venue_id` and `cafe_id` values in the body, headers and prompt text, and expect 403s or no effect (§11).

### 5.4 The PIN lock must not be bypassed
- **Phase 2 (immediate):** the co-pilot drawer only offers locked-module tools (`dashboard`, `payments`, `guests`, …) when the screen is master-unlocked, mirroring today's client gate.
- **Phase 4 (proper fix):** the PIN check issues a short-lived signed unlock token, which the co-pilot route (and later the dashboard APIs) verifies server-side.

### 5.5 Prompt injection
- Dish names and descriptions are host-entered **data**. They are fenced and labelled as data in the prompt and never treated as instructions.
- Guest text cannot change venue, table, price, or which tools exist.
- The worst a successful injection can do on the guest side is *propose* a tray change from the real menu, which the guest sees and confirms. On the host side it can at most choose a different read-only tool for the same venue.
- An injection corpus is part of the eval set (§7).

### 5.6 Abuse and cost
- Rate limits per venue+table, per IP and per venue per day.
- A per-venue daily model budget. When it is spent, Vibey runs in **fastpath-only mode** and the UI says so.
- One environment kill switch (`VIBEY_ENABLED=0`) plus per-venue flags.

---

## 6. UI — what it looks and feels like

### 6.1 Guest: "Ask Vibey" on the menu
- **Entry:** a small pill above the floating tray bar ("Ask Vibey · order by chat"), in the menu's own style (white, zinc, Playfair accents). It does not cover the tray bar or the quick-actions dial (`components/guest/menu/MenuDock.tsx`).
- **Sheet:** the existing `components/guest/shared/BottomSheet.tsx`, ≈ 85 % height. Header: venue name, table, "Vibey only adds to your tray. You confirm the order."
- **Message types:**
  - guest bubble;
  - Vibey text;
  - **dish cards** (photo, name, price from the client's own menu, − qty +);
  - **"Added to tray"** receipt listing exactly what changed, with **Undo**;
  - **clarification chips** ("Which coffee? Cold Coffee ₹220 · Cappuccino ₹180");
  - **tray summary card** with **Review & place order**, which opens the existing cart review;
  - **"Call staff"** card for help and dietary questions (uses the existing `app/api/guest/call-staff/route.ts`).
- **Composer:** text field, send button, and code-built suggestion chips ("What's popular?", "Add one more of the same", "Show desserts"). The mic arrives in Phase 3.
- **States:** typing indicator, "Vibey is offline, but you can still order from the menu", "Busy time, simple orders only" (fastpath mode), rate-limited message.
- **Accessibility:** the feed is an `aria-live="polite"` region, focus is trapped in the sheet, targets are ≥ 44 px, reduced motion is respected, and every action has a text label.

### 6.2 Host: "Ask Vibey" co-pilot
- **Entry:** a button in the desktop sidebar and the mobile header, plus `⌘/Ctrl + K`. It is available on every tab.
- **Panel:** a right-hand drawer on desktop (≈ 420 px) and a full sheet on phones.
- **Suggestions by context:**
  - on Dues: "What do I owe today?";
  - on Analytics: "Compare this week with last";
  - on Tables: "Which tables have been open longest?".
- **Answers are cards, not paragraphs.** They reuse existing components where they fit: KPI tiles in the style of `components/host/workspaces/dashboard/KpiStrip.tsx`, `components/host/payments/DailyBars.tsx`, `components/host/wallet/InvoiceRowView.tsx` rows, stock rows. Each card has an **Open in Analytics / Dues / Tables** link via the workspace's `onNavigate`.
- **Trust strip** under every answer: scope, timestamp, "read-only", "from your settled bills".
- **Locked state:** "Unlock with your master PIN to ask about money and guests", using the existing gatekeeper modal.

---

## 7. Models and evaluation (Phase 0, before any build)

1. **Inventory:** `GET {LLM_BASE_URL}/models` with the configured key. Record which models are available today [verify].
2. **Golden set** in `tests/vibey/golden/*.jsonl`, built from the demo café menu (no real guest data):
   - ≈ 150 guest utterances: English, Hindi in Latin script, Hinglish, typos, multi-item, remove and change, questions, injections;
   - ≈ 60 host questions.
   Each has the expected intent, resolved ids and quantities, or the expected tool and arguments.
3. **Candidates:**
   - the configured `openai/gpt-oss-120b`;
   - the blueprint's `llama-3.1-8b-instant`;
   - one mid-size model from the inventory.
   Each is run with and without the provider's JSON or structured-output mode, which must be checked per model [verify].
4. **Metrics:**

   | Metric | Target |
   |---|---|
   | Wrong-dish adds | **0** (hard gate) |
   | Intent accuracy | ≥ 95 % |
   | Clarification rate | reported |
   | Valid JSON after one repair retry | ≥ 99.5 % |
   | Host tool and argument accuracy | ≥ 95 % |
   | Latency p50 / p95 | reported |
   | Tokens per turn | reported |

5. **Limits:** read the `x-ratelimit-*` response headers to learn the free-tier ceilings [verify], and size the per-venue budget from them.
6. **CI:** the golden set runs against recorded fixtures on every push (no network). A live run happens on demand and nightly once a scheduler exists. The repo has none today, so it is triggered manually until then.

The model is chosen from these numbers and recorded as an ADR in `docs/adr/`.

---

## 8. Latency budget (targets, to be confirmed in Phase 0)

| Path | Budget (server, p95) | Notes |
|---|---|---|
| Guest fastpath (no model) | ≤ 150 ms | Menu is in memory; the rule parser and resolver are pure functions. |
| Guest model path | ≤ 1.5 s, first token ≤ 600 ms when streamed | To be confirmed against the chosen model's measured p95. |
| Host co-pilot | ≤ 2.5 s | Dominated by `computeEodReport`, which today reads up to a period of orders. |
| Voice (Phase 3) | + recognition time | Shown as a live "listening" transcript, so the wait is visible. |

---

## 9. Files (following the repo's layout and the ~80–120-line rule)

```
lib/vibey/core/llm.ts                 owned Groq client: json mode, zod parse, 1 repair retry, timeout, budget, kill switch
lib/vibey/core/telemetry.ts           structured turn log (no raw text by default)
lib/vibey/guest/retrieve.ts           hybrid lexical retrieval + Hinglish alias map
lib/vibey/guest/fastpath.ts           rule parser for common orders
lib/vibey/guest/resolve.ts            closed-world matcher, thresholds, clarification options
lib/vibey/guest/graph.ts              LangGraph wiring (guard → retrieve → fastpath/understand → resolve → decide → respond)
lib/vibey/guest/schema.ts             zod schemas: model output, reply
lib/vibey/host/tools.ts               tool allowlist wrapping existing services (venue injected)
lib/vibey/host/graph.ts               LangGraph wiring (guard → route → tools → compose)
lib/vibey/host/verify-numbers.ts      number verifier for any free-text summary
app/api/guest/vibey/route.ts          runtime=nodejs, SSE stream
app/api/host/vibey/route.ts           runtime=nodejs, SSE stream
components/guest/vibey/VibeyLauncher.tsx · VibeySheet.tsx · VibeyMessage.tsx · VibeyDishCard.tsx · useVibeyGuest.ts
components/host/vibey/CopilotButton.tsx · CopilotDrawer.tsx · CopilotCards.tsx · useCopilot.ts
supabase/migrations/2026xxxx_vibey.sql + supabase/apply-pending-<date>-vibey.sql
tests: lib/vibey/**/*.test.ts · tests/vibey/golden/* · tests/e2e/vibey-*.e2e.test.ts · scripts/audit/vibey-isolation.mjs
```
Prerequisite refactor: `computeEodReport(requestUrl, supabase)` gets a `businessId` parameter, so tools and the dashboard read the same venue the URL shows.

---

## 10. Data, privacy and retention

- **`vibey_turns`:**
  - columns: `id`, `business_id → businesses(id)`, `surface (guest|host)`, `table_number`, `intent`, `actions jsonb` (ids and quantities only), `path (fastpath|model|fallback)`, `model`, `latency_ms`, `tokens_in`, `tokens_out`, `error_code`, `created_at`;
  - RLS on, no anon or authenticated policies, written by the service role;
  - hosts read aggregates through the API.
- **Raw text is off by default.** If it is enabled for debugging, it is stored redacted (phone numbers, emails), kept for a short window, and deleted by `pg_cron` if the project has it enabled [verify], otherwise trimmed on insert.
- **Notice:** the guest sheet says what Vibey does with messages.
- **Voice:** Chromium's speech recognition sends audio to the browser vendor's servers, so the mic shows a one-line notice before first use. Server-side transcription (for example Groq-hosted Whisper, availability [verify]) is the alternative in Phase 3.
- **Per-venue flags:** `businesses.vibey_guest_enabled` and `businesses.vibey_host_enabled`, default off, so rollout is opt-in per venue.

---

## 11. Quality gates (each phase ships only when all of its gates pass)

| Gate | How |
|---|---|
| Wrong-dish adds = 0 | Golden set, plus a property test: random menus × random utterances never yield an id outside the menu. |
| Tenant isolation | e2e: forged venue/table in the body, headers and prompt → 403 or no effect; host tools never read another venue (disposable venues, as the existing A-to-Z e2e does). |
| Roles and lock | Waiter and chef PIN sessions → 403 on `/api/host/vibey`; locked tools not offered while the screen is locked. |
| Injection corpus | Zero tool or venue escalations; at most a visible, unconfirmed tray proposal. |
| Fallback | With the key removed or a 429 from the provider: the guest fastpath still adds "2 cold coffee"; the co-pilot keyword router still answers "today's sales". |
| Schema | Every reply passes Zod; a fuzzed model output never crashes the route. |
| Latency | §8 budgets met on the measured p95. |
| Code health | `npm run verify` (typecheck, lint, tests, migrations, guard audit) green; files ≈ ≤ 120 lines. |

---

## 12. Delivery plan

| Phase | Ships | Exit criteria |
|---|---|---|
| **0 · Prove** (2–3 days) | Model inventory, golden set, eval harness, latency/limit measurements, pinned dependency versions, ADR. | §7 metrics measured; model chosen. |
| **1 · Guest MVP** (≈ 1 week) | Text chat, fastpath, resolver, LangGraph guest graph, dish cards, Undo, tray hand-off, call-staff hand-off, flags, telemetry, rate limits. | Wrong-dish adds = 0 on the golden set; isolation + fallback e2e green; one pilot venue enabled. |
| **2 · Host co-pilot** (≈ 1 week) | `computeEodReport` refactor, read-only tools, cards with deep links, number verifier, roles and lock gating. | Tool accuracy ≥ 95 %; roles/lock e2e green. |
| **3 · Voice + streaming** | Mic (Web Speech where supported, feature-detected), `en-IN`/`hi-IN`, SSE streaming, optional server transcription. | Hindi/Hinglish voice golden subset ≥ 90 % intent accuracy. |
| **4 · Act, with a human in the loop** | Host write actions through LangGraph `interrupt()` + confirm cards (mark table vacant, advance a delivery, share an order with a vendor), Postgres checkpointer for multi-turn tasks, server-side unlock token, dishes tagged with dietary fields so Vibey can answer dietary questions safely, pgvector retrieval once menus exceed a few hundred dishes. | Every write needs an explicit confirm; audit log of agent-initiated changes. |

---

## 13. Open decisions for you

1. **Rollout:** start with one pilot venue (recommended) or all venues behind the flag.
2. **Raw-text logging:** off (recommended) or redacted with a short retention window.
3. **Voice in Phase 3:** browser recognition only, or add server transcription (better Hindi, uses the model budget).
4. **Dietary tags:** do you want hosts to tag veg / Jain / allergens in the catalog (needed before Vibey can answer those questions)?
