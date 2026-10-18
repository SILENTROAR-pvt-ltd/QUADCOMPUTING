# Live events lead pipeline: live test report

| # | Step | Result | Detail |
|---:|---|:---:|---|
| 1 | Guest feed lists the live event | PASS | 1 event(s) |
| 2 | Feed carries fee, perks, and seats left in total and by gender | PASS |  |
| 3 | Feed does not expose the pool settings | PASS |  |
| 4 | Prefill for a guest not signed in is empty | PASS |  |
| 5 | Refused: no contact | PASS | HTTP 400 |
| 6 | Refused: no name | PASS | HTTP 400 |
| 7 | Refused: empty party | PASS | HTTP 400 |
| 8 | Refused: party over ten | PASS | HTTP 400 |
| 9 | Refused: unknown event | PASS | HTTP 404 |
| 10 | Instant confirmation message | PASS | You're on the guest list! The lounge team has been notified. |
| 11 | Lead saved with party and gender mix | PASS |  |
| 12 | The lounge team is notified | PASS | Asha Rao is interested in "Sunset Acoustics & Cocktails" (5 guests: 3 men, 2 women). |
| 13 | Seats left drop by gender: 5 total, 2 men, 3 women | PASS | 5 / men 2 / women 3 |
| 14 | Three men when two seats are left: refused with the seats left | PASS | Only 2 seats are left for men. |
| 15 | Two men and two women fit | PASS |  |
| 16 | Second submit by the same guest updates the same lead | PASS | 1 lead(s), party 4 |
| 17 | Two women when one seat is left for women: refused | PASS | Only 1 seat is left for women. |
| 18 | One man and one woman take the last seats | PASS |  |
| 19 | Feed now shows the event full | PASS | 0 left |
| 20 | Anyone else is told the event is full | PASS | This event is full. |
| 21 | Two parties race for one pair of seats: exactly one wins | PASS | HTTP 409 and 200 |
| 22 | Ledger has one row per guest, even when a guest gave phone once and email later | PASS | p:9000000002, p:9000000012, p:9123456780, p:9876543210 |
| 23 | Each guest counted once as an event lead | PASS |  |
| 24 | A bill settled twice is counted once | PASS |  |
| 25 | Two settled bills: 2 visits, spend adds up | PASS | 2 visits, ₹2000 |
| 26 | No login: /api/host/guests refused | PASS | HTTP 401 |
| 27 | No login: /api/host/live-events refused | PASS | HTTP 401 |
| 28 | No login: /api/host/live-events/import refused | PASS | HTTP 401 |
| 29 | No login: /api/host/live-events/leads refused | PASS | HTTP 401 |
| 30 | The browser's own key cannot read the guest list directly | PASS | 0 rows |
| 31 | Cancelled event refuses new interest and leaves the feed | PASS | HTTP 404, 0 in feed |
| 32 | Cleanup: every row of the test venue removed | PASS | 15 rows deleted, 0 left |

**32 / 32 checks passed.**
