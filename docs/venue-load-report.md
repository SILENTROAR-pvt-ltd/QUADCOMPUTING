# Backend query report per venue (rush profile)

Profile per venue: 2 waiters, 1 chef, 1 cashier, 60 guest phones, 8 orders/min.

| Venues | Mode | Staff requests/s | Staff reads/s | Push refetch reads/s | Guest reads/s | Menu reads/s | **Total DB reads/s** |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | polling 4 s, no menu cache | 2.6 | 3.3 | 0.0 | 6.0 | 3.0 | **12.3** |
| 1 | push + cache | 0.3 | 0.2 | 2.7 | 6.0 | 0.2 | **9.1** |
| 5 | polling 4 s, no menu cache | 13.2 | 16.5 | 0.0 | 30.0 | 15.0 | **61.5** |
| 5 | push + cache | 1.7 | 1.0 | 13.3 | 30.0 | 1.0 | **45.3** |
| 20 | polling 4 s, no menu cache | 52.7 | 65.8 | 0.0 | 120 | 60.0 | **246** |
| 20 | push + cache | 6.7 | 3.9 | 53.3 | 120 | 4.0 | **181** |
| 40 | polling 4 s, no menu cache | 105 | 132 | 0.0 | 240 | 120 | **492** |
| 40 | push + cache | 13.3 | 7.8 | 107 | 240 | 8.0 | **362** |

Per venue: 12.3 -> 9.1 reads/s (26% fewer). Guest status polling is now the largest remaining share.
