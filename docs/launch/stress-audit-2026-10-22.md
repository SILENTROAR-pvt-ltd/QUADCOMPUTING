# Floor stress audit: KOT, waiter and cashier under a rush

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
