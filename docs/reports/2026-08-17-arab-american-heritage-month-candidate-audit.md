# Arab American Heritage Month Candidate Audit

**Audit date:** 2026-08-17

**Canonical tag:** `Arab American Heritage Month`

**Status:** Read-only candidate review; no lesson rows changed

**Decision owner:** Dan

## Scope and rubric

This is a curated candidate review, not an exhaustive text search and not a mutation predicate.
A lesson is recommended when its current source document either explicitly frames the lesson for
Arab American Heritage Month or materially teaches the culture, history, geography, or foodways of
a named Arab people or country.

- **Yes:** Evidence meets that rubric.
- **Hold:** Evidence is relevant but needs owner judgment or stronger grounding.
- **No:** The lesson is religious, regional, or cross-cultural without enough Arab-specific teaching.

## Recommended decisions

| Verdict | Lesson ID | Title | Current-source evidence |
| --- | --- | --- | --- |
| Yes | `lesson_3eb295f4dfb94185bd8ae5b39aabe01d` | Lahsa | Explicitly honors Arab American Heritage Month and teaches Arab cuisine, Yemeni culture, Arab New Yorkers, Little Syria, Arab neighborhoods, and eating customs. The source Tags section already names the proposed tag. |
| Yes | `lesson_426e363f5de14520b790695e25b95cda` | Chilled Cucumber and Tahini Soup with Spicy Pumpkin Seeds | Teaches Palestinian culture, ingredients, cooking, geography, and foodways. |
| Yes | `1JYc3BYK-ZbYBcYQSUPKrFR3ocLhjnBRiFXFj3EV3CmE` | Cooking with Seeds: Ful Medames | Identifies ful medames as an Egyptian breakfast, calls it culturally important to school families, and introduces it within Middle East/North Africa traditions. |
| Yes | `1Dz-Jv4cV0N0ntxZ8z0VcRgenI0hpZuOIDJuPbEvr7bI` | Fattoush | Teaches food cultures and trade; maps Syria, Lebanon, Jordan, and Palestine; and describes fattoush foodways in those countries. |
| Yes, medium confidence | `1gh1_OqCpnhDkGOmte5VIdIkEkU8_HpXs34KdcSuPkrQ` | Fattoush | The database summary is generic, but the live source identifies fattoush as traditional in Lebanon, Syria, Egypt, Jordan, and Palestine and locates the region on a map. |
| Yes | `1K8JBnS7hTldpcB-f0CkDK94yYJyr_7r0itLDL3IOz4U` | Ful Medames | Teaches the dish's origins, maps Egypt, and explains Egyptian breakfast and bread traditions. |
| Yes | `1eFmMW_gk1dR2uEpUWTVHylQAB7-OSAIKNfwc07Dbmgg` | Hummus and Pita-revised | Teaches Palestinian native foods, Palestinian/Middle Eastern food identity, and relevant history. The rationale for this tag is specifically the Palestinian material. |
| Yes | `1ulDJYHIEKOqidEYl9gQ2xsBFEVhI2alJ` | Yemeni Fasoulia | Students learn about Yemen, locate it on a map, view a Yemen culture resource, and make two named Yemeni foods. |
| Yes | `188Ph9s6OEdUgNQScQOxGiqAtvNd2r78X` | Zahawig | Identifies zahawig as a Yemeni sauce and makes understanding its origin a lesson objective; keywords include Yemen and Arabic. |
| Hold | `1LyuuuF-GNwUfVIgxrR_3NQLCEbD59GkfFN145WeTk3Q` | Moroccan Carrot Salad, Two Ways | Contains meaningful Moroccan foodways, geography, music, and Berber/Arabic vocabulary. Owner judgment is needed so Moroccan identity is not flattened across Arab and Amazigh traditions. |
| Hold | `1x4iNndIGdwuqZuIkMc9-iDkHsc7lA-Y8dG9nptzZKs8` | Yemeni Shakshuka | Yemen appears in the title, but the source focuses on spices and cooking skills without substantive instruction about Yemen. |
| Hold | `1RcuAcHgStjdTUlodk5Lq8Yg3QH2UHmXAPL5uzKwHekk` | Za'atar with Roasted Potatoes | Promises history/origin instruction and has Egypt/Arabic keywords, but the main lesson only says Middle East and the referenced reading is not independently grounded as a named Arab-culture lesson. |
| No | `1LSEGMUYjXZX5J24AitIpVHWvKpiLC5tmAtEQAfSub1I` | Dolmas for Eid (stuffed grape leaves) | Framed around Eid and the broader Islamic world, including Arab and non-Arab countries; it is religious/cross-cultural rather than specifically Arab heritage. |
| No | `1EyUZUgWrURvJ_tKKdhMakD7xY5C1COcNkvdks72ZI1I` | Ma'amoul Cookies for Eid | Teaches Eid and Muslim celebrations without substantively teaching a named Arab culture. |

## Production snapshot

As of the audit:

- All 14 candidates exist and are active in Production.
- None carries `Arab American Heritage Month`.
- Every candidate's `observances_holidays` column equals its
  `metadata.observancesHolidays` JSON mirror.
- Production Drive IDs and Drive modification timestamps matched the inspected source documents.
- `Hummus and Pita-revised` has historical versions; the other 13 do not.

The following values are evidence only and **must be refreshed immediately before any data change**.

| Lesson ID | Content hash | Updated at (UTC) | Drive modified at (UTC) |
| --- | --- | --- | --- |
| `lesson_3eb295f4dfb94185bd8ae5b39aabe01d` | `f06bc52295fa12cc6f5a8d91a754ac5977402e6c9e685a4970b7d71474427c76` | 2026-08-10 19:54:13 | 2026-08-12 15:46:12 |
| `lesson_426e363f5de14520b790695e25b95cda` | `9448e4fce02bc089e816b511ad0a2dcec30145290eaaf6c920e7637315775843` | 2025-09-01 01:58:29 | 2025-09-02 19:31:36 |
| `1JYc3BYK-ZbYBcYQSUPKrFR3ocLhjnBRiFXFj3EV3CmE` | `0a3463993cb738b1e8413dcf3d24b596f913d4cf5b86805996a0a22ab832c09e` | 2025-07-31 14:58:59 | 2025-01-23 19:24:44 |
| `1Dz-Jv4cV0N0ntxZ8z0VcRgenI0hpZuOIDJuPbEvr7bI` | `f4aceaf94287a111868e528735cb14277fa63c5a8c949be9a2d7d8f6c223e0df` | 2025-07-31 14:58:58 | 2025-09-23 17:30:05 |
| `1gh1_OqCpnhDkGOmte5VIdIkEkU8_HpXs34KdcSuPkrQ` | `f015b7a26353aeaa255ecc599c3d4693dd53305552b842699f2f42b44073b47f` | 2025-07-31 14:59:00 | 2024-04-30 19:38:17 |
| `1K8JBnS7hTldpcB-f0CkDK94yYJyr_7r0itLDL3IOz4U` | `e07dd218791742249c81047ab63f5f179c7fe849991157fd6b0cfc22ed3f9b2d` | 2025-07-31 14:58:59 | 2020-03-26 17:16:45 |
| `1eFmMW_gk1dR2uEpUWTVHylQAB7-OSAIKNfwc07Dbmgg` | `4559a10fe337e338e32767cbc7cf93dfdf01132afdb0c76203b8706a25a83905` | 2026-08-06 18:00:45 | 2026-08-06 18:51:00 |
| `1ulDJYHIEKOqidEYl9gQ2xsBFEVhI2alJ` | `bb644fb7bb6ce18f9f860f6e663fadf52406c864bacdef291b1e98e4b6a94237` | 2025-07-31 14:59:00 | 2020-03-25 17:49:55 |
| `188Ph9s6OEdUgNQScQOxGiqAtvNd2r78X` | `863bbc59271c55094286f57c368f2e2b27c9bde4980176ec30a3114aa2ace544` | 2025-07-31 14:58:58 | 2018-08-21 14:01:03 |

## Retired duplicates to exclude

- `13nUlv33cUEy2yjjzCARmrlCIHO4oDwQxyCNHVyUtKGk` — Chilled Cucumber and Tahini Soup with Spicy Pumpkin Seeds
- `1vDebvrcoPdDcoooLnpF64P3ade4l8ZRqVkfSlEAyYts` — Fattoush
- `1YeRlyncgM-gMS-Aica2Fk7wjBsRN9-K6` — Fattoush

## TEST drift and data-release consequence

TEST is not a row-identical copy of Production:

- Lahsa and the medium-confidence Fattoush are absent from TEST.
- Hummus/Pita in TEST has an older title and content hash.
- The inspected TEST candidates have null Drive provenance fields.

Therefore, a future data step must not use one environment-agnostic migration that asserts Production
IDs, hashes, and counts. Before tagging, either reconcile the approved candidate rows into TEST or use
separately guarded TEST and Production data operations with environment-specific snapshots.

## Required gate before mutation

1. The 17-value database constraint is deployed and verified in Production.
2. The canonical app, Edge, and reviewer support is deployed and verified after the database gate.
3. Dan approves the exact literal-ID allowlist and resolves all holds.
4. Refresh Drive metadata and re-fetch the approved source documents.
5. Capture fresh `lesson_id`, title, `drive_file_id`, `drive_modified_at`, `content_hash`, and
   `updated_at` values for the target environment.
6. Abort on source/row drift, retirement, mirror disagreement, duplicates, or a pre-existing new tag.
7. Update the column and JSON mirror from one computed array, using literal IDs only.
8. Assert that only approved active IDs changed, mirrors agree, no duplicates exist, retired rows and
   version history are untouched, and search vectors refreshed.
9. Preserve the exact pre-change arrays. Rollback removes only this tag from the approved IDs after
   rechecking that no target carried it before the operation.
