# A-to-Z live test report

Target: http://localhost:3000 (disposable venue "ZZ E2E Test Venue", removed afterwards)

| # | Step | Result | Time | Detail |
|---:|---|:---:|---:|---|
| 1 | Guest scans QR: menu | PASS | 520 ms | 3 dishes |
| 2 | Guest places order | PASS | 1299 ms | order d57857cc, subtotal 660 |
| 3 | WAITER signs in with PIN | PASS | 724 ms | /pos/terminal?business_id=62504756-d24f-4859-9463-872d317a42ad&tab=waiter |
| 4 | CHEF signs in with PIN | PASS | 609 ms | /pos/terminal?business_id=62504756-d24f-4859-9463-872d317a42ad&tab=kitchen |
| 5 | CASHIER signs in with PIN | PASS | 533 ms | /pos/terminal?business_id=62504756-d24f-4859-9463-872d317a42ad&tab=cashier |
| 6 | Wrong PIN is refused | PASS | 547 ms |  |
| 7 | Chef sees the new ticket | PASS | 390 ms | 1 tickets |
| 8 | Chef marks PREPARING | PASS | 648 ms |  |
| 9 | Chef marks READY | PASS | 524 ms |  |
| 10 | Waiter sees T-01 occupied with its bill | PASS | 434 ms | bill 660 |
| 11 | Waiter adds items to the table | PASS | 992 ms |  |
| 12 | Waiter marks the order served | PASS | 865 ms |  |
| 13 | Waiter sends the bill to billing | PASS | 815 ms |  |
| 14 | Chef cannot read tables | PASS | 21 ms | HTTP 401 |
| 15 | Chef cannot read sessions | PASS | 12 ms | HTTP 401 |
| 16 | Waiter cannot open staff admin | PASS | 16 ms | HTTP 401 |
| 17 | Cashier cannot open staff admin | PASS | 15 ms | HTTP 401 |
| 18 | Waiter cannot settle a bill | PASS | 18 ms | HTTP 403 |
| 19 | Waiter cannot self-settle (owner switch off) | PASS | 216 ms | HTTP 403 |
| 20 | Forged cookie is refused | PASS | 8 ms | HTTP 401 |
| 21 | No cookie is refused | PASS | 8 ms | HTTP 401 |
| 22 | Waiter cannot read another venue | PASS | 17 ms | HTTP 403 |
| 23 | Cashier settles the bill (cash) | PASS | 1767 ms | total 740 |
| 24 | Order is settled in the database | PASS |  | settled |
| 25 | Table is vacant again | PASS |  | VACANT |
| 26 | Websocket: guest at the table got "table_settled" | PASS |  | 1 message(s) |
| 27 | Database refuses a second new bill on an occupied table | PASS |  | TABLE_STATE_CHANGED: table T-01 already has an open bill |
| 28 | Database refuses an add-on built from an out-of-date bill | PASS |  | TABLE_STATE_CHANGED: bill 911efb2d-a880-4ce6-aa04-67cd35438e4e changed since it  |
| 29 | Rush: 24 guests order at once on 2 tables | PASS | 6151 ms | accepted 24/24 in 6.5 s; HTTP {"200":24}; p50 3851 ms, p95 6151 ms |
| 30 | Rush: waiter tables read (p95) | PASS | 531 ms | 14 reads, p50 55 ms |
| 31 | Rush: waiter sessions read (p95) | PASS | 627 ms | 14 reads, p50 191 ms |
| 32 | Rush: chef tickets read (p95) | PASS | 575 ms | 14 reads, p50 184 ms |
| 33 | Rush: T-02 has exactly one open bill | PASS |  | 1 open order(s) |
| 34 | Rush: T-02 bill equals what was ordered | PASS |  | bill 2880 vs ordered 2880 |
| 35 | Rush: T-03 has exactly one open bill | PASS |  | 1 open order(s) |
| 36 | Rush: T-03 bill equals what was ordered | PASS |  | bill 2880 vs ordered 2880 |
| 37 | Cashier settles T-02 (UPI) | PASS | 1677 ms | HTTP 200 |
| 38 | Cashier settles T-03 (UPI) | PASS | 1527 ms | HTTP 200 |
| 39 | No order left open at the venue | PASS |  | 0 open |
| 40 | Websocket: guest channel connects | PASS |  |  |
| 41 | Websocket: floor-ping channel connects | PASS |  |  |
| 42 | Websocket: floor pings received during the run | PASS |  | 142 pings |
| 43 | Websocket: guest got kitchen status events | PASS |  | 3 events |
| 44 | Cleanup: every row of the test venue removed | PASS |  | 21 rows deleted, 0 left |

**44 / 44 checks passed.**
