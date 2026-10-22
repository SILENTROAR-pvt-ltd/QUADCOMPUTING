# Floor stress audit: KOT, waiter and cashier under a rush

## Round 2: every table booked (22 October, 18:15 IST, production `abee626`, migration `20261022000004` applied)

All 17 Bombay Rasoi tables at once. The four tables with an open, empty session (T-01, T-02, T-04, T-05) were put
back exactly as they were; every test order was cancelled; nothing was settled.

| Phase | Call | Screens told | Checks |
|---|---|---|---|
| 17 tables order at once | p50 1,170 ms | table screens p50 1,169 ms, 17 of 17 | all accepted |
| 34 add-ons at once (2 per table) | p50 1,309 ms, p95 1,599 ms | p50 1,199 ms, 34 of 34 | 1 bill per table, 51 of 51 dishes, 3 tickets per table |
| 51 tickets to Preparing | write p50 349 ms | terminals p50 431 ms, 51 of 51 | read right after: all Preparing |
| 51 tickets to Ready | write p50 306 ms | terminals p50 353 ms, 51 of 51 | read right after: all Ready |
| 51 tickets Served | write p50 515 ms | terminals p50 430 ms, 51 of 51 | read right after: all Served |
| 17 bill requests at once | p50 701 ms | table screens p50 570 ms | bell once per table (17), 17 bill requested |
| 68 guest phones read at once | p50 679 ms, p95 1,726 ms | | all 68 answered |

**Push volume fixed:** 1.0 floor push per order (it was about 5), and every table got its push.

**Where an order's time goes, on the server** (new Server-Timing header, p50 during the rush):

| Step | Time | Cause |
|---|---|---|
| Find the venue | 150 ms | a new server instance asked the shared store before the database |
| Checks | 90–100 ms | the rate limit is a write to Upstash, which answers in about 70 ms from Singapore |
| Duplicate guard | 140 ms | two more Upstash calls before the guest gets an answer |
| Place the order | 380–440 ms | the reads and the order function |
| Total | 740–910 ms | of 1.2–1.3 s seen by the phone |

### Fixed in this round (in code; deploy to take effect)

- **Guest reads no longer write to Upstash.** Every guest read (on every push) counted its rate limit in Upstash, about
  70 ms each and growing with every venue. Those high ceilings are now counted on the server instance.
- **A venue id goes straight to the database.** The shared miss check (about 70 ms) now applies only to names.
- **The duplicate guard answers first.** It stores the answer just after the guest has it; a retry in between waits for
  that answer, so an order still never runs twice (new test).
- **The order route reports its inside steps:** time queued behind the same table, the reads, the order function, and
  retries, so the next run shows exactly what "place" is made of.
- **Owner screens use the floor push.** Billing and Live Tables held four row-change subscriptions (orders, lines,
  sessions, tables), so one order sent about eight Realtime messages per owner screen, each checked against the
  database's rules. They now use the venue's single floor push, like the staff phones. The unused order-lines
  subscription in the kitchen feed and two duplicate subscriptions (bill requests, guest calls) are gone.
- **The chef's board stays smooth in a rush.** Tickets that did not change keep their identity and each card redraws
  only when its own ticket changes; cards off screen are skipped by the browser (content-visibility); the console's
  new-order bell shares one read per burst instead of one read per ticket.
- **The waiter's Ready bar shows the 12 oldest orders** and a "+N more" card, instead of animating every card.
- **The guest order ceiling is 120 a minute per venue address** (was 40; a full house on one Wi-Fi shares it).

### Capacity: what 1,000 venues needs

Per order, after these fixes: about 10 database calls to place it, about 20 more for the screens that re-read on its
push, 2 Realtime pushes delivered to about 6 devices, and 2 Upstash calls.

| Resource | Today (Supabase Pro, Micro compute) | For 1,000 venues at peak (about 50 orders a second) |
|---|---|---|
| Database | comfortable for tens of busy venues; the 51-order rush ran without errors | about 1,800 queries a second: a Large or bigger compute, and a read replica for the screens' reads |
| Realtime connections | 500 included on Pro | about 34,000 (4 staff screens and about 30 guest phones per venue): buy connection add-ons or move up a plan, and consider guests listening only while they have an open order |
| Realtime messages | 5 million a month included | about 300 deliveries a second at peak: within paid limits, now that each order sends 2 pushes instead of about 10 |
| Upstash | global database, about 70 ms from Singapore | create the database in Singapore (ap-southeast-1) to save about 140 ms per order |
| Vercel | functions in Singapore | scales on its own; watch function concurrency on the plan |

The code is now shaped for that scale (one push per change, no per-row subscriptions on owner screens, no shared
store on reads). What remains for 1,000 venues is capacity you buy: database compute, Realtime connections, and an
Upstash database in Singapore.

---

## Round 1

Date: 22 October 2026, 17:55 IST. Target: production (`www.vibersconnect.com`, functions in Singapore, commit
`c03cb70`). Venue: Bombay Rasoi, 12 tables at once (T-03 and T-06 to T-16). Your live T-01 bill and the tables with
sessions left open from 15–18 October (T-02, T-04, T-05) were not touched. Every test order was cancelled afterwards;
nothing was settled, so no bill or fee was recorded.

## Verdict

**The backend held under the rush with no wrong data.** All 36 parallel orders landed exactly once, every table kept
one bill, every kitchen and waiter move was visible on the very next read, and the bill bell rang once per table.

**Two problems showed up, both now fixed in code** (not yet on production):

1. One table's push was lost in the first burst. The database sent one push per row written, 732 in the run, which
   can approach Supabase Realtime's message rate. Fixed by migration `20261022000004` (one push per change).
2. The screens' flip-back and late-order bugs you saw came from a 2-second server cache, plus screens that let an
   older answer overwrite a newer one. Both were fixed earlier today; a replay of 300 rushes proves the screen logic.

## What was run

`scripts/audit/floor-stress.mjs` drives the floor the way the screens see it:

| Phase | What happens | Through |
|---|---|---|
| 1 | All 12 tables order at the same moment | the public guest order API, as phones send it |
| 2 | Two more guests per table order at the same moment: 24 orders in parallel | same |
| 3 | The kitchen moves all 36 tickets to Preparing, then to Ready, all at once | `update_kot_status`, the function the kitchen route runs |
| 4 | The waiter marks all 36 Served at once | same |
| 5 | All 12 tables ask for the bill at once | the public guest session API |
| 6 | Each guest's phone reads its bill right after | the public guest order API |

Pushes were timed on the channels the screens listen to: the venue's floor ping (kitchen, waiter, cashier terminals)
and each table's own channel (the guest's phone).

## Results on production

| Phase | Call | Screens told |
|---|---|---|
| 1. 12 tables order at once | p50 912 ms, p95 1,204 ms, max 2,034 ms | table screens p50 920 ms; **11 of 12 got their push** |
| 2. 24 add-ons at once | p50 867 ms, p95 1,036 ms | p50 788 ms, p95 884 ms, 24 of 24 |
| 3a. 36 tickets to Preparing | write p50 434 ms | terminals p50 507 ms, 36 of 36 |
| 3b. 36 tickets to Ready | write p50 244 ms | terminals p50 377 ms, p95 420 ms, 36 of 36 |
| 4. 36 tickets Served | write p50 292 ms | terminals p50 387 ms, 36 of 36 |
| 5. 12 bill requests at once | p50 671 ms, p95 863 ms | table screens p50 575 ms |
| 6. Guest reads right after | p50 374 ms | |

The kitchen and waiter writes were sent from India straight to the database, so about 250 ms of each is distance; a
tap on a terminal goes through Singapore and is shorter.

| Integrity check | Result |
|---|---|
| All 36 orders accepted | pass |
| Exactly one open bill per table | pass (1 on each of 12) |
| Every dish on its table's bill once | pass (36 of 36) |
| One kitchen ticket per order | pass (3 on each table) |
| Every stage change reached the terminals by push | pass (36 of 36, three times) |
| A read right after each change shows it | pass (Preparing, Ready, Served) |
| The bell rings once per table for the bill | pass (12 calls for 12 tables) |
| Every table shows "bill requested" for the cashier | pass (12) |
| One bill request per table in the cashier's list | pass (12) |
| Every guest sees their bill | pass |
| Every table's screen got its push in the first burst | **fail: 11 of 12** |

## Findings and fixes

**1. Too many pushes in a rush (fixed, migration `20261022000004` to apply).** One order writes about five rows, and
the floor ping and the table ping each fired once per row: 732 floor pushes for this run. Realtime limits messages per
second, and one table's push was lost. The migration makes each database change send at most one push per channel; a
ticket changing stage still always names itself. Expected: about 2 pushes per order instead of 10.

**2. A lost push left a screen stale for up to 30 seconds (fixed in code).** Screens now read at once when their push
channel reconnects, and their safety read runs every 10 seconds instead of 30.

**3. Stale reads flipped tickets back and hid new orders (fixed in code earlier today).** The kitchen and tables reads
no longer keep a 2- and 2.5-second cache, and a screen never moves a ticket backwards. `kitchen-merge.stress.test.ts`
replays 300 rushes of 36 tickets with late, out-of-order and lost pushes and reads: zero backward moves, and every
screen ends on the true state. The same replay with the old logic does show flip-backs, so the test catches the bug.

**4. Orders take about 0.9 s each under a rush, against 0.53 s alone (measured; instrumented).** The guest's thank-you
card no longer waits for this, so the guest does not feel it; the kitchen hears an order in about 0.8–0.9 s during a
rush. The order route now reports its own time per step in a `Server-Timing` header, and the stress script prints it,
so the next run shows whether the extra time is the server or the network.

**5. The guest order limit is 40 per minute per address and venue.** The test stayed under it. A whole venue on one
Wi-Fi shares one address, so a very large rush could reach it; worth watching rather than changing now.

**6. Caches that remain are safe.** The menu (15 s, and each dish's availability is checked again when the order is
placed), the venue's identity (60 s) and the public menu, events and venue-status responses (10–30 s at the edge). The
order, session, kitchen and tables reads are not cached.

## What this run could not cover

- The staff and owner screens themselves: signing in to them is yours to do. The run drove the same database
  functions and pushes those screens use; you can watch your open screens during the next run.
- The cashier's settle step: settling test orders would put them into your sales and Z-report, so they were cancelled
  instead. Settlement correctness is covered by the test suite.

## To finish

1. Apply `supabase/migrations/20261022000004_ping_once_per_change.sql` in the Supabase SQL editor.
2. Deploy today's fixes ("commit nd gitpush").
3. Re-run, with your kitchen, waiter and billing screens open:

```bash
node scripts/audit/floor-stress.mjs . https://www.vibersconnect.com 189664b2-99e7-4d45-ac50-ffb647ef97df T-03,T-06,T-07,T-08,T-09,T-10,T-11,T-12,T-13,T-14,T-15,T-16
```
