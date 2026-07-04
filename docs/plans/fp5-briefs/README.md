# FP5 wave — briefs index

Owner-approved scope from the 2026-07-04 Fable Q&A session (decision record:
`docs/plans/2026-07-04-owner-uiux-candidates.md`). Same execution model as FP4: one brief
per fresh Opus executor session, thin hand-backs, owner merges every PR and presses every
PROD gate.

**The standing rules in `docs/plans/fp4-briefs/README.md` apply verbatim to every FP5
brief** (STOP rule, branch/gates, migration discipline, PROD/TEST probe rules, bot triage,
verbatim identifiers, thin hand-backs). Read that section first.

| # | Brief | Size | DB? | Depends on |
|---|-------|------|-----|-----------|
| 1 | `brief-1-sel-skills-and-cultural-diversity.md` | M | migration (constraint swaps + 320-row rename, one gate) | **HARD: FP4 brief 6 must be applied to PROD first** |
| 2 | `brief-2-template-prefill-and-ai-off.md` | M | no (edge deploy gate only) | **HARD: brief 1 merged first** (parser targets post-rename vocab) |

**Run order is the pre-wave chain — see `docs/plans/2026-07-04-pre-wave-plan.md` (THE
tracker): FP4 brief 6 → FP5 brief 1 → FP5 brief 2 → wave.** Both briefs must be live on
PROD **before reviewers start the spreadsheet-wave submissions** (owner's deadline
driver). Pre-wave work outranks FP4 briefs 1–4.

Migration dates: FP4 briefs 2 and 6 take `20260706000000` and `20260707000000`; brief 1
here uses `20260708000000`. Never reuse a taken date; if taken, bump to the next free day.
