# E3 — Token-economics dry-run: per-field vs monolithic call shapes (feeds OQ3, secondarily OQ4)

- **Evidence item:** impl-plan work-list item 3 ("Token-economics dry-run, 10-20 lessons, per-field AND monolithic shapes")
- **Date:** 2026-06-12 (run); sampled 2026-06-11
- **Model measured:** `claude-opus-4-7` (matches both PROD call sites), direct API
- **Status:** V1 + V2 COMPLETE; **V3 PARTIAL (5 of 153 calls — Console account ran out of credits mid-run)**. The 5 V3 calls are nonetheless decisive on the headline cache question. Rerun instructions in §9.
- **Harness + raw per-call JSONL:** `.tmp/pr6-dryrun/` (throwaway, not pipeline code): `harness.ts`, `fields.ts`, `fetch-samples.mjs`, `analyze.py`, `preflight.json`, `v{1,2,3}-*.jsonl`, `projections.json`
- **Actual dry-run spend: $3.58** ($0.54 V1 + $2.85 V2 + $0.20 V3) — against the $40 target / $60 abort caps

---

## 1. Executive summary (plain language)

**The numbers favor the monolithic shape — one call per lesson that fills in all 17 fields at once — and not by a little.** On the model we use today, re-tagging all 767 live lessons monolithically projects to about **$24** run live, or **$13–26** through the half-price Batch API depending on how often the cache cooperates. Tagging the same corpus one-field-at-a-time the way the submission pipeline does it today (V2) projects to about **$220** live / **$110** batched — roughly **$90–200 more** than monolithic on every full run. The clever middle option (V3: per-field calls sharing one big cached prompt) cut the *input* cost as hoped — caching worked even better than the docs promise — but the model unexpectedly wrote ~18× more output per call in that shape, which made it the most expensive variant measured (~$430 projected as-measured; ~$120 if that output behavior were fixed — still 5× monolithic). On a cheaper model tier (Sonnet 4.6) every number shrinks ~40%, with the same ordering.

Three measured facts drive this:
1. **Per-field calls can't use the cache at all on Opus.** Each single-field prompt+tool weighs 1,328–2,238 tokens — under the 4,096-token minimum a prompt must reach before Opus will cache it. We watched all 153 V2 calls run with zero cache activity. So per-field pays full price to re-send the lesson body 17 times.
2. **The monolithic prompt caches perfectly.** Its 6,274-token prefix was written once, then read from cache on 14/14 subsequent lessons at one-tenth input price.
3. **In V3, even the lesson body cached across the per-field calls** (the docs predicted forcing a different tool each call would break that). But the shape confused the model into ~1,000-token tool outputs (vs ~57 in V2), and output tokens cost 5× input — wiping out the savings.

Decision-relevant remainder: monolithic's risks are qualitative, not economic — one bad field can poison a whole-lesson response, and debugging/retry is coarser-grained. Those belong to the OQ3 walkthrough discussion; the cost question is settled.

---

## 2. Methodology

**Harness.** Throwaway TS harness at `.tmp/pr6-dryrun/harness.ts` (Node ESM, `npx tsx`, `dotenv` → `.env.local`, `@anthropic-ai/sdk@0.95.0`) mirroring the canonical call shape verified in `oq1-call-shape-confirmation.md`: bare `new Anthropic({apiKey})`, `system` as text-block array with `cache_control: {type:'ephemeral'}`, custom tool(s) with enum-constrained `input_schema` and `cache_control` on the (last) tool, forced `tool_choice`, single user turn carrying the raw body, usage counters captured per call, JSONL appended per call. `max_tokens` 1024 (canonical) for per-field calls; 2048 for monolithic (17-field output headroom; no call came near either cap — all 173 successful calls stopped on `tool_use`).

**API key.** `.env.local`'s `ANTHROPIC_API_KEY` is the CLIProxyAPI proxy-side key (401s against the direct API; the proxy route is also disqualified for this measurement by its known cache_read=0 usage-reporting gotcha). Used `ANTHROPIC_CONSOLE_API_KEY` from the same `.env.local`, direct to `api.anthropic.com`, so all cache counters are real API counters.

**Sample.** 15 live lessons, sampled READ-ONLY from PROD via `mcp__supabase-remote__execute_sql` with deterministic seed `md5(lesson_id || 'oq3-dryrun-seed')`, stratified: 4 short (1,692–2,156 chars), 7 mid (3,045–5,007), 4 long (8,351–20,477); all `retired_at IS NULL AND length(content_text) >= 500` (automatically excludes the 3 OQ5 known-bad rows). Bodies fetched read-only via PostgREST with the project's publishable anon key; hygiene per OQ5 (strip `\x0B`, normalize `\r`). V2/V3 use a 9-lesson subset (2 short / 5 mid / 2 long, mean 4,859 chars — close to the corpus mean 4,294).

**Prompt + tool mass (provisional text, realistic mass).** 17 fields from `lessonMetadata.zod.ts` (the classified-vocab fields; free-string fields like `summary`/`duration` excluded). Enums: the 4 locked enums from `src/types/generated/enums.json`; cultural heritage = union of live PROD DISTINCT values (60) and `data/vocab/cultural-heritage.vocab.json` canonical labels → 71 values; academic concepts = union of live PROD DISTINCT (120) and `data/vocab/academic-concepts.vocab.json` canonical labels → 119 values; remaining fields from the configured lists in `src/utils/filterDefinitions.ts` (mainIngredients 44, cookingSkills 27, gardenSkills 22, observancesHolidays 17, gradeLevels 11, etc.). Each field got a 2-5 sentence provisional tagging rule (drawing on the documented failure classes: tasting≠cooking, craft vs cooking, stovetop grade-appropriateness).

**Variants.**
| | Calls | Shape | Order |
|---|---|---|---|
| V1 monolithic | 15 (1/lesson) | one tool, 17 enum-constrained properties; combined system prompt | sequential |
| V2 per-field (canonical) | 153 (17/lesson × 9) | per call: ONLY that field's prompt + single tool (today's `process-submission` shape) | FIELD-major (cross-lesson cache chance per field) |
| V3 per-field (shared prefix) | 153 planned, **5 ran** | every call: identical full 17-tool array + combined system; `tool_choice` rotates per field; body block carries its own `cache_control` (3 breakpoints total) | LESSON-major burst (within 5-min TTL) |

**Pricing used** ($/MTok, claude-api skill, cached 2026-06-04): Opus 4.7 input $5, output $25, cache write (5-min TTL) $6.25, cache read $0.50. Sonnet 4.6: $3 / $15 / $3.75 / $0.30. Opus-family minimum cacheable prefix: **4,096 tokens** (Sonnet 4.6: 2,048); shorter prefixes silently don't cache.

**Budget.** Caps: ≤20 lessons, ≤$40 target, $60 hard abort (enforced in-harness from the JSONLs). Actual: $3.58.

---

## 3. Preflight token masses (free `count_tokens` endpoint, measured)

| Shape | Prefix tokens (system+tools) | vs Opus 4,096 min |
|---|---:|---|
| V1 monolithic (combined system + 17-property tool) | **6,713** | caches ✓ |
| V3 shared prefix (combined system + 17 tools) | **7,806** | caches ✓ |
| V2 per-field, largest (academicConcepts, 119-value enum) | **2,238** | **below — cannot cache** |
| V2 per-field, smallest (locationRequirements) | **1,328** | below |
| V2 per-field, mean across 17 fields | **1,490** | below |

Bodies: 15 bodies = 29,374 tokens (mean 1,958; **2.895 chars/token**). Corpus-mean body estimate: 4,294 chars (OQ5) ÷ 2.895 = **1,483 tokens**.

## 4. Measured results

### V1 — monolithic (15/15 calls, 0 errors, $0.5364)

- Call 1: `cache_creation_input_tokens=6,274` (prefix written). Calls 2-15: **`cache_read_input_tokens=6,274` on 14/14** — perfect prefix reuse across 15 different bodies.
- `input_tokens` per call = body + ~565 wrapper/overhead. Output mean **704** tokens (17-field tool JSON). Mean latency 7.8s.
- Verbatim first two records (trimmed): `{"field":null,...,"usage":{"input_tokens":1231,"cache_creation_input_tokens":6274,"cache_read_input_tokens":0,"output_tokens":578}}` → `{"usage":{"input_tokens":1267,"cache_creation_input_tokens":0,"cache_read_input_tokens":6274,"output_tokens":724}}`

### V2 — per-field canonical (153/153 calls, 0 errors, $2.8474)

- **Zero cache activity on all 153 calls** (`cache_read>0` on 0/153, `cache_write>0` on 0/153) — including the 9 consecutive same-prefix `academicConcepts` calls (largest prefix, 2,238 tok). Confirms the 4,096-token minimum bites: today's per-field shape **cannot cache anything on Opus-family models**, even field-major.
- Mean uncached input per call: prefix+overhead 1,614 + body. Mean input by bucket: short 2,356 / mid 3,024 / long 5,541 tokens. Output mean **57** tokens. Mean latency 2.7s.
- Token totals: input 525,551; output 8,786; cache 0/0.

### V3 — shared-prefix per-field (5/153 calls before credit exhaustion, $0.1976)

All 5 calls are lesson 1 (Trail Mix, body 666 tok), five different forced tools:

| call | field (tool_choice) | input | cache_write | cache_read | output |
|---|---|---:|---:|---:|---:|
| 0 | activityType | 34 | **8,564** | 0 | 1,001 |
| 1 | tags | 32 | 0 | **8,564** | 1,021 |
| 2 | seasonTiming | 34 | 0 | **8,564** | 1,005 |
| 3 | culturalResponsivenessFeatures | 41 | 0 | **8,564** | 1,003 |
| 4 | thematicCategories | 36 | 0 | **8,564** | 1,013 |

8,564 = 7,806 (prefix) + 92 (wrapper) + 666 (body) exactly.

**Headline cache answer (the V3 question):** rotating `tool_choice` across calls did **not** invalidate the prefix cache — and it did not even invalidate the **body block's message-tier breakpoint**. The full prefix+body was written once and read back whole on every subsequent forced-tool call (uncached remainder: 32–41 tokens/call). This is *better* than current documentation predicts — the published invalidation hierarchy says a `tool_choice` change invalidates the messages-tier cache (tools/system survive). Empirically on Opus 4.7, the body breakpoint survived too. Because measurement contradicts docs in our favor, re-verify on the completion rerun before any pipeline relies on body-tier reuse (the conservative fallback — body uncached per call — adds ~$48 sync to the V3 projection at corpus scale; it does not change the ranking).

**Second V3 finding — output inflation (~18×):** V3 calls produced ~1,009 output tokens each vs ~57 in V2 for the same fields (all `stop_reason: tool_use`, none truncated). With the all-field system prompt but a single forced field-tool, the model overfilled `selected_values` (enum/`uniqueItems` are NOT server-enforced without `strict: true` — e.g. the `tags` call returned 3 items from a 2-value enum). At $25/MTok output, this dominates V3's cost. Plausibly fixable (per-call user-turn instruction "submit only <field>" placed AFTER the body breakpoint, so it wouldn't break the body cache; or `strict: true`), but that is untested — projections below show measured AND hypothetically-fixed output. The harness now records `input_preview` per call so the rerun can diagnose exactly what the model emitted.

## 5. Projection matrix — full live corpus, 767 lessons

Assumptions: corpus-mean body 1,483 tokens; measured per-call overheads/outputs as above; V2 caching impossible (Opus); V3 entry E = 7,806 + 92 + 1,483 = 9,381 tokens; "cache-hit X%" = fraction of cache-eligible reads that actually hit (Batch caching is best-effort); misses pay the 1.25× write premium (markers present). Batch = guaranteed 50% discount on all token classes.

### claude-opus-4-7 ($5 / $25, cw $6.25, cr $0.50)

| Scenario | Projected cost |
|---|---:|
| **V1 monolithic — sync, steady-state cache** | **$23.76** |
| V1 Batch 50%, cache-hit 0% | $25.72 |
| V1 Batch 50%, cache-hit 50% | $18.80 |
| V1 Batch 50%, cache-hit 90% | $13.26 |
| V2 per-field — sync (caching impossible) | $220.60 |
| V2 Batch 50% (caching N/A) | $110.30 |
| V3 shared-prefix — sync, measured output | $433.62 |
| V3 sync, IF output fixed to V2-like | $123.56 |
| V3 Batch 50%, hit 0% / 50% / 90%, measured output | $547.79 / $382.30 / $249.91 |
| V3 Batch 50%, hit 90%, fixed output | $94.88 |

### claude-sonnet-4-6 ($3 / $15, cw $3.75, cr $0.30) — same measured token masses (caveat §8)

| Scenario | Projected cost |
|---|---:|
| **V1 monolithic — sync** | **$14.26** |
| V1 Batch 50%, hit 0% / 50% / 90% | $15.43 / $11.28 / $7.96 |
| V2 sync / Batch | $132.36 / $66.18 |
| V3 sync measured / fixed output | $260.17 / $74.14 |
| V3 Batch 50% hit 90%, measured / fixed | $149.94 / $56.93 |

### The arithmetic (V1 sync, Opus — others analogous; machine-readable in `projections.json`)

```
per lesson = (body 1,483 + overhead 565) × $5/M     = $0.01024   (uncached input)
           + prefix 6,274 × $0.50/M                  = $0.00314   (cache read)
           + output 704 × $25/M                      = $0.01760
           = $0.03098 / lesson  →  × 767 = $23.76
one-time prefix write 6,274 × $6.25/M = $0.04 (negligible)

V2 sync:  per call (1,614 + 1,483) × $5/M + 57 × $25/M = $0.01691
          × 17 fields = $0.2876 / lesson  →  × 767 = $220.60   (13,039 calls)

V3 sync (measured out): write E 9,381 × $6.25/M + 16 reads × 9,381 × $0.50/M
          + 17 × 35 × $5/M + 17 × 1,009 × $25/M = $0.5655 / lesson → × 767 = $433.62
```

**Wall-clock note:** measured mean latency 7.8s (V1), 2.7s (V2), 15.4s (V3, inflated by the 1,000-token outputs). Sync full-run at concurrency 5: V1 ≈ 20-35 min; V2 ≈ 2 h; V3's 17-call lesson burst took 17 × 15.4s ≈ 4.4 min — uncomfortably close to the 5-minute cache TTL at concurrency 1.

## 6. What this feeds into OQ3 / OQ4

- **OQ3 (per-field vs monolithic):** the cost driver framing from the exploration doc (§4 Q1) is confirmed — body-token repetition without cache hits is exactly what makes per-field expensive, and on Opus the per-field shape *cannot* get cache hits because its prefixes are under the model's 4,096-token cache minimum. Monolithic is ~9× cheaper than today's per-field shape and ~5-18× cheaper than the shared-prefix variant. The remaining per-field arguments (per-field retry, debuggability, incremental field addition) now carry a measured price tag of roughly **+$90 to +$200 per full corpus run** (Opus, batch/sync).
- **OQ4 (Batch vs sync):** at monolithic scale the entire decision is worth ~$10 ($24 sync vs $13-26 batch) on a one-shot run. Batch's best-effort caching brackets ($13.26-$25.72) straddle the sync price — Batch is NOT automatically cheaper for V1 unless cache hits materialize, because sync gets deterministic cache reuse that best-effort batching may not. The retention/ZDR acceptability half of OQ4 (E5) is unaffected by these numbers.
- Output tokens are a first-class cost driver, not a rounding error: in V1, output (704 × $25/M) is ~57% of per-lesson cost. Prompt design that constrains output verbosity matters as much as caching design.

## 7. Actual dry-run spend (from JSONL `cost_usd` sums)

| Variant | Calls OK | Cost |
|---|---:|---:|
| V1 | 15/15 | $0.5364 |
| V2 | 153/153 | $2.8474 |
| V3 | 5/153 | $0.1976 |
| **Total** | **173** | **$3.58** |

## 8. Caveats

1. **Prompt text is provisional.** Realistic mass, not final Stage-2 prompts. If real per-field prompts grew ~3× (to >4,096 tok incl. tool), V2 would start caching on Opus and its math would improve — but it would still re-pay body+prefix reads 17× per lesson.
2. **Single model measured.** `claude-opus-4-7` only (matches PROD call sites; now previous-gen — Opus 4.8 has identical pricing/cache rules). Sonnet figures reuse Opus-measured token counts (not re-measured) and ignore that Sonnet's **2,048-token cache minimum** would let V2's `academicConcepts` prefix (2,238) cache — V2's Sonnet figure is slightly pessimistic.
3. **V3 evidence is 5 calls / 1 lesson** (credit exhaustion). The body-tier cache survival across `tool_choice` changes *contradicts the documented invalidation hierarchy in our favor* — re-verify on rerun before relying on it. V1 independently confirms prefix-tier survival across 15 different bodies.
4. **V3 output inflation may be fixable but is unverified**; both readings projected. Enum adherence is not server-guaranteed without `strict: true` — the post-hoc Zod validation (already in the PROD call sites) must travel into any Stage-2 runner regardless of shape.
5. **Batch caching is best-effort** — the 0/50/90% scenarios bracket it; the 50% discount is the only guaranteed part. Batch-with-markers misses pay 1.25× writes; stripping markers in batch would cap the downside at 1.0× (V1 batch-0% becomes ~$22.7 instead of $25.72).
6. Projections scale bodies to the corpus mean (1,483 tok) — per-lesson variance (273–20,477 chars) means the long tail costs more per lesson; totals are means × 767.
7. Monolithic's qualitative risks (one-bad-field-poisons-response, coarser retry) and the D5 dual-vocabulary concepts output were not measured here.
8. Latency figures are sequential single-key measurements; rate limits at higher concurrency not probed.

## 9. Completing V3 (after Console credit top-up)

```
mv .tmp/pr6-dryrun/v3-sharedprefix.jsonl .tmp/pr6-dryrun/v3-sharedprefix.failed.jsonl
npx tsx .tmp/pr6-dryrun/harness.ts v3      # ~153 calls, ~$5.5 projected at measured output
python3 .tmp/pr6-dryrun/analyze.py         # regenerates projections.json
```
The harness now also records `tool_name` + `input_preview` per call, which will show exactly what the model stuffed into the 1,000-token V3 outputs. The credit failure mode is non-destructive: failed calls cost $0 and are recorded as error records.

---

**Supervisor postscript (2026-06-11):** the throwaway harness + raw JSONL were relocated from `.tmp/pr6-dryrun/` to `/Users/danfeder/cCode/pr6-dryrun-tmp/` (outside the repo) because ESLint does not ignore `.tmp/**` and the harness `.ts` files broke the repo's clean-lint baseline. All rerun commands in this doc still work with the path substituted, run from the repo root with `--project`-relative env (`.env.local`) intact, e.g.: `npx tsx /Users/danfeder/cCode/pr6-dryrun-tmp/harness.ts v3`.
