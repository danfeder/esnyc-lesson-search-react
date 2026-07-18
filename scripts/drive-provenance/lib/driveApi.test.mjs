import { describe, it, expect, vi } from 'vitest';
import { fetchDriveActivity, fetchDriveFileMetadata } from './driveApi.mjs';

// Synthetic people-ids only.
const P1 = 'people/111';
const P2 = 'people/222';

const knownUser = (personName, isCurrentUser = false) => ({
  user: { knownUser: { personName, isCurrentUser } },
});

function mockFetch(bodies) {
  let call = 0;
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => bodies[call++],
  }));
}

describe('fetchDriveActivity — per-action actor/timestamp semantics', () => {
  it('pairs each action with ITS OWN actor and timestamp (never fans consolidated actors)', async () => {
    // One activity, consolidated actors [P1, P2], but per-action actors are
    // singular: CREATE by P1 at t1, EDIT by P2 at t2. The old fan-out bug
    // turned this into 2 CREATEs + 2 EDITs with the activity timestamp.
    const body = {
      activities: [
        {
          timestamp: '2024-01-01T00:00:00Z',
          actors: [knownUser(P1), knownUser(P2)],
          actions: [
            {
              actor: knownUser(P1),
              timestamp: '2020-05-05T00:00:00Z',
              detail: { create: { new: {} } },
            },
            {
              actor: knownUser(P2),
              timestamp: '2021-06-06T00:00:00Z',
              detail: { edit: {} },
            },
          ],
        },
      ],
    };
    const result = await fetchDriveActivity('token', 'FILE-A', mockFetch([body]));
    expect(result.ok).toBe(true);
    expect(result.createActions).toEqual([
      {
        personName: P1,
        isCurrentUser: false,
        actorIsPerson: true,
        subtype: 'new',
        timestamp: '2020-05-05T00:00:00Z',
      },
    ]);
    expect(result.edits).toEqual([
      {
        personName: P2,
        isCurrentUser: false,
        actorIsPerson: true,
        timestamp: '2021-06-06T00:00:00Z',
      },
    ]);
  });

  it('falls back to the SINGLE consolidated actor when the action carries none', async () => {
    const body = {
      activities: [
        {
          timeRange: { endTime: '2022-02-02T00:00:00Z' },
          actors: [knownUser(P1, true)],
          actions: [{ detail: { create: { copy: {} } } }],
        },
      ],
    };
    const result = await fetchDriveActivity('token', 'FILE-B', mockFetch([body]));
    expect(result.createActions).toEqual([
      {
        personName: P1,
        isCurrentUser: true,
        actorIsPerson: true,
        subtype: 'copy',
        timestamp: '2022-02-02T00:00:00Z',
      },
    ]);
  });

  it('treats a missing per-action actor with MULTIPLE consolidated actors as unresolved (fail closed)', async () => {
    const body = {
      activities: [
        {
          timestamp: '2022-02-02T00:00:00Z',
          actors: [knownUser(P1), knownUser(P2)],
          actions: [{ detail: { create: { new: {} } } }],
        },
      ],
    };
    const result = await fetchDriveActivity('token', 'FILE-C', mockFetch([body]));
    expect(result.createActions).toEqual([
      {
        personName: null,
        isCurrentUser: false,
        actorIsPerson: false,
        subtype: 'new',
        timestamp: '2022-02-02T00:00:00Z',
      },
    ]);
  });

  it('prefers action.timeRange.endTime over the activity time when action.timestamp is absent', async () => {
    const body = {
      activities: [
        {
          timestamp: '2024-01-01T00:00:00Z',
          actors: [knownUser(P1)],
          actions: [
            {
              actor: knownUser(P1),
              timeRange: { endTime: '2023-03-03T00:00:00Z' },
              detail: { edit: {} },
            },
          ],
        },
      ],
    };
    const result = await fetchDriveActivity('token', 'FILE-D', mockFetch([body]));
    expect(result.edits[0].timestamp).toBe('2023-03-03T00:00:00Z');
  });

  it('follows nextPageToken across pages', async () => {
    const page1 = {
      nextPageToken: 'p2',
      activities: [
        {
          actors: [knownUser(P1)],
          timestamp: '2020-01-01T00:00:00Z',
          actions: [{ actor: knownUser(P1), detail: { create: { new: {} } } }],
        },
      ],
    };
    const page2 = {
      activities: [
        {
          actors: [knownUser(P1)],
          timestamp: '2020-02-02T00:00:00Z',
          actions: [{ actor: knownUser(P1), detail: { edit: {} } }],
        },
      ],
    };
    const result = await fetchDriveActivity('token', 'FILE-E', mockFetch([page1, page2]));
    expect(result.createActions).toHaveLength(1);
    expect(result.edits).toHaveLength(1);
  });
});

describe('fetchDriveFileMetadata (script mirror)', () => {
  it('flags persistent non-404 failures as transient without throwing (after retries)', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    const noSleep = vi.fn(async () => {});
    const result = await fetchDriveFileMetadata('token', 'FILE-F', fetchImpl, noSleep);
    expect(result).toEqual({ ok: false, status: 503, notFound: false });
    expect(fetchImpl).toHaveBeenCalledTimes(8); // MAX_ATTEMPTS
  });
});

describe('retry-with-backoff on transient statuses', () => {
  it('retries 429s and succeeds once the API recovers', async () => {
    let call = 0;
    const responses = [
      { ok: false, status: 429, headers: { get: () => null }, json: async () => ({}) },
      { ok: false, status: 429, headers: { get: () => null }, json: async () => ({}) },
      { ok: true, status: 200, json: async () => ({ activities: [] }) },
    ];
    const fetchImpl = vi.fn(async () => responses[call++]);
    const noSleep = vi.fn(async () => {});
    const result = await fetchDriveActivity('token', 'FILE-G', fetchImpl, noSleep);
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(noSleep).toHaveBeenCalledTimes(2);
  });

  it('honors Retry-After seconds when present', async () => {
    let call = 0;
    const responses = [
      { ok: false, status: 429, headers: { get: () => '3' }, json: async () => ({}) },
      { ok: true, status: 200, json: async () => ({ activities: [] }) },
    ];
    const fetchImpl = vi.fn(async () => responses[call++]);
    const noSleep = vi.fn(async () => {});
    await fetchDriveActivity('token', 'FILE-H', fetchImpl, noSleep);
    expect(noSleep).toHaveBeenCalledWith(3000);
  });

  it('does NOT retry a 404 — it is a real answer', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    const noSleep = vi.fn(async () => {});
    const result = await fetchDriveActivity('token', 'FILE-I', fetchImpl, noSleep);
    expect(result).toEqual({ ok: false, status: 404, notFound: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(noSleep).not.toHaveBeenCalled();
  });
});
