# A-to-Z live test report

Target: http://localhost:3000 (disposable venue "ZZ E2E Test Venue", removed afterwards)

| # | Step | Result | Time | Detail |
|---:|---|:---:|---:|---|
| 1 | Guest scans QR: menu | PASS | 789 ms | 3 dishes |
| 2 | Guest places order | PASS | 1042 ms | order 29a916df, subtotal 660 |
| 3 | WAITER signs in with PIN | PASS | 637 ms | /pos/terminal?business_id=b4c213bf-85f2-4a4c-a583-7be3ae30c9b6&tab=waiter |
| 4 | CHEF signs in with PIN | PASS | 686 ms | /pos/terminal?business_id=b4c213bf-85f2-4a4c-a583-7be3ae30c9b6&tab=kitchen |
| 5 | CASHIER signs in with PIN | PASS | 722 ms | /pos/terminal?business_id=b4c213bf-85f2-4a4c-a583-7be3ae30c9b6&tab=cashier |
| 6 | Wrong PIN is refused | PASS | 775 ms |  |
| 7 | Chef sees the new ticket | PASS | 514 ms | 1 tickets |
| 8 | Chef marks PREPARING | PASS | 888 ms |  |
| 9 | Chef marks READY | PASS | 864 ms |  |
| 10 | Waiter sees T-01 occupied with its bill | PASS | 1080 ms | bill 660 |
| 11 | Waiter adds items to the table | PASS | 923 ms |  |
| 12 | Waiter marks the order served | PASS | 586 ms |  |
| 13 | Waiter sends the bill to billing | PASS | 712 ms |  |
| 14 | Chef cannot read tables | PASS | 44 ms | HTTP 401 |
| 15 | Chef cannot read sessions | PASS | 28 ms | HTTP 401 |
| 16 | Waiter cannot open staff admin | PASS | 22 ms | HTTP 401 |
| 17 | Cashier cannot open staff admin | PASS | 15 ms | HTTP 401 |
| 18 | Waiter cannot settle a bill | PASS | 21 ms | HTTP 403 |
| 19 | Waiter cannot self-settle (owner switch off) | PASS | 352 ms | HTTP 403 |
| 20 | Forged cookie is refused | PASS | 28 ms | HTTP 401 |
| 21 | No cookie is refused | PASS | 33 ms | HTTP 401 |
| 22 | Waiter cannot read another venue | PASS | 24 ms | HTTP 403 |
| 23 | Cashier settles the bill (cash) | PASS | 1849 ms | total 740 |
| 24 | Order is settled in the database | PASS |  | settled |
| 25 | Table is vacant again | PASS |  | VACANT |
| 26 | Websocket: guest at the table got "table_settled" | PASS |  | 1 message(s) |
| 27 | Websocket: the public settlement message carries no amounts or ids | PASS |  | empty |
| 28 | Database refuses a second new bill on an occupied table | PASS |  | TABLE_STATE_CHANGED: table T-01 already has an open bill |
| 29 | Database refuses an add-on built from an out-of-date bill | PASS |  | TABLE_STATE_CHANGED: bill 8357f1b5-3103-438c-978e-33497a7c2f67 changed since it  |
| 30 | Rush: 24 guests order at once on 2 tables | PASS | 6546 ms | accepted 24/24 in 7.1 s; HTTP {"200":24}; p50 4221 ms, p95 6546 ms |
| 31 | Rush: waiter tables read (p95) | PASS | 518 ms | 14 reads, p50 124 ms |
| 32 | Rush: waiter sessions read (p95) | PASS | 964 ms | 14 reads, p50 273 ms |
| 33 | Rush: chef tickets read (p95) | PASS | 954 ms | 14 reads, p50 231 ms |
| 34 | Rush: T-02 has exactly one open bill | PASS |  | 1 open order(s) |
| 35 | Rush: T-02 bill equals what was ordered | PASS |  | bill 2880 vs ordered 2880 |
| 36 | Rush: T-03 has exactly one open bill | PASS |  | 1 open order(s) |
| 37 | Rush: T-03 bill equals what was ordered | PASS |  | bill 2880 vs ordered 2880 |
| 38 | Cashier settles T-02 (UPI) | PASS | 1915 ms | HTTP 200 |
| 39 | Cashier settles T-03 (UPI) | PASS | 1528 ms | HTTP 200 |
| 40 | No order left open at the venue | PASS |  | 0 open |
| 41 | Order numbers: 4 orders numbered ORD-001..ORD-004, none missing or repeated | PASS |  | 1 billing day(s), seqs 1..4 |
| 42 | Websocket: guest channel connects | PASS |  |  |
| 43 | Websocket: floor-ping channel connects | PASS |  |  |
| 44 | Websocket: floor pings received during the run | PASS |  | 147 pings |
| 45 | Websocket: guest got kitchen status events | PASS |  | 3 events |
| 46 | Cleanup: every row of the test venue removed | PASS |  | 30 rows deleted, 0 left |

**46 / 46 checks passed.**
