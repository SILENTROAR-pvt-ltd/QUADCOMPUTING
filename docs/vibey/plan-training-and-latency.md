# Vibey: why "INDIAN MAIN COURSE" showed bread, how the agent reads the menu, and the plan for training and latency

Status: 18 Oct 2026. Fixed and tested: the category bug, the vocabulary, the category precedence. Planned: the latency work in §5.

## 1. What happened (your screenshot)

You typed **INDIAN MAIN COURSE**. Vibey replied "Here's what we have for mains:" and showed wraps, bread and toast.

Why it happened:

1. The browse code asked each dish "what kind are you?" with a function (`kindOf`). Any dish that wasn't a drink, dessert or side fell into a catch-all bucket called `main`. Sandwiches, rolls, breads and burgers all landed there.
2. The request "main course" matched that bucket, so every one of those dishes was listed.
3. Bombay Rasoi has no "Mains" category. Its real categories are Sandwiches, Quick Bites, Beverages, Shakes, Breads, Pav Bhaji, Dals & Lentils, Waffles, Rolls, Pizza, Burgers, Rental, Tours and Salads. So the honest answer was "we don't have mains here", followed by the real categories. Vibey should never list a dish just because it's in a bucket.

Fixed:

- Browsing now matches the request's food concepts (main, bread, dal, sandwich and so on) against each dish's own name and its venue category.
- A dish's venue category wins over words in its name. "Paneer Makhni Grill Sandwich" is a sandwich, not a main, because its category is Sandwiches.
- If nothing on the venue's menu fits, Vibey says so and lists the venue's real categories as tap-to-ask chips.
- A message made only of food-kind words ("INDIAN MAIN COURSE", "sandwiches", "breads") is now read as a request to see that kind. It no longer tries to add a dish.

Verified live on Bombay Rasoi's real menu (dev server, 3005):

| You type | Vibey shows | Time |
|---|---|---|
| INDIAN MAIN COURSE | Dal Fry, Dal Makhani, Gujarati Kadhi, Gujarati Khatti Mithi Dal, Dahi Tikhari, Spl Mumbai Pav Bhaji, Tawa Pulao, Extra Pav | 59 ms |
| show desserts | Waffles and dessert items | 454 ms first, then faster |
| mujhe kuch thanda peena hai | Cold drinks and milkshakes (Cold Coffee, Banana and Mango shakes) | 386 ms |
| breads | Methi Thepla, Puri, Tawa Paratha, Fulka rotis | 19 ms |

## 2. How the agent gets menu details

The request runs through these steps (`app/api/guest/vibey/route.ts`):

1. **Venue check.** `validateGuestAccess` confirms the venue exists. The venue must also have Vibey switched on.
2. **Menu read.** `loadGuestVenue` reads the venue's dishes from the shared menu cache (`lib/services/guest-menu/venue-menu-cache.ts`). On a cache miss it runs three database queries in parallel: the venue row, its tables, and its available dishes (name, category, price, description, photo). A fresh copy is kept 15 s; stale copies up to 5 min if the database fails.
3. **Rules first.** The rule parser (`fastpath.ts`) and the browse matcher (`concepts.ts`) read the message. Most turns end here with no model call.
4. **Model only when needed.** About 14% of golden turns reach the model. It receives at most 20 candidate dishes (never the whole menu), its answer is checked against the schema, and every dish word it returns must appear in what the guest actually typed.
5. **Closed world.** Dish ids and prices come only from the menu. The model can name a dish, never create one. A dish that isn't on the venue's menu is never added.

## 3. The training data: what was added, and what it is not

Added: `lib/vibey/guest/lexicon.ts` and `lexicon-more.ts`.

- **1,262 terms** in 29 concept groups: main, dal, rice, paneer, bread, starter, dessert, drink, cold, tea, coffee, sandwich, burger, roll, pizza, pasta, noodles, chinese, salad, soup, shake, veg, nonveg, breakfast, south Indian, side, and request words.
- Each term is a dish word, a Hinglish name ("thandi", "chai", "meetha"), a spelling variant ("cappucino", "coffe") or a category word.
- Tests: the vocabulary must hold at least 1,000 terms (test passes at 1,262); the screenshot case is a regression test; a dish with its own category is never matched through a word in its name.

What it is not, and why I did not generate 1,000+ dish names per category:

- The venue's dishes come from the venue's own catalog. A made-up list of 1,000 dish names would invent items. Vibey could then offer a dish the venue doesn't serve, which breaks the closed-world rule.
- So the vocabulary teaches words, not dishes. Dishes always come from the venue's menu.
- Real training data for dishes is the host's menu. The next step (§6) is to make that menu richer: categories, diet tags and aliases entered by the host.

Golden set: 165 cases, with recorded model answers. Result: 100% intent, 100% exact, zero wrong dishes added or edited. Property test: 300 random menus, the agent never returns a dish id that isn't on the menu.

## 4. Latency: measured, and what the numbers mean

Measured in this repo (not production):

| Path | Measured | Source |
|---|---|---|
| Rules only, server time | 19–136 ms | `meta.ms` on live replies (dev server, localhost) |
| Rules only, browser round trip | 19–460 ms after warm-up | live browser checks |
| Model path, Groq, p50 / p95 | 349–676 ms / 1.43–1.65 s | 155-case eval, 3 models (`docs/vibey/eval-results.json`) |
| Model share of turns | 14% | golden set |
| First request after a dev restart | up to 2.8 s | dev compile only; not production |

Not measured yet (needs production or staging):

- The round trip from the phone to the production server, and the database round trip. Memory notes say each database query costs about 170 ms from Delhi, but that is for the Club project and was not measured here.
- The Vercel function region. `vercel.json` sets no `regions`, and the Supabase project's region is not recorded in this repo.

Causes of high latency, most important first:

1. **Database round trips across regions.** Each menu cache miss waits for the slowest of three database queries. If the functions and the database are in different regions, every miss costs a long round trip. Fix: check the Supabase region in the dashboard, then set `regions` in `vercel.json` to match. Measure with the response header `x-vercel-id` before and after.
2. **Model turns.** A model turn costs about 0.35–1.6 s. The new rules remove more of these (categories, diet, timing); the goal is under 10% of turns.
3. **Cache warm-up per instance.** Each serverless instance starts with an empty cache. Option: raise the menu cache from 15 s to 30 s (edits then take up to 30 s to show), or move the cache to Upstash.
4. **Model input size.** 500–570 input tokens per model turn. Cut the candidate dishes from 20 to 10 and trim the system prompt; this lowers model latency.
5. **Rate-limit calls.** With Upstash configured, each turn makes up to three Redis calls (per IP, per table, the daily budget). Combine them into one pipelined call.
6. **Client.** The menu page and the chat are fine once compiled. Check the production build with Lighthouse on a mid-range phone before launch.

Targets to hold:

- Rules path: p95 under 150 ms on the server.
- Model path: p95 under 1.5 s.
- End to end on a phone: under 1 s for rules, under 2.5 s with the model.

## 5. Plan, in order

| # | Item | Status | Owner / where |
|---|---|---|---|
| 1 | Fix "INDIAN MAIN COURSE" and category browsing | Done (tests + live) | `concepts.ts`, `answers.ts`, `fastpath.ts` |
| 2 | Category precedence over dish-name words | Done (test) | `concepts.ts` |
| 3 | 1,262-term food vocabulary, merged per concept | Done (test ≥ 1,000) | `lexicon.ts`, `lexicon-more.ts` |
| 4 | Remove ambiguous vocabulary (masala, chocolate, margarita, vada, methi) | Done | `lexicon.ts` |
| 5 | Confirm the Supabase region; set the Vercel region to match | Next (needs the dashboard) | `vercel.json` |
| 6 | Cut candidate dishes 20 → 10; shorten the system prompt | Next | `understand.ts` |
| 7 | Menu cache TTL decision (15 s vs 30 s, or shared cache) | Needs your decision | `venue-menu-cache.ts` |
| 8 | Pipeline the Redis rate-limit calls | Next | `rate-limiter.ts` |
| 9 | Log unmatched phrases as counts, with no personal text, to grow the vocabulary | Next | `telemetry.ts` |
| 10 | Host-side dish tags (category, veg/non-veg, aliases) in the catalog | Planned (needs the host editor) | catalog |
| 11 | Staging load test (50–200 users) and production Lighthouse check | Before launch | staging |

## 6. Decisions I need from you

- **Supabase region.** Tell me the project's region, or check Settings → General in the Supabase dashboard. I'll set the Vercel region to match.
- **Menu freshness.** Keep edits showing within 15 seconds (more database reads), or allow 30 seconds (fewer reads, slower updates)?
- **Model use.** Keep Groq's free key (about 14 model turns per minute across all venues), or move to a paid tier before the pilot grows?

## 7. Known behaviour, not a bug

- A bare category word that also appears in dish names ("sandwiches") asks which one, with the options as cards and chips. "club sandwich" does the same. This is deliberate: it avoids guessing a dish.
