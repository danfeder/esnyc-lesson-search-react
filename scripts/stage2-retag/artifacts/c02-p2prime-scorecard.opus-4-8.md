# C02 re-tag — 4-gate pilot scorecard

Key lessons: 69 (34 clean-core / 35 judgment-row). Winning model: `opus-4-8`.

**GREENLIGHT: BLOCKED — a gate failed.**

## Gate ① — no clean-core regression: FAIL

Winner per-field micro-F1 must be ≥ the rules-baseline on the clean-core slice (strict, each field).

| Field | winner | rules |
| --- | --- | --- |
| cooking_skills | 0.782 | 0.808 |
| main_ingredients | 0.757 | 0.918 |

## Gate ② — beats rules on judgment rows (+0.05, both fields, tie fails): FAIL

| Field | winner | rules | delta | pass | bootstrap 95% CI |
| --- | --- | --- | --- | --- | --- |
| cooking_skills | 0.738 | 0.807 | -0.069 | FAIL | [-0.167, 0.015] |
| main_ingredients | 0.818 | 0.777 | 0.041 | FAIL | [-0.048, 0.132] |

_Bootstrap CI on the gate-② delta is informational / non-gating._

## Gate ③ — low false-positive on added specifics (pooled ≥ 0.7, per-specific ≥ 0.6, absent-rate ≤ 0.05): FAIL

Pooled precision over the 46 added specifics = 0.617 (tp 116 / fp 72; singleton FPs counted).

No never-in-key specific exceeds the absent-value prediction-rate ceiling.

Support-guarded specifics below the per-specific precision floor (0.6):

| Specific | precision | truth support | predictions |
| --- | --- | --- | --- |
| Bell peppers | 0.571 | 4 | 7 |
| Carrots | 0.500 | 6 | 10 |
| Cilantro | 0.500 | 3 | 6 |
| Garlic | 0.286 | 5 | 14 |
| Ginger | 0.500 | 3 | 6 |
| Honey | 0.333 | 4 | 9 |
| Lemon | 0.375 | 3 | 8 |
| Tomatoes | 0.500 | 3 | 6 |

Named sentinels: FAIL.

| Sentinel | field | precision | floor | predictions | gated | pass |
| --- | --- | --- | --- | --- | --- | --- |
| Tasting | cooking_skills | 0.214 | 0.7 | 28 | yes | FAIL |
| Kitchen & food safety | cooking_skills | 0.400 | 0.7 | 5 | yes | FAIL |
| Sweeteners | main_ingredients | 0.364 | 0.8 | 11 | yes | FAIL |

## Gate ④ — pantry-staple precision (Sweeteners ≥ 0.8, no never-stored literal survives): FAIL

Sweeteners precision = 0.364.

No never-stored literal (Salt / Oil / Soy sauce) survives in any prediction.

