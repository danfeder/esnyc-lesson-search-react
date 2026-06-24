# C02 re-tag — 4-gate pilot scorecard

Key lessons: 69 (34 clean-core / 35 judgment-row). Winning model: `opus-4-8`.

**GREENLIGHT: BLOCKED — a gate failed.**

## Gate ① — no clean-core regression: FAIL

Winner per-field micro-F1 must be ≥ the rules-baseline on the clean-core slice (strict, each field).

| Field | winner | rules |
| --- | --- | --- |
| cooking_skills | 0.757 | 0.785 |
| main_ingredients | 0.755 | 0.918 |

## Gate ② — beats rules on judgment rows (+0.05, both fields, tie fails): FAIL

| Field | winner | rules | delta | pass | bootstrap 95% CI |
| --- | --- | --- | --- | --- | --- |
| cooking_skills | 0.698 | 0.772 | -0.074 | FAIL | [-0.131, -0.015] |
| main_ingredients | 0.822 | 0.724 | 0.098 | PASS | [0.019, 0.192] |

_Bootstrap CI on the gate-② delta is informational / non-gating._

## Gate ③ — low false-positive on added specifics (precision ≥ 0.7, absent-rate ≤ 0.05): FAIL

Pooled precision over the 46 added specifics = 0.575 (tp 126 / fp 93; singleton FPs counted).

No never-in-key specific exceeds the absent-value prediction-rate ceiling.

## Gate ④ — pantry-staple precision (Sweeteners ≥ 0.8, no never-stored literal survives): FAIL

Sweeteners precision = 0.357.

No never-stored literal (Salt / Oil / Soy sauce) survives in any prediction.

