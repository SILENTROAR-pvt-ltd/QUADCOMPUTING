# Floor latency: order to bill, measured and fixed

Date: 22 October 2026. Venue used: Bombay Rasoi (test venue), table T-16. Every test order was cancelled afterwards and
the table left vacant. Commit with the fixes: `c03cb70` on `main`.

## Verdict

**Latency is now four to six times lower, and the bill bell rings.** Measured on production after `c03cb70` went live at
17:19 IST:

- An order reaches the kitchen in about 0.5 s instead of 2.4–4.9 s. The first order of a new bill takes about 0.9 s.
- The guest sees the thank-you card on the tap, instead of waiting 3–5.5 s.
- A bill request takes about 0.6 s instead of 3.5 s, and it now rings the bell.

Most of what remains is the trip from India to Singapore and back, plus a few calls on the server.

## How it was measured

`scripts/audit/order-latency.mjs` runs the floor pipeline against the live site from a laptop in India, the way a
guest's phone and a staff phone would see it:

1. A guest places an order three times (one new bill, then two add-ons) through `POST /api/guest/order`.
2. The kitchen ticket moves PREPARING, READY and SERVED through `update_kot_status`, the database function the kitchen
   route calls.
3. The guest asks for the bill through `PATCH /api/guest/session`.

For each step it records how long the call takes and when the venue's floor ping reaches a listening device. The floor
ping is the push a staff phone reacts to, so its arrival time is when the other screen learns about the change.

## Before: production on 22 October, 16:46 IST

| Step | Call | Other screens told after |
|---|---|---|
| Guest places order, first of three | 5,544 ms | 4,910 ms |
| Guest places order, second | 3,037 ms | 2,418 ms |
| Guest places order, third | 3,567 ms | 2,967 ms |
| Kitchen ticket to PREPARING | 328 ms | 325 ms |
| Kitchen ticket to READY | 342 ms | 339 ms |
| Waiter marks SERVED | 337 ms | 310 ms |
| Guest asks for the bill | 3,464 ms | 1,705 ms |
| Bell rang for the bill request | no | |
| Simple guest read, `GET /api/guest/order` | 1,323–3,575 ms | |

## Where the time went

**The server and the database were on opposite sides of the world.** The Supabase project is in AWS `ap-southeast-1`
(Singapore). This was confirmed from the database host's address, `2406:da18:…`, which AWS lists under
`ap-southeast-1`. The Vercel functions ran in `iad1` (Washington DC), shown by the `x-vercel-id` header
`bom1::iad1::…`: requests entered in Mumbai and were then carried to Washington. `vercel.json` named no region, so
Vercel used its default.

Every database or cache call from Washington to Singapore costs about 200–250 ms. One guest order made roughly a dozen
of them one after another:

| Part of the order | Round trips |
|---|---|
| Venue lookup when not cached | 1–2 |
| Rate limit, venue billing check and guest sign-in, in parallel | 1 |
| Shared duplicate-order guard before the order | 3 |
| Open bill and its lines, then the menu prices | 2 |
| The atomic order function | 1 |
| Storing the guard's answer and releasing it | 2 |
| Table note, when there is one | 1 |

Roughly twelve trips at 200–250 ms each is the 3–5.5 seconds measured. The database work itself is fast: the same ticket
change made directly took about 330 ms from India, and most of that is the trip from India to Singapore.

**The realtime push was never the problem.** In every step the push reached the listening device within 3 ms of the
write finishing.

**The bill bell had no trigger.** A bill request only changed the table's session and wrote a history row. The bell and
the tray listen for guest calls (`staff_notifications`), so nothing rang, and the sidebar badge came from a 6-second poll.

Other measurements from the same laptop, for scale:

| Destination | Typical round trip |
|---|---|
| AWS Mumbai | 90–100 ms |
| AWS Singapore | 140–150 ms |
| Supabase project | 125–145 ms |
| AWS Frankfurt | 360–390 ms |
| AWS Virginia | 320–410 ms |

## What was fixed

| Fix | What changed | What it saves |
|---|---|---|
| Server region | `vercel.json` pins the functions to `sin1` (Singapore), next to the database and the Upstash cache | Each of the dozen calls drops from about 220 ms to a few ms |
| Instant order for the guest | The thank-you card opens on the tap and the order travels behind it. A refused or dropped order puts the dishes back in the cart and reopens the review with the reason. The request uses `keepalive`, so it finishes even if the page closes | The guest no longer waits for the server at all |
| Fewer guard trips | The duplicate-order guard takes its lock and checks for an earlier answer in one pipelined call, and stores the answer and releases the lock in another | 5 trips become 2 |
| Bill bell | A bill request records a BILL guest call, so the bell rings on host and staff screens, the tray names the table, and Billing lights. The call clears when the table is settled or freed | The bill request rings for the first time |
| Bill lists | The sidebar and billing bill-request lists update on push, with a slow safety read | Up to 6 s of polling delay removed |
| Kitchen and waiter roles | Ready has no Served button on the kitchen board, and the tickets API refuses Served from a chef's sign-in. Live Tables rings once when a ticket turns Ready | The waiter hears Ready at once |
| Staff terminals | Waiter and cashier terminals get the guest-call tray and bell | Calls reach staff phones |
| Shorter waits after a push | Floor ping, POS tables, guest menu and room page now wait 80 ms instead of 250–300 ms before reading | 170–220 ms per update |
| Kitchen route | The extra guest push goes out after the response; the database already pushes the same update | One call off every chef and waiter tap |
| Ticket stage in the push (needs migration `20261022000003`) | A ticket that changes stage names its id and stage, so a waiter's phone moves the card before reading | One read, about 100–200 ms, on staff phones |

## After: production with `c03cb70`, 22 October, 17:20 IST

The deploy went live at about 17:19 IST; `x-vercel-id` now reads `bom1::sin1::…`. Two passes of the same script:

| Step | Before: call / others told | After: call / others told |
|---|---|---|
| Guest places order, new bill | 5,544 / 4,910 ms | 983–1,010 / 887–969 ms |
| Guest adds to the bill | 3,037–3,567 / 2,418–2,967 ms | 532–573 / 461–529 ms |
| Guest asks for the bill | 3,464 / 1,705 ms | 605–665 / 468–617 ms |
| Bell rings for the bill request | no | yes |
| Simple guest read | 1,323–3,575 ms | 357–575 ms (1,721 ms on a cold first hit) |
| Ticket stage change, database function called directly | 328–342 ms | 196–317 ms |
| What the guest sees after tapping Place order | a spinner for 3–5.5 s | the thank-you card at once |

The ticket stage row calls the database directly from India, so the region change does not affect it. It shows that the
push reaches other screens within a few milliseconds of the write. A real chef or waiter tap now goes through Singapore
too, and the person tapping sees the change at once because the screen updates before the server answers.

**Where the remaining half second goes, for an add-on order:**

| Part | About |
|---|---|
| Phone in India to Singapore and back, through Vercel's Mumbai edge | 150–200 ms |
| Shared cache calls: rate limit, then the two duplicate-guard calls | 3 calls |
| Database: open bill, its lines, then the atomic order function | 3–4 calls |

The first order of a new bill takes about 0.4 s longer. The database function opens the table's session as well, and
that request was the first after a pause, so it also met a cold server instance.

**Migration `20261022000003` is applied.** A no-change write to an old guest call produced a floor ping, so guest calls
and ticket stages now reach staff PIN phones by push.

## What is left

- **The ticket push carries a little more.** On the venue's public channel it now includes a random ticket id and a stage
  name, with no table, dish, amount or person. Someone who knows a venue's id could already see that there was
  activity; now they can also see the kitchen's pace.
- **Further trims, if wanted.** The duplicate guard's lock could be taken alongside the venue checks, saving one cache
  call. The open bill and its lines could be read in one query. A per-step server timing header would show exactly how
  the remaining server time splits between the cache and the database, which decides which of these is worth doing.
- **Phones outside India** pay their own distance to Singapore; nothing in the app can remove that.

## How to re-measure

```bash
node scripts/audit/order-latency.mjs . https://www.vibersconnect.com 189664b2-99e7-4d45-ac50-ffb647ef97df T-16
```

It places real test orders on that table and cancels them at the end, so use a test venue and a table nobody is using.
Check that `x-vercel-id` on any API response contains `::sin1::` first.
