# ESYNYC Lesson Search — Edge Function Reference

Last verified against `supabase/functions/` on 2026-10-23. Nine functions are deployed from this repo (TEST and PROD). Those nine are deployed with `--no-verify-jwt`, so each one authenticates in code (see `supabase/functions/CLAUDE.md`). Base URL: `${SUPABASE_URL}/functions/v1/<name>`. Every function answers `OPTIONS` (CORS preflight) and returns JSON.

Auth modes:
- **user JWT** — `Authorization: Bearer <user access token>`; the function then checks `user_profiles.role`.
- **service role** — `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` (server-to-server only; constant-time compared).
- **anon key** — `Authorization: Bearer <VITE_SUPABASE_ANON_KEY>`.

## smart-search — `POST` — anon key
Zero-result search suggestions for the public search page (`src/hooks/useLessonSuggestions.ts`). Expands the query through `search_synonyms` (plus prefix variants), then counts matching non-retired rows of `lessons_with_metadata`. Rows are never returned; public search uses the `search_lessons` RPC.
- Request: `{ query?: string; filters?: { gradeLevels?, thematicCategories?, seasons?, coreCompetencies?, culturalHeritage?, location?, activityType?, tags?: string[]; includeAllSeasons?: boolean } }` — other fields are ignored.
- Response: `{ totalCount: number; suggestions: string[]; expandedQuery: string | null }`. `suggestions` (max 5) is non-empty only when a query was given and `totalCount` is 0. `expandedQuery` is the tsquery used, e.g. `corn:* | maize:*`.
- Errors: `500 { error: 'Search failed', message }`.

## process-submission — `POST` — user JWT (teacher)
- Request: `{ googleDocUrl?: string; submissionType?: 'new' | 'update'; originalLessonId?: string; submissionId?: string; resubmit?: boolean }` (`resubmit: true` + `submissionId` re-snapshots an existing `needs_revision` row).
- Response: `{ success: true, data: { submissionId, status, extractedTitle, duplicatesFound, topDuplicates[] } }`; failures `400 { success: false, error }`.

## extract-google-doc — `POST` — service role or any user JWT
- Request: `{ googleDocUrl: string }`
- Response: `{ success: true, data: { docId, title, content, metadata: { wordCount, extractionMethod, hasImages }, metadataSketch, driveMetadata, extractedAt } }`; failures `{ success: false, error, fallbackReason? }`.

## detect-duplicates — `POST` — service role or user JWT (reviewer / admin / super_admin)
- Request: `{ submissionId: string; content: string; title: string; metadata?: object }`
- Response: `{ success: true, data: { submissionId, contentHash, duplicatesFound, duplicates: Array<{ lessonId, title, similarityScore, matchType: 'exact' | 'high' | 'medium' | 'low', … }> } }` (top 10); failures `400 { success: false, error }`. Writes `submission_similarities`.

## complete-review — `POST` — user JWT (reviewer / admin / super_admin)
- Request: `{ submissionId: string; decision: 'approve_new' | 'approve_update' | 'needs_revision' | 'reject'; metadata?: object; notes?: string; selectedLessonId?: string | null }` (`selectedLessonId` required for `approve_update`).
- Response: `{ success: true, lessonId: string | null, decision }`; errors `{ error, code?, detail? }` with 400 / 401 / 403 / 405 / 500. Calls the `complete_review_atomic` RPC. Decision e-mails were retired for launch (T3, 2026-07-01).

## send-email — `POST` — service role, or admin/super_admin user JWT for `invitation` only
- Request: `{ type: 'invitation' | 'account-deactivated' | 'account-reactivated'; to: string; data: { … } }`
  - `invitation` — `data: { invitationId, token, inviterName, role, customMessage?, permissions?: string[], expiresAt }` (sent by the admin pages `AdminInviteUser` / `AdminInvitations`).
  - `account-deactivated` / `account-reactivated` — service role only; `data: { recipientName, role?, deactivatedBy | reactivatedBy, reason? }` (sent by `user-management`).
- Response: `{ success: true, emailId }` via Resend, or `{ success: true, message: 'Email logged (development mode)', email }` when `RESEND_API_KEY` is unset. Errors: `400` unknown type, `401` / `403` auth, `500` Resend failure.

## user-management — `POST /users/bulk` — user JWT (admin / super_admin)
The only route. Everything else (schools, single-user read/update/deactivate) is done by the admin pages directly against the database under RLS.
- Request: `{ action: 'activate' | 'deactivate' | 'delete'; userIds: string[] }` (`delete` = soft delete: `is_active=false`, notes get ` [DELETED]`).
- Response: `{ success: true, affected: number, failed: string[] }`; errors 400 / 401 / 403 / 404 / 500.
- Invoke from the app as `supabase.functions.invoke('user-management/users/bulk', …)` — the sub-path must be in the invoke target.

## invitation-management — `POST /invitations/accept` — anon key (token-gated)
The only route. Creating, listing, resending and cancelling invitations is done by the admin pages directly against `user_invitations` under RLS, with `send-email` for delivery.
- Request: `{ token: string; password: string; fullName: string; gradesTaught?: string[]; subjectsTaught?: string[] }`
- Response: `{ success: true, userId }`; errors `400` (missing fields / expired / already accepted / email already registered), `404` invalid token, `500`.

## sync-drive-metadata — `POST` — `Authorization: Bearer <DRIVE_SYNC_TOKEN>` (scheduled workflow)
- Request: `{ cursor?: string | null; batchSize?: number }`
- Response: `{ success: true, processedRows, updatedRows, unreadableFiles, transientFailures, unresolvableRows, nextCursor, done }`; `401` on a bad token, `405` on non-POST.

## Environment variables (Supabase dashboard → Edge Function secrets)
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS`, `PUBLIC_SITE_URL`, `RESEND_API_KEY` (send-email), `GOOGLE_SERVICE_ACCOUNT_JSON` + `GOOGLE_IMPERSONATE_EMAIL` (extract-google-doc, sync-drive-metadata), `DRIVE_SYNC_TOKEN` (sync-drive-metadata), `ANTHROPIC_API_KEY` + `ENABLE_AI_AUTO_TAG` (process-submission). (Exact set from `grep -rhoE "Deno\.env\.get\('[A-Z_]+'\)" supabase/functions --include='*.ts' | sort -u`; there is no `OPENAI_API_KEY` reader any more.)

## Testing
- Daily PROD smoke: `npm run test:edge-functions` (`scripts/test-edge-functions.mjs`; full smoke of smart-search, OPTIONS health check of six others; scheduled by `.github/workflows/edge-function-smoke.yml`).
- Deploys: `.github/workflows/deploy-edge-functions.yml` (PR → TEST, merge → PROD after manual approval).
- Local: `supabase functions serve <name> --no-verify-jwt`, then `curl -X POST http://localhost:54321/functions/v1/<name> -H 'Content-Type: application/json' -d '{…}'`.
