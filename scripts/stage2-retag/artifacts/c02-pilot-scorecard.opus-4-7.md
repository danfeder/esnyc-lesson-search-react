# C02 re-tag — 4-gate pilot scorecard

Key lessons: 69 (34 clean-core / 35 judgment-row). Winning model: `opus-4-7`.

**GREENLIGHT: BLOCKED — a gate failed.**

## Gate ① — no clean-core regression: FAIL

Winner per-field micro-F1 must be ≥ the rules-baseline on the clean-core slice (strict, each field).

| Field | winner | rules |
| --- | --- | --- |
| cooking_skills | 0.792 | 0.785 |
| main_ingredients | 0.773 | 0.918 |

## Gate ② — beats rules on judgment rows (+0.05, both fields, tie fails): FAIL

| Field | winner | rules | delta | pass | bootstrap 95% CI |
| --- | --- | --- | --- | --- | --- |
| cooking_skills | 0.615 | 0.772 | -0.157 | FAIL | [-0.256, -0.072] |
| main_ingredients | 0.729 | 0.724 | 0.005 | FAIL | [-0.135, 0.143] |

_Bootstrap CI on the gate-② delta is informational / non-gating._

## Gate ③ — low false-positive on added specifics (precision ≥ 0.7, absent-rate ≤ 0.05): FAIL

Pooled precision over the 46 added specifics = 0.559 (tp 105 / fp 83; singleton FPs counted).

No never-in-key specific exceeds the absent-value prediction-rate ceiling.

## Gate ④ — pantry-staple precision (Sweeteners ≥ 0.8, no never-stored literal survives): FAIL

Sweeteners precision = 0.273.

No never-stored literal (Salt / Oil / Soy sauce) survives in any prediction.

