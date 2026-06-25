# C02 P2′.7 — Held-out (fresh-25) cooking-only canary scorecard

- run: `c02-run.opus-4-8.heldout.jsonl`  ·  key: `c02-heldout-cooking-key.v2.jsonl`  ·  lessons: **25**
- floor-retention ⊇ floor (no loss vs floor): **25/25**

## Aggregate cooking_skills (micro, over the SHIPPED output)

| policy | P | R | F1 | tp | fp | fn |
|---|---|---|---|---|---|---|
| floor-only | 0.804 | 0.482 | 0.603 | 41 | 10 | 44 |
| LLM-as-is | 0.884 | 0.718 | 0.792 | 61 | 8 | 24 |
| **floor-retention (SHIPPED)** | **0.819** | **0.800** | **0.810** | 68 | 15 | 17 |

floor-retention − floor-only F1 delta: **+0.207**

## Sentinels (precision over the SHIPPED output)

| sentinel | P | R | tp | fp | fn | gold-support |
|---|---|---|---|---|---|---|
| Tasting | n/a | 0.000 | 0 | 0 | 2 | 2 |
| Kitchen & food safety | n/a | 0.000 | 0 | 0 | 1 | 1 |

## Per-value cooking_skills (SHIPPED), support-sorted

| value | P | R | tp | fp | fn |
|---|---|---|---|---|---|
| Reading & following recipes | 0.833 | 0.833 | 10 | 2 | 2 |
| Knife skills | 1.000 | 0.917 | 11 | 0 | 1 |
| Measuring | 0.833 | 0.909 | 10 | 2 | 1 |
| Mixing & stirring | 0.900 | 0.818 | 9 | 1 | 2 |
| Assembling dishes | 0.625 | 0.714 | 5 | 3 | 2 |
| Grating | 1.000 | 1.000 | 5 | 0 | 0 |
| Creating sauces & dressings | 0.750 | 0.600 | 3 | 1 | 2 |
| Boiling & simmering | 1.000 | 1.000 | 5 | 0 | 0 |
| Sautéing & stir-frying | 0.600 | 0.750 | 3 | 2 | 1 |
| Seasoning & spice blending | 1.000 | 0.750 | 3 | 0 | 1 |
| Tasting | n/a | 0.000 | 0 | 0 | 2 |
| Wrapping & rolling | 1.000 | 0.500 | 1 | 0 | 1 |
| Mashing | 1.000 | 0.500 | 1 | 0 | 1 |
| Roasting | 0.500 | 1.000 | 1 | 1 | 0 |
| Kitchen & food safety | n/a | 0.000 | 0 | 0 | 1 |
| Baking | 1.000 | 1.000 | 1 | 0 | 0 |
| Dough making | 0.000 | n/a | 0 | 1 | 0 |
| Steaming | 0.000 | n/a | 0 | 1 | 0 |
| Pickling & preserving | 0.000 | n/a | 0 | 1 | 0 |

## Per-lesson diffs (SHIPPED vs gold) — only lessons with a delta

- `1puemyxDt0Cy` ship=[Reading & following recipes] gold=[Tasting] **+FP:** Reading & following recipes **−FN:** Tasting
- `1dx3HqZZFfiA` ship=[Knife skills, Measuring, Reading & following recipes, Assembling dishes, Sautéing & stir-frying, Roasting, Grating, Creating sauces & dressings, Mixing & stirring] gold=[Creating sauces & dressings, Grating, Knife skills, Measuring, Mixing & stirring, Reading & following recipes, Roasting, Sautéing & stir-frying] **+FP:** Assembling dishes
- `19CMwluTwweS` ship=[Knife skills, Measuring, Assembling dishes, Reading & following recipes, Creating sauces & dressings] gold=[Assembling dishes, Knife skills, Measuring, Mixing & stirring, Tasting] **+FP:** Reading & following recipes, Creating sauces & dressings **−FN:** Mixing & stirring, Tasting
- `1qYwSYXu5udi` ship=[Knife skills, Measuring, Mixing & stirring, Reading & following recipes, Boiling & simmering, Assembling dishes] gold=[Assembling dishes, Boiling & simmering, Creating sauces & dressings, Knife skills, Measuring, Mixing & stirring, Reading & following recipes, Sautéing & stir-frying] **−FN:** Creating sauces & dressings, Sautéing & stir-frying
- `1lv-gM8xprEt` ship=[Reading & following recipes, Assembling dishes] gold=[Knife skills, Measuring, Reading & following recipes] **+FP:** Assembling dishes **−FN:** Knife skills, Measuring
- `1GXPRwyORgQy` ship=[Knife skills, Mixing & stirring, Measuring, Assembling dishes, Creating sauces & dressings] gold=[Assembling dishes, Creating sauces & dressings, Knife skills, Mixing & stirring, Reading & following recipes] **+FP:** Measuring **−FN:** Reading & following recipes
- `1LMlCebsrli4` ship=[Knife skills, Measuring, Mixing & stirring, Reading & following recipes, Assembling dishes] gold=[Creating sauces & dressings, Kitchen & food safety, Knife skills, Mixing & stirring, Reading & following recipes] **+FP:** Measuring, Assembling dishes **−FN:** Creating sauces & dressings, Kitchen & food safety
- `1FUQYevNBKMd` ship=[Knife skills, Boiling & simmering, Sautéing & stir-frying, Assembling dishes, Reading & following recipes, Grating, Measuring, Seasoning & spice blending] gold=[Assembling dishes, Boiling & simmering, Grating, Knife skills, Measuring, Mixing & stirring, Reading & following recipes, Seasoning & spice blending] **+FP:** Sautéing & stir-frying **−FN:** Mixing & stirring
- `1pLaLf59n80w` ship=[Measuring, Mixing & stirring, Assembling dishes, Seasoning & spice blending] gold=[Assembling dishes, Measuring, Reading & following recipes, Seasoning & spice blending, Wrapping & rolling] **+FP:** Mixing & stirring **−FN:** Reading & following recipes, Wrapping & rolling
- `1eViPJBz9xeq` ship=[Measuring, Knife skills, Dough making, Sautéing & stir-frying, Steaming, Reading & following recipes, Mashing, Grating, Mixing & stirring, Wrapping & rolling] gold=[Assembling dishes, Grating, Knife skills, Mashing, Measuring, Mixing & stirring, Reading & following recipes, Seasoning & spice blending, Wrapping & rolling] **+FP:** Dough making, Sautéing & stir-frying, Steaming **−FN:** Assembling dishes, Seasoning & spice blending
- `19OW9S7QbgkM` ship=[Pickling & preserving] gold=[] **+FP:** Pickling & preserving
- `11ialYB913qP` ship=[Knife skills, Measuring, Reading & following recipes, Mixing & stirring, Sautéing & stir-frying, Boiling & simmering, Roasting, Grating] gold=[Boiling & simmering, Grating, Knife skills, Measuring, Mixing & stirring, Reading & following recipes, Sautéing & stir-frying] **+FP:** Roasting
- `1m2sMUa9Qjkz` ship=[Knife skills, Measuring, Mixing & stirring, Reading & following recipes, Creating sauces & dressings, Grating] gold=[Assembling dishes, Creating sauces & dressings, Grating, Knife skills, Mashing, Measuring, Mixing & stirring, Reading & following recipes] **−FN:** Assembling dishes, Mashing
