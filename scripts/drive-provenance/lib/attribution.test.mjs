import { describe, it, expect } from 'vitest';
import {
  decideAttribution,
  parseActivityTimestamp,
  lastCreateMillis,
  isLaterThan,
} from './attribution.mjs';
import { NATIVE_GOOGLE_DOC_MIME } from './driveUrl.mjs';

// Synthetic identities ONLY — no real names, emails, or file ids.
const ACTOR = 'actor-one@synthetic.test';
const OTHER = 'actor-two@synthetic.test';

const worksheetApprove = new Map([[ACTOR, { decision: 'approve', publicName: 'Test Person' }]]);
const worksheetOmit = new Map([[ACTOR, { decision: 'omit', publicName: null }]]);
const worksheetUnsafe = new Map([
  [ACTOR, { decision: 'approve', publicName: 'person@synthetic.test' }],
]);

const create = (overrides = {}) => ({
  actorEmail: ACTOR,
  actorIsPerson: true,
  subtype: 'new',
  ...overrides,
});

const base = {
  mimeType: NATIVE_GOOGLE_DOC_MIME,
  createActions: [create()],
  laterEditActorEmails: [],
  worksheet: worksheetApprove,
};

describe('decideAttribution — accepts', () => {
  it('rule 1: one CREATE(new) by one known actor with an approved name → created', () => {
    expect(decideAttribution(base)).toEqual({
      accept: true,
      attribution: 'created',
      name: 'Test Person',
      actorEmail: ACTOR,
    });
  });

  it('rule 3: CREATE(copy) + later EDIT by the same actor → adapted', () => {
    const result = decideAttribution({
      ...base,
      createActions: [create({ subtype: 'copy' })],
      laterEditActorEmails: [ACTOR],
    });
    expect(result).toMatchObject({ accept: true, attribution: 'adapted', name: 'Test Person' });
  });

  it('rule 2: multiple CREATEs — same actor, same subtype → accepted', () => {
    const result = decideAttribution({
      ...base,
      createActions: [create({ subtype: 'copy' }), create({ subtype: 'copy' })],
      laterEditActorEmails: [ACTOR],
    });
    expect(result).toMatchObject({ accept: true, attribution: 'adapted' });
  });
});

describe('decideAttribution — omits (fail closed)', () => {
  const cases = [
    ['non-native MIME', { ...base, mimeType: 'application/pdf' }, 'non_native'],
    ['missing MIME', { ...base, mimeType: null }, 'non_native'],
    ['no CREATE actions', { ...base, createActions: [] }, 'create_missing'],
    [
      'non-person actor',
      { ...base, createActions: [create({ actorIsPerson: false })] },
      'actor_nonperson',
    ],
    [
      'unresolved actor',
      { ...base, createActions: [create({ actorEmail: null })] },
      'actor_unresolved',
    ],
    [
      'cross-actor multiple CREATE',
      { ...base, createActions: [create(), create({ actorEmail: OTHER })] },
      'cross_actor_ambiguous',
    ],
    [
      'subtype mismatch across CREATEs',
      { ...base, createActions: [create({ subtype: 'new' }), create({ subtype: 'copy' })] },
      'subtype_mismatch',
    ],
    [
      'upload subtype (never a creator claim)',
      { ...base, createActions: [create({ subtype: 'upload' })] },
      'unsupported_subtype',
    ],
    [
      'unknown subtype',
      { ...base, createActions: [create({ subtype: 'unknown' })] },
      'unsupported_subtype',
    ],
    [
      'actor not on any worksheet',
      { ...base, createActions: [create({ actorEmail: OTHER })] },
      'unmapped',
    ],
    ['worksheet says omit', { ...base, worksheet: worksheetOmit }, 'worksheet_omit'],
    ['approved name is unsafe (email)', { ...base, worksheet: worksheetUnsafe }, 'unsafe_name'],
    [
      'copy WITHOUT a later edit by the same actor',
      { ...base, createActions: [create({ subtype: 'copy' })], laterEditActorEmails: [] },
      'copy_without_edit',
    ],
    [
      'copy with a later edit by a DIFFERENT actor only',
      {
        ...base,
        createActions: [create({ subtype: 'copy' })],
        laterEditActorEmails: [OTHER],
      },
      'copy_without_edit',
    ],
  ];

  it.each(cases)('%s → omit(%s)', (_label, evidence, reason) => {
    expect(decideAttribution(evidence)).toEqual({ accept: false, reason });
  });
});

describe('activity-timestamp helpers — parsed epoch, never lexicographic', () => {
  it('parses RFC 3339 with 0/3/6/9 fractional digits to the same instant family', () => {
    expect(parseActivityTimestamp('2024-01-01T00:00:00Z')).toBe(
      Date.parse('2024-01-01T00:00:00.000Z')
    );
    expect(parseActivityTimestamp('2024-01-01T00:00:00.900Z')).toBe(
      Date.parse('2024-01-01T00:00:00.900Z')
    );
    expect(parseActivityTimestamp(null)).toBeNull();
    expect(parseActivityTimestamp('')).toBeNull();
    expect(parseActivityTimestamp('not-a-time')).toBeNull();
  });

  it("REGRESSION: '…00.900Z' is LATER than '…00Z' despite sorting lexicographically earlier", () => {
    // Lexicographic order lies here: '.'(0x2E) < 'Z'(0x5A) puts .900Z first.
    expect('2024-01-01T00:00:00.900Z' < '2024-01-01T00:00:00Z').toBe(true);
    // Parsed comparison gets it right.
    const lastCreate = lastCreateMillis(['2024-01-01T00:00:00.900Z']);
    expect(isLaterThan('2024-01-01T00:00:00Z', lastCreate)).toBe(false); // 900ms EARLIER
    const lastCreate2 = lastCreateMillis(['2024-01-01T00:00:00Z']);
    expect(isLaterThan('2024-01-01T00:00:00.900Z', lastCreate2)).toBe(true); // 900ms later
  });

  it('lastCreateMillis picks the chronologically-last create across mixed precision', () => {
    expect(
      lastCreateMillis(['2024-01-01T00:00:00.900Z', '2024-01-01T00:00:00Z', null, 'garbage'])
    ).toBe(Date.parse('2024-01-01T00:00:00.900Z'));
    expect(lastCreateMillis([])).toBeNull();
    expect(lastCreateMillis([null, 'garbage'])).toBeNull();
  });

  it('fails closed: null anchor, unparseable edit time, and EXACT equality are never "later"', () => {
    expect(isLaterThan('2024-01-01T00:00:01Z', null)).toBe(false);
    const anchor = lastCreateMillis(['2024-01-01T00:00:00Z']);
    expect(isLaterThan('garbage', anchor)).toBe(false);
    expect(isLaterThan(null, anchor)).toBe(false);
    expect(isLaterThan('2024-01-01T00:00:00.000Z', anchor)).toBe(false); // equal, not later
    expect(isLaterThan('2024-01-01T00:00:00.001Z', anchor)).toBe(true);
  });
});
