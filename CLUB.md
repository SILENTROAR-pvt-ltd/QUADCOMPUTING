# Vibers Club — master system specification

Vibers Club is an application-only, verified social and event ecosystem for travellers, digital
nomads and lifestyle creators. It runs alongside the Quad Computing (QC) hospitality engine in the
same repository and turns partner properties (hotels, hostels, cafes, restaurants) into social hubs.

Two principles:

1. **Curated quality over open mass.** Access is gated by application and verified presence, which
   keeps out bots, spam and toxic behaviour ("the Red Flag Protocol").
2. **Community-driven monetisation.** Any verified Viber can organise and monetise trips, events,
   jams, movie nights or drives, and book verified partner properties for them.

---

## 1. Repository layout and isolation rules

One repository, one Next.js app, one Supabase project. Club code lives only in its own folders and
never changes a QC file.

| Area | QC (frozen) | Vibers Club |
| --- | --- | --- |
| Pages | `app/(guest)`, `app/host`, `app/auth`, … | `app/(club)/join`, `app/(club)/club/**` |
| API | `app/api/{guest,host,…}` | `app/api/club/**` |
| Server code | `lib/**` (everything else) | `lib/club/**` |
| UI | `components/**` (everything else) | `components/club/**` |
| Tests | `tests/**` | `tests/club/**` |
| Database | existing tables, RPCs, POS | new `club_*`, `viber_*`, `property_marketplace`, `escrow_ledger` tables |

- **Zero core modifications.** QC schema, atomic RPCs (`submit_guest_order_atomic`,
  `execute_atomic_bill_settlement`) and POS logic are untouched. Club migrations only create new
  tables, plus one read-only helper index on `vibers_accounts`.
- **Allowed imports from Club into shared code:** Supabase clients, the verified-user check, auth
  messages, rate limiter, error boundary, and the Vibers profile service (one identity). QC code
  never imports Club code. `tests/club/isolation.test.ts` enforces both directions.
- **One login.** Club users sign in with the same Supabase account (email and password) as QC hosts
  and guests. `viber_profiles.user_id` is `auth.users.id`, and the Viber ID *is* the person's
  Vibers `@handle` (`vibers_accounts.handle`), held in sync by a composite foreign key.

## 2. Roles

| Role | How it is granted |
| --- | --- |
| `VIBER` | Approved application with account type *viber*. |
| `BUSINESS` | Approved application with account type *business* (multi-category). |
| `EVENT_CREATOR` | Not a sign-up type: any approved Viber whose event is approved. |
| `CLUB_ADMIN` | Row in `club_staff` with role `club_admin`. |
| `SUPER_ADMIN` | Row in `club_staff` with role `super_admin`, or the QC `app_metadata.role = 'super_admin'`. |

## 3. Onboarding and gated application

Public landing → multi-step form (18+ and account) → identity and vibe → admin review → Viber Pass.

- `/join` is the single public landing. `?src=<campaign>` is kept as `campaign_source`.
- Admins create and rotate QR campaigns and download them as PNG, SVG or PDF.
- The hero shows floating avatars of members online now; a bubble opens a preview card that leads
  into the club chat (members only).
- Form: date of birth (under 18 is refused), SMS OTP (provider abstraction: Twilio, Fast2SMS, and a
  console provider for development only), city/state/country, account type *Viber* or *Business*
  (business name and categories; categories are admin-managed records).
- Identity: Viber ID (2–30 lowercase letters, digits, underscores; case-insensitive unique;
  profanity and reserved-word filtered), optional masked alias (members see only the alias; admins
  always see the real identity), generation tag computed from date of birth (exact age is never
  shown).
- On approval a holographic Viber Pass with the Viber ID and pass number is issued.

## 4. Live presence and club home

- Grid of members online now: photo, name or alias, generation badge, vibe line.
- Presence is counted only while the tab is visible: a heartbeat every 20 s, a 45 s timeout, and an
  immediate leave on tab hide, close or sign-out.
- Filters: generation, city, search by Viber ID or alias.

## 5. Social features and moderation

- Global club chat, 1:1 direct messages and event discussion rooms: typing indicators, image
  uploads, emoji reactions, reports, unread counters, pagination.
- Stories: 24-hour images or short clips, with a verified-stay badge for members checked in at a
  partner property.
- Red Flag Protocol: automatic profanity filtering, a report queue for users, posts, messages,
  events and properties, and admin actions to mute, shadow-ban or revoke a pass.

## 6. Events and tours

Draft → signed responsibility and consent (timestamp, IP, Viber ID, consent version) → admin review
→ property negotiation → deposit → "Vibers Verified Plan" badge.

- Fields: title, cover gallery, type (tour, event, short plan), dates, transport, venue, food,
  activities, budget lines, cancellation policy, safety protocol, price range, capacity, ticket
  price and payment schedule.
- On approval, notifications go to every approved Viber and to QC guests who are checked in now and
  have a Vibers account.
- "Interested" members join the event's discussion room.

## 7. Business profiles and property marketplace

- Owners list properties: capacity, photos, min/max rate, amenities, location, house rules, terms,
  optional link to their own QC venue. `CLUB_ADMIN` verifies them (`pending` → `verified`).
- Deal flow: offer → accept, counter or reject → rate locked and an itemised agreement invoice is
  issued → creator pays the non-refundable deposit → the event becomes a Vibers Verified Plan.

## 8. Escrow-style double-entry ledger

Every money movement is a balanced journal in `escrow_ledger` (immutable; integer paise).

| Step | Debit | Credit |
| --- | --- | --- |
| Payment captured | `platform_cash` | `event_escrow` (net) and `club_revenue` (fee) |
| Payout approved | `event_escrow` | `vendor_payable` |
| Payout paid | `vendor_payable` | `platform_cash` |

- Participants pay through the gateway on the event's schedule (for example 10 % deposit then
  instalments). The platform fee (default 10 %) is configurable globally or per event.
- Payouts to verified vendors are released after admin approval (a global toggle can switch
  approval off for verified vendors). Unverified third-party services always need an admin.
- When an event is completed and its escrow and payables are both zero, a signed, QR-verifiable
  No Objection Certificate (NOC) is issued to the creator and the property owners.
- Robustness: idempotency keys on every journal, payment and payout; webhook signature checks;
  retry state on payouts; a reconciliation report per event.

---

## Implementation notes (what differs from the original brief, and why)

| Brief | Implemented as | Why |
| --- | --- | --- |
| Separate deployable app | Route group in the same app | The brief's own isolation rules (§1) put Club in `app/(club)`; same domain also means the same login session as QC. |
| Viber ID allows dots | Letters, digits, underscores | The Viber ID is the shared Vibers `@handle`, which QC wallets key on; dots are not allowed there. |
| Argon2 password hashing | Supabase Auth (bcrypt) | The login must be the same account as QC, and Supabase owns password storage. A strength meter is shown on sign-up. |
| WebSocket + Redis heartbeat | Visible-tab heartbeat to a presence table, Supabase Realtime for live nudges | Vercel functions cannot hold WebSockets; the table gives the same 45 s timeout. |
| Automated Razorpay Route payouts | Payout queue with admin approval and a manual "paid" reference; gateway payouts are a provider switch | Automatic payouts need a RazorpayX account and vendor fund accounts that do not exist yet. |
| NOC PDF on the server | Signed NOC record; the certificate page renders it and downloads a vector PDF with its QR | No new PDF dependency; anyone can verify the QR at `/club/noc/<code>`. |

### Configuration (all optional; features report "not configured" without them)

- `CLUB_SIGNING_SECRET` — signs OTP hashes and NOCs (falls back to a key derived from the service role key).
- `CLUB_SMS_PROVIDER` = `twilio` | `fast2sms` | `console` (console works only outside production).
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` / `FAST2SMS_API_KEY`.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

### Database

Easiest: paste **`supabase/club_setup_all.sql`** into the Supabase SQL editor and run it once. It is
the four Club migrations in order, safe to re-run, and it also creates the shared `vibers_accounts`
table if QC migration `20261010000019` has not been applied yet.

Or apply the migrations one by one, in this order (each later one stops with a clear message if an
earlier one is missing):

1. `20261011000001_club_identity.sql`
2. `20261011000002_club_social.sql`
3. `20261011000003_club_events_marketplace.sql`
4. `20261011000004_club_ledger.sql`

After changing a Club migration, regenerate the one-paste file: `UPDATE_CLUB_SQL=1 npx vitest run tests/club/setup-sql.test.ts`.

Make yourself an admin once: `insert into club_staff (user_id, role) values ('<your auth user id>', 'super_admin');`
