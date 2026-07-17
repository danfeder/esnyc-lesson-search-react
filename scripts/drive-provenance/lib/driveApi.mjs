/**
 * Drive API wrappers for the supervised local tooling (Drive provenance,
 * Phase 5). Metadata requests fetch ONLY id/mimeType/createdTime/modifiedTime;
 * Activity requests exist ONLY for the supervised historical backfill path and
 * are never part of deployed runtime behavior.
 */

const METADATA_FIELDS = 'id,mimeType,createdTime,modifiedTime';

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503]);
const MAX_ATTEMPTS = 5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Quota 429s and 5xx blips are transient, not answers: retry with exponential
// backoff (honoring Retry-After) before letting a failure surface. 404 and
// every other status return immediately — the callers treat those as real
// evidence and must keep seeing them unchanged.
async function fetchWithRetry(makeRequest, sleepImpl) {
  for (let attempt = 1; ; attempt++) {
    const response = await makeRequest();
    if (response.ok || !RETRYABLE_STATUSES.has(response.status) || attempt >= MAX_ATTEMPTS) {
      return response;
    }
    const retryAfterSec = Number(response.headers?.get?.('retry-after'));
    const backoffMs =
      Number.isFinite(retryAfterSec) && retryAfterSec > 0
        ? retryAfterSec * 1000
        : Math.min(16000, 1000 * 2 ** (attempt - 1));
    await sleepImpl(backoffMs);
  }
}

/**
 * @returns {{ok: true, metadata: {id, mimeType, createdTime, modifiedTime}}
 *         | {ok: false, status: number, notFound: boolean}}
 */
export async function fetchDriveFileMetadata(accessToken, fileId, fetchImpl = fetch, sleepImpl = sleep) {
  const url =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}` +
    `?fields=${encodeURIComponent(METADATA_FIELDS)}&supportsAllDrives=true`;
  const response = await fetchWithRetry(
    () => fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}` } }),
    sleepImpl
  );
  if (!response.ok) {
    return { ok: false, status: response.status, notFound: response.status === 404 };
  }
  const body = await response.json();
  if (!body.id || !body.mimeType || !body.createdTime || !body.modifiedTime) {
    return { ok: false, status: 200, notFound: false };
  }
  return {
    ok: true,
    metadata: {
      id: body.id,
      mimeType: body.mimeType,
      createdTime: body.createdTime,
      modifiedTime: body.modifiedTime,
    },
  };
}

/**
 * Query Drive Activity for CREATE + EDIT actions on one file (supervised
 * backfill only). Pages through the full activity list.
 *
 * Returns raw-ish structured evidence for the pure decision layer:
 *   createActions: [{ personName, isCurrentUser, actorIsPerson, subtype, timestamp }]
 *   edits:         [{ personName, isCurrentUser, actorIsPerson, timestamp }]
 */
export async function fetchDriveActivity(accessToken, fileId, fetchImpl = fetch, sleepImpl = sleep) {
  const createActions = [];
  const edits = [];
  let pageToken;
  do {
    const response = await fetchWithRetry(
      () =>
        fetchImpl('https://driveactivity.googleapis.com/v2/activity:query', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            itemName: `items/${fileId}`,
            filter: 'detail.action_detail_case:(CREATE EDIT)',
            pageSize: 100,
            ...(pageToken ? { pageToken } : {}),
          }),
        }),
      sleepImpl
    );
    if (!response.ok) {
      return { ok: false, status: response.status, notFound: response.status === 404 };
    }
    const body = await response.json();
    for (const activity of body.activities ?? []) {
      const activityTime = activity.timestamp ?? activity.timeRange?.endTime ?? null;
      for (const action of activity.actions ?? []) {
        const detail = action.detail ?? {};
        // Google's Action resource carries a SINGULAR per-action `actor` and
        // its own timestamp/timeRange; the activity-level `actors` list is a
        // consolidated summary. Pair each action with ITS actor — falling back
        // to the activity actor only when it is unambiguous (exactly one);
        // multiple consolidated actors with no per-action actor = unresolved,
        // which the decision layer treats as an omit (fail closed).
        const timestamp =
          action.timestamp ?? action.timeRange?.endTime ?? activityTime;
        let actor = action.actor ?? null;
        if (!actor) {
          const consolidated = activity.actors ?? [];
          actor = consolidated.length === 1 ? consolidated[0] : null;
        }
        const knownUser = actor?.user?.knownUser;
        const actorIsPerson = Boolean(knownUser);
        const personName = knownUser?.personName ?? null;
        const isCurrentUser = Boolean(knownUser?.isCurrentUser);
        if (detail.create) {
          const subtype = detail.create.new
            ? 'new'
            : detail.create.copy
              ? 'copy'
              : detail.create.upload
                ? 'upload'
                : 'unknown';
          createActions.push({ personName, isCurrentUser, actorIsPerson, subtype, timestamp });
        } else if (detail.edit) {
          edits.push({ personName, isCurrentUser, actorIsPerson, timestamp });
        }
      }
    }
    pageToken = body.nextPageToken;
  } while (pageToken);
  return { ok: true, createActions, edits };
}
