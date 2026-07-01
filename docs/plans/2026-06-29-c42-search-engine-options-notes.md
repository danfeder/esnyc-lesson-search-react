# C42 Scope-Spike — Search-Engine "Build vs. Adopt" Options (input notes)

**Status:** Input material for **PR C** (the C42 semantic-tier scope-spike, `docs/plans/2026-06-29-c42-semantic-tier-spike.md`). NOT the spike doc itself. Captured 2026-06-29 from a user-prompted OSS-engine evaluation during the Wave 6 PR D session. Fold the relevant parts into PR C as an "engine options" section; the spike owner decides final recommendation + prerequisite ordering.

## Why this lives in the C42 spike, not now

At current scale (~745 lessons, reviewer-only writes) the immediate multi-term **flood** is a *relevance/ranking* problem that **C41 (AND-of-ORs) already fixes** — performance/scale is a non-issue, any engine is instant. So adopting an external engine *now* is a mid-flight detour from a fix that's about to land. The genuine "build vs. adopt" decision is the **C42** question: the heavy semantic / "everyday-vocabulary" tier (queries that don't match FTS tokens return nothing today), which needs vector/hybrid search and has real prerequisites (C07 embedding-space mismatch, C01 regen). Evaluate engines there, against plain pgvector.

Context worth noting in the spike: this project **already removed Algolia** in favor of Postgres FTS (stale `VITE_ALGOLIA_*` / `ALGOLIA_ADMIN_API_KEY` env vars still flagged for deletion). Meilisearch/Typesense are essentially the OSS, self-hostable answer to Algolia — so adopting one is, in part, *reconsidering that earlier decision*. Frame honestly: if Algolia was dropped for cost/vendor-lock, self-hosted Meili/Typesense is "Algolia-quality UX without the bill"; if it was dropped to avoid a second service to sync, they reintroduce exactly that.

## Candidate engines

| Engine | License | Shape | Notes |
|---|---|---|---|
| **ParadeDB** (`pg_search`/BM25) | Apache-2 | Postgres-native, **separate instance via logical replication** | Supabase *partner integration* (https://supabase.com/partners/integrations/paradedb). **Verified:** does NOT install `pg_search` inside managed Supabase — runs as a logical replica; you create a publication + replication slot on Supabase, ParadeDB subscribes, and `pg_search`/BM25 indexes are activated *in ParadeDB*. Zero-ETL sync; isolates search load from the transactional path. Brings BM25 *and* vector/hybrid. Lowest-friction sync; stays in SQL/RLS world; but a 2nd managed instance + replica lag. |
| **Meilisearch** | MIT | Standalone document search server (API) | Best DX; typo tolerance + instant-search + synonyms/ranking-rules out of the box; faceting maps cleanly to the filter facets; now has hybrid/vector via embedders. Self-host or Meili Cloud. **You own the sync glue** (Edge Function on DB webhooks, or periodic full reindex — trivially cheap at this corpus size). Data lives in two stores; engine doesn't know RLS (fine — lesson search is public-read). |
| **Typesense** | GPL-3 | Standalone document search server (API) | Near-equivalent to Meilisearch: typo tolerance, faceting, vector search, curation. GPL-3 (server-side use is fine; some orgs still flag the license). |
| **OpenSearch / Elasticsearch** | Apache-2 / ELv2 | Heavy search cluster | Powerful (BM25, vectors, learned ranking) but operationally heavy; overkill at this scale. |
| **Qdrant / Weaviate** | OSS | Vector DBs | For the *semantic* tier specifically, not keyword-search replacements. Compare against pgvector (already installed in the DB). |

If picking among the two "search-UX-as-a-product" engines, lean **Meilisearch** (best DX, MIT, slightly less ops) over Typesense.

## The two architectures, contrasted (the real decision axis)

- **ParadeDB** = lower-friction **sync** story (logical replication, zero-ETL, stays Postgres-native so RLS/SQL carry over) + BM25 + vector. Cost: a second Postgres-compatible instance, replica lag.
- **Meilisearch / Typesense** = better **search-UX-as-a-product** (typo tolerance + instant search are their whole reason to exist) + faceting that maps to existing filters + would let you retire much of the hand-rolled `parseSearchQuery` + synonym tables. Cost: you write the sync, data in two stores, non-Postgres store outside the RLS model.
- **Plain pgvector** (already installed) = no new service; hybrid FTS+cosine fusion built into `search_lessons`. The "don't adopt anything" baseline the spike should cost against — this is the natural extension of the current architecture.

All of ParadeDB / Meili / Typesense now do hybrid keyword+vector, so any of them *could* also serve the C42 semantic tier — meaning the C42 build could either be "pgvector + fusion ranker in Postgres" or "adopt an engine that does both." That's the core build-vs-adopt fork for the spike.

## Recommendation for the spike to land

1. Keep finishing C41/PR D — no engine pivot now.
2. In PR C, list pgvector, ParadeDB, Meilisearch, Typesense as named options with the architecture/sync/RLS tradeoffs above.
3. Weigh against the honest prerequisites already in the design (§6): C07 embedding-space mismatch must be verified on the live DB, C01 regen, query-time embedding, fusion ranking, ivfflat→HNSW. An external engine that bundles vector search may *change* which prerequisites apply (e.g. it owns the index), which is itself a point in its favor or against, depending.
