# ADR 0004: Vibey's language model

Status: Accepted (18 Oct 2026, from the Phase 0 eval)

## Decision

Vibey (the guest ordering assistant and the host co-pilot) uses **`qwen/qwen3.8-27b` on Groq**, called through
`lib/vibey/core/llm.ts` with JSON mode and `reasoning_effort: "none"`. `VIBEY_MODEL` overrides it without a code
change. It is separate from the catalog pipeline's `LLM_TEXT_MODEL`.

## Evidence

Measured on 18 Oct 2026 against the 155-case golden set (`tests/vibey/golden/guest.jsonl`, a made-up demo menu, no
real guest data). Raw results: `docs/vibey/eval-results.json`. Re-run: `npx vitest run --config vitest.vibey-eval.config.ts`.

Available on the key that day (`GET /models`): gpt-oss-120b, gpt-oss-20b, qwen3.8-27b, plus non-chat models (Whisper,
Orpheus, prompt guards). The blueprint's `llama-3.1-8b-instant` is **not** offered, so it could not be a candidate.

| | gpt-oss-120b | gpt-oss-20b | **qwen3.8-27b** |
|---|---|---|---|
| Valid JSON (JSON mode on) | 100% | 100% | **100%** |
| Valid JSON after one repair (JSON mode off, 20 cases) | 100% | 100% | **100%** |
| Model alone: intent accuracy | 97.4% | 93.5% | 94.8% |
| Model alone: exact tray change | 92.9% | 89.0% | 91.6% |
| **As shipped** (rules first, model when needed): intent | 99.4% | 99.4% | **100%** |
| As shipped: exact | 98.7% | 98.1% | **98.7%** |
| As shipped: wrong dish added or edited | 1 | 2 | **0** (its one flagged edit was correct; the case's expectation was fixed) |
| Latency p50 / p95 (model call) | 676 / 1646 ms | 602 / 1599 ms | **349 / 1429 ms** |
| Tokens per call (median in / out) | 567 / 77 | 567 / 76 | **504 / 65** |

The model is asked on 14% of golden turns; the rest are answered by the rule parser with no model call. The failures
the eval found (a comma that hid a quantity, "actually make the coffee 3" read as an add by both gpt-oss models,
"delete everything except the coffee" read as removing the coffee by gpt-oss-20b) were fixed in code, not by prompt
changes: the rules now handle them, and a removal phrased with "except/keep/chhod ke" never acts. After the fixes, the
offline golden test (replaying the recorded Qwen answers) scores 100% intent and 100% exact with zero wrong adds.

## Limits that shape the design

Groq's headers on this key, per model: **1,000 requests/day and 8,000 tokens/minute**. At ~570 tokens a turn that is
about 14 model turns a minute across every venue together. So:

- the rule parser and the keyword router answer most turns with no model call;
- each venue has a daily model budget (`VIBEY_DAILY_MODEL_CALLS`, default 1,500, shared across instances through
  Redis when it is configured); when it is spent, or the model is slow or down, Vibey keeps working on rules alone;
- before more than a few pilot venues, move to a paid Groq tier (or a second provider) and re-run the eval.

## Consequences

- Re-run the eval before changing the model, and after any prompt change. The offline golden test replays
  `tests/vibey/golden/recorded.json`; refresh it from the chosen model's `recorded-*.json`.
- The hard gate stays: zero wrong-dish adds on the golden set and in the property test (`lib/vibey/guest/property.test.ts`).
