# FP4 Brief 2 — `search_synonyms` live-row census (provenance)

Provenance for `supabase/migrations/20260709000000_seed_search_synonyms_live_rows.sql`.
Evidence: **C3/FP4-SYN-06** in `docs/plans/fp4-discovery/discovery-evidence.md`.

## Source of truth

- **Database:** PRODUCTION — `jxlxtzkmicfhchkhiojz` (read-only `SELECT` via `mcp__supabase-remote__execute_sql`).
- **Captured:** 2026-07-04.
- **Live row count at capture:** **74** (matches the brief's expected 74 → no STOP-condition delta).

## Dump SQL (verbatim)

```sql
SELECT term, synonyms, synonym_type
FROM search_synonyms
ORDER BY term, synonym_type, synonyms;
```

Count / shape probes:

```sql
SELECT count(*) AS live_total,
       count(DISTINCT term) AS distinct_terms,
       count(DISTINCT (term, synonym_type)) AS distinct_term_type
FROM search_synonyms;
-- → {"live_total":74, "distinct_terms":67, "distinct_term_type":68}

SELECT count(*) AS total,
       count(DISTINCT (term, synonyms, synonym_type)) AS distinct_full_tuple,
       count(*) FILTER (WHERE synonym_type IS NULL) AS null_type_rows,
       count(*) FILTER (WHERE synonyms IS NULL) AS null_synonyms_rows,
       count(*) FILTER (WHERE array_length(synonyms,1) IS NULL) AS empty_array_rows
FROM search_synonyms;
-- → {"total":74, "distinct_full_tuple":74, "null_type_rows":0, "null_synonyms_rows":0, "empty_array_rows":0}
```

### Key structural facts (drive the migration design)

- **74 rows / 74 distinct full `(term, synonyms, synonym_type)` tuples** → no exact-duplicate
  rows, so a full-tuple `WHERE NOT EXISTS` guard collapses nothing.
- **68 distinct `(term, synonym_type)` pairs**, not 74 → **six terms legitimately carry two
  differently-scoped rows.** The migration matches on the FULL tuple so it preserves both and
  never treats them as duplicates. The six collisions:

  | term | `synonym_type` | variant A | variant B |
  |------|----------------|-----------|-----------|
  | `christmas` | oneway | `{holiday,gingerbread}` | `{winter,celebration,december}` |
  | `easter` | oneway | `{eggs,april,bunny}` | `{spring,celebration}` |
  | `halloween` | oneway | `{fall,celebration}` | `{pumpkin,october}` |
  | `hispanic` | oneway | `{latin,american}` | `{latino,latina,latinx,mexican,spanish,caribbean}` |
  | `thanksgiving` | oneway | `{harvest,festival}` | `{harvest,turkey,gratitude,cranberry,pumpkin}` |
  | `woman` | bidirectional | `{girls,women's,girl}` | `{women,female,lady,ladies}` |

  (In each pair, one variant is a `20260522000000` seed row and the other is the original DB
  row — expected, that seed migration deliberately added a second row per term.)
- **Zero NULL `synonym_type`, zero NULL/empty `synonyms`** → plain `=` equality in the guard is
  faithful (mirrors `20260522000000`; no `IS NOT DISTINCT FROM` needed).

## Escaping / generation method

The migration's `VALUES` block was **not hand-transcribed.** It was emitted by Postgres' own
`format('%L', …)` + `quote_literal()` over the live table:

```sql
SELECT string_agg(
  format('    (%L, ARRAY[%s]::text[], %L)',
    term,
    (SELECT string_agg(quote_literal(e), ', ') FROM unnest(synonyms) AS e),
    synonym_type),
  E',\n' ORDER BY term, synonym_type, synonyms)
FROM search_synonyms;
```

An independent throwaway generator (scratchpad Node, JS-side `'`→`''` escaping) produced the
same block; both hash **`md5 = 454b9573ed0260acb5845387af03c034`**, proving the escaping
(`children''s`, `women''s`, `woman''s`) and every row are byte-identical to the DB's own output.

## Full 74-row dump (raw)

Ordered `term, synonym_type, synonyms`; one JSON object per live row:

```jsonl
{"term":"3","synonyms":["3rd","third","three"],"synonym_type":"bidirectional"}
{"term":"4","synonyms":["4th","fourth","four"],"synonym_type":"bidirectional"}
{"term":"5","synonyms":["5th","fifth","five"],"synonym_type":"bidirectional"}
{"term":"6","synonyms":["6th","sixth","six"],"synonym_type":"bidirectional"}
{"term":"7","synonyms":["7th","seventh","seven"],"synonym_type":"bidirectional"}
{"term":"8","synonyms":["8th","eighth","eight"],"synonym_type":"bidirectional"}
{"term":"activity","synonyms":["activities","lesson","lessons","project","projects"],"synonym_type":"bidirectional"}
{"term":"african","synonyms":["ethiopian","nigerian","moroccan"],"synonym_type":"oneway"}
{"term":"asian","synonyms":["chinese","japanese","korean","vietnamese","thai","indian","filipino"],"synonym_type":"oneway"}
{"term":"berries","synonyms":["strawberry","blueberry","raspberry","blackberry","cranberry"],"synonym_type":"oneway"}
{"term":"child","synonyms":["children","kid","kids","student","students"],"synonym_type":"bidirectional"}
{"term":"childrens","synonyms":["children's"],"synonym_type":"typo_correction"}
{"term":"christmas","synonyms":["holiday","gingerbread"],"synonym_type":"oneway"}
{"term":"christmas","synonyms":["winter","celebration","december"],"synonym_type":"oneway"}
{"term":"citrus","synonyms":["orange","lemon","lime","grapefruit","tangerine"],"synonym_type":"oneway"}
{"term":"cookin","synonyms":["cooking"],"synonym_type":"typo_correction"}
{"term":"cooking","synonyms":["cook","culinary","kitchen","baking","bake"],"synonym_type":"bidirectional"}
{"term":"decay","synonyms":["decomposition"],"synonym_type":"oneway"}
{"term":"easter","synonyms":["eggs","april","bunny"],"synonym_type":"oneway"}
{"term":"easter","synonyms":["spring","celebration"],"synonym_type":"oneway"}
{"term":"elementary","synonyms":["elem","primary"],"synonym_type":"bidirectional"}
{"term":"elementry","synonyms":["elementary"],"synonym_type":"typo_correction"}
{"term":"fall","synonyms":["autumn","september","october","november"],"synonym_type":"bidirectional"}
{"term":"garden","synonyms":["gardening","planting","plant","growing","grow","cultivation"],"synonym_type":"bidirectional"}
{"term":"greens","synonyms":["kale","spinach","lettuce","chard","collards","arugula"],"synonym_type":"bidirectional"}
{"term":"growin","synonyms":["growing"],"synonym_type":"typo_correction"}
{"term":"halloween","synonyms":["fall","celebration"],"synonym_type":"oneway"}
{"term":"halloween","synonyms":["pumpkin","october"],"synonym_type":"oneway"}
{"term":"harvest","synonyms":["harvesting","picking","gathering","collecting"],"synonym_type":"bidirectional"}
{"term":"healthy","synonyms":["healthful","nutritious","wholesome"],"synonym_type":"bidirectional"}
{"term":"healty","synonyms":["healthy"],"synonym_type":"typo_correction"}
{"term":"herb","synonyms":["herbs","spice","spices","seasoning","seasonings"],"synonym_type":"bidirectional"}
{"term":"hispanic","synonyms":["latin","american"],"synonym_type":"oneway"}
{"term":"hispanic","synonyms":["latino","latina","latinx","mexican","spanish","caribbean"],"synonym_type":"oneway"}
{"term":"k","synonyms":["kindergarten","kinder"],"synonym_type":"bidirectional"}
{"term":"kindergarden","synonyms":["kindergarten"],"synonym_type":"typo_correction"}
{"term":"latin","synonyms":["latino","latina","latinx","mexican","spanish","caribbean"],"synonym_type":"oneway"}
{"term":"latino","synonyms":["hispanic","latina","latinx","latin","american","spanish"],"synonym_type":"oneway"}
{"term":"man","synonyms":["men","male","gentleman","gentlemen"],"synonym_type":"bidirectional"}
{"term":"mediterranean","synonyms":["italian","greek","spanish","turkish","moroccan"],"synonym_type":"oneway"}
{"term":"middel","synonyms":["middle"],"synonym_type":"typo_correction"}
{"term":"middle","synonyms":["ms","intermediate"],"synonym_type":"bidirectional"}
{"term":"nutrition","synonyms":["nutrients","dietary","diet","eating"],"synonym_type":"bidirectional"}
{"term":"nutrtion","synonyms":["nutrition"],"synonym_type":"typo_correction"}
{"term":"pk","synonyms":["prek","prekindergarten","3k","4k"],"synonym_type":"bidirectional"}
{"term":"plantin","synonyms":["planting"],"synonym_type":"typo_correction"}
{"term":"potatos","synonyms":["potatoes"],"synonym_type":"typo_correction"}
{"term":"pumkin","synonyms":["pumpkin"],"synonym_type":"typo_correction"}
{"term":"quick","synonyms":["fast","easy","simple"],"synonym_type":"bidirectional"}
{"term":"reciepe","synonyms":["recipe"],"synonym_type":"typo_correction"}
{"term":"reciepes","synonyms":["recipes"],"synonym_type":"typo_correction"}
{"term":"recipe","synonyms":["recipes","instructions","directions"],"synonym_type":"bidirectional"}
{"term":"recipie","synonyms":["recipe"],"synonym_type":"typo_correction"}
{"term":"recipies","synonyms":["recipes"],"synonym_type":"typo_correction"}
{"term":"roots","synonyms":["carrot","potato","beet","turnip","radish"],"synonym_type":"bidirectional"}
{"term":"skwash","synonyms":["squash"],"synonym_type":"typo_correction"}
{"term":"spring","synonyms":["march","april","may"],"synonym_type":"bidirectional"}
{"term":"squash","synonyms":["butternut","acorn","pumpkin","kabocha","delicata"],"synonym_type":"bidirectional"}
{"term":"summer","synonyms":["june","july","august"],"synonym_type":"bidirectional"}
{"term":"thanksgiving","synonyms":["gratitude","harvest"],"synonym_type":"bidirectional"}
{"term":"thanksgiving","synonyms":["harvest","festival"],"synonym_type":"oneway"}
{"term":"thanksgiving","synonyms":["harvest","turkey","gratitude","cranberry","pumpkin"],"synonym_type":"oneway"}
{"term":"tomatoe","synonyms":["tomato"],"synonym_type":"typo_correction"}
{"term":"valentine","synonyms":["love","heart","february"],"synonym_type":"oneway"}
{"term":"vegatable","synonyms":["vegetable"],"synonym_type":"typo_correction"}
{"term":"vegatables","synonyms":["vegetables"],"synonym_type":"typo_correction"}
{"term":"vegetable","synonyms":["vegetables","veggie","veggies","veg"],"synonym_type":"bidirectional"}
{"term":"vegitable","synonyms":["vegetable"],"synonym_type":"typo_correction"}
{"term":"vegitables","synonyms":["vegetables"],"synonym_type":"typo_correction"}
{"term":"winter","synonyms":["december","january","february"],"synonym_type":"bidirectional"}
{"term":"woman","synonyms":["girls","women's","girl"],"synonym_type":"bidirectional"}
{"term":"woman","synonyms":["women","female","lady","ladies"],"synonym_type":"bidirectional"}
{"term":"womans","synonyms":["woman's"],"synonym_type":"typo_correction"}
{"term":"womens","synonyms":["women's"],"synonym_type":"typo_correction"}
```
