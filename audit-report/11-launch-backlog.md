# 11 Launch Backlog (14 Oct Pilot)

| ID | Title | Area | Severity | Symptom | Root Cause | Fix Approach | Effort | Depends On | Proof | Pilot? | Owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | Fix Empty Catch Blocks | API | P1 | Silent failure on DB errors | roundtrips.csv | Re-throw or return 500 | 4h | - | Script 09 | Y | Dev |
| B2 | Resolve DB Mismatches | DB | P0 | App crashes | db-mismatch.csv | Update migrations or queries | 8h | - | Script 04 | Y | DB Admin |
| B3 | Implement Atomic Order/KOT | Backend | P0 | Race conditions | P1 pipeline | Use RPC for transaction | 16h | - | e2e test | Y | Dev |
