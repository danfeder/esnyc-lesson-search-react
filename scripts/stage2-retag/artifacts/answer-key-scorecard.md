# Stage 2 re-tag — answer-key scorecard

Key lessons: 57. Winning model: `fable`.

## Coverage

| Contestant | Lessons present | Missing (scored all-empty) |
| --- | --- | --- |
| `v3` | 57/57 | — |
| `fable` | 57/57 | — |
| `o47` | 57/57 | — |

## Per-field F1 (micro over value occurrences)

| Field | `v3` | `fable` | `o47` |
| --- | --- | --- | --- |
| activity_type | 0.785 | 0.902 | 0.855 |
| tags | 0.000 | 1.000 | 0.769 |
| season_timing | 0.823 | 0.941 | 0.970 |
| cultural_responsiveness_features | 0.836 | 0.890 | 0.891 |
| cultural_heritage | 0.407 | 0.709 | 0.688 |
| academic_concepts | 0.414 | 0.644 | 0.447 |
| academic_integration | 0.697 | 0.783 | 0.602 |
| social_emotional_learning | 0.794 | 0.938 | 0.883 |
| core_competencies | 0.541 | 0.788 | 0.807 |
| cooking_methods | 0.590 | 0.921 | 0.804 |
| observances_holidays | 0.615 | 0.909 | 0.811 |
| garden_skills | 0.415 | 0.752 | 0.646 |
| grade_levels | 0.000 | 0.982 | 0.929 |
| **macroF1** | **0.532** | **0.858** | **0.777** |

## Gates (winning model)

### Gate 1 — winning per-field F1 ≥ v3 on EVERY field: PASS

`fable` meets or beats v3 on all 13 fields.

### Gate 2 — macroF1 ≥ 0.7: PASS

`fable` macroF1 = 0.858 (floor 0.7).

### Gate 3 — per-value recall ≥ 0.5 (gates values with answer-key support ≥ 2): PASS

The recall floor only gates values appearing in ≥ 2 key lessons. Support-1 singletons are reported below but do not fail this gate.

No support-≥2 value falls below the 0.5 recall floor.

### Singletons (informational — support-1 values, non-gating)

`fable` recovered 45/50 singleton value(s) (values appearing in exactly one key lesson).

Missed singleton(s):

| Field | Value | Lesson |
| --- | --- | --- |
| academic_concepts | Arts: Engineering | 1X7HadA1WaR-hNBFIHvAUsFKborDGE5eT3Lhg5Dp9CEI |
| academic_concepts | Literacy/ELA: Cultural Narratives | 19Tg4I9XywohpcrdBZ77vaBgyIdYhxGo0bk3FpSUcE2Y |
| academic_concepts | Science: Harvesting | lesson_c257c458adb549c3ad5ffe25aef9a776 |
| academic_concepts | Science: Tool Use | 18aRAD5iY1YxcaqTUZBhflNDAstEAHumK |
| academic_concepts | Social Studies: Environmental Justice | lesson_3aaa27c0096a48368cde2804832ad07c |

