# Phase 3: Internal Design System — Admin / Review / Submission

**Date:** 2026-04-23
**Status:** Approved — Ready for Implementation
**Branch:** `feat/internal-design-system` (rebased onto main `bed61a4`)
**Predecessors:** Phases 1 + 2 already shipped on this branch (search page).

## Overview

Extend the internal design system from the search page to the remaining staff-facing surfaces: admin pages, review workflow, and the lesson submission flow. Source of truth is the Claude Design handoff at `lessonplanlibrayr/` — extracted to `/tmp/design-bundle/` for this session, but the file URLs are single-use.

Phase 3 ports the visual language and the page layouts from the handoff but does NOT adopt its 4-tab top-level subnav. Goal: visual coherence everywhere, navigation structure unchanged.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Top-level navigation | Keep current Header + dropdown menu | Staff bounce within sections, not across them. A 4-tab subnav would compete for vertical space without earning it. |
| Visual coherence | Adopt all handoff tokens, primitives, layouts | The whole tool is internal — same paper canvas, ink palette, page headers, badges, buttons everywhere. |
| Routing | Keep React Router, current routes | Handoff's hash routing is an artifact of the prototype, not a design intent. |
| `admin.css` location | New file `src/styles/internal-admin.css`, imported after `internal.css` | Keeps search-page CSS separate from admin CSS for easier maintenance. |
| New CSS prefix | Keep `.adm-*` from handoff | Distinguishes admin/review/submission styles from search-page `.int-*` styles. |
| Slice strategy | Vertical slices, one logical commit each | Visible progress; primitives validated by real consumers; easy to course-correct. |
| Undesigned pages | Pause after Slice 6, return to Claude Design for those screens | AdminUserDetail, AdminInvitations, AdminInviteUser, AdminDuplicates, AdminDuplicateReview, UserProfile, AcceptInvitation, ResetPassword, VerifySetup are not in the bundle. |
| Color tokens | Add `--esy-amber-review #B8860B` and `--esy-orange-revision #C97A2A` | Required for status eyebrows; not in current `--esy-*` palette. |

## Surfaces in Scope (designed)

| Page | Design source | Pattern |
|------|---------------|---------|
| `SubmissionPage.tsx` | `Submission.html` + `submission.jsx` | 4-step wizard with hints aside |
| `ReviewDashboard.tsx` | `Review Dashboard.html` + `review_dashboard.jsx` | Status-tab queue with row-list variant |
| `ReviewDetail.tsx` | `Review Detail.html` + `review_detail.jsx` | 3-col layout: metadata pills · doc preview · duplicates + decision bar |
| `AdminDashboard.tsx` | `Admin.html` (Overview view) + `admin.jsx` | 8-tile hub grid + activity rail |
| `AdminUsers.tsx` | `Admin.html` (Users view) | Filter pills + data table with role badges |
| `AdminAnalytics.tsx` | `Admin.html` (Analytics view) | Stat-card row + Recharts retinted to tokens |

## Surfaces Deferred (undesigned)

These get nothing from Phase 3. After Slice 6, return to Claude Design for explicit screens, then a follow-up phase ports them:

- `AdminUserDetail`, `AdminInvitations`, `AdminInviteUser`
- `AdminDuplicates` (top-level), `AdminDuplicateReview`
- `UserProfile`, `AcceptInvitation`, `ResetPassword`, `VerifySetup`

## New Int* Components

### Shared (Slice 0)
| Component | Purpose |
|-----------|---------|
| `IntPageHeader` | `.adm-page-head` — title, description, optional action buttons |
| `IntButton` | `.adm-btn` with variants: `primary`, `ink`, `danger`, `ghost`, sizes `lg`/`sm` |
| `IntStatusBadge` | `.adm-status` eyebrow with leading dot — submitted/review/revision/approved/rejected/active/inactive |
| `IntRoleBadge` | `.adm-role` bordered pill — admin/super/reviewer/teacher |
| `IntTabs` | `.adm-subnav-tab` style — uppercase caps, bottom border on active, optional count badge |

### Form primitives (Slice 1)
| Component | Purpose |
|-----------|---------|
| `IntFormField` | `.adm-field` wrapper — label + input/textarea/select + hint + required `*` + error state |
| `IntPillGroup` | `.adm-pill-group` + `.adm-pill` — multi-select tag UI |
| `IntStepper` | `.adm-stepper` — numbered steps with current/done states |
| `IntProgressBar` | `.adm-progress` — count label + bar + text |

### Specialized (Slices 2–6)
| Component | Used in | Purpose |
|-----------|---------|---------|
| `IntQueueRow` | Review Dashboard | 4-col grid for queue items |
| `IntDocFrame` | Review Detail | File preview with Doc/Card toggle |
| `IntDuplicateCard` | Review Detail | Selectable card with title, similarity %, match-type label |
| `IntDecisionBar` | Review Detail | Sticky bottom decision panel |
| `IntHubTile` | Admin Hub | Eyebrow + title + description + footer stat |
| `IntDataTable` | Admin Users | `.adm-table` wrapper with density attr support |
| `IntStatCard` | Admin Analytics | Label + large value + optional delta |
| `IntStatRow` | Admin Analytics | Responsive grid container for stat cards |

## Implementation Slices

| # | Slice | Adds | Reuses |
|---|-------|------|--------|
| 0 | Foundations | `internal-admin.css`, color tokens, IntPageHeader, IntButton, IntStatusBadge, IntRoleBadge, IntTabs | — |
| 1 | Submission page | IntFormField, IntPillGroup, IntStepper, IntProgressBar | Slice 0 |
| 2 | Review Dashboard | IntQueueRow | 0 + IntTabs for status filters |
| 3 | Review Detail | IntDocFrame, IntDuplicateCard, IntDecisionBar | 0, 1, 2 |
| 4 | Admin Hub | IntHubTile | 0 |
| 5 | Admin Users | IntDataTable | 0 + IntTabs for role filters |
| 6 | Admin Analytics | IntStatCard, IntStatRow | 0 |
| 7 | Pause | Return to Claude Design for the deferred surfaces | — |

## Risks / Open Items

1. **Status color tokens** (`#B8860B`, `#C97A2A`) are not in the existing `--esy-*` palette. We're adding them as `--esy-amber-review` and `--esy-orange-revision`. If design later names them differently, rename in one place.
2. **Mobile breakpoint at 900px** in `admin.css` may be aggressive for tablets. Address case-by-case if it bites.
3. **Duplicate match-type thresholds** (exact / high / medium / low) are not defined in the bundle. Existing duplicate-detection logic owns this — reuse it; don't invent thresholds.
4. **Recharts color integration** for AdminAnalytics — Recharts expects hex props, so we'll need to read CSS vars at component level or hardcode the same hex values.
5. **Density attribute on IntDataTable** — design uses `[data-density]` on a parent. We'll reuse the existing `useUIPrefsStore` density value (currently scoped to search-list view) or scope a new admin-only setting; decide when we get to Slice 5.

## Verification

- `npm run type-check` and `npm run lint` after every slice (project rule).
- `npm run test` if any test surface is touched.
- Manual smoke of each restyled page in dev server before committing the slice.
- After Slice 6: branch deploy still resolves on Netlify; teammates can resume trial.

## Out of Scope

- The handoff's `AdmSubnav` 4-tab top-level navigation.
- Hash-based routing.
- Public-facing search page changes (already done in Phase 1+2).
- Public marketing variant (`Lesson Library.html` in the bundle).
- Print view (`Lesson Library-print.html`).
- Backend changes (RPC for facet counts, per-user prefs sync) — these were originally under "Phase 3 candidates" but are deferred to a separate initiative.
- Merge of `feat/internal-design-system` to `main` — that happens after teammate trial signs off.
