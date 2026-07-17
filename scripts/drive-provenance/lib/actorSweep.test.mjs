import { describe, it, expect } from 'vitest';
import {
  collectUnresolvedCreators,
  applySweepObservation,
  filesStillUnresolved,
} from './actorSweep.mjs';

// Synthetic ids only.
const P1 = 'people/111';
const P2 = 'people/222';
const A1 = 'account-one@synthetic.test';
const A2 = 'account-two@synthetic.test';

describe('collectUnresolvedCreators', () => {
  it('groups unresolved person actors by file, skipping resolved and null actors', () => {
    const perFile = new Map([
      ['F1', [{ personName: P1 }, { personName: null }]],
      ['F2', [{ personName: P1 }, { personName: P2 }]],
    ]);
    const unresolved = collectUnresolvedCreators(perFile, new Map([[P2, A2]]));
    expect([...unresolved.keys()]).toEqual([P1]);
    expect([...unresolved.get(P1)]).toEqual(['F1', 'F2']);
  });

  it('returns empty when everything is resolved', () => {
    const perFile = new Map([['F1', [{ personName: P1 }]]]);
    expect(collectUnresolvedCreators(perFile, new Map([[P1, A1]])).size).toBe(0);
  });
});

describe('applySweepObservation', () => {
  it('resolves isCurrentUser actors to the querying subject (CREATEs and EDITs alike)', () => {
    const map = new Map();
    const resolved = applySweepObservation(map, A1, [
      { personName: P1, isCurrentUser: true },
      { personName: P2, isCurrentUser: false },
      { personName: null, isCurrentUser: true },
    ]);
    expect(resolved).toEqual([P1]);
    expect(map.get(P1)).toBe(A1);
    expect(map.has(P2)).toBe(false);
  });

  it('is idempotent for a re-observation by the same subject', () => {
    const map = new Map([[P1, A1]]);
    expect(applySweepObservation(map, A1, [{ personName: P1, isCurrentUser: true }])).toEqual([]);
    expect(map.get(P1)).toBe(A1);
  });

  it('hard-errors on a cross-subject conflict (one person, two accounts)', () => {
    const map = new Map([[P1, A1]]);
    expect(() =>
      applySweepObservation(map, A2, [{ personName: P1, isCurrentUser: true }])
    ).toThrow(/sweep conflict/);
  });
});

describe('filesStillUnresolved', () => {
  it('unions the file sets of every unresolved actor', () => {
    const unresolved = new Map([
      [P1, new Set(['F1', 'F2'])],
      [P2, new Set(['F2', 'F3'])],
    ]);
    expect(filesStillUnresolved(unresolved).sort()).toEqual(['F1', 'F2', 'F3']);
    expect(filesStillUnresolved(new Map())).toEqual([]);
  });
});
