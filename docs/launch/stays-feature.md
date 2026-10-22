# Stays: showcase, free reservation, paid self check-in, in-room dining, early check-in and late check-out

Built 2026-10-21 on top of the existing Accommodations workspace.

**How money moves.** QC has no payment gateway, so the room is paid the way a table bill is: directly to the venue.
Reserving is free. At the desk the guest pays by UPI (the venue's own QR, exact amount), cash or card; staff confirm the
money has arrived, and only then does the guest get a link to check themselves in. In-room food and drinks are charged
to the room and settled at checkout. Nothing else is charged to the room.

## Deploy order

1. Apply `20261021000005_stays.sql`, `20261021000006_compliance_and_legal_hardening.sql`,
   `20261021000007_stay_passes_and_policies.sql`, `20261021000008_stay_booking_accounts.sql`,
   `20261021000009_room_checkout_request.sql` and `20261021000010_booking_checked_out.sql` (staging, then production).
   All additive. The build reads the new columns, so a database without them fails on room reads and writes (desk
   check-in included), on every reservation (`guest_account_id`) and on the guest's "request check-out"
   (`rooms.checkout_request`); without migration 10 a room checkout cannot close its booking (status `checked_out`),
   so the guest's Stay tab keeps saying "checked in".
2. Deploy the build.
3. Owner switches on **Self check-in** (off by default) and sets early check-in / late check-out options under
   Accommodations → Room setup (both behind the master PIN). The venue's UPI ID (Profile) drives the payment QR.

## The guest's journey

1. **Reserve** on `/stay/<venue>`: free, confirmed at once, a code `ST-XXXXXX`, and how they expect to arrive
   (daytime, an early check-in option with its fee, or late at night). *Reserve* goes through the same Vibers ID
   sign-in sheet as the menu (`GuestAuthSheet`, with "Continue without an account" as at the table). A signed-in guest
   has the name filled in and the mobile taken from the account on the server (the browser only sees it masked), and
   the booking is linked to the account (`stay_booking_requests.guest_account_id`).
2. **Pay at the desk.** Bookings → *Take payment*: the server quotes the room (nights × rate, plus the early check-in fee
   if chosen), the guest pays, staff tick "payment received" and enter the UTR (UPI) or approval code (card). The server
   writes a **settled advance bill** and issues a **pass**. The desk sees the guest's check-in link (QR, copy, WhatsApp)
   and can print the bill.
3. **Check in** on `/stay/<venue>/checkin?p=<token>` (or by entering the booking code and the last four digits of the
   phone once the desk has confirmed): the pass says what was paid for; the guest adds name, ID photo, consent. The first
   vacant room of the paid type is released, the folio opens with the advance on it, and the guest lands on `/room/<code>`.
4. **In the room**: unlock with the last four digits of the phone. The page shows the stay at a glance (nights, check-out,
   bill), a **front desk** button in the header (a call, or a WhatsApp chat with the room number filled in: the owner sets
   the number and the mode under Room setup, `stay_policies.front_desk`; with none set, the first phone on the menu
   information rings), and **My bill** shows the room's real tax invoice (`GET /api/guest/room/<code>` → `invoice`, from
   the pass that checked the stay in) above the running stay and the food charged to the room. Tap **Order food to my room**, which opens the venue's
   own menu in room mode (header "Room 101", orders sent through the room endpoint: kitchen hours enforced, food and
   drinks only, charged to the room bill); one-tap requests; ask for a **late check-out**; see the bill (stay, advance as
   a credit, food, balance). A hotel guest browsing the ordinary menu sees a **Room delivery** tile: room number plus
   the last four digits of their phone confirm them and open the same room-mode menu. The room's table label is `RS-<room>`.
5. **Checkout**: the invoice is the balance. The advance is credited once; a guest who paid for more nights than they
   stayed is flagged "refund due".

**On the front desk.** A booking is for a room type, so a room is chosen at check-in, and "reserved" is shown rather than stored
(`lib/services/stay/reservation-overlay.ts`): for each type, as many free rooms as there are bookings due now (arrival today or
overdue, stay not ended) show as **Reserved**, lowest room number first and paid bookings first. There is a Reserved tile, filter and
card (guest, arrival, code, paid or not), and an **Expected arrivals** strip for the next three days. Opening a reserved room starts
its check-in with that booking filled in. Cancelling a booking frees its room at once; nothing is written, and the desk's list
re-reads every 30 seconds so a guest's new reservation appears by itself. The desk can also reserve for a caller: Bookings →
*Reserve* (same availability checks, marked as made at the desk).

**The bill** for a room payment is the platform's own tax invoice (the receipt the POS prints): venue name, address and GSTIN from
the venue's profile, the invoice number from the bill, itemised under ROOM STAY, totals, amount in words, marked PAID with the
payment reference. The guest sees the same bill on their check-in page. Like every room bill here it carries no GST line today.

A guest with no reservation starts from Bookings → *New stay*; the same payment and link follow. The desk can also
check a booking in itself (*Check in at desk*, or pick the booking from a vacant room's panel); if that booking was
already paid, the room carries the advance so nothing is charged twice.

## Arrival, requests and notifications (22 October)

- **One way in when a reserved guest arrives.** Bookings → *Guest arrived* (and opening a Reserved room tile) first asks
  how they check in (`ArrivalChoice.tsx`). *On their phone*: take the payment (UPI, cash, card) and show the check-in QR,
  or, if already paid, show it again; the guest adds their ID photo and consent and a room opens. Needs Self check-in on.
  *At the desk*: pick the room (the tile is the room), then the desk form. The old side-by-side "Take payment" and
  "Check in at desk" buttons are gone.
- **A desk check-in records what self check-in asks for.** The ID number (or a passport for a foreign national) and a
  ticked consent ("I have seen this ID, and the guest agrees to it being kept for the guest register") are required by
  the form and by the server (`checkInError`). A booking checked in at the desk used to be marked "ID verified" with
  neither.
- **The booking code** on the guest's confirmation copies in one tap, and the card saves as a picture (share sheet →
  "Save image" into the gallery; a download where there is no share sheet). The Stay hub's booking row copies the code
  too and says **Paid · check-in open** once the desk has taken the payment.
- **The bell rings for a new reservation** (`STAY_BOOKING`, migration `20261022000006`, bundle
  `supabase/apply-pending-2026-10-22b.sql`): once, not every minute; the tray's link opens Bookings. Until the
  migration is applied the database refuses the type and the booking still succeeds without a bell.
- **The folio shows the stay's requests** (`OccupiedRoomRequests.tsx`, `GET .../rooms/[id]/requests`): housekeeping,
  towels, water, calls, notes, check-out and payment requests, waiting first with *Mark done*, then the handled ones.
  Live on the floor ping.
- **The guest hears every answer.** The room page's Services tab lists *Your requests* (On its way / Done), and an alert
  slides in when the desk marks one done, decides a late check-out, or records a payment (`room-updates.ts`). Marking a
  room's request done pushes the room's channel at once (`PATCH /api/host/notifications`).

## Pages and routes

| Page | Who | What |
|---|---|---|
| `/stay/<slug or id>` | Public | Room types, availability, free reservation with arrival choice |
| `/stay/<slug or id>/checkin` | Guest | Paid pass required: link, or booking code + phone digits |
| `/room/<room code>` | Guest in the room | Menu, services, late check-out, bill |

Guest routes (service role, rate-limited): `GET /api/guest/stay/showcase`, `POST .../book`, `GET .../pass`,
`POST .../pass/lookup`, `POST .../id-proof` (needs a pass), `POST .../checkin` (needs a pass), `GET /api/guest/room/[code]`,
`.../verify`, `.../order`, `.../service`, `.../late-checkout`.

Host routes: `GET/PATCH .../bookings`, `GET/POST .../passes` (quote, bill, link), `PATCH .../passes/[id]` (rotate link; void
= owner + master PIN), `POST .../rooms/[id]/late-checkout` (preview, grant, decline), `GET/PATCH .../rooms/[id]/id-proof`,
`GET/PATCH .../stay-settings`, and the existing `PATCH .../rooms/[id]/status` (now accepts `booking_id`).

## Rules the server enforces

- **Amounts are never taken from a client.** The room quote comes from the room type's rate and the owner's fee rules; a late
  check-out fee from the room's rate and the chosen option.
- **UPI and card payments need their bank reference**, so every advance bill can be matched to a statement later. Cash needs none.
- **One live pass per booking** (unique index). A repeated request returns the same pass; a second bill is refused and leaves nothing behind.
- **A pass is used once.** It is claimed atomically; if the room cannot be given (none free) the pass is given back, so a paid guest never loses it.
- **Link tokens are derived** (HMAC of server secret, pass id, version): the desk can show a link again, rotating revokes the old one.
  Only a hash is stored. `STAFF_SESSION_SECRET` should be set in Vercel.
- **Cancelling a paid stay** is Refund & cancel: owner only, master PIN, and the refund is handed back by the desk.
- **A room's bill is this guest's only.** Orders carry the room id, so anything an earlier stay left open (a bill that failed to
  settle) used to be swept into the next guest's checkout and billed twice. Checkout, the front desk's folio, the guest's bill and
  the room card's order count now count only orders created since the current stay began, and a dish ordered twice becomes one line.
- **Charge to room is food and drinks only**, checked against the catalogue on the server as well as hidden in the menu.
- **ID photos**: private bucket, uploaded only by a holder of a live pass, viewed by the desk through a 10-minute signed link.

## Early check-in and late check-out

Owner options (label, time, fee as a share of one night or a flat amount), up to six each. Early check-in is chosen when
reserving and billed with the room. Late check-out is requested from the room page, approved by the desk, paid at once, moves
the room's check-out time (so "due out" follows), and appears on the final bill as a line already paid.

## Requesting check-out

The room page's Services tab has a **Checking out** group: "Ready to check out?" (one tap, an optional note for the
desk) and, while the room is free after the guest, the late check-out options. The request is written to
`rooms.checkout_request` (`POST /api/guest/room/<code>/checkout-request`, `{action: 'request' | 'cancel'}`), rings the
host console as a BILL call for `ROOM <n>`, shows on the room's front-desk card ("Ready to check out · prepare bill")
and at the top of the occupied-room box with the balance and **Bill & check out at the till** / **Dismiss**. The guest's
page shows it as pending (with "See my bill" and "Not leaving yet") and hides the late check-out offer. Checking the
room out clears the request; the desk's Dismiss clears it without checking out.

**The room is never released before its bill is settled.** "Bill & check out" hands the room to the till
(`requestSettleRoom` in `lib/host/open-room-request.ts`): the POS loads the folio, opens the receipt with "Check out &
settle" chosen, and only saving that receipt runs the checkout. The guest's page keeps saying "checked in" until then.
A room that an older build released with its invoice waiting (`ready_for_settlement`) is settled by the till whichever
choice the receipt carries. The Accommodations tab glows while any room holds a pending request, from the rooms table
itself (`useRoomRequests`), even after the bell's call was cleared.

## What a stay is billed for

The nights booked, or the nights stayed if that is more (`billableNights` in `stay-folio.util.ts`), on the guest's
bill, the desk's folio and the checkout alike. A guest who books two nights and leaves after one pays for two; one who
stays a third night pays for three. An advance paid for the booked nights therefore never comes back as a refund for
leaving early; a refund arises only when more was paid than the stay comes to (a desk correction).

## Guests waiting on the desk

A guest's request from the room page ("ready to check out", "wants to pay now") stays visible until acted on: on the
room's front-desk card, at the top of the front desk as a bold "Waiting on the desk" strip (a tap opens the room with
the action ready), in the occupied-room box, and in the bell tray on every host tab, where a room's call is bold and
"Open room" takes the host to Accommodations with that room open. Checkout, a recorded payment, or Dismiss clears it.

## Paying during the stay

Money is taken at the desk, but it can be taken at any point of the stay, not only at checkout:

- **Desk check-in** has a **Payment** section before the button: "Take payment now" (the whole stay, or any advance
  typed in) or "Pay at checkout". The one button says what it will do ("Check in & take ₹X now" / "Check in · pay at
  checkout"). Pay now opens the occupied-room box straight on the payment sheet for that amount (UPI QR, cash or card,
  with reference); the rest stays on the room bill for checkout. A guest arriving with a paid booking defaults to "pay
  at checkout" since nothing is owed yet.
- **The till (Billing / POS)**: picking a room loads its folio, and the receipt asks what the money does before saving.
  **Adjust in the stay · guest stays checked in** (the default; the amount can be part of the bill) records a
  `room_advance` payment and the guest keeps ordering; **Check out & settle · frees the room** runs the room checkout.
  A part payment can never check a guest out (`settlement.mode` on `POST /api/host/orders/create`,
  `room-till-settlement.ts`).
- **Guest's bill tab** shows Paid / Stay so far / Food, the pending amount, and "Pay ₹X now". It sends a BILL call and
  marks the room (`checkout_request.kind = 'bill'`); the desk sees "wants to pay the running bill now" on the card
  and in the box, with "Take payment". The guest can take it back ("Not now").
- **Occupied-room box** has "Take payment now" under the folio at any time (part or full, never more than owed).
- A payment is `POST /api/host/accommodations/rooms/[id]/payment` (`preview` / `record`): a settled `room_advance`
  bill plus `rooms.advance_paid` raised by it, so the guest's bill, the desk's folio and the checkout all show it as
  paid and bill only the balance (`room-payment.service.ts`, idempotent per sheet).

## Cash and change

A cash bill keeps what the guest handed over and what went back (`orders.cash_tendered`, `orders.cash_change`,
migration `20261022000001_cash_tender.sql`; `lib/services/billing/cash-tender.ts`). On the till's receipt and on the
desk's payment sheet, choosing Cash shows **Cash given** with quick note amounts and the change to return; an amount
short of the bill cannot be saved. The receipt prints "Cash tendered / Change returned", the till's message starts
with "Return ₹X change", and the Z-report's cash drawer section shows cash received, change returned and the cash
sales kept (their difference), so the expected drawer still equals the opening float plus cash sales.

## Live orders in the room

The room page subscribes to the same venue-scoped channel the menu's tracker uses (`biz_<venue>_table_RS-<room>`,
`components/room/useRoomLive.ts`): the database pings it on every change to the room's orders and kitchen tickets
(`20261016000006_table_ping.sql`) and the kitchen's status PATCH pushes to it too, so a dish moving from received to
being prepared to on its way shows at once, without a reload. The newest order still in the kitchen is shown with the
menu's own tracker (steps, wording and ticket number; `RoomLiveTracker.tsx`), fed by the ticket status the room API now
returns per order (`kot_status`, `ticket_number`). Polling stays as the safety net: every 8 s while something is
cooking and the push channel is down, 30–90 s while it is up.

## My room without signing in

The stay page's hero has a **My room** button beside "Reserve a room" and "I have a booking". A guest checked in at the
desk (or on another phone) enters the room number and the last four digits of the mobile given at check-in; the same
lookup the menu's "Room delivery" uses (`POST /api/guest/stay/room-lookup`, rate-limited, one answer for every
mismatch) confirms the phone and opens the room page. A phone that already confirmed a room goes straight to it.
Signed-in guests with a live room see "My room · <n>" instead.

## After checkout

Checking a room out marks its booking `checked_out` (not by moving the check-out date: a same-day stay has no earlier
day, and the table refuses check-out on or before check-in). The guest's Stay tab, tile and stay page then read
"Stayed" and offer "Reserve" again. The room page keeps what this phone knew of the stay (`components/room/last-stay.ts`,
localStorage, 36 h): once the room's API reports no stay, it shows "Thank you for staying with us · Checked out" with
the bill and cashback pointers (Me tab) instead of "no stay here", and, if the page was open while the desk settled,
the same message comes up as a sheet within 15 s (the page polls every 15 s while a request is pending, 45 s otherwise).

## How it is tested

`lib/services/stay/stay-pipeline.test.ts` drives the real route handlers through one shared fake database with a controlled clock:
reserve, quote, pay, pass, lookup by code, check in, the room page, a late check-out request and approval, food orders, the dossier,
checkout and settlement, and the desk reserving. It also covers: repeated taps billing once; a second bill refused; one link used by
two taps; two paid guests racing for one room (the loser keeps their pass); a failed check-in giving the pass back; a paid stay
refusing a plain cancel; the desk checking in a paid booking; a guest leaving early (refund due); and an earlier stay's open order
never reaching the next guest's bill. Disabling the stay-scope rule makes the double-billing test fail, which is how it was checked.
What a fake cannot prove: Postgres itself (the unique partial index, row-level security) and the screens; those need the migration
applied and a signed-in click-through.

## One Vibers ID: room orders, cashback, invoices, the POS

- **Room orders are the guest's.** `POST /api/guest/room/<code>/order` reads the sign-in session (`applyRequestIdentity`)
  and every dish is written with `order_items.guest_handle`, exactly as at a table. The order still goes out under the
  room's registered guest. A handle sent by the browser is never trusted.
- **Cashback on room food**, credited at checkout (`room-cashback.service.ts`, called from the room checkout route with
  the service role): 7% of each room-service order's subtotal to the one signed-in guest who ordered all of it; nothing
  on a shared order or a walk-in; once per order, ever (a retried checkout finds the ledger entry). The tariff earns
  nothing (paid at the desk before the stay). `checkoutSummary.cashbackCredited` reports it. The settled room-service
  orders and the stay invoice are stamped `orders.guest_handle`, so they appear under the guest's invoices (Me tab).
- **The advance bill** issued at the desk is stamped with the handle of the Vibers ID the guest reserved with
  (`stay_booking_requests.guest_account_id`), best effort.
- **The menu in room mode is the full menu**: the Vibers ID account bar, cashback and offers in the review, the lounge,
  the Me tab (wallet, invoices). Room-specific: the room bar on top, orders go to the room endpoint, the Bill tab opens
  the room page, no table quick actions, no wallet-code redemption (the room settles at checkout) and no chat ordering.
- **Billing terminal**: picking a room under Order Destination loads its running folio into the POS the way picking a
  table loads its bill (`handle-room-selection.util.ts`: nights so far, add-ons, fees, every room-service dish merged,
  the advance as a credit, what checkout would settle). **Settling a room bill from the till is the guest's checkout**:
  `POST /api/host/orders/create` with `roomId` + `settlement` forwards to the room checkout route with the tender, which
  writes and settles the stay invoice, settles the room-service orders, credits the cashback against that invoice,
  stamps it with the guest's handle, closes the booking (its check-out becomes the day they left, so Stays reads
  "Stayed") and frees the room. The till then refreshes its room list (`quad:rooms-changed`). The table settlement path
  is never used for a room: it used to leave the stay open with a stray settled order beside it, which is why a bill
  settled from the POS "never updated" anywhere.
- **Late check-out is offered only while the room is free after the guest** (`lateCheckoutAvailable`: a room of the
  type for the night after check-out, less reservations due that night). The room's main tab shows "Want to stay a
  little longer?" with the first option's fee when it is; the Services card says to ask the desk when it is not.
- The pipeline test "one Vibers ID, end to end" drives all of this through the real handlers: reserve signed in, desk
  bills (advance stamped), self check-in, the Stay hub knows the room, an order under the handle, the till settles
  (cashback 7% once, invoice stamped, retry refused), the stay reads Stayed and the invoice is in the guest's bills.
- **Host "ID checked"** confirms optimistically and never sits on "Saving…": a desk that cannot be reached in 15 s says so.

## The Stay tile and the Me tab

`GET /api/guest/stay/mine?venue_id=<id>[&scope=all]` (`stay-hub.service.ts`) is the one read behind both: the room this
phone holds a live session for (found by checking the venue's occupied rooms against the room cookies), the reservations
made under the guest's Vibers ID (this venue, or every venue the same login is connected to with `scope=all`), and what
the venue offers (rooms, lowest rate, free now). The menu's **Stay** tile (`components/guest/stay/`, in place of the old
"Room delivery" tile) reads as "Your room · 101", "Your stay · ST-XXXXXX · from Thu 23 Oct" or "Stay with us · from
₹3,500 · 3 free right now", and opens one sheet: My room / Order to room, the reservations with Check in, Reserve a room,
I have a booking, Find my room (room number + phone digits). The **Me** tab's **Stays** section lists every reservation
at every venue with its state (Upcoming, In house, Stayed, Not used, Cancelled…) and the room the guest is in now; the
stay's bills sit under Bills once stamped with the guest's handle (above).

At a venue with rooms the guest navigation gains a **Stay** tab beside Menu (`GuestTabBar` reads the same hub), which
opens `/stay/<venue>`; everything about staying is managed there. Every guest tab link carries `room=` in room mode (`guestHref`), and `POST /api/guest/order` refuses a room label
(`RS-…`): a room order only ever goes through the room endpoint, so it is always on the room's bill.

## Room → menu latency

"Order food to my room" used to arrive on a skeleton after three dependent request waves (room check, then the menu
and six others, then offers/wallet/account once the review sheet mounted), with `auth/me` and `venue/offers` each sent
four times by separate hooks. Now:

- The room page, on its Order tab, reads the menu (`prefetchMenu`) and leaves it plus what the menu needs to know about
  the room in sessionStorage for three minutes (`lib/guest/menu-seed.ts`); it also `router.prefetch`es the menu route.
  The menu page draws from that at once and refreshes behind it (`fetchMenuAndInitSession`, `useRoomMode`).
- `app/(guest)/menu/loading.tsx` shows the menu skeleton the instant the guest taps, instead of a frozen room page.
- `GET /api/guest/room/<code>?view=menu` returns the room, the venue and the kitchen hours without reading the bill.
- Identical concurrent GETs are shared: `fetchGuestAccountState` per venue, offers through `sharedGet`, the wallet per
  URL. In room mode the table-session status poll does not run (a room has no table session).

Measured on the dev server (which also compiles on demand): skeleton at 275 ms, menu visible at 1.1 s, one request wave.

## Not in this build

- An online payment gateway (Razorpay or similar). The payment step is written so one can be added: it would set the pass's
  payment fields from a verified webhook instead of a desk confirmation.
- GST on the advance bill: it carries the same untaxed totals as the existing room folio.
- SMS/WhatsApp sending from the server: the desk shares the link (WhatsApp deep link, QR, copy).
- Hold of a specific room when a pass is issued: the room is chosen at check-in, from the paid type.
- A printable QR card for rooms.
