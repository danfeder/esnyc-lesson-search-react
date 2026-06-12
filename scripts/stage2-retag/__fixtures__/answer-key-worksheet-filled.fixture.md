# Answer-key labeling worksheet (FILLED FIXTURE)

This fixture exercises the worksheet → final.jsonl parser. It mirrors the
renderer's per-lesson table shape. CONFIRMED wins; blank CONFIRMED falls back
to DRAFT. Multi-value cells are comma-separated; academic_concepts uses
`Subject: a, b; Subject2: c`.

---

### Lesson 1 — Fixture Cooking-Craft Lesson

<!-- lesson-id: lesson-fixture-a -->

- **id:** `lesson-fixture-a`
- **bucket:** adversarial (class: demo-class)

Read this lesson's body from `answer-key-sample.jsonl` (id `lesson-fixture-a`).

| Field | DRAFT | CONFIRMED |
|---|---|---|
| Activity Type <!-- f:activity_type --> | cooking | cooking, craft |
| Lesson Type <!-- f:tags --> |  |  |
| Season & Timing <!-- f:season_timing --> | Fall | Winter |
| Cultural Responsiveness Features <!-- f:cultural_responsiveness_features --> |  |  |
| Cultural Heritage <!-- f:cultural_heritage --> |  |  |
| Academic Concepts <!-- f:academic_concepts --> | Science: Plant Parts | Science: Plant Parts |
| Academic Integration <!-- f:academic_integration --> | Science | Science |
| Social-Emotional Learning <!-- f:social_emotional_learning --> |  |  |
| Core Competencies <!-- f:core_competencies --> |  |  |
| Cooking Methods <!-- f:cooking_methods --> | basic-prep | basic-prep |
| Observances & Holidays <!-- f:observances_holidays --> |  |  |
| Garden Skills <!-- f:garden_skills --> |  |  |
| Grades the document itself claims <!-- f:grade_levels --> | K | K, 1 |

---

### Lesson 2 — Fixture Garden Lesson

<!-- lesson-id: lesson-fixture-b -->

- **id:** `lesson-fixture-b`
- **bucket:** random (stratum: garden::Q2)

Read this lesson's body from `answer-key-sample.jsonl` (id `lesson-fixture-b`).

| Field | DRAFT | CONFIRMED |
|---|---|---|
| Activity Type <!-- f:activity_type --> | garden | garden |
| Lesson Type <!-- f:tags --> |  |  |
| Season & Timing <!-- f:season_timing --> | Fall |  |
| Cultural Responsiveness Features <!-- f:cultural_responsiveness_features --> |  |  |
| Cultural Heritage <!-- f:cultural_heritage --> |  |  |
| Academic Concepts <!-- f:academic_concepts --> |  |  |
| Academic Integration <!-- f:academic_integration --> |  |  |
| Social-Emotional Learning <!-- f:social_emotional_learning --> |  |  |
| Core Competencies <!-- f:core_competencies --> |  |  |
| Cooking Methods <!-- f:cooking_methods --> |  |  |
| Observances & Holidays <!-- f:observances_holidays --> |  |  |
| Garden Skills <!-- f:garden_skills --> | Planting | Planting |
| Grades the document itself claims <!-- f:grade_levels --> |  |  |

---

### Lesson 3 — Fixture Excluded Lesson

<!-- lesson-id: lesson-fixture-excluded -->

- **id:** `lesson-fixture-excluded`
- **bucket:** random (stratum: cooking::Q1)

Read this lesson's body from `answer-key-sample.jsonl` (id `lesson-fixture-excluded`).

| Field | DRAFT | CONFIRMED |
|---|---|---|
| Activity Type <!-- f:activity_type --> | cooking | cooking |
| Lesson Type <!-- f:tags --> |  |  |
| Season & Timing <!-- f:season_timing --> |  |  |
| Cultural Responsiveness Features <!-- f:cultural_responsiveness_features --> |  |  |
| Cultural Heritage <!-- f:cultural_heritage --> |  |  |
| Academic Concepts <!-- f:academic_concepts --> |  |  |
| Academic Integration <!-- f:academic_integration --> |  |  |
| Social-Emotional Learning <!-- f:social_emotional_learning --> |  |  |
| Core Competencies <!-- f:core_competencies --> |  |  |
| Cooking Methods <!-- f:cooking_methods --> |  |  |
| Observances & Holidays <!-- f:observances_holidays --> |  |  |
| Garden Skills <!-- f:garden_skills --> |  |  |
| Grades the document itself claims <!-- f:grade_levels --> |  |  |

---
