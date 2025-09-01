**DB Baseline Snapshot — 2025-09-01**

Purpose: Phase 0 snapshot of key database structures and current query plans before refactors.

---

Tables (row counts)

```
lessons: 783
lesson_submissions: 95
submission_reviews: 102
duplicate_resolutions: 86
lesson_archive: 127
user_profiles: 6
user_invitations: 1
canonical_lessons: 1
user_schools: 0
schools: 6
saved_searches: 0
lesson_collections: 0
submission_similarities: 117
search_synonyms: 60
cultural_heritage_hierarchy: 6
```

---

Indexes (selected tables)

This snapshot includes all indexes across the primary public tables. Highlights:

- lessons: multiple GIN indexes on arrays + JSON paths; duplicate trigram indexes present (title/summary).
- foreign-key related tables: missing FK indexes flagged by advisors; present here are reviewer/teacher/submission indexes.

Raw index list (pg_indexes):

```
[See query output in repository history – captured from pg_indexes on 2025-09-01.]
```

Note: The full index list is lengthy; refer to the “Indexes” SQL output recorded during Phase 0.

---

Query Plans (EXPLAIN ANALYZE)

1) search_lessons(query='pumpkin', page_size=10)

```
Function Scan on public.search_lessons  ...  (actual time≈40.7 ms rows=10)
Buffers: shared hit≈2743
Planning Time: ≈0.09 ms
Execution Time: ≈40.76 ms
```

2) search_lessons(query='garden', grade_levels={3,4}, seasons={Spring}, page_size=10)

```
Function Scan on public.search_lessons  ...  (actual time≈36.6 ms rows=10)
Buffers: shared hit≈6880
Planning Time: ≈0.13 ms
Execution Time: ≈36.64 ms
```

3) search_lessons(query='', cultures={Asian}, page_size=10)

```
Function Scan on public.search_lessons  ...  (actual time≈16.2 ms rows=10)
Buffers: shared hit≈6708
Planning Time: ≈0.12 ms
Execution Time: ≈16.21 ms
```

Observations

- Execution times are acceptable at current scale (<50ms for 783 lessons), but plans show significant shared buffer hits related to JSON-based filters/fields inside the function.
- Duplicate trigram indexes exist on `lessons.title` and `lessons.summary`.
- Many JSON-path indexes on `lessons.metadata` are likely unnecessary once we shift to normalized columns.

Next Steps (per plan)

- Implement `search_lessons_v2` to rely solely on normalized columns and arrays.
- Remove duplicate/unused indexes after switching the query path.
- Add missing FK indexes flagged by advisors.

