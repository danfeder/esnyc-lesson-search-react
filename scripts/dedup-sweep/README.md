# T4 dedup sweep

Read-only pipeline that finds duplicate-candidate lesson sets in the live
library and builds a plain-language evidence deck for the T4 walkthrough with
the user. **Nothing here writes to any database** — every DB touch is a
`SELECT` via the publishable anon key. Retiring the true duplicates happens
later, in a reviewed migration (track t4c), only on user-approved losers.

## Pipeline

| Step | Script | Output | Notes |
|------|--------|--------|-------|
| 1. Export | `export-corpus.ts` | `artifacts/corpus.json` (gitignored) | Live PROD lessons (`retired_at IS NULL`), read-only anon key. |
| 2. Candidates | `generate-candidates.ts` | `docs/plans/t4-dedup/candidates.json` | Deterministic groups + tiers + signals. Pre-registered calibration gate. |
| 3. Deck fan-out | `run-deck.ts` | `docs/plans/t4-dedup/deck.json` | One Sonnet 4.6 agent per group, script-side collection. |
| 4. Render | `build-deck-md.ts` | `docs/plans/t4-dedup/deck.md` | Human-readable walkthrough deck. |

`trigram.ts` and `deck-prompt.ts` are shared pure helpers.

## Reproduce

```bash
# 1. export (needs the publishable anon key — read-only)
DEDUP_SWEEP_SUPABASE_URL="https://jxlxtzkmicfhchkhiojz.supabase.co" \
DEDUP_SWEEP_SUPABASE_ANON_KEY="<publishable anon key>" \
  npx tsx scripts/dedup-sweep/export-corpus.ts

# 2. deterministic candidates (byte-identical every run; hard-fails on calibration drift)
npx tsx scripts/dedup-sweep/generate-candidates.ts

# 3. evidence deck (LLM fan-out; DECK_LIMIT=N for a smoke test)
npx tsx scripts/dedup-sweep/run-deck.ts

# 4. render the markdown deck
npx tsx scripts/dedup-sweep/build-deck-md.ts
```

## Candidate rules (blocking → union-find groups)

A pair is a candidate if ANY of: (a) identical normalized title (lower + collapse
all whitespace/control chars); (b) title trigram similarity ≥ 0.55; (c) equal
`content_hash`; (d) identical non-empty `main_ingredients` **and**
`thematic_categories`. Groups are tiered by their max pairwise content trigram
similarity: **A ≥ 0.92** (near-certain copy), **B 0.75–0.92**, **C < 0.75**.

The TS trigram mimics PostgreSQL `pg_trgm.similarity()` closely — on the 8
pre-registered PROD reference pairs the TS and SQL values agree to ≤0.001 (except
one Fattoush pair, both < 0.75). The calibration gate in `generate-candidates.ts`
STOPs the run if any reference pair's tier flips or the group/row counts drift.

## Determinism

`candidates.json` is fully deterministic (same corpus → byte-identical output).
`deck.json` is a **point-in-time LLM artifact**: the recommendations come from
Sonnet 4.6 reading each lesson and will vary slightly if regenerated. It is a
starting point for the walkthrough — every keep/retire decision is the user's.

## Model pin

The fan-out is pinned to `claude-sonnet-4-6` (user directive 2026-07-02 — **not**
the `sonnet` alias, which now resolves to Sonnet 5). `run-deck.ts` asserts the
model that actually ran and STOPs on any mismatch.
