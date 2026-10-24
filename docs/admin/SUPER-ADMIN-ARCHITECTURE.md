# Vibers Connect · Super admin command center

Built 24 Oct 2026. Sign in at `/auth/admin` (a login with `app_metadata.role = super_admin`, set on the server only;
today: harshitsinghnitj@gmail.com). The middleware refuses every `/admin` page and `/api/admin` call for anyone else.

## Architecture

```
/auth/admin ─ separate sign-in (role checked, token renewed)
/admin/*    ─ AdminShell: black sidebar (General / Account, live badges), page
   pages ── useAdminData (polls 15–60 s while visible) ──► /api/admin/* (adminGate = requireAdmin)
                                                            │
                                     lib/services/admin/*  ─┤ service-role reads (paged past 1,000 rows)
                                                            │ writes only through venue-actions / announcements /
                                                            │ support, each recorded in platform_admin_actions
   Postgres: admin_orders_daily / admin_orders_heatmap (IST rollups of settled bills, partial index)
             platform_admin_actions (append-only) · platform_venue_reviews · platform_announcements · support_tickets
venue side: AnnouncementBanner (control center) · Help & support (My profile) · /api/host/announcements, /api/host/support
```

Migration `20261024000003_super_admin.sql` (bundle `supabase/apply-pending-2026-10-24c.sql`) is applied on production.
Every service falls back safely before it: rollups scan raw bills (bounded), changes are refused until the admin log exists.

## The blueprint, item by item

| Blueprint | Built | Data source |
|---|---|---|
| **1. Metrics bar** | 5 KPI cards for 7 / 30 / 90 days vs the period before: GMV, bills, active venues, average bill, platform income; "Live now" strip; per-service health pills | settled `orders` (rollup), `usage_ledger`, approved `venue_topup_requests`; `dine_in_sessions`, `guest_auth_sessions`, `staff_profiles`, `rooms`; health pings |
| Active devices | Tables open, guests online (15 min), staff on duty (12 h), rooms occupied. Labelled an estimate | live session tables. The exact websocket count is only in the Supabase Realtime inspector (linked) |
| System health | API, Supabase round trip, Upstash PING, in ms, good / slow / down | measured from the server on each read |
| **2. Venue & plan approvals** | Directory with search and filters; drawer with owner, contact, legal name; review status (approve / request documents / reject) | `businesses`, `locations`, `profiles`, `platform_venue_reviews` |
| Document badges | GSTIN (format + owner confirmed), FSSAI (14 digits), Form C (foreign guests recorded at check-in) | `businesses.gst_*`, `fssai_number`, `room_stay_logs` |
| Plan assignment | Give any plan for N days, start a free month, extend, move to ₹3 a bill, add or end Vibey, waive the ₹599 setup | `venue_subscriptions`, every change logged with before/after |
| Quick actions | Approve, request documents, reject, suspend (guests can't order: the venue guard returns 402), resume | as above |
| **3. Wallet, top-ups & financials** | Approval queue (live, with visible results); income by month (plans, setups, ₹3 fees); fees and dues per venue; venue credit held; guest cashback held | `venue_topup_requests`, `usage_ledger`, `venue_outstanding_bills`, `venue_wallets`, `guest_wallets` |
| **4. Analytics** | GMV per day (F&B vs stays), leaderboard, F&B/stay share, peak-hours heatmap (IST), GST and change vs previous | rollups |
| Statutory exports | Consolidated GST CSV (per venue and month: bills, gross, discounts, taxable value, GST, total, GSTIN); Form C CSV (passport, visa, country, dates, room) | rollups; `room_stay_logs` (anonymised rows excluded). Every export logged; Form C only with the log |
| **5. System & infrastructure** | Health, connection estimate, data volumes, Vibey 24 h (turns, latency, errors, model share), console links | counts, `vibey_turns` |
| Compute scaling | Link to Supabase compute & disk | The scaling change is made in Supabase: it changes the bill and needs the account owner's login |
| Global broadcast | Publish info / warning / critical notices for 6 h to 7 days or until withdrawn; shown at the top of every venue's control center within a minute | `platform_announcements` |
| **6. Support desk** | Ticket queue (urgent first), reply, status (open / in progress / resolved); venues raise and read tickets in My profile | `support_tickets` |
| Folio overrides | Live stays monitor: occupied rooms, overdue check-outs, check-out and late check-out requests, desk phone | `rooms`. Forced check-outs stay with the venue's desk, where the payment is taken |
| **Settings** | Change password (current checked first; 12+ characters, letters, numbers, a symbol; sign out other devices), session, sign out everywhere, admin log | Supabase Auth, `platform_admin_actions` |

## Not built, on purpose (needs an outside key or a decision)

- Government GSTIN verification: needs a GSP / GST API account. Today the badge is "format valid + confirmed by owner".
- Telling the owner when a venue is suspended or reviewed: the reason is in the admin log only.
- Custom per-venue pricing: needs a price column per venue and the approval function to read it.
- Forcing a check-out from the admin side: it would bypass the desk's payment step.

## Verification

- `lib/services/admin/rollup.test.ts`, `venue-actions.test.ts`, `tests/pipelines/super-admin.pipeline.test.ts`: access,
  figures, refusal without the log, logged changes, notices end to end, tickets both ways, exports.
- `tests/e2e/super-admin.e2e.test.ts` (live, read-only): every route on production data. The figures agree with direct
  counts: venues, plan mix, series = period GMV, heatmap = bills, wallets.
