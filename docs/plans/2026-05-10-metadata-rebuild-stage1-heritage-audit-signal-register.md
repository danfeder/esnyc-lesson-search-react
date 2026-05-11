# Stage 1 Heritage — Audit Signal Register

**Last updated:** 2026-05-11 (extracted from Stage 1 execution status doc Sessions 62-67 and worksheet §11-§13 Notes blocks).

> **Purpose.** Open audit signals surfaced during Stage 1 per-value fills, structured for Stage 2 corpus re-tag intake. Each entry is sourced from existing documentation (worksheet Notes blocks or status doc session entries). Do not invent new signals here; append from session work as it lands.
>
> **Status vocabulary.**
> - `Open` — flagged, not yet addressed
> - `Resolved` — closed by a Stage 2 re-tag action; record the closing PR or backfill query in the row
> - `Deferred` — explicitly scoped out; record the reason in the row
>
> **Scope.** Stage 1 surfaces audit signals as a byproduct of per-value worksheet fills. Stage 2 (corpus re-tag + reviewer validation flow) is where signals close. This register is the bridge between the two stages.

## Open signals

| ID | Cluster / source | Signal | Evidence already in docs | Stage 2 action | Status |
|----|------------------|--------|---------------------------|----------------|--------|
| ASI-01 | Asian §11.2 / §11.12 | Bánh Mì lesson tagged `Vietnamese + East Asian + Asian`; correct parent chain is Southeast Asian | Status doc Session 62 corpus-read; worksheet §11.2 + §11.12 Notes | Re-tag Bánh Mì to Southeast Asian | Open |
| ASI-02 | Asian §11.3 / §11.9 | 4 of 15 `South Asian` lessons missing country tags (Aloo Gobi → Indian + Pakistani; Black Bean Burgers anchors on India) | Status doc Session 62 corpus-read; worksheet §11.3 + §11.9 Notes | Backfill country tags | Open |
| ASI-03 | Asian §11.4 | 2 of 5 Southeast Asian lessons missing country tags (Khao Soi → Thai/Lao; Lumpia → Filipino) | Status doc Session 62 corpus-read; worksheet §11.4 Notes | Backfill country tags | Open |
| ASI-04 | Asian §11.3 / §11.13 | Sri Lankan Curry lesson body geographically mis-locates Sri Lanka as "Southeast Asia" (tagging is correct; body content has factual error) | Status doc Session 62 corpus-read; worksheet §11.3 + §11.13 Notes | Outside Stage 1 scope (body content); flag for curriculum-team body-content review | Open |
| AME-01 | Americas §12.1 / §12.2 | Inconsistent diaspora-to-North-American pairing (67% AA / 79% Indigenous / 43% Lenape / 60% Native American carry `North American`) | Status doc Session 64 + worksheet §12.1 / §12.2 Notes (TEST DB direct queries) | Decide: backfill `North American` on diaspora lessons (geographic-parent convention) OR leave as-is (identity-tag-anchors-placement convention) — curriculum-team-level call | Open |
| AME-02 | Americas §12.4 (Puerto Rican) | 4/4 Puerto Rican lessons multi-parent dual-coded as `Caribbean + Latin American` | Worksheet §12.4 Notes; status doc Session 64 | Address multi-parent question at curriculum-team handoff; may surface schema/worksheet `parents:` plural decision | Open |
| AME-03 | Americas (arepa-related) | `Three Sister Arepas` + `Three Sisters Empanadas` missing country tags (Colombian / Venezuelan dishes tagged only `Latin American + Americas`) | Status doc Session 64 corpus-read | Backfill country tags | Open |
| AME-04 | Asian-cluster spurious carry into Americas | `Bats & Banana Pancakes`, `Flies & Fruit`, `Descriptive Language`, `Our Garden and Kitchen Community` over-tagged with `Caribbean + Latin American + Americas` (Asian-cluster lesson bodies; minimal Americas content) | Status doc Session 64 corpus-read | Drop spurious Americas-cluster tags | Open |
| AME-05 | Americas §12.5 (Mexican) | `Monarch Migration` uses `Mexican` for geographic-place tagging rather than cuisine / culture (borderline use of `culturalHeritage`) | Status doc Session 64 corpus-read | Clarify country-tag scope OR re-tag | Open |
| AME-06 | European §14 + Americas (Empanadas) | `Empanadas` lesson over-tagged with `Spanish + Mediterranean + European` based on a single body sentence about Spanish origins | Status doc Session 64 corpus-read | Drop European cluster tags OR re-anchor on Latin American depending on §9.2 Spanish multi-parent resolution | Open |
| AFR-01 | African §13.1 / §13.2 (Carver siblings) | Inconsistent Carver content tagging — `In the Garden with Dr. Carver` tags `[African, African American, Americas]` correctly; sibling `Lotion & Agar Soap` K + MS tag `[African, North American]` (missing `African American` despite identical subject) | Status doc Session 66 audit-signals; worksheet §13.1 / §13.2 | Backfill `African American + Americas` on Carver siblings | Open |
| AFR-02 | African §13.4 East African (Wangari Maathai) | `October Seed Saving` tags `[Kenyan, African]`; sibling `Wangari Maathai 4th/5th` tags only `[African]` despite same source body | Status doc Session 66 audit-signals; worksheet §13.4 / §13.8 | Backfill `Kenyan + East African` on sibling (post-East-African canonicalization) | Open |
| AFR-03 | African §13.1 (African American cohort) | 7-8 lessons (Juneteenth × 4, BHM cornbread, Newly Freed Americans, BEP Stew, BEP Hummus) tag `West African + North American` but omit `African American` despite content alignment | Status doc Session 66 audit-signals; worksheet §13.1 / §13.2; cross-references §12.2 NA Cohort A finding | Backfill `African American` tag | Open |
| AFR-04 | African §13.2 (Seed & Date Balls) | Over-tagged `[West African, African, Americas, Asian]` based on single body sentences about Carolina rice + Asian arid-region seed-ball use | Status doc Session 66 audit-signals; worksheet §13.2 | Drop both `West African` and `Asian` (lesson is springtime gardening + a date-ball snack) | Open |
| AFR-05 | African §13.6 (Egyptian split) | 2 ful medames lessons use different cluster placements — 1 tags `[Egyptian, North African, African]`, 1 tags `[Egyptian, Middle Eastern, African]`. §9.2 pre-handoff = North African primary with Middle Eastern noted at Notes-level | Status doc Sessions 64 + 66 §9.2 multi-parent resolution; worksheet §13.6 Notes | Pick convention + re-tag the non-converging ful medames lesson | Open |
| AFR-06 | African §13.4 East African (Edmond Albius) | Tags `[African, African American diaspora]` but body identifies Réunion (East African / Indian Ocean French colony) — missing East African sub-region + plausibly mis-labeled `African American diaspora` (Albius was Réunionnais) | Status doc Session 66 audit-signals; worksheet §13.4 | Backfill East African; review `African American diaspora` tag | Open |
| AFR-07 | African §13.1 (5th Grade Food Cultures Unit Overview) | Heritage-array anomaly — tags `[Latin American, Asian, African, European]` but body keywords don't include any African country (plausible legacy auto-tagging artifact) | Status doc Session 66 audit-signals; worksheet §13.1 (Session 67 round-1 fix-up reframed citation as "plausible legacy auto-tagging artifact; flag for Stage 2 reviewer validation") | Reviewer validation; drop `African` unless 6 daughter lessons surface African content | Open |
| AFR-08 | African §13.4 East African (sub-region under-tagging) | 0/2 Kenyan + 0/1 Ethiopian lessons currently carry `East African` | Status doc Session 66 audit-signals; worksheet §13.4 Notes | If §13.4 East African canonicalizes as `new`, backfill on all 3 rows | Open |

## Resolved signals

(none yet — first resolutions land with Stage 2 corpus re-tag PRs)

## Deferred signals

(none yet)

## Adding a new signal

When a session surfaces a new audit signal during a per-value fill or review cycle:

1. Assign an ID using the cluster prefix (`ASI` / `AME` / `AFR` / `EUR` / `ME` / `X` for cross-cluster) + the next available sequence number for that cluster.
2. Append the row to the Open signals table above.
3. Cite the source document (worksheet section + Notes line, status doc session entry, or both). Repo-facing evidence only — no private-memory citations (see Source-of-truth rules in the Stage 1 execution status doc).
4. Do NOT mark `Resolved` until a Stage 2 re-tag PR or backfill query closes the gap; record the closing reference in the row when resolved.

## See also

- Worksheet: `2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md`
- Stage 1 execution status: `2026-05-10-metadata-rebuild-stage1-heritage-execution-status.md`
- Foundation status: `2026-05-03-metadata-rebuild-foundation-execution-status.md`
