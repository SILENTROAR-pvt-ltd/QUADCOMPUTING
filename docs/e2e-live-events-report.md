# Live events lead pipeline: live test report

| # | Step | Result | Detail |
|---:|---|:---:|---|
| 1 | Guest feed lists the live event | PASS | 1 event(s) |
| 2 | Feed carries fee, perks, spots and a rule flag | PASS |  |
| 3 | Feed does not expose capacity or the men-share limit | PASS |  |
| 4 | Prefill for a guest not signed in is empty | PASS |  |
| 5 | Refused: no contact | PASS | HTTP 400 |
| 6 | Refused: no name | PASS | HTTP 400 |
| 7 | Refused: empty party | PASS | HTTP 400 |
| 8 | Refused: party over ten | PASS | HTTP 400 |
| 9 | Refused: unknown event | PASS | HTTP 404 |
| 10 | Instant confirmation message | PASS | You're on the guest list! The lounge team has been notified. |
| 11 | Lead saved with party and gender mix | PASS |  |
| 12 | The lounge team is notified | PASS | Asha Rao is interested in "Sunset Acoustics & Cocktails" (5 guests). |
| 13 | Over the men-share limit: accepted but needs approval | PASS | Your request is in. The lounge team will confirm your party shortly. |
| 14 | Held lead is flagged for the host | PASS |  |
| 15 | Second submit by the same guest updates the same lead | PASS | 1 lead(s), party 4 |
| 16 | Party larger than the spots left is refused | PASS | Only 1 spots are left for this event. |
| 17 | Spots left falls as parties join | PASS | 1 left of 10 |
| 18 | Ledger has one row per guest, even when a guest gave phone once and email later | PASS | p:9123456780, p:9876543210 |
| 19 | Each guest counted once as an event lead | PASS |  |
| 20 | Two settled bills: 2 visits, spend adds up | PASS | 2 visits, ₹2000 |
| 21 | No login: /api/host/guests refused | PASS | HTTP 401 |
| 22 | No login: /api/host/live-events refused | PASS | HTTP 401 |
| 23 | No login: /api/host/live-events/leads refused | PASS | HTTP 401 |
| 24 | The browser's own key cannot read the guest list directly | PASS | 0 rows |
| 25 | Cancelled event refuses new interest and leaves the feed | PASS | HTTP 404, 0 in feed |
| 26 | Cleanup: every row of the test venue removed | PASS | 9 rows deleted, 0 left |

**26 / 26 checks passed.**
