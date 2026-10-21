# Stays, A to Z: two walkthroughs

Every screen a stay touches, in the order it happens, for the two ways a guest arrives. Each step names the screen,
who acts, what is written, and what the other side sees. The figures are one worked example: a Mount View room at
₹3,500 a night, two nights, a ₹650 room-service order, and a guest who pays cash.

Read with `stays-feature.md` (what each piece is) and `stays-audit-2026-10-21.md` (what was tested and the verdict).

## Scenario 1 · The guest walks in; staff do everything

**1. Arrival · Host console → Accommodations → Front desk.**
The desk taps a vacant room card (say suite2). The check-in panel opens as a full-screen sheet on a phone, a card on a
desk. Staff type the name, mobile, ID type and number, nights (2), guests (2), purpose, add-ons if any. The quote at
the bottom is the same rule checkout bills with: 2 × ₹3,500 = ₹7,000.

**2. Payment choice · same panel, Payment section.**
"Take payment now" (whole stay, or any advance typed in) or "Pay at checkout". The one button reads what it will do:
"Check in & take ₹7,000 now" or "Check in · pay at checkout". Say the guest pays ₹4,000 now in cash.

**3. Check-in · `PATCH /api/host/accommodations/rooms/suite2/status {action: 'check-in'}`.**
The room turns OCCUPIED with the guest's details; the stay's folio order opens; a stay log starts. The room's
QR card (Room setup → Room QR cards, printable placards) is what the guest will scan.

**4. Advance · the occupied-room box opens straight on the payment sheet for ₹4,000.**
Cash: "Cash given" with quick notes; the guest hands ₹5,000, the sheet shows "Return change ₹1,000". Staff tick
"received" and confirm. `POST /api/host/accommodations/rooms/suite2/payment {action: 'record', amount: 4000,
payment_method: 'CASH', cash_tendered: 5000}` writes a settled `room_advance` bill (cash_tendered 5,000, cash_change
1,000) and raises `rooms.advance_paid` to 4,000. The receipt step prints the tax invoice with "Cash tendered / Change
returned" and a bold "Return change ₹1,000".

**5. The guest's room page · scans the QR card → `/room/<code>`.**
First visit asks for the last four digits of the mobile given at check-in; after that the phone is the guest's for
the stay. The page shows: Welcome, nights so far, check-out time, Bill ₹3,000 pending (₹7,000 stay − ₹4,000 paid),
"Order food to my room", Services, My bill. (Without the card: the venue's stay page `/stay/<venue>` → **My room** →
the same four digits open the same page; the room number is asked only if two stays share the digits.)

**6. Room service · "Order food to my room" → the venue's menu in room mode (`/menu?...&table=RS-suite2`).**
The guest orders a ₹650 thali. `POST /api/guest/room/<code>/order` writes the order with label RS-suite2 and a
kitchen ticket. The guest sees the sending overlay, then "Track my order" → back on the room page the menu's own
tracker sits at the top: Received → Being prepared → On its way, moved by the kitchen's pushes on the room's realtime
channel (no reload). Kitchen → Tickets shows the ticket as "RS-suite2".

**7. The bill, any time · room page → My bill.**
Paid ₹4,000 · Stay so far ₹7,000 · Food ₹650 · Pending ₹3,650. "Pay ₹3,650 now" sends a BILL call; the desk's bell
reads "Room suite2 wants to pay the running bill now", the Accommodations row glows, the room card says so, and the
room box opens on "Take payment". Any part can be taken now; the rest stays on the bill.

**8. Leaving · room page → Order tab → "Leaving today? Request check-out" (or Services → Checking out).**
`rooms.checkout_request = {kind: 'checkout'}`. The bell rings, Accommodations glows, the front desk shows "Waiting on
the desk · Room suite2", and the room box opens on the request panel. The guest's page says "Check-out requested. The
desk is preparing your bill: ₹3,650 to pay at the desk."

**9. Checkout · room box → "Bill ₹3,650 & check out" (or the request panel's "Bill & check out at the till").**
Nothing is released yet. The room is handed to Billing & POS: the folio loads (nights, add-ons, dishes, advance as a
credit) and the receipt opens with **Check out & settle · frees the room** already chosen. Cash: "Cash given" ₹4,000 →
"Return change ₹350". Save. `POST /api/host/orders/create {roomId, settlement: {mode: 'checkout'}, paymentMethod:
'CASH', cashTendered: 4000}` runs the room checkout: the stay invoice (ROOM suite2, ₹3,650) is written and settled
with cash_tendered 4,000 / cash_change 350, the thali order is settled, the stay log closes, the room goes to
CLEANING, the request clears. The till's message: "Return ₹350 change. ROOM suite2 checked out and settled."

If instead the host chooses **Adjust in the stay** with ₹2,000, the guest stays checked in, ₹1,650 remains pending,
and the room page shows it. A part payment can never check a guest out.

**10. After · the guest's room page** turns into "Thank you for staying with us · Checked out", with "See my bill"
(Me → Bills shows the ROOM suite2 invoice) and "Stay again". The front desk card shows the room in housekeeping;
"Mark clean" returns it to vacant. Stay history lists the stay with guest, ID, invoice, orders and cashback.

**11. End of day · Host console → Analytics → Z-report.**
Payments received: Cash ₹7,650 (₹4,000 advance + ₹3,650 final). Cash drawer: Opening float + Cash received from guests
₹9,000 (₹5,000 + ₹4,000) − Change returned ₹1,350 = Cash sales ₹7,650 = Expected in drawer. Count the drawer; the
variance line says Balanced, Over or Short. Sales summary counts the two settled bills; open and voided bills are
listed beside them.

## Scenario 2 · The guest does it from their phone (scan, reserve, self check-in)

**1. Discovery · table QR → `/menu?cafe_id=…&table=T-03` → Stay tab/tile, or the venue's link `/stay/<venue>`.**
The stay page shows the rooms, free-for-your-dates counts, and the three promises (free to reserve, pay at the desk,
check in from your phone).

**2. Reserve · "Reserve a room" → Vibers ID sign-in (one tap if already signed in) → dates, guests → Reserve.**
`POST /api/guest/stay/book` holds a room of that type for the dates (overbooking refused). Status `confirmed`, code
ST-XXXXXX. The guest's Stay tab shows "Upcoming · ST-XXXXXX". Nothing is charged.

**3. The desk sees it · Accommodations → Bookings (and Expected arrivals on the front desk).**
The booking lists with "Take payment" / "Check in at desk". The held room shows "holding suite1" on the arrival card.

**4. Pay for the stay · Bookings → Take payment.**
The sheet quotes on the server (2 nights ₹7,000, early check-in fee if chosen). UPI shows the venue's QR for the exact
amount; cash shows "Cash given" and change. Confirm. `POST /api/host/accommodations/passes` writes the settled advance
bill (owned by the guest's Vibers ID, so it appears in their Me → Bills) and issues the **pass**: a check-in link and
QR. The desk shows it, copies it, or sends it on WhatsApp.

**5. Self check-in · the guest opens the link (`/stay/<venue>/checkin?p=…`).**
Name confirmed, ID type and number, photo of the ID, DPDP consent. `POST /api/guest/stay/checkin` checks the pass
(one use, not expired), takes the held room, writes the guest to it with `advance_paid` 7,000, closes the booking as
`checked_in`, and opens the room page with "You are checked in" and the phone confirmed. The stay page and the menu's
Stay tile now read "My room · suite1".

**6–8. Room service, bill, requests** are exactly Scenario 1 steps 6–8. The bill reads Paid ₹7,000 · Stay ₹7,000 ·
Food ₹650 · Pending ₹650. Dishes ordered under the Vibers ID earn 7% cashback at checkout.

**9. Checkout** is Scenario 1 step 9 with ₹650 to take. The stay invoice carries the thali and the advance credit;
`creditRoomDiningCashback` credits ₹45.50 to the guest's wallet against that invoice; the booking becomes
`checked_out`.

**10. After** · the guest's Stay tab reads "Stayed · ST-XXXXXX", Me → Bills has the advance bill and the stay invoice
with its cashback, the room page is the farewell. A guest who leaves after one night of a two-night booking is still
billed two nights (a third night stayed is billed three).

**11. Z-report** · as Scenario 1; the advance bill is in the day it was paid, the stay invoice in the day of checkout.

## Where each piece of money lives

| Event | Written where | Shown where |
|---|---|---|
| Advance at the desk | `orders` (room_advance, SETTLED) + `rooms.advance_paid` | Guest bill "Paid", desk folio "Paid so far", Z-report tenders |
| Pass payment (reservation) | `orders` (room_advance) + `stay_passes` | Guest Me → Bills, Bookings "Paid" |
| Part payment at the till | `orders` (room_advance) + `rooms.advance_paid` | Guest bill, desk folio, till message |
| Checkout | `orders` (room_stay invoice, SETTLED), room-service orders SETTLED, `room_stay_logs` | Guest farewell + Me → Bills, Stay history, Z-report |
| Cash given / change | `orders.cash_tendered` / `orders.cash_change` | Receipt, till message, Z-report drawer |

## Timing on the dev server (remote database)

Order placement from the room ≈ 1.7–2.0 s round trip; the sending overlay covers it. Room page refresh ≈ 300–500 ms;
pushes arrive within a second of the kitchen's tap. The POS folio load ≈ 600–900 ms. Production on Vercel with the
database in the same region is faster; the figures above are the worst case seen.
