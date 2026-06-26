# C02 P2′.7 — Held-out (fresh-25) cooking-only canary scorecard

- run: `c02-run.opus-4-8.heldout.jsonl`  ·  key: `c02-heldout-cooking-key.jsonl`  ·  lessons: **25**
- floor-retention ⊇ floor (no loss vs floor): **25/25**

## Aggregate cooking_skills (micro, over the SHIPPED output)

| policy | P | R | F1 | tp | fp | fn |
|---|---|---|---|---|---|---|
| floor-only | 0.373 | 0.463 | 0.413 | 19 | 32 | 22 |
| LLM-as-is | 0.507 | 0.854 | 0.636 | 35 | 34 | 6 |
| **floor-retention (SHIPPED)** | **0.422** | **0.854** | **0.565** | 35 | 48 | 6 |

floor-retention − floor-only F1 delta: **+0.151**

## Sentinels (precision over the SHIPPED output)

| sentinel | P | R | tp | fp | fn | gold-support |
|---|---|---|---|---|---|---|
| Tasting | n/a | 0.000 | 0 | 0 | 2 | 2 |
| Kitchen & food safety | n/a | 0.000 | 0 | 0 | 1 | 1 |

## Per-value cooking_skills (SHIPPED), support-sorted

| value | P | R | tp | fp | fn |
|---|---|---|---|---|---|
| Knife skills | 0.818 | 1.000 | 9 | 2 | 0 |
| Mixing & stirring | 0.500 | 1.000 | 5 | 5 | 0 |
| Assembling dishes | 0.375 | 1.000 | 3 | 5 | 0 |
| Creating sauces & dressings | 0.500 | 0.667 | 2 | 2 | 1 |
| Boiling & simmering | 0.600 | 1.000 | 3 | 2 | 0 |
| Seasoning & spice blending | 1.000 | 1.000 | 3 | 0 | 0 |
| Reading & following recipes | 0.167 | 1.000 | 2 | 10 | 0 |
| Tasting | n/a | 0.000 | 0 | 0 | 2 |
| Measuring | 0.167 | 1.000 | 2 | 10 | 0 |
| Sautéing & stir-frying | 0.400 | 1.000 | 2 | 3 | 0 |
| Grating | 0.400 | 1.000 | 2 | 3 | 0 |
| Wrapping & rolling | 1.000 | 0.500 | 1 | 0 | 1 |
| Mashing | 1.000 | 0.500 | 1 | 0 | 1 |
| Kitchen & food safety | n/a | 0.000 | 0 | 0 | 1 |
| Roasting | 0.000 | n/a | 0 | 2 | 0 |
| Baking | 0.000 | n/a | 0 | 1 | 0 |
| Dough making | 0.000 | n/a | 0 | 1 | 0 |
| Steaming | 0.000 | n/a | 0 | 1 | 0 |
| Pickling & preserving | 0.000 | n/a | 0 | 1 | 0 |

## Per-lesson diffs (SHIPPED vs gold) — only lessons with a delta

- `1puemyxDt0Cy` ship=[Reading & following recipes] gold=[Tasting] **+FP:** Reading & following recipes **−FN:** Tasting
- `1dx3HqZZFfiA` ship=[Knife skills, Measuring, Reading & following recipes, Assembling dishes, Sautéing & stir-frying, Roasting, Grating, Creating sauces & dressings, Mixing & stirring] gold=[Knife skills, Sautéing & stir-frying] **+FP:** Measuring, Reading & following recipes, Assembling dishes, Roasting, Grating, Creating sauces & dressings, Mixing & stirring
- `19CMwluTwweS` ship=[Knife skills, Measuring, Assembling dishes, Reading & following recipes, Creating sauces & dressings] gold=[Assembling dishes, Knife skills, Tasting] **+FP:** Measuring, Reading & following recipes, Creating sauces & dressings **−FN:** Tasting
- `1qYwSYXu5udi` ship=[Knife skills, Measuring, Mixing & stirring, Reading & following recipes, Boiling & simmering, Assembling dishes] gold=[Assembling dishes] **+FP:** Knife skills, Measuring, Mixing & stirring, Reading & following recipes, Boiling & simmering
- `1lv-gM8xprEt` ship=[Reading & following recipes, Assembling dishes] gold=[] **+FP:** Reading & following recipes, Assembling dishes
- `1GXPRwyORgQy` ship=[Knife skills, Mixing & stirring, Measuring, Assembling dishes, Creating sauces & dressings] gold=[Creating sauces & dressings, Knife skills, Mixing & stirring] **+FP:** Measuring, Assembling dishes
- `1LMlCebsrli4` ship=[Knife skills, Measuring, Mixing & stirring, Reading & following recipes, Assembling dishes] gold=[Creating sauces & dressings, Kitchen & food safety, Knife skills] **+FP:** Measuring, Mixing & stirring, Reading & following recipes, Assembling dishes **−FN:** Creating sauces & dressings, Kitchen & food safety
- `1YW8jh8unSsE` ship=[Knife skills, Measuring, Mixing & stirring, Reading & following recipes, Boiling & simmering, Sautéing & stir-frying, Baking] gold=[Boiling & simmering, Knife skills, Mixing & stirring] **+FP:** Measuring, Reading & following recipes, Sautéing & stir-frying, Baking
- `1FUQYevNBKMd` ship=[Knife skills, Boiling & simmering, Sautéing & stir-frying, Assembling dishes, Reading & following recipes, Grating, Measuring, Seasoning & spice blending] gold=[Boiling & simmering, Grating, Knife skills, Measuring, Seasoning & spice blending] **+FP:** Sautéing & stir-frying, Assembling dishes, Reading & following recipes
- `1pLaLf59n80w` ship=[Measuring, Mixing & stirring, Assembling dishes, Seasoning & spice blending] gold=[Assembling dishes, Seasoning & spice blending, Wrapping & rolling] **+FP:** Measuring, Mixing & stirring **−FN:** Wrapping & rolling
- `1eViPJBz9xeq` ship=[Measuring, Knife skills, Dough making, Sautéing & stir-frying, Steaming, Reading & following recipes, Mashing, Grating, Mixing & stirring, Wrapping & rolling] gold=[Grating, Knife skills, Mashing, Measuring, Mixing & stirring, Reading & following recipes, Wrapping & rolling] **+FP:** Dough making, Sautéing & stir-frying, Steaming
- `1zrKohaoXxvE` ship=[Measuring, Mixing & stirring, Reading & following recipes, Knife skills, Seasoning & spice blending, Boiling & simmering] gold=[Boiling & simmering, Mixing & stirring, Seasoning & spice blending] **+FP:** Measuring, Reading & following recipes, Knife skills
- `19OW9S7QbgkM` ship=[Pickling & preserving] gold=[] **+FP:** Pickling & preserving
- `11ialYB913qP` ship=[Knife skills, Measuring, Reading & following recipes, Mixing & stirring, Sautéing & stir-frying, Boiling & simmering, Roasting, Grating] gold=[Knife skills, Sautéing & stir-frying] **+FP:** Measuring, Reading & following recipes, Mixing & stirring, Boiling & simmering, Roasting, Grating
- `1m2sMUa9Qjkz` ship=[Knife skills, Measuring, Mixing & stirring, Reading & following recipes, Creating sauces & dressings, Grating] gold=[Creating sauces & dressings, Knife skills, Mashing, Mixing & stirring, Reading & following recipes] **+FP:** Measuring, Grating **−FN:** Mashing
