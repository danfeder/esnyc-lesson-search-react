# C02 re-tag — 4-gate pilot scorecard

Key lessons: 69 (34 clean-core / 35 judgment-row). Winning model: `opus-4-8`.

**GREENLIGHT: BLOCKED — a gate failed.**

## Gate ① — no clean-core regression: FAIL

Winner per-field micro-F1 must be ≥ the rules-baseline on the clean-core slice (strict, each field).

| Field | winner | rules |
| --- | --- | --- |
| cooking_skills | 0.767 | 0.808 |
| main_ingredients | 0.729 | 0.918 |

## Gate ② — beats rules on judgment rows (+0.05, both fields, tie fails): FAIL

| Field | winner | rules | delta | pass | bootstrap 95% CI |
| --- | --- | --- | --- | --- | --- |
| cooking_skills | 0.797 | 0.807 | -0.010 | FAIL | [-0.100, 0.057] |
| main_ingredients | 0.826 | 0.777 | 0.049 | FAIL | [-0.029, 0.130] |

_Bootstrap CI on the gate-② delta is informational / non-gating._

## Gate ③ — low false-positive on added specifics (pooled ≥ 0.7, per-specific ≥ 0.6, absent-rate ≤ 0.05): FAIL

Pooled precision over the 46 added specifics = 0.647 (tp 112 / fp 61; singleton FPs counted).

No never-in-key specific exceeds the absent-value prediction-rate ceiling.

Support-guarded specifics below the per-specific precision floor (0.6):

| Specific | precision | truth support | predictions |
| --- | --- | --- | --- |
| Garlic | 0.167 | 5 | 12 |
| Honey | 0.400 | 4 | 10 |
| Lemon | 0.429 | 3 | 7 |
| Tomatoes | 0.333 | 3 | 6 |

Named sentinels: FAIL.

| Sentinel | field | precision | floor | predictions | gated | pass |
| --- | --- | --- | --- | --- | --- | --- |
| Tasting | cooking_skills | 1.000 | 0.7 | 3 | yes | PASS |
| Kitchen & food safety | cooking_skills | 1.000 | 0.7 | 2 | no (informational) | PASS |
| Sweeteners | main_ingredients | 0.417 | 0.8 | 12 | yes | FAIL |

## Gate ④ — pantry-staple precision (Sweeteners ≥ 0.8, no never-stored literal survives): FAIL

Sweeteners precision = 0.417.

No never-stored literal (Salt / Oil / Soy sauce) survives in any prediction.

