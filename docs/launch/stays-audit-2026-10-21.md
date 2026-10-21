# Stays and accommodations: deep audit and launch verdict (2026-10-21)

Scope: everything a guest or the desk can do around a room, from the public showcase to the stay history, on code
at commit `3d97ca0` plus the fixes listed under "Fixed during this audit". Method: the full verification pipeline, a
line-by-line pass over every stay and room route and service, a new stress suite for the races, a live probe of the
database with the public key, and warm latency measurements of every guest-facing endpoint.

## Verdict

**Ready for launch, on four conditions** (all in the "Before launch" list): migrations 06 to 10 applied in production,
the staff session secret set on Vercel, a decision on GST for room tariffs, and the stale test bookings cleared.
Nothing found blocks a real guest or a real desk; the one correctness bug found (two guests could book the last room in
the same instant) is fixed and covered by a test.

## What was checked and what it found

### 1. Verification pipeline

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| `eslint` | clean |
| `vitest` | 182 files, 1,248 tests pass (now 1,255 with the stress suite) |
| `check:migrations` | 141 migrations, versions unique |
| `audit:guards` | 161 owner-side handlers, each guarded before its first database call |
| `scripts/audit/rls-anon.mjs` (live database) | PASSED: the public key reads only the six public tables and changes nothing, over 107 tables |

### 2. Security of the stay surface

- Every guest stay and room route is rate limited (showcase, book, pass lookup, check-in, ID upload, room lookup,
  mine, room state, verify, order, service, late check-out, check-out request; `leave` added in this audit). Limits are
  per address and venue or room code; room lookup and digit verification allow 8 tries per 15 minutes and answer every
  mismatch the same way.
- Every host accommodation route runs `requireHost` first; a staff PIN session gets the service client scoped to its own
  venue, and an owner session the row-level client.
- The room cookie is an HMAC-signed, HttpOnly token bound to room, venue and the stay's start; it stops working the
  moment a new stay begins in the room (tested). Sign-out of the Vibers ID drops every room cookie on the phone.
- Pass links are stored hashed; a pass is claimed with a conditional update, so a shared or double-tapped link checks
  in one guest (tested). A failed check-in gives the pass back.
- The public room API returns the guest's first name only, and only once the phone is confirmed; never the phone,
  the ID, or the payment reference. The showcase returns nothing about occupants.
- The stay log table's old "public read" policy is dropped and anon grants revoked by migration 06, confirmed by the live probe.

### 3. Races and double actions (new `stay-stress.test.ts`, plus the 16-step pipeline)

| Situation | Outcome | Covered by |
|---|---|---|
| Two guests book the last room in the same instant | exactly one booking; the other gets "just taken" | stress (fixed in this audit) |
| A guest still in a room past the check-in date | counted against availability; later non-overlapping stay accepted | stress |
| Two self check-ins at once, two rooms free | two different rooms; the third is refused | stress |
| Pass used twice | second use refused, pass stays used | stress, pipeline |
| Late check-out granted twice | second refused, one fee bill, advance raised once | stress |
| Room cookie after a new stay, wrong room, tampered | all refused | stress |
| Check-out request on a vacated room | refused, nothing written | stress |
| Two desks check into one room | the second gets a 409 (conditional on status) | status route |
| Checkout retried after a failure | the same invoice is reused; "Check Out" twice does not mint a second invoice | checkout route, pipeline |
| Same-day stay checked out | booking closes as `checked_out` (migration 10) | stay-hub test |
| A previous guest's open order on the room | excluded from the new guest's folio and bill | stay-scope tests |

### 4. Domain outcomes, A to Z

Reserve: valid; name, phone, dates, nights (1 to 30), guests (1 to 20) invalid; past date; fully booked; race;
signed-in guest without a usable phone (asked for one). Pass: issued with tender and reference; idempotent on retry;
void and refund; expired; rotated link; lookup by code. Check-in: self with photo or ID number; from a booking with a
different room type (tariff of the actual room); desk walk-in; desk from a booking with its pass; housekeeping and
maintenance holds. In room: unconfirmed phone; wrong digits; stay ended; dining off or kitchen closed (browse only);
order misrouted to the table API (refused); late check-out offered only while the type is free the next night;
check-out request, cancel, dismiss, cleared by checkout. Checkout: no tender (invoice pending), tender later, refund
due when the advance exceeded the stay, cashback once per guest handle against the invoice, booking closed, request
cleared, stay log written. After: farewell page and sheet, bill and cashback in Me, stay reads "Stayed", Stay tab
offers "Reserve" again. History: list, filters, full record with invoice lines, advances, orders and cashback.

### 5. Latency

Measured on the dev server (Turbopack) from this laptop, warm, 8 requests each. The laptop's round trip to the
database is 150 to 500 ms and to the rate limiter 50 to 240 ms, so the absolute numbers are the network, not the code.
What matters for production is the depth of sequential round trips, shown with the projection for Vercel and Supabase
in the same region (about 30 ms per trip).

| Endpoint | p50 here | sequential trips | projected production |
|---|---|---|---|
| `/stay/<venue>` page | 270 to 480 ms | 1 (static shell, data seeded client-side) | under 100 ms |
| `/room/<code>` page | 280 to 490 ms | 1 | under 100 ms |
| showcase API | 720 to 810 ms | 2 (venue, then rooms + types + bookings in parallel with the limiter) | 60 to 120 ms |
| stay/mine API | 720 to 800 ms | 3 (venue, then venue + rooms + session + account in parallel with the limiter, then bookings) | 90 to 180 ms |
| room state API | 820 to 970 ms | 2 (room with venue, then hours + folio + invoice + availability in parallel with the limiter) | 60 to 120 ms |
| menu API | 240 to 365 ms | 1 to 2 | 40 to 80 ms |

Changed in this audit: the stay/mine limiter call now runs beside the reads instead of before them (one trip saved).
Pages open instantly from seeds read after mount; the API refresh lands behind them.

## Fixed during this audit

1. **Overbooking race.** Two bookings for the last room in the same instant both passed the availability check. A
   booking is now ranked among the bookings overlapping it after it is written; one past the rooms that exist withdraws
   itself (`overbooked` in `stay-availability.service.ts`).
2. `POST /api/guest/stay/leave` had no rate limit; it has one.
3. stay/mine makes one round trip fewer.

## Before launch (open)

1. **Apply migrations 06 to 10 in production** (`20261021000006` to `20261021000010`), in order. Without 10, a
   same-day checkout leaves the booking "checked in" for the guest.
2. **Set `STAFF_SESSION_SECRET` on Vercel.** It signs room cookies and staff sessions; without it room pages cannot
   confirm a guest.
3. **GST on room tariffs.** Room invoices carry `taxAmount: 0`; the venue has a GSTIN. Decide whether tariffs are
   GST-inclusive (print the split) or exclusive (add the slab); the receipt and `stay-invoice.ts` then need the lines.
   A compliance item, not a flow bug.
4. **Clear the test bookings and stays** on Bombay Rasoi before real guests see the history (six test stays, several
   `ready_for_settlement` orders from earlier trials on suite1).
5. Room lookup from the menu ("Find my room") is available only when in-room dining is on; a venue with dining off
   confirms guests through the QR card in the room only. Acceptable; documented.
6. Stay history lists the latest 100 stays without paging; fine for a venue's first year, add paging when a venue passes it.
7. Pre-existing oversized files (`checkout/route.ts` ~440 lines, `useBillingSession.ts`, `stay-pass.service.ts`)
   are on the follow-up card; behaviour is tested, splitting is housekeeping.

## How to re-run

```bash
npm run verify
```

```bash
node scripts/audit/rls-anon.mjs
```

```bash
npx vitest run lib/services/stay
```
