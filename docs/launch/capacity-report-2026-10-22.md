# Capacity report: how many venues and guests Quad Computing handles today

Date: 22 October 2026. Production `www.vibersconnect.com` (Vercel functions in Singapore), Supabase Pro in Singapore
on Micro compute (1 GB). First measured at about 19:30 IST with the spend cap on; re-measured the same evening after
the spend cap was turned off and the Realtime limits were raised. Test venue: Bombay Rasoi.

## Verdict

| Setup | Venues in a full rush at the same moment, still instant | Limit hit first |
|---|---|---|
| Until 22 October: spend cap on, Realtime still at the Free plan's 200 devices and 100 events a second | about 8 | Realtime: 200 connected devices |
| **Now**: spend cap off, Realtime at 10,000 devices and 2,500 events a second, Micro | **about 60–80** | the database's read rate (about 100 guest reads a second measured) |
| Spend cap off, Small compute | about 120–160 | database reads |
| Spend cap off, Medium compute, Upstash in Singapore | about 250–350 | database reads |
| Large compute plus a read replica | about 400–600 | Realtime's 10,000 devices (Pro with the cap off) |
| 1,000 venues | Team or Enterprise Realtime limits, extra-large compute, read replicas | |

"Venue in a full rush" means about 25 devices with the app open (4–5 staff screens and about 20 guest phones), a few
orders a minute, and the kitchen moving tickets. Past a limit nothing breaks: devices fall back to reading on a timer,
so screens update every few seconds instead of at once. Venues that are registered but quiet cost almost nothing.

## What was measured today

**Guest reads** (GET /api/guest/order, the read every guest phone makes when its table changes), all phones reading at
the same moment, from one laptop in India:

| Phones reading at once | Answered | Typical | Slowest |
|---|---|---|---|
| 100 | 100 of 100 | 0.88 s | 1.7 s |
| 150 | 150 of 150 | 1.03 s | 1.8 s |
| 200 | 200 of 200 | 1.23 s | 2.0 s |
| 400 | 400 of 400 | 2.48 s | 3.5 s |

The server answered every request; latency grows steadily with load, which is the database queueing on Micro. About
**100–110 guest reads a second** is the comfortable ceiling today. (An earlier run during a deploy lost requests while
Vercel swapped versions, and at 300 some connections failed on the laptop's side; neither was the server refusing.)

**Live pushes** (the venue's floor channel, each device its own connection, like real phones and tablets):

| Devices on one channel | Heard the push | Typical | Slowest |
|---|---|---|---|
| 50 | all | 0.23 s | 1.0 s |
| 100 | all | 0.36 s | 0.5 s |
| 200 | **200 of 600 deliveries** | 1.5 s | 1.9 s |

At 200 devices most deliveries were lost. The dashboard showed why: the project's own Realtime settings were still at
the Free plan's numbers, 200 connected devices and 100 events a second, well below what Pro allows. They were raised on
22 October (see Settings below) and the test was re-run; the result is under "After the Realtime change". In normal
use a venue's floor channel has about 5 listeners and a table's channel about 2, so this limit is reached by the total
across all venues, not by one venue.

### After the Realtime change

Same script, same venue, re-run after the settings below were saved:

| Devices on one channel | Heard the push | Typical | Slowest |
|---|---|---|---|
| 50 | 150 of 150 | 0.23 s | 0.47 s |
| 100 | 300 of 300 | 0.39 s | 0.57 s |
| 200 | **600 of 600** | 0.24 s | 0.38 s |
| 400 | **1,200 of 1,200** | 0.45 s | 1.1 s |

| Phones reading at once | Answered | Typical | 95% within |
|---|---|---|---|
| 100 | 300 of 300 | 0.51 s | 1.5 s |
| 200 | 600 of 600 | 0.75 s | 1.4 s |

Pushes no longer drop: 400 devices on one channel heard every change, typically within half a second. 400 is where
the test stopped, to stay inside the 500 peak devices that Pro includes each month; the setting now allows 10,000. At
about 25 devices per busy venue, Realtime now has room for roughly 400 venues by devices, and by messages (about 30
deliveries per order across its stages) for several hundred, so the database's read rate is the next limit again.

**Orders** (from the 17-table stress test earlier today): 51 orders in parallel all landed once, one bill per table,
about 0.9–1.2 s each; the server's own time was 0.74–0.9 s, of which about 0.3 s is three calls to Upstash (it is
outside Singapore). The kitchen and waiter screens heard each ticket stage in 0.35–0.45 s.

## Where each limit comes from

| Resource | Today | What uses it | When it matters |
|---|---|---|---|
| Realtime connected devices | 10,000 (was 200) | every open screen and guest phone | about 400 busy venues at once |
| Realtime messages | 2,500 a second (was 100) | 2 pushes per order and per ticket stage, each delivered to that channel's devices | several hundred busy venues |
| Database reads (PostgREST on Micro) | about 100–110 guest reads a second | guest phones reading on a push; staff screens reading on a push and every 10 s as a safety net | about 60–80 busy venues |
| Database writes | 51 orders at once without error | orders, ticket moves, bills | far above real need |
| Upstash | about 70 ms per call from Singapore | rate limit and duplicate guard on each order | adds about 0.3 s per order |
| Vercel functions | scale on their own | every API call | not a limit at this size |

The safety-net reads add up: every staff screen re-reads its lists every 10 seconds even when nothing changes. At 100
venues with 4 screens each that is about 120 reads a second on its own, which is why the database, not the code, is the
next limit after Realtime.

## The pasted connection-pooling report, applied to this app

The report is right about Supabase in general, but most of it does not apply here, because **the app never opens a
direct Postgres connection**. Every read and write goes through Supabase's Data API (PostgREST, over HTTPS) with
supabase-js; Supabase runs PostgREST's own connection pool to the database. So:

| Advice in the report | Applies? | Why |
|---|---|---|
| Use transaction mode (port 6543) for serverless | No | Vercel functions call the Data API over HTTPS, not Postgres |
| ORM `connection_limit=1` | No | no ORM, no direct connections |
| Don't run both poolers | No | neither pooler is used by the app |
| Keep pool size at or under 40% when PostgREST is heavy | Yes, as it is | leave Supavisor's pool size at its default; PostgREST needs the rest |
| Micro: about 60 direct connections, 200 pooler clients | Yes | the 60 are shared by PostgREST, Auth, Storage and Realtime; it is why reads queue past about 100 a second |
| Upgrade compute when you hit client limits | Yes | each compute step raises both the connection count and the CPU for reads |
| Monitor with the connections chart and pg_stat_activity | Yes | watch them on the first busy evenings |

Dedicated PgBouncer is not needed: it helps direct-connection clients, which this app does not have.

## Settings: applied in the dashboard on 22 October

| Setting | Before | Now | Why |
|---|---|---|---|
| **Spend cap** (Billing) | on | **off** (applied) | With the cap on, Realtime stops at 500 devices and 500 messages a second, and once a quota is exceeded that usage is refused until the next billing cycle: a launch-day outage risk. Overage is $10 per 1,000 extra peak devices and $2.50 per million messages; usage this cycle was 7 of 500 peak devices, so nothing was charged |
| **Realtime: max concurrent clients** | **200** (the Free plan's number) | **10,000** (applied) | this was the real reason 200 devices lost two thirds of their pushes |
| **Realtime: max events per second** | **100** | **2,500** (applied) | each push counts once per device that hears it |
| Realtime: max presence events per second | 20 | 1,000 (applied) | guest lobbies use presence |
| Realtime: max payload size | 256 KB | 3,000 KB (applied) | Pro's limit; our pushes are tiny |
| Realtime: database and postgres-changes pools | 2 and 2 | unchanged | Micro has only 60 database connections and 36 are already used by Supabase's own services at idle |
| Compute | Micro | Micro (no change) | move to **Small** when the database CPU stays above about 60% at peak or guest reads pass 1.5 s; Small is $0.0206 an hour, about $15 a month, and raises connections to 90 |
| Supavisor pool size | 15 (default), 200 clients | unchanged | the app uses the Data API, not the pooler |
| Data API max rows and pool | 1,000 rows, pool automatic | unchanged | lists are bounded in the code |
| SSL enforcement | on | on | |
| Auth email confirmation | off | unchanged | new sign-ups do not wait on the mailer |
| Auth email rate | 2 emails an hour (built-in mailer) | unchanged | only password resets use email; set custom SMTP before many owners or guests reset passwords |
| Point-in-time recovery | off | off, **needs your approval** | $100 a month for 7 days, $200 for 14, $400 for 28, billed hourly at the end of the cycle; Supabase may also ask for Small compute |
| Usage alerts | none | none | the dashboard has no alert setting; check the Usage page weekly while the cap is off |
| **Vercel plan** | Hobby, no payment method | unchanged, **needs your card** | Hobby is non-commercial only and stops functions for 30 days past 1,000,000 calls or 4 CPU-hours a month; 116,000 calls were used in the 30 days before launch and 10 busy venues would use about 220,000 a day. Upgrade to Pro ($20 a month plus usage) before launch |
| **Upstash plan** | Free tier: 500,000 commands a month, 319,000 used | unchanged, **needs your card** | 10 busy venues would use the allowance within days, after which limits and the duplicate-order guard fall back to each instance; Pay as You Go is $0.20 per 100,000 commands, about $10 a month |
| Upstash region | Global database, primary in Mumbai (read in the console) | unchanged, **needs Pay as You Go first** | every order waits on Upstash writes, and writes always go to the primary, so a Singapore read copy would not help; create a database with its primary in Singapore and swap the two variables in Vercel (steps in `upstash-singapore-move.md`); saves about 0.2–0.3 s per order |

## How to re-run these numbers

```bash
node scripts/audit/capacity-ramp.mjs . https://www.vibersconnect.com 189664b2-99e7-4d45-ac50-ffb647ef97df T-16
```

```bash
node scripts/audit/floor-stress.mjs . https://www.vibersconnect.com 189664b2-99e7-4d45-ac50-ffb647ef97df T-01,T-02,T-03,T-04,T-05,T-06,T-07,T-08,T-09,T-0A,T-10,T-11,T-12,T-13,T-14,T-15,T-16
```

The first reads only (plus one no-change write per push wave); the second places and cancels test orders. Run both
after any compute or plan change to see the new ceiling.
