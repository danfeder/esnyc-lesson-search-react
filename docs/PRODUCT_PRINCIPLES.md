# Product Principles

Signed principles the product is built against. Feature ideas get tested against these
before they get designed. Changing one is an owner decision, made deliberately.

## 1. We are an index, not a host

*Adopted by the owner 2026-07-03 (FP2 walkthrough, Session 1 step 14).*

The library **finds** lessons; Google Docs **holds** them. Lesson content is never
rendered, stored, or previewed in-app — the only content action is "Open Lesson Plan,"
which leaves for the lesson's Google Doc. Everything the app keeps is *about* lessons
(titles, summaries, tags, links), never the lesson itself. This is cheap insurance
against scope creep: in-app previews, PDF copies, favorites-with-excerpts, and offline
caches all quietly violate it, and each would balloon complexity, storage, and sync cost
for a ~15-person tool. If a future feature needs lesson content inside the app, that's
not a small feature — it's a reversal of this principle, and it gets decided as one.
