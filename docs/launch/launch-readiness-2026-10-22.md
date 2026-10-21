# Launch readiness: ten new hosts tomorrow

Date: 22 October 2026. Source: main at `94f7d7b` plus the uncommitted inventory realtime filter. Database: Supabase Pro.

## Verdict

**Ready to onboard new hosts, on three conditions.** A new host who signs up tomorrow gets an empty venue of their own
and cannot see Bombay Rasoi, any other venue, or any other venue's guests, from any screen or API. The three
conditions are configuration, not code: the two pending migrations, the production environment variables, and the
Supabase Pro settings listed at the end. Everything below was checked today against the current source and, where a
live check exists, against the configured database.

## Checks run today

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| `eslint` (whole project) | clean |
| `vitest` | 187 files, 1,280 tests pass |
| `check:migrations` | 143 migrations, versions unique |
| `audit:guards` | 162 owner-side handlers, each guarded before its first database call |
| `scripts/audit/rls-anon.mjs` (live database) | PASSED: the public key reads only the six public tables and changes nothing, over 107 tables; its own probe rows were invisible, unchangeable and cleaned up |

## How one host is kept apart from another

**1. Identity.** Every host route starts with `requireHost`. It verifies the Supabase session, loads the venues that
session owns, and accepts a `business_id` in the URL only if it is one of them; any other id is refused with 403. A
staff PIN session is bound to its own venue and role before the owner path is even considered. There is no default
venue, no first-venue fallback for an id that does not match, and no way to name a venue in a request body that
overrides the session (the wallet redeem route, flagged in the October security run, now rejects a mismatched body).

**2. Reads and writes.** Owner sessions use the row-level client, so the database itself hides other venues. The
routes that use the service role (bookings, passes, payments, notifications, guests, promotions, kitchen, wallet,
reservations, delivery, vendors, analytics) all filter by the venue `requireHost` resolved; the scan today found no
service-role read in `app/api/host` without that filter.

**3. Public pages.** A venue is reached by its UUID or its exact slug only; the lookup by name was removed because
names are not unique. Slugs are unique in the database, and provisioning appends a number when a name is taken, so a
second "Bombay Rasoi" becomes `bombay-rasoi-2` with its own page, menu, rooms and QR codes. The public key cannot
read guests, orders, bookings, rooms or wallets (live audit above). Room pages use an unguessable code on the room's
QR card and an HMAC cookie bound to the stay.

**4. Realtime.** Host subscriptions are filtered by venue (orders, tickets, tables, sessions, rooms, categories,
notifications, offers; the inventory one is filtered as of today). Guest channels are named by venue id and carry no
data: every push is an empty "read again", and the phone reads its own order through its own session.

**5. The browser.** Host caches are keyed by venue (`pos_catalog_cache_<venue>`, `pos_tables_cache_<venue>`) and
sign-out clears session storage and those keys, so the next account on the same device starts clean. The host
workspace store lives in session storage and carries the venue id it was built for. Guest caches are keyed by venue
and room.

**6. Money and fees.** Platform fees, wallet credit, dues and cashback are all keyed to the venue of the session and
the bill id. The admin top-up and fee RPCs run only under the service role; the October remediation migration revoked
them from signed-in users.

## What each of the ten hosts sees

- **Sign-up and onboarding.** A fresh profile, one venue provisioned atomically (business, location, wallet,
  subscription) with its own id, slug and QR hash. No menu, tables, rooms, guests, bills or dues. Pay-as-you-go
  wallet at zero; the ₹3 bill fee starts with their first settled bill.
- **Control center.** Only their venue in the header and sidebar. Billing & POS with no tables until they add
  some; Kitchen empty; Accommodations empty until a room type is created; Analytics at zero with "No earlier sales";
  My Guests empty with "Guests appear here after their first settled bill"; Reservations with no tables and no
  rooms; Dues empty; Subscription & Wallet at their own balance.
- **Menu and QR.** `/menu?cafe_id=<their id>` and the table QR cards show their catalogue only. Scanning another
  venue's card opens that venue's menu, as it should: the card is the venue's own link.
- **Stay page and rooms.** `/stay/<their slug>` lists their room types, free counts and policies. Room QR cards,
  placards and check-in links are generated per room and per booking.
- **Guests' Vibers IDs.** A guest account is per venue (same person across venues is linked by the auth user, but
  each venue sees only its own visits, bills, cashback and stays). A guest's bill at venue A never appears in venue
  B's My Guests or invoices.
- **Analytics and Z-report.** Their settled bills only; rooms, add-ons and check-out fees categorised; the cash
  drawer reconciles cash received and change returned once the cash migration is applied.
- **Staff.** PINs, roles and waiter permissions are per venue; a staff session cannot reach another venue or the
  owner's locked sections.

## Before tomorrow (the three conditions)

**A. Apply the two pending migrations** in the Supabase SQL editor, in this order:

| Migration | What it does |
|---|---|
| `20261022000001_cash_tender.sql` | cash given and change on bills (receipt, till message, Z-report drawer) |
| `20261022000002_ledger_stay_visits_backfill.sql` | records past stay bills as guest visits, so My Guests and the dashboard count the rooms |

Without the first, bills still save but cash given is not recorded. Without the second, stays settled before today
stay out of the guest figures. Both are safe to re-run.

**B. Production environment on Vercel** (`scripts/verify-env.mjs` fails the production build if the first three
are missing):

| Variable | Why |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side reads that RLS would otherwise hide; must differ from the anon key |
| `STAFF_SESSION_SECRET` | signs staff PIN sessions and room cookies; without it staff sign-in and room pages refuse |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | shared rate limits and duplicate-order guards across instances; without them each instance keeps its own |
| `NEXT_PUBLIC_SENTRY_DSN` | errors from ten venues reach you |
| `QC_PRODUCTION_SUPABASE_HOST` | stops a preview build from ever holding the production database |
| `LLM_API_KEY` | menu scan and Vibey; optional |

**C. Supabase Pro settings** (dashboard, once):

- Backups: daily backups are on with Pro; enable point-in-time recovery (Add-ons) before real money flows, so a bad
  migration or deletion can be rolled back to the minute.
- Auth: set the Site URL to `https://www.vibersconnect.com` and the redirect allow-list to the production and
  preview domains; turn on custom SMTP so sign-up and password emails come from your domain and are not throttled
  at the default 4 per hour, which ten sign-ups in a morning would hit.
- Auth rate limits and email confirmation: keep confirmation on; raise the email rate limit for launch day.
- Realtime: Pro's default concurrent connections (500) cover ten venues; each host console holds about six
  channels and each guest phone one.
- Database: keep the connection pooler (Supavisor, transaction mode) for the serverless app; the app already uses
  the pooled URL through the Supabase client.
- Network: leave SSL enforcement on; add no allow-list that would block Vercel's egress.
- Secrets: rotate the service-role key if it was ever pasted anywhere outside Vercel; the app reads it only on the
  server.

## Known residuals (not blockers)

- The October security run left 19 items to validate. Re-checked today and now fixed in source: the body venue
  override on wallet redeem, venue lookup by name, bank details without the master unlock, the audit-log PIN
  columns, the catalog-less order line, and the room checkout fee reference. Still open and worth a follow-up pass:
  master-PIN enforcement is client-side on wallet, expense and catalog writes (an owner session is still required, so
  this is an owner-device risk, not a cross-venue one), the forwarded-header trust of the rate limiter outside
  Vercel, and the two CI/Vercel configuration items that live in GitHub and Vercel settings, not in the repository.
- Preview builds must use a staging Supabase project, never production (verify-env enforces this when
  `QC_PRODUCTION_SUPABASE_HOST` is set).
- GST on room tariffs is a policy decision still open; room bills are currently issued without GST.
- Clear the test bookings and the test room stays from Bombay Rasoi before the day's Z-report is used for real.

## First-day watch

- Sentry: any error tagged with a workspace name.
- Supabase: Auth logs for failed sign-ups; Database health for connection count.
- Dues: each new venue's first settled bill should show a ₹3 line.
- One smoke test per new host: scan their table QR, order, settle at the till, see the bill in Analytics.
