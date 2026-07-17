// Internal Drive-provenance date refresh (Drive provenance, Phase 6).
//
// Batched (≤50 rows/request) refresh of the five drive file/date/MIME/sync
// columns on ACTIVE lessons, using the ordinary delegated reader (Docs+Drive
// readonly — NO Activity, ever) and Drive v3 file metadata ONLY. This function
// NEVER writes a creator column — creator provenance comes exclusively from
// the reviewer flow and the one-time supervised local backfill.
//
// AUTH: a dedicated sync secret (DRIVE_SYNC_TOKEN edge secret), constant-time
// compared. NOT anon/public and NOT the service-role key — the service-role
// client is confined to this function's own DB access. Deployed with
// --no-verify-jwt like every function in this project, so this in-code gate is
// the only gate (supabase/functions/CLAUDE.md).
//
// FAILURE DISCIPLINE: a 404 preserves last-known metadata and reports the file
// as unreadable; any transient Drive/API failure also preserves and reports.
// The caller (scheduled GitHub workflow) loops on nextCursor and fails visibly
// when a batch reports transient failures.
//
// OPERATIONAL GATE (not enabled by this change): deploying this function and
// installing DRIVE_SYNC_TOKEN + the workflow secrets are explicit post-review
// rollout steps — see docs/plans/2026-07-17-drive-provenance-rollout.md.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getRestrictedCorsHeaders } from '../_shared/cors.ts';
import { getGoogleAccessToken } from '../_shared/google-auth-with-delegation.ts';
import { fetchDriveFileMetadata } from '../_shared/google-drive-metadata.ts';
import {
  clampBatchSize,
  computeNextCursor,
  classifyFetchResult,
  buildDriveRowUpdate,
  isAuthorizedSyncRequest,
  planBatch,
  type ActiveLessonRow,
} from './syncLogic.ts';

interface SyncRequest {
  cursor?: string | null;
  batchSize?: number;
}

serve(async (req) => {
  // Repo-mandatory origin-restricted CORS on EVERY response, incl. OPTIONS
  // (supabase/functions/CLAUDE.md). Callers are server-to-server (the
  // scheduled workflow), but the pattern is uniform across functions.
  const origin = req.headers.get('origin');
  const corsHeaders = getRestrictedCorsHeaders(origin);
  const json = (body: unknown, status: number): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  const syncToken = Deno.env.get('DRIVE_SYNC_TOKEN');
  if (!isAuthorizedSyncRequest(req.headers.get('Authorization'), syncToken)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleServiceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!supabaseUrl || !supabaseServiceKey || !googleServiceAccount) {
      return json({ success: false, error: 'Server configuration error' }, 500);
    }

    const body = ((await req.json().catch(() => ({}))) ?? {}) as SyncRequest;
    const batchSize = clampBatchSize(body.batchSize);
    const cursor = typeof body.cursor === 'string' && body.cursor !== '' ? body.cursor : null;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabaseAdmin
      .from('lessons')
      .select('lesson_id, drive_file_id, file_link')
      .is('retired_at', null)
      .order('lesson_id', { ascending: true })
      .limit(batchSize);
    if (cursor) query = query.gt('lesson_id', cursor);

    const { data: rows, error: selectError } = await query;
    if (selectError) throw selectError;

    const batch = (rows ?? []) as ActiveLessonRow[];
    if (batch.length === 0) {
      return json(
        {
          success: true,
          processedRows: 0,
          updatedRows: 0,
          unreadableFiles: 0,
          transientFailures: 0,
          unresolvableRows: 0,
          nextCursor: null,
          done: true,
        },
        200
      );
    }

    const plan = planBatch(batch);

    const credentials = JSON.parse(googleServiceAccount);
    const impersonateEmail =
      Deno.env.get('GOOGLE_IMPERSONATE_EMAIL') || 'docs-reader@esynyc.org';
    const accessToken = await getGoogleAccessToken(credentials, impersonateEmail);

    let updatedRows = 0;
    let unreadableFiles = 0;
    let transientFailures = 0;

    for (const entry of plan.entries) {
      let outcome: 'update' | 'unreadable' | 'transient';
      let update: ReturnType<typeof buildDriveRowUpdate> | null = null;
      try {
        const result = await fetchDriveFileMetadata(accessToken, entry.fileId);
        outcome = classifyFetchResult(result);
        if (result.ok) update = buildDriveRowUpdate(result.metadata, new Date().toISOString());
      } catch (_fetchError) {
        outcome = 'transient';
      }

      if (outcome === 'update' && update) {
        const { error: updateError, count } = await supabaseAdmin
          .from('lessons')
          .update(update, { count: 'exact' })
          .in('lesson_id', entry.lessonIds)
          .is('retired_at', null);
        if (updateError) {
          // A DB write failure must be visible, not silently absorbed as
          // success — count it as transient so the workflow fails the run.
          console.error(`[sync-drive-metadata] update failed for a file's rows:`, updateError);
          transientFailures += 1;
        } else {
          updatedRows += count ?? entry.lessonIds.length;
        }
      } else if (outcome === 'unreadable') {
        unreadableFiles += 1;
      } else if (outcome === 'transient') {
        transientFailures += 1;
      }
    }

    const nextCursor = computeNextCursor(batch, batchSize);
    return json(
      {
        success: true,
        processedRows: batch.length,
        updatedRows,
        unreadableFiles,
        transientFailures,
        unresolvableRows: plan.unresolvableLessonIds.length,
        nextCursor,
        done: nextCursor === null,
      },
      200
    );
  } catch (error) {
    console.error('[sync-drive-metadata] failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ success: false, error: message }, 500);
  }
});
