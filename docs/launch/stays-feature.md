# Stays: showcase, booking, self check-in, in-room dining

Built 2026-10-21 on top of the existing Accommodations workspace. Nothing is paid online anywhere in this flow:
reservations are confirmed and paid on arrival, in-room orders are charged to the stay, and the desk settles the
consolidated bill at checkout exactly as before.

## Deploy order

1. Apply `supabase/migrations/20261021000005_stays.sql` (staging, then production). Additive: new columns on
   `businesses`, `rooms`, `room_stay_logs`; `stay_booking_requests` brought into the migration history with a
   confirmation code and more statuses; the private `guest-ids` storage bucket.
2. Deploy the build. The front-desk checkout now clears the three new room columns, so the columns must exist first.
3. Owner switches on **Self check-in** (off by default) under Accommodations → Room setup → *Stay page & in-room
   service*. In-room dining is on by default and follows the venue's operating hours.

## Pages

| Page | Who | What |
|---|---|---|
| `/stay/<slug or id>` | Public | Room types with photos, amenities, rate, free-for-your-dates counts; reserve with name + phone; code `ST-XXXXXX` to show at the desk |
| `/stay/<slug or id>/checkin` | Guest at the property | Three steps: guest details, ID photo (camera), room type or booking code. Takes the first vacant room of the type, opens the stay folio, redirects to the room page |
| `/room/<room code>` | Guest in the room (QR card) | Unlocks with the last 4 digits of the phone given at check-in; menu with kitchen-hours gate; "Order to room"; one-tap requests (housekeeping, water, towels, front desk); running bill |

Room codes are `rooms.qr_code_hash`; a room created before this feature gets one at its first self check-in, and
the links are listed under *Stay page & in-room service* for printing.

## Routes

Guest (service role, rate-limited, no sign-in): `GET /api/guest/stay/showcase`, `POST /api/guest/stay/book`,
`POST /api/guest/stay/id-proof` (multipart), `POST /api/guest/stay/checkin`, `GET /api/guest/room/[code]`,
`POST /api/guest/room/[code]/verify`, `POST /api/guest/room/[code]/order`, `POST /api/guest/room/[code]/service`.

Host: `GET/PATCH /api/host/accommodations/bookings`, `GET/PATCH /api/host/accommodations/rooms/[id]/id-proof`,
`GET/PATCH /api/host/accommodations/stay-settings` (PATCH behind the master PIN, owner only).

## How it fits the existing data

- A self check-in writes the same room columns and opens the same `room_stay` folio order as the desk
  (`room-guest-fields.util`, `check-in.service`), plus `checkin_source`, `id_proof_path`, `id_verified_at`.
- An in-room order goes through `placeGuestOrder` (verified prices, atomic function, kitchen ticket) under the label
  `RS <room>`, never `ROOM <room>`, so it is not appended to the tariff folio; it is then tied to the room by
  `orders.room_id` / `kitchen_tickets.room_id`, which checkout and the front desk already read. The ticket carries
  the note `[IN-ROOM DINING - ROOM <n>]`.
- Kitchen hours are `venue_operating_hours` (Reservations → Operating hours). No hours saved means always open.
- Availability for a date range: rooms of the type, less open bookings overlapping the range, less rooms whose
  current guest is still expected on the first night.
- Room requests are `staff_notifications` with `table_number = ROOM <n>`, so the host console rings as it does for
  tables.

## Security decisions

- **Room session**: an HttpOnly cookie signed by the server, bound to the room, the venue and the stay's check-in
  time. Issued at self check-in or after the last-4-digits check (8 tries per 15 minutes per address). A new stay
  in the same room invalidates every earlier cookie. Without it the page shows nothing about the guest and takes no
  order.
- **ID photos**: a private bucket with no client policies; uploaded only through the server after a byte-level
  type check; 5 MB cap; path random under the venue's prefix, and a path from another venue cannot be attached to a
  room. The host sees the photo through a 10-minute signed URL. Checkout clears the path from the room; the stay log
  keeps it for the retention the owner decides (see `database-audit-2026-10-21.md`, item 3).
- **Self check-in is opt-in** and marked on the room card ("Self check-in · ID to verify") until the desk confirms
  the ID. A guest who is not at the property could still take a vacant room from the link; that is why it ships off
  and why the owner's switch is behind the master PIN.
- **Public data**: the showcase exposes room types and counts, never guests or room numbers; the room page exposes
  the guest's first name only after verification.

## Not in this build

- Payments online (by design).
- Breakfast/all-day menu windows per category: the kitchen gate is the venue's opening hours. Per-window menus need
  a small settings model; add when a venue asks.
- A printable QR card for rooms: the links are listed; the table-placard generator can be extended to rooms.
- Notifying the guest (SMS/WhatsApp) of a booking: the code is shown on screen; no messaging provider is configured.
