# Vibers Connect subscription plans: audit and implementation plan

Source: "Vibers Connect Pricing – Subscription Plans" (PDF / HTML, 24 Oct 2026).
Status: **P1, P2 and P3 built** (24 Oct 2026): catalogue, migration `20261024000001_qc2_subscription_plans.sql` (bundle
`supabase/apply-pending-2026-10-24.sql`, to be applied), entitlements engine, fee rule, setup fee; Wallet plans screen,
free month, sign-up choice, admin card; feature gates, grace week, reminders, Vibey add-on (₹7,000/yr). P4–P6 to do.

Renamed later the same day: the per-bill plan is called **You earn, we earn**. New venues get no free credit
(`20261024000002_signup_no_free_credit.sql`, bundle `apply-pending-2026-10-24b.sql`). On plans without rooms the stay
showcase lists no rooms (`venue.bookable = false`). Live proof and verdict: `docs/launch/SUBSCRIPTION-VERDICT-2026-10-24.md`.

Decided (24 Oct 2026): per bill is its own plan, **Pay as you go** (₹3 a bill, every feature, "Most adopted"), shown
apart from Rhodium Pro everywhere (Wallet bar, compare table, sign-up, landing); its stored id stays `rhodium_ppb` /
`pay_as_you_go`. Rooms / stays are **Rhodium only** among the yearly plans (Pay as you go includes them too).
Also decided: the **₹599 one-time setup applies to every plan, Pay as you go included**, once per venue
(`setup_fee_paid_at`). Plans add it to their price; Pay as you go takes it from the first wallet top-up (which must be
at least ₹699; a "+₹500" chip asks ₹1,099 so ₹500 is credit). Venues that joined before 25 Oct 2026 are exempt (the
migration marks their setup done). M²-Pro no longer carries a "Most popular" badge; the Vibey add-on has its own Wallet
card and shows as "Add-on · ₹7,000/yr" for M¹/M² in the compare table. Defaults kept: trial end without payment falls back to
Rhodium per bill; prices include GST; no monthly minimum on per bill; UPI + UTR approval first, Razorpay later.

## 1. The plans (as published)

| | QC² M¹-Pro | QC² M²-Pro | Rhodium Pro |
|---|---|---|---|
| Price | ₹8,999 / year | ₹14,999 / year | ₹3 per bill, or ₹48,999 / year |
| Trial | 1 month | 1 month | none |
| One-time | ₹599 setup (profile, data entry, design, QR) | — | — |
| Core (menu, ordering, chef + service portals, bill request, 7% cashback, lobby reviews, inventory + low-stock alerts, purchase list, finance and expense reports) | yes | yes | yes |
| Events, offers, buffets with seat reservations (EO-pro) | — | yes | yes |
| Local delivery: radius + minimum order (M-CS+) | — | yes | yes |
| Retention and repeat-visit boosters | — | yes | yes |
| Viber Connect (lobby posts, venue tour, visitor bookings) | — | — | yes |
| Viber Club (5% commission on bookings, no plan fee) | — | — | yes |
| Vibey AI Gen 2 (any language; worth ₹7,200/yr) | — | — | yes |
| Free future updates for the tenure | — | — | yes |

Rhodium per bill: ₹3 whatever the bill size, nothing when there are no bills, no expiry while a valid partner.
Per bill and annual meet at about 16,300 bills a year.

## 2. Audit: what exists today

**Billing engine (built, live, tested):**
- `venue_subscriptions` (plan_tier, status, trial_ends_at, expires_at) and `venue_wallets` (prepaid credit).
- Plan catalogue `lib/services/wallet/plans.ts`: three old plans (Starter ₹8,000, Growth ₹12,000, Enterprise ₹14,000, each 12 months + bonus months) and pay-as-you-go.
- Pay-as-you-go = **₹3 per settled bill** from the wallet (`fee-guard.service.ts`, `bill-fee.ts`, idempotent per bill, outstanding-bill fallback, POS never blocked). This is exactly Rhodium's per-bill model already.
- `subscription-state.ts`: paid plan waives the fee until `expires_at`; "expiring" inside 15 days.
- Payment: manual UPI. Host pays the platform UPI, submits the UTR; admin approves in the top-up desk; `approve_topup_request` RPC (row-locked, idempotent) credits the wallet or starts the plan.
- `venue-guard.service.ts`: blocks guest orders (402) when the wallet is negative or the subscription status is not active/trial.
- Razorpay REST adapter exists in `lib/club/payments/razorpay.ts` (Club only; no keys set).
- GST for venues' own bills (`gst-policy.ts`); nothing for the platform's own subscription invoices.

**Features the plans sell (all built):** digital menu and ordering, chef and service portals with alerts, bill request,
7% cashback (matches), lobby reviews, inventory with stock alerts and the purchase list builder, expense and P&L
reports, live events with capacity (incl. "Buffet Night"), offers, delivery with radius and minimum order, Vibey
(now replying in the guest's language). Viber Club lives in its own repo.

**Gaps:**
1. No plan-based entitlements anywhere: every venue gets every feature. Vibey is a per-venue switch / pilot env.
2. Old catalogue and prices hard-coded in three places: `plans.ts`, the `approve_topup_request` RPC and the
   `plan_tier` CHECK constraint. Landing pricing and the Wallet plan cards show the old plans.
3. No trial lifecycle (trial plan, one trial per venue, what happens at the end), no setup fee, no renewals or reminders.
4. Unpaid fees are recorded but never enforced: 91 unpaid ₹3 rows (₹273) across the venues; the guard only checks a
   negative balance, which the fee engine never produces.
5. "Retention and repeat-visit boosters" exist only as cashback and the guest ledger; no named feature to gate.
6. Rooms / stays are not mentioned in the pricing.

**Live data (counts only):** 3 venues, all on pay-as-you-go, none on a paid plan. Nothing to migrate.

## 3. Design

### 3.1 Catalogue (one source of truth)
`plans.ts` becomes the new catalogue: `m1_pro`, `m2_pro`, `rhodium_annual`, `rhodium_ppb` (per bill), each with
price, term (12 months), trial days, setup fee and its feature list. The RPC reads prices from a small
`subscription_plans` table seeded by the migration; a test asserts the table seed equals `plans.ts`.

### 3.2 Entitlements
`lib/services/billing/entitlements.ts`: `entitlementsOf(subscription, now)` → `{ plan, phase, features: Set<Feature> }`.
Features: `core`, `events`, `offers`, `delivery`, `retention`, `viber_connect`, `viber_club`, `vibey`, `rooms`.
- Server: one helper `requireFeature(businessId, feature)` on the routes that create/use a gated feature (events,
  offers, delivery settings and guest delivery orders, Vibey guest and host routes, lobby posting). Returns 402
  `plan_required` with the plan that unlocks it.
- Guest side: gated features are simply not shown (no delivery button, no Vibey launcher) when the venue lacks them.
- Host side: locked modules show an "Available on M²-Pro" card with Upgrade.
- Existing data is never deleted when a plan lapses; it is hidden and returns on upgrade.

### 3.3 Fees
`feeFor('bill_generate')`: ₹3 only on `rhodium_ppb`; ₹0 on M¹, M² and Rhodium annual while in force. Wallet,
idempotency and the outstanding-bill fallback stay as they are.

### 3.4 Lifecycle
- New venue: 30-day trial of the plan it picks at onboarding (M¹ or M²); one trial per venue (`trial_used_at`).
- Day 30 with no payment: falls back to Rhodium per bill (keeps trading, ₹3 a bill from the wallet). No venue is ever
  locked out mid-service.
- Paid plan: 12 months from approval (or from the current end date on renewal). Reminders at 15, 7 and 1 days
  (dashboard banner + staff notification). At expiry: 7-day grace with a banner, then fallback to per bill.
- Upgrade any time: unused days of the current plan are credited against the new one. Downgrade takes effect at renewal.
- Per bill dues: top-up prompts at low balance; orders keep working, but new gated actions pause once unpaid fees pass a
  limit (proposed ₹500) until a top-up.

### 3.5 Payments
- Phase A (works now, no gateway): the existing UPI + UTR + admin approval, extended to the new plans and the ₹599 setup fee.
- Phase B: Razorpay checkout (reuse the Club adapter) with webhook auto-activation; no admin step for card/UPI payments.
- Platform tax invoice (GST) for every plan payment once the company GSTIN is provided.

### 3.6 Admin
Top-up desk handles plan requests; add: comp/extend a plan, reset a trial, and a revenue panel (active by plan,
trials ending this week, renewals due, per-bill fees collected, outstanding dues).

## 4. Build order

| Phase | Scope | Behaviour change |
|---|---|---|
| P1 | Migration (plan_tier values, `subscription_plans`, trial/setup columns, RPC prices), new catalogue, entitlements engine, fee rule, tests | none: existing venues become `rhodium_ppb`, identical to today |
| P2 | Wallet "Plans" screen (3 plans, compare table, per-bill calculator), purchase via UPI/UTR, setup fee, admin approval, trial start at onboarding | hosts can buy the new plans |
| P3 | Gating on routes, guest UI and host modules; grace, fallback and reminders | M¹ venues lose M²/Rhodium features |
| P4 | Razorpay checkout + webhook, platform GST invoices | instant activation |
| P5 | Landing pricing page from the catalogue, admin revenue panel, renewal emails | — |
| P6 | Viber Club 5% commission (Club repo) | — |

Verification per phase: unit tests for catalogue/entitlements/fees/lifecycle, route tests for 402 `plan_required`,
the tenant-isolation suite, and a read-only browser check of the Wallet and guest menu per plan.

## 5. Decisions

1. Rooms / stays: **Rhodium only** (decided).
2. Trial end without payment: fall back to Rhodium per bill (default).
3. GST: prices include it (default).
4. Payment collection: UPI + UTR approval now, Razorpay when keys and KYC are ready (default).
5. Pricing risk, open: below about 3,000 bills a year Rhodium per bill costs less than M¹ and includes more. A minimum
   monthly floor for per bill (e.g. ₹499) would protect M¹/M² sales.

## 6. P1 as built

- `lib/services/wallet/plans.ts`: `PLANS` (m1_pro, m2_pro, rhodium_annual), `PER_BILL_PLAN` (rhodium_ppb, ₹3), earlier
  tiers kept read-only, `planCharge` (price + setup fee once), `cheapestPlanFor(feature)`.
- `lib/services/billing/entitlements.ts`: `entitlementsOf(sub)`, `canUse`, `featureBlock` (402 `plan_required` payload).
  Not yet called by any route: gating is P3.
- `subscription-state.ts`: trial in force waives the bill fee (`onTrial`); "pay_as_you_go" and "rhodium_ppb" both mean per bill.
- Server prices plan requests from the catalogue and adds M¹'s ₹599 until `setup_fee_paid_at` is set; the approval
  function charges the same from `subscription_plans`.
- Wallet cards, payment modal and the Quad Computing pricing section read the new catalogue.

## 7. P2 as built

- Free month (`lib/services/wallet/trial.service.ts`): M¹ or M², 30 days, once per venue (`trial_used_at`, set by a
  conditional update so two taps cannot start two), never over a running paid plan; waits (503) until the migration.
  Wallet action `start_trial`; ending a trial early goes back to per bill (`select_plan`), keeping `trial_used_at`.
- Sign-up (`StartPlanChoice` in the review step, `startPlan` in the onboarding schema): café defaults to M²'s free
  month, a venue with rooms to Rhodium per bill; the provision route starts the trial and never fails sign-up over it.
- Wallet: status card (trial / active / ending / ended / per bill, Buy during trial, End trial), plan cards with modes
  (choose, upgrade, renew, buy now, from renewal) and "Try free for a month", compare table, per-bill calculator.
- Server refuses a smaller plan while a paid one runs (it would cut paid months); upgrades are allowed.
- Admin top-up card shows the plan by name with the setup fee split out.

## 8. P3 as built

Decided by the user: M¹-Pro and M²-Pro venues can buy **Vibey separately for ₹7,000 a year**.

- **Gate helper** `lib/services/billing/feature-gate.ts`: `loadEntitlements` (service-role read, 30 s cache per instance,
  a failed read counts as per bill so service never stops), `hasFeature`, `requireFeature` (402 `plan_required` with the
  plan that unlocks it), `clearEntitlements` (after a trial starts or ends).
- **Only new intake is gated.** Running stays, check-ins, check-outs, payments and orders already placed are never blocked;
  existing events and offers can still be hidden, cancelled, paused or deleted.

| Feature | Host routes (402) | Guest side |
|---|---|---|
| Events (M²) | `live-events` POST, PATCH except hide/cancel, `live-events/import` POST | `guest/events` returns none; `events/interest` 402; Vibey gets no events |
| Offers (M²) | `venue/offers` POST, PATCH except pause | offers list empty; `guest/offers/requests` 402 |
| Delivery (M²) | `delivery-settings` PUT turning delivery on | `delivery-info` says off; `guest/order` delivery 402 |
| Rooms (Rhodium) | `accommodations/rooms` POST, `categories` POST, `bookings` POST | `guest/stay/book` 402 |
| Vibey (Rhodium or add-on) | `host/vibey` POST, `settings/vibey` switching on | launcher hidden, POST 403 |

- **Grace week** (`subscription-state.ts`): a paid plan keeps its features and no bill fee for 7 days after `expires_at`
  (`phase: 'grace'`, `daysLeft` = grace days left); a trial has none. `paidPlanRunning()` excludes grace, so a venue in
  grace can buy a smaller plan or move to per bill.
- **Vibey add-on**: catalogue row `vibey_addon` (kind `addon`) in `subscription_plans` and `VIBEY_ADDON` in `plans.ts`;
  filed as a plan request at ₹7,000, only while M¹-Pro or M²-Pro (trial or paid) is in force; approval extends
  `venue_subscriptions.vibey_until` by 12 months (from its current end if still running) and leaves the plan alone.
  `entitlementsOf` adds `vibey` while `vibey_until` is ahead.
- **Dashboard**: `GET /api/host/plan`; `usePlanFeatures` (one shared store); `PlanLockedCard` ("Available on M²-Pro",
  See plans → Wallet) on Delivery, Accommodations, Live events and the Vibey switches; `PlanReminderBanner` above every
  section but Wallet (trial's last 5 days, plan's last 15, grace week). Wallet: grace status, `VibeyAddonCard`, add-on
  payment sheet; admin card and statement name the add-on.
- Reminders are on-screen only. They are not staff notifications (those ring the floor's bell); renewal emails are P5.
