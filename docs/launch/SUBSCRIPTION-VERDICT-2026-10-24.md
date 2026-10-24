# Subscription launch verdict, 24 Oct 2026

**Verdict: READY TO LAUNCH, once two steps are done.**

1. Run `supabase/apply-pending-2026-10-24b.sql` in the Supabase SQL editor (new venues start with ₹0, not ₹1,000). Its last
   line prints `signup_wallet_starts_at_zero = true` when it has taken.
2. Deploy this code (commit and push; Vercel builds `main`). Production still runs the code from before the plans: no
   gates, the old plan names, no Vibey add-on.

Already done and checked on the live database: the plans migration (`apply-pending-2026-10-24.sql`). All five price rows
are there, the ₹599 setup applies to every plan, and the three existing venues are marked exempt.

**Until step 2:** do not approve a plan purchase in the admin desk. The old production code reads `m1_pro` as unknown
and would still take ₹3 a bill. No such request can be filed from the old screens, and none is pending.

## Evidence

| Check | Result |
|---|---|
| Offline suite (unit + pipeline tests, fake database) | 1,420 / 1,420 pass; `tsc` and `eslint` clean |
| Live stress test on Bombay Rasoi (`tests/e2e/subscription-plans.e2e.test.ts`, real database, real route code) | 195 / 195 checks, 15 plan states, run twice; report in `docs/e2e-subscription-report.md` |
| Live approval function (setup, plans, renewal, add-on, idempotency) | all pass |
| UI walk-through on Bombay Rasoi (real plan rows): M¹-Pro, M²-Pro free month (4 days left), grace week, Rhodium; stay page on M¹ | as specified below |
| Bombay Rasoi afterwards | plan row restored field for field, wallet back to ₹0, every test row deleted |

## What each plan gives (verified live)

| Plan | Bill fee | Owner can | Guests see | Wallet shows |
|---|---|---|---|---|
| **You earn, we earn** (₹3 a bill; also any venue with no yearly plan) | ₹3 per settled bill, once per bill | everything | events, offers, delivery, Vibey, rooms | "Most adopted" bar marked "You are on it"; Vibey "Included in your plan" |
| M¹-Pro free month / paid | ₹0 | menu, orders, kitchen, billing, inventory, reports. Locked: events, offers, delivery, rooms, Vibey ("Available on M²-Pro / Rhodium Pro", See plans) | the menu only: no events, offers, delivery, Vibey or rooms | "Buy Vibey · ₹7,000/yr"; reminder in the trial's last 5 days |
| M¹-Pro + Vibey add-on | ₹0 | as M¹, plus Vibey | menu + Vibey | add-on "On until …", "Extend a year" |
| M²-Pro free month / paid | ₹0 | M¹ + events, offers, delivery. Locked: rooms, Vibey | menu, events, offers, delivery | "Buy Vibey"; banner "free month ends in 4 days" |
| M²-Pro + Vibey add-on | ₹0 | as M², plus Vibey | as M², plus Vibey | add-on running |
| Rhodium Pro yearly | ₹0 | everything | everything | no locks, no banner; Vibey included |
| Grace week (paid plan ended up to 7 days ago) | ₹0 | the ended plan's features | the ended plan's features | "Grace week" status, banner, Renew / any plan / switch |
| Plan ended over 7 days ago, or a free month over | ₹3 | everything (back on You earn, we earn) | everything | "Ended", back on ₹3 a bill |
| Earlier plans (8k/12k/14k) still running | ₹0 | everything | everything | runs to its end date |

**Never locked, on any plan:** stays already booked or in house, check-in and check-out, room payments, orders already
placed, and the bill. Existing events and offers can always be hidden, cancelled, paused or deleted. A venue is never
locked out: an ended plan falls back to You earn, we earn.

## Money rules (verified live)

- ₹3 is taken only on You earn, we earn, or after a plan or free month has ended. It is ₹0 on M¹, M², Rhodium, free
  months, the grace week and the earlier plans. A retried settlement is charged once.
- Too little credit: the bill still settles, and the ₹3 is recorded as a due. The till is never blocked.
- ₹599 one-time setup on every plan, once per venue:
  - yearly plans add it to their price (M¹ ₹9,598, M² ₹15,598, Rhodium ₹49,598);
  - You earn, we earn takes it from the first top-up. The top-up must be at least ₹699 (₹599 setup, ₹100 credit),
    and a ₹599-only top-up is refused;
  - venues that joined before 25 Oct 2026 are exempt.
- Plans run 12 months from approval. Renewing early adds the year onto the current end date, so no days are lost.
- A smaller plan cannot be bought mid-term. In the grace week any plan can be.
- Vibey add-on ₹7,000/year, M¹ and M² only (refused on You earn, we earn and Rhodium, which include it). It never
  changes the plan; a second purchase stacks another year.
- Approving the same payment twice changes nothing.
- No free credit at sign-up once step 1 is run. Until then the sign-up function still adds ₹1,000. The app's own
  fallbacks and the welcome tour already say ₹0.

## Clashes found and fixed in this pass

- On M¹/M² the guest menu still showed "Accommodation · Explore & reserve", and the stay page listed rooms whose
  booking was then refused. Now no rooms are listed; the stay page says rooms are not taken online and gives the phone
  number; check-in and "My room" keep working.
- The welcome tour promised "₹1,000 of credit".
- Reminder and calculator wording now name the plan "You earn, we earn".

## Known limits (not blockers)

- Viber Connect, Viber Club and "retention boosters" are not gated separately. QC has no separate module for them; Club
  commission is P6, in the Club repo.
- Payments are UPI + UTR with admin approval. Razorpay auto-activation is P4.
- Renewal reminders are on screen only; emails are P5.
- A plan change can take up to 30 seconds to show (per-server cache).
- Pricing risk: below about 3,000 bills a year, You earn, we earn costs less than M¹ and includes more.
- No staging Supabase project. The live checks ran on the owner's pilot venue and restored it.

## Re-run

```
$env:E2E_LIVE='1'; npx vitest run --config vitest.e2e.config.ts tests/e2e/subscription-plans.e2e.test.ts
```
