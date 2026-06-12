# E5 — Anthropic Message Batches API: data retention + operational fact sheet (feeds OQ4)

**Evidence item:** E5 (impl-plan work-list item 5)
**Feeds:** Design doc OQ4 — Batch API vs synchronous SDK for the full ~751-lesson Stage 2 re-tag run (`docs/plans/2026-06-11-metadata-rebuild-pr6-stage2-retag-design.md:58`)
**Retrieval date:** 2026-06-11 (all quotes pulled from live pages on this date)
**Method:** `claude-api` skill consulted as starting reference; every policy fact below verified against live `platform.claude.com` / `privacy.claude.com` documentation. Nothing below is from memory.
**Status:** Facts verified. The retention-acceptability decision itself is the USER's call (data-safety verdict) — this document deliberately does not make it.

---

## 1. Sources fetched (live, 2026-06-11)

| # | Page | URL |
|---|------|-----|
| S1 | Batch processing guide | `https://platform.claude.com/docs/en/build-with-claude/batch-processing.md` |
| S2 | API and data retention (ZDR / feature eligibility) | `https://platform.claude.com/docs/en/build-with-claude/api-and-data-retention.md` |
| S3 | Pricing | `https://platform.claude.com/docs/en/about-claude/pricing.md` |
| S4 | Rate limits | `https://platform.claude.com/docs/en/api/rate-limits.md` |
| S5 | Commercial data retention policy (privacy center) | `https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data` |

Note: `https://platform.claude.com/docs/en/pricing.md` (the URL in the skill's live-sources table) now 404s; the live pricing page is S3.

---

## 2. Verified facts

### (a) Batch input/output retention period — 29 days, confirmed current

The 2026-05-13 figure ("~29 days", exploration doc §5 item 7) is **still current and is now exact, not approximate**:

> "Batch processing stores request and response data for up to 29 days after batch creation. You can delete a message batch at any time after processing using the `DELETE /v1/messages/batches/{batch_id}` endpoint. To delete an in-progress batch, cancel it first. Asynchronous processing requires server-side storage of both inputs and outputs until batch completion and result retrieval." — S1, "Data retention" section

Result-download availability matches:

> "Batch results are available for 29 days after creation. After that, you may still view the Batch, but its results will no longer be available for download." — S1, "Batch limitations"

### (b) ZDR eligibility — Batches are NOT ZDR-eligible, confirmed current

> "This feature is **not** eligible for [Zero Data Retention (ZDR)]. Data is retained according to the feature's standard retention policy." — S1, top-of-page note

The feature-eligibility table on S2 lists:

> "Batch processing | `/v1/messages/batches` | ZDR eligible: **No** | HIPAA eligible: **No** | 29-day retention; async storage required." — S2, feature eligibility table

And the rationale:

> "Features marked 'No' for ZDR are fundamentally stateful: the Batch API stores your jobs, the Files API stores your files... Using them is a choice to step outside your ZDR arrangement for that specific data." — S2, FAQ

**Important context for this org:** ZDR is a negotiated arrangement ("To request a ZDR arrangement, contact the Anthropic sales team" — S2). An organization on standard pay-as-you-go API terms — which is almost certainly this project's situation — does **not** have ZDR; for such an org the synchronous API's inputs/outputs are also backend-retained under the standard policy (see (h) below), so ZDR-ineligibility is only a *differential* concern if a ZDR agreement actually exists or is planned.

### (c) Model training — retained data not used for training without permission

> "Retained data is never used for model training without your express permission." — S2, "Anthropic's approach to data retention"

This sits in the section governing features (like Batches) that require storage. Applies to both sync and batch paths.

### (d) Deletion controls — explicit per-batch DELETE endpoint + Console download control

Two org-side controls are documented (the 2026-05-13 exploration note did not mention either):

1. **Per-batch deletion:** "You can delete a message batch at any time after processing using the `DELETE /v1/messages/batches/{batch_id}` endpoint. To delete an in-progress batch, cancel it first." — S1, Data retention section. Practical effect: after downloading results, the batch can be deleted the same day, shrinking the effective retention window from 29 days to hours. (The doc does not state how promptly backend purge follows the DELETE call; the general commitment is "Data is purged on the shortest practical TTL" — S2.)
2. **Console download restriction:** "Downloading batch results in the Console can be disabled on the organization-level or on a per-workspace basis." — S1, FAQ ("privacy and data separation"), which also notes: "Batches and their results are isolated within the Workspace in which they were created. This means they can only be accessed by API keys from that same Workspace."

For non-ZDR-eligible features generally: "Contact your Anthropic account representative to discuss deletion options for non-ZDR features." — S2, FAQ.

### (e) Discount — 50%, confirmed; stacks with prompt caching

> "The Batches API offers significant cost savings. All usage is charged at 50% of the standard API prices." — S1
> "The Batch API allows asynchronous processing of large volumes of requests with a 50% discount on both input and output tokens." — S3

Per-model batch prices (S3 table, selected rows):

| Model | Batch input | Batch output | (Standard: input / output) |
|---|---|---|---|
| Claude Opus 4.8 | $2.50 / MTok | $12.50 / MTok | $5 / $25 |
| Claude Sonnet 4.6 | $1.50 / MTok | $7.50 / MTok | $3 / $15 |
| Claude Haiku 4.5 | $0.50 / MTok | $2.50 / MTok | $1 / $5 |

Stacking with caching is explicit:

> "These multipliers stack with other pricing modifiers, including the Batch API discount and data residency." — S3, prompt-caching section
> "The pricing discounts from prompt caching and Message Batches can stack, providing even greater cost savings when both features are used together." — S1

### (f) Prompt caching in batches — supported, hits are best-effort (30–98%)

> "The Message Batches API supports prompt caching... However, since batch requests are processed asynchronously and concurrently, cache hits are provided on a best-effort basis. Users typically experience cache hit rates ranging from 30% to 98%, depending on their traffic patterns." — S1

Two operational notes that feed OQ3 (token economics) directly:

- > "Since batches can take longer than 5 minutes to process, consider using the [1-hour cache duration] with prompt caching for better cache hit rates when processing batches with shared context." — S1. (1-hour cache writes cost 2x base input vs 1.25x for 5-minute — S3.)
- `max_tokens: 0` cache pre-warming is rejected inside a batch: "Each batched request must have `max_tokens` of at least `1`. `max_tokens: 0` (cache pre-warming) is not supported inside a batch, since an ephemeral cache entry written during batch processing would likely expire before the follow-up request runs." — S1

### (g) Operational limits, polling model, custom_id semantics

All from S1 unless noted:

- **Batch size:** "A Message Batch is limited to either 100,000 Message requests or 256 MB in size, whichever is reached first." (~751 lessons is ~0.75% of the request cap; even with full lesson bodies the corpus is far below 256 MB — single batch is trivially feasible.)
- **Processing window:** "The system processes each batch as fast as possible, with most batches completing within 1 hour. You can access batch results when all messages have completed or after 24 hours, whichever comes first. Batches expire if processing does not complete within 24 hours."
- **Expired requests are free:** "`expired` | Batch reached its 24 hour expiration before this request could be sent to the model. You will not be billed for these requests."
- **Polling:** create batch → poll `GET` retrieve until `processing_status == "ended"` → stream results as `.jsonl` (one result object per line). No webhooks; client-side polling loop.
- **custom_id:** "A unique `custom_id` for identifying the Messages request. Must be 1 to 64 characters and contain only alphanumeric characters, hyphens, and underscores (matching `^[a-zA-Z0-9_-]{1,64}$`)." Lesson IDs/UUIDs fit this charset.
- **Result ordering:** "Batch results can be returned in any order, and may not match the ordering of requests when the batch was created... To correctly match results with their corresponding requests, always use the `custom_id` field." Per-result `result.type` is one of `succeeded` / `errored` / `canceled` / `expired` — failed items are individually identifiable and re-submittable by `custom_id`.
- **Cancellation:** supported; "Canceled batches end up with a status of `ended` and may contain partial results for requests that were processed before cancellation."
- **Workspace scoping:** "Batches are scoped to a Workspace."
- **Feature support:** "Almost any request you can make to the Messages API can be included in a batch," including tool use ("including all server tools") — so the locked call shape (mirror of `process-submission`'s `tool_choice` schema forcing + `cache_control`) is batch-compatible. Unsupported params: `stream: true`, `speed` (fast mode), `store`/`previous_thread_event_id`, `cache_hint`/`context_hint`, `max_tokens: 0`, `research_preview_2026_02`.
- **Models:** "All active models support the Message Batches API."
- **Rate limits (S4, Message Batches API section, separate pool from Messages API):** "Usage of the Batches API does not affect rate limits in the Messages API" (S1 FAQ). Tier 1: 50 RPM / 100,000 batch requests in processing queue / 100,000 requests per batch. Tier 2: 1,000 RPM / 200,000 queue. Tier 4: 4,000 RPM / 500,000 queue. A 751-request batch is far inside even Tier 1 limits.

### (h) The synchronous-path retention backdrop (needed to make OQ4 a fair comparison)

The standard (non-ZDR) retention policy that governs synchronous Messages API calls:

> "For Anthropic API users, we automatically delete inputs and outputs on our backend within 30 days of receipt or generation" — S5 (commercial data retention policy, privacy center)

The docs page adds the design-intent framing for the API in general:

> "Conversation content (your prompts and Claude's outputs) is not retained by default." — S2

These two statements coexist: S2 describes the per-feature design goal (stateless features don't *require* storage); S5 is the org-level backstop commitment (anything retained is deleted within 30 days). The operative comparison for OQ4: **for an org without a ZDR agreement, the sync path's worst-case backend retention (≤30 days) and the batch path's retention (≤29 days) are essentially the same window.** The batch path differs in that storage is *guaranteed and load-bearing* (inputs+outputs stored as a retrievable artifact until you download/delete them), rather than incidental backend retention.

**Trust-and-safety exception (applies to both paths):** "We retain inputs and outputs for up to 2 years and trust and safety classification scores for up to 7 years if your chat is flagged" — S5. Curriculum content is an unlikely flag candidate, but the exception exists regardless of sync/batch choice.

### (i) What changed since the 2026-05-13 claim

The exploration doc's claim (`docs/plans/2026-05-13-stage2-retag-mechanism-exploration.md:497`): "Message Batches are not eligible for Zero Data Retention; batch request and response data may be retained for up to ~29 days... Alternatives if not acceptable: synchronous SDK calls (no batch discount, but standard retention applies) or a ZDR-eligible tier if available at run time."

Verified deltas as of 2026-06-11:

1. **Core claim unchanged and confirmed** — not ZDR-eligible; 29-day retention (now documented as exactly "up to 29 days after batch creation", not "~29").
2. **New/now-documented: per-batch DELETE endpoint** (`DELETE /v1/messages/batches/{batch_id}`) in the official Data retention section — an early-deletion control the 2026-05-13 note didn't capture. This materially softens the retention concern: the window is user-shrinkable to ~hours.
3. **Refinement to the "alternatives" framing:** the sync alternative's "standard retention" is itself up-to-30-days backend retention for a non-ZDR org (S5), so sync is not a zero-retention alternative unless the org negotiates ZDR (sales contact required; and note Claude Fable 5 / Mythos 5 are *unavailable* under ZDR — S2 — though those models are not required for this run).
4. **Caching-in-batch facts now concrete:** best-effort hits quantified at 30–98%; 1-hour TTL recommended for batch; `max_tokens: 0` pre-warm prohibited in batch. These feed OQ3's per-field vs monolithic economics: the per-field pattern's reliance on body-cache hits is *not guaranteed* under batch.

---

## 3. Data classification at stake (considerations only — no call made)

What would be submitted: ~751 lesson bodies from `lessons.content_text` plus tagging prompts; outputs are proposed metadata tags.

- **Content nature:** teacher-authored curriculum content for a nonprofit (ESYNYC). Not end-user PII; no student data; no credentials. Not formally public either — the exploration note flagged "copyright + program-asset concerns" as the relevant sensitivity, not privacy.
- **Exposure under Batch:** inputs+outputs stored at rest by Anthropic for up to 29 days as a workspace-scoped, API-key-retrievable artifact; deletable on demand after processing; never used for training without express permission; HIPAA-ineligible (irrelevant here — no PHI).
- **Exposure under sync:** same content transits the same API; backend retention up to 30 days under the standard commercial policy; no customer-retrievable stored artifact; ZDR would eliminate at-rest retention but only exists via a negotiated agreement this org presumably does not have.
- **Both paths:** flagged-content exception (up to 2 years) exists; Workspace isolation applies; corpus is already stored with third parties (Supabase, Google Docs) under ordinary commercial terms, which is a useful baseline for judging whether a 29-day Anthropic-side copy is an acceptable marginal exposure.
- **Residual asymmetry to weigh:** Batch makes storage a *feature* (guaranteed artifact, downloadable for 29 days unless deleted) vs sync's *incidental* backend retention. If the user wants the smallest at-rest footprint without a ZDR agreement, the practical mitigation under Batch is: download results immediately on completion, then `DELETE` the batch — shrinking the artifact window to hours.

---

## 4. Cost framing (neutral; exact dollars await E3/OQ3 token dry-run)

- Batch = 50% of sync price on every token (input, output, cache writes/reads — the multipliers stack). Whatever the OQ3 dry-run projects as full-run sync cost, Batch halves it.
- Counterweights: async (submit → poll, typically <1 hour, hard 24-hour ceiling with per-item `expired` fallback billed at $0), and cache hits become best-effort (30–98%) — which penalizes the per-field call pattern more than the monolithic one.
- A hybrid is fully compatible with the docs: synchronous SDK for the 10–20-lesson dry-run/iteration loop (fast feedback, deterministic caching), Batch for the one-shot full-corpus run (50% discount, `custom_id` replay of failures) — this matches the design doc's "likely shape" note.
- At this corpus size the absolute stakes are small either way: 751 requests is <1% of a single batch's request cap, and well inside Tier-1 batch rate limits.

---

## 5. Bottom line for the OQ4 walkthrough

1. The 2026-05-13 facts are confirmed current: Batch is not ZDR-eligible and stores request+response data up to 29 days after batch creation.
2. Two facts discovered in verification change the decision's texture: (a) the per-batch DELETE endpoint lets the user shrink the retention window to hours after collecting results; (b) the sync alternative is not retention-free either — a non-ZDR org's sync inputs/outputs are backend-retained up to 30 days under the standard commercial policy, so the *marginal* retention exposure of Batch vs sync is the stored-artifact shape, not the duration.
3. Retained data is not used for training without express permission, on either path.
4. Whether a ≤29-day (user-shrinkable) Anthropic-side copy of teacher-authored curriculum bodies is acceptable is the user's data-safety verdict. If yes: Batch halves the full-run cost and adds per-item `custom_id` replay. If no: sync forfeits the 50% discount and still carries ≤30-day backend retention unless a ZDR agreement is negotiated.
