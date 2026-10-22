# Moving Upstash to Singapore

Date: 22 October 2026. Goal: cut about 0.2–0.3 s from every guest order.

## Why

- **Every order waits on Upstash writes.** The rate limit (one transaction) and the duplicate-order guard (one lock plus
  read) run before the guest gets an answer. The stress audit measured about 90–100 ms and 140 ms for those two steps.
- **Writes always go to the primary region.** Upstash sends reads to the nearest copy but every write to the primary,
  so adding a Singapore read copy to the current database would not help. Only a database whose primary is in
  Singapore does.
- **The current primary is in Mumbai** (read in the Upstash console). From the Singapore functions each call takes
  about 70 ms. A Singapore primary answers the functions in a few milliseconds.
- **Nothing durable lives in Upstash.** Every key the app writes expires on its own: rate-limit windows, duplicate-order
  guards and short caches. A fresh database needs no data copied. During the switch, limits start from zero, which is
  harmless.
- **It also rotates the token.** The launch verdict asked for the Upstash token to be rotated, because Vercel showed it
  as readable before it was marked Sensitive. A new database comes with a new token.

## What the dashboards showed on 22 October

- **The current database** ("Silentroar", endpoint `blessed-reptile-217294`) is a Global database with its primary in
  AWS Mumbai (`ap-south-1`). Upstash lets you add or remove read regions on it, but its primary cannot be moved.
- **It is on Upstash's Free tier**: 500,000 commands a month, of which 319,000 were already used (227,000 writes).
  About a dozen guest routes count each request in Upstash (menu opens, orders, bills, lobby and others), roughly 15,000
  commands per busy venue per night, so 10 venues would use the month's allowance within days. Past it, the app keeps
  working but the rate limits and the duplicate-order guard fall back to each server instance on its own.
  `RATE_LIMIT_REQUIRE_REDIS` is not set in production, so nothing returns 503.
- **The Free tier allows one database.** A Singapore database needs a payment method on the Upstash account and the Pay
  as You Go plan, $0.20 per 100,000 commands, about $10 a month at 10 busy venues.
- **Vercel is on the Hobby plan** with no payment method. Hobby is for non-commercial use only and includes 1,000,000
  function calls and 4 CPU-hours a month; past either, functions stop until 30 days have passed. Production used 116,000
  calls in the last 30 days before launch; 10 busy venues would use roughly 220,000 a day, mostly the staff screens'
  10-second safety-net reads. Upgrade the team to Pro before launch.

## Steps

0. **Add a payment method to Upstash and choose Pay as You Go.** Only the account owner can enter card details.
1. **Create the database (Upstash console).** Sign in at console.upstash.com, choose Create Database, give it a name
   such as `qc-sin`, set the primary region to AWS `ap-southeast-1` (Singapore), and add no read regions. Read regions
   double the cost of every write and do not help here. Pricing is per command, $0.20 per 100,000.
2. **Copy the two values.** On the new database's page, the REST API section shows `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN`.
3. **Replace them in Vercel.** Open the `quadcomputing` project, then Settings, then Environment Variables. Edit both
   variables and keep them Production only. Paste the new URL and the new token, and keep the token marked Sensitive.
4. **Redeploy production.** Environment changes take effect only on a new deployment. Open the latest production
   deployment and choose Redeploy.
5. **Check it straight away.** Place one order from a guest phone. If the token was mistyped, the app falls back to
   per-instance limits. It returns 503 on limited routes only if `RATE_LIMIT_REQUIRE_REDIS=1` is set in production. Then
   run the check below.
6. **Old database.** Leave it running for a day, then delete it in the Upstash console. Local development
   (`.env.local`) still points at it. Either paste the new pair there too or leave it to fall back to memory once the
   old one is deleted.

## Check

```bash
node scripts/audit/floor-stress.mjs . https://www.vibersconnect.com 189664b2-99e7-4d45-ac50-ffb647ef97df T-15,T-16
```

The script prints each order's server timing. After the move, `checks` should fall from about 90–100 ms to about
20–30 ms, and `guard` from about 140 ms to under 20 ms. It places and cancels test orders on the two tables.
