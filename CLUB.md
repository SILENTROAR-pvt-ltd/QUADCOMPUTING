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

Public landing → multi-step form (18+ and account) → identity and vibe → admin review → Club Visa.

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
- On approval a holographic Club Visa with the Viber ID and visa number is issued.
- Public handle: shown under the club name on a profile (`PublicMember.handle`, see
  `lib/club/membership/members.ts`). It is the member's Club username when they set one (3–20
  lowercase letters, digits, underscores; unique; not reserved, profane, or equal to any Viber
  handle; changeable once every 30 days, `viber_profiles.username_changed_at`), otherwise their Viber
  ID. It is hidden together with the real identity when a member masks their identity.
- Bio: up to 300 characters and 5 lines the member writes about themself (`viber_profiles.bio`).
  There is no preset text; with no bio, other members see no bio section.

## 4. Live presence and club home

- Grid of members online now: photo, name or alias, generation badge, vibe line.
- Presence is counted only while the tab is visible: a heartbeat every 20 s, a 45 s timeout, and an
  immediate leave on tab hide, close or sign-out.
- Filters: generation, city, search by Club username or alias.

## 5. Social features and moderation

- **Common Room** (the club home): members post plans and questions (up to 1,000 characters) with an
  optional place (shown in lime inside the text), a region (India, Asia, Europe, The Americas,
  Africa, Oceania) and an optional approved plan to join. Search, New or Top (most liked in 30 days),
  likes, comments, and a notification to the author for each comment. Deleted posts are soft-deleted;
  a shadow-banned author's posts and comments are seen only by them and by staff.
- Global club chat, 1:1 direct messages and event discussion rooms: typing indicators, image
  uploads, emoji reactions, reports, unread counters, pagination.
- Stories: 24-hour images or short clips, with a verified-stay badge for members checked in at a
  partner property.
- Red Flag Protocol: automatic profanity filtering, a report queue for users, messages, stories,
  Common Room posts and comments, events and properties, and admin actions to hide content, mute,
  shadow-ban (which also hides the member's live stories and posts) or revoke a visa.
- Member travel profiles (`/club/members/<id>`): name with the verified tick, city, generation,
  member since, online now, counts of posts, plans hosted and trips joined, upcoming plans hosted,
  and their posts, with "Message" and "Report".

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

## 8a. Profile details

- **Traveller types.** A member picks up to five (solo traveller, digital nomad, volunteer,
  influencer, content creator, photographer, foodie, adventure seeker, backpacker, luxury, slow,
  wellness, culture explorer, business, festival goer). Stored in `viber_profiles.traveler_kinds`,
  with the list enforced by a database check (`20261012000002_club_profile_details.sql`).
- **Social accounts.** Instagram, YouTube, X, TikTok, LinkedIn, Facebook (handles), and a website
  (https link). Stored in `viber_profiles.social_links`. Only the filled-in accounts appear on the
  profile, as logos; a pasted profile link is reduced to its handle.
- Both are set in Edit profile (`PATCH /api/club/me` with `traveler_kinds` and `social`) and rules live in
  `lib/club/identity/profile-details.ts`.

## 8b. Stories, places and follows

- **Follows (Instagram-style).** Members follow members. Followers and following are public counts;
  you can open both lists and follow back from them. Only approved members can be followed, and you
  cannot follow yourself. (`lib/club/social/follow.service.ts`, `club_follows`.)
- **Places.** Browse by region (India, Asia, Europe, The Americas, Africa, Oceania), then by place
  (Goa, Manali, Old Manali …). Search by name, country or kind, filter by kind (beaches, mountains,
  heritage, food …), sort by trending or A–Z. "I'm planning to go" follows a place. Places are only
  added by staff (`club_places`); a story or post can be tagged only with a listed place, and the
  name and region are taken from the list, never typed in.
- **Stories by place.** A story can be tagged with a place. Its place page shows the live stories
  from there (people you follow first), who is planning to go, and the posts about it.
- **How the tray is ranked** (`lib/club/social/ranking.ts`, one place for the rules): people you
  follow +100, places you plan to visit +60, the place you live (your city) +40, unseen +15, and
  recency fades across 24 hours. Your own stories always come first.
- **Views.** Watching a story leaves a receipt once. The author sees the count and the list of
  viewers; nobody else can. Your own views do not count.
- **Places score for "trending":** live stories ×3, posts this week ×2, people planning ×1.
- **Not built yet:** place cover photos (no verified photos for these places yet, so each place shows
  its name on a gradient until staff upload one), story replies and likes, and "people you may know".

## 8c. Explore and instant meetups

- **Two kinds of thing, two rules.** *Trips* and *ticketed events* hold money in escrow, so the club
  reviews them before they go live (section 6, unchanged). *Meetups* (coffee, food, walk-around, party,
  music, sports and games, developer meet, creative, wellness, get-together) are free, take a few taps,
  and **go live at once with no review** (`lib/club/meetups/`, table `club_meetups`, migration
  `20261012000005_club_meetups.sql`). The older "short plan" is now a meetup; existing short plans
  still show, as get-togethers.
- **Meetup rules.** Start now or up to 14 days ahead; lasts 1–12 hours; optional spots (2–500); one
  place from the Places list or a typed city, plus a meeting spot. Three running at once per member;
  eight posted per day; muted members cannot post. "I'm in" is a free RSVP (the host counts as
  going, and is told when someone joins); the host can cancel and everyone in is told.
- **Photos.** A host can add up to four pictures (`club_meetups.cover_paths`, migration
  `20261012000006_club_meetup_photos.sql`; only paths in the host's own `meetups/<id>/` folder are
  kept). Cards and the meetup page lead with the first one; with none, a photo that suits the type.
- **Your activity** (`GET /api/club/activity`, Trips screen). Upcoming (approved trips and events),
  Going, Hosting and History, all from one place: trips, events and meetups together. Hosting shows
  everything you run in any state (draft, in review, changes requested, live); History holds what has
  finished, ended or been cancelled.
- **Safety without review.** Every meetup can be reported (`meetup` report type); staff can hide it
  from the Red Flag queue, and a shadow-ban hides the member's meetups. Profanity is refused.
- **Explore** (`GET /api/club/explore`, `lib/club/explore/explore.service.ts`) is one feed of trips,
  events and meetups. Search text; filter by where (matches the place, venue or city), type, and
  when (live now, today, this week); live items first, then by start time. The header "Create" menu
  offers an instant meetup or a trip or ticketed event, and a band at the top starts a meetup in one tap.
- **Fast by design.** The screen loads the feed once and searches and filters it on the phone
  (`explore-filter.ts`, the same rules the server uses), so typing never waits on the network; it
  refreshes when the app comes back to the front. **Location is real, never guessed from the profile:**
  on a tap of "Near me" the browser gives a position, the nearest listed destination within 120 km is
  found on the device (`lib/club/social/place-coords.ts`), and only that destination's name is kept
  (12 hours). The position is never sent anywhere. Things there are listed first. Types and the quick-start
  band are square photo tiles (`photos.ts`, `TYPE_PHOTO`); sheets are drawn at the top of the page so
  a blurred header can never clip them.

## 9. Look and navigation

Soft luxury for travellers: warm ivory pages (`#f1efe6`), white cards, deep forest-green ink and
actions (`#17301f`), a chartreuse highlight (`#c8da4a`) for "I'm in", selected tabs and counts, and
mint panels (`#e1efe3`). Playfair Display for headlines (italics for warmth), Plus Jakarta Sans for
reading. Tokens live in `components/club/theme.ts`, the kit in `components/club/ui.tsx` and
`ui-extra.tsx` (chips, tabs, the "+" button, faces, bottom sheets).

Photography is part of the design. `components/club/photos.ts` lists travel photos from the
Unsplash CDN (hotlinking is allowed there); place names are given only for recognisable landmarks.
`LivePhotos.tsx` crossfades them with a slow Ken Burns drift (still for reduced motion) on the
landing hero, the sign-in screen, plan and stay galleries and profile banners. A plan or stay always
shows its own uploaded photos first; without any, it gets a stable mood photo for its kind.

| Tab (phone bar / desktop sidebar) | Route | What it is |
| --- | --- | --- |
| Home | `/club` | Common Room: stories, who is online, the feed, "+" to post |
| Explore | `/club/explore` | Upcoming plans one at a time: ♥ joins the plan's chat, ✕ skips; Stays from here |
| Trips | `/club/events` | Upcoming, My trips (joined or interested), Hosting; faces and "N travelers going" |
| Community | `/club/community` | Club chat entry and everyone online now, with filters |
| Messages | `/club/chat` | Inbox (club chat, DMs, plan rooms); phones open one room at a time |

Your avatar (top right on phones, bottom of the sidebar on desktop) opens `/club/pass`: your travel
profile, Club Visa, posts, and account links (notifications, stays, back office, sign out). The
public `/join` landing pairs a live photo hero with who is online now, a destinations gallery, and
a tilted collage of the app's screens.
The Club session is loaded once in `app/(club)/layout.tsx`, so moving between tabs never reloads it.

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
the five Club migrations in order, safe to re-run, and it also creates the shared `vibers_accounts`
table if QC migration `20261010000019` has not been applied yet.

Or apply the migrations one by one, in this order (each later one stops with a clear message if an
earlier one is missing):

1. `20261011000001_club_identity.sql`
2. `20261011000002_club_social.sql`
3. `20261011000003_club_events_marketplace.sql`
4. `20261011000004_club_ledger.sql`
5. `20261011000005_club_common_room.sql` (posts, likes, comments; lets reports point at them).
   Until it runs, everything else works and the Common Room shows "not switched on yet".

After changing a Club migration, regenerate the one-paste file: `UPDATE_CLUB_SQL=1 npx vitest run tests/club/setup-sql.test.ts`.

Make yourself an admin once: `insert into club_staff (user_id, role) values ('<your auth user id>', 'super_admin');`
