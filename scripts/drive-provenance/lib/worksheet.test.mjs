import { describe, it, expect } from 'vitest';
import { parseCsv, parseWorksheet, mergeWorksheets } from './worksheet.mjs';

const HEADER =
  'account_email,observed_drive_display_names,created_file_candidates,created_lesson_candidates,' +
  'adapted_file_candidates,adapted_lesson_candidates,adapted_with_other_known_editors_files,' +
  'approved_public_name,decision_approve_or_omit,notes';

// Synthetic identities only.
const row = (email, name, decision, notes = '') =>
  `${email},"Display, Name",1,2,0,0,0,${name},${decision},${notes}`;

describe('parseCsv', () => {
  it('handles quoted fields with commas and escaped quotes', () => {
    const rows = parseCsv('a,"b,c","d""e"\n1,2,3');
    expect(rows).toEqual([
      ['a', 'b,c', 'd"e'],
      ['1', '2', '3'],
    ]);
  });

  it('handles CRLF and trailing newline', () => {
    expect(parseCsv('a,b\r\nc,d\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('parseWorksheet', () => {
  it('parses approve and omit rows (emails lower-cased)', () => {
    const text = [
      HEADER,
      row('Person-A@synthetic.test', 'Person A', 'approve'),
      row('person-b@synthetic.test', '', 'omit'),
    ].join('\n');
    expect(parseWorksheet(text)).toEqual([
      { accountEmail: 'person-a@synthetic.test', decision: 'approve', publicName: 'Person A' },
      { accountEmail: 'person-b@synthetic.test', decision: 'omit', publicName: null },
    ]);
  });

  it('rejects a missing required column', () => {
    expect(() => parseWorksheet('account_email,notes\nx@synthetic.test,hi')).toThrow(
      /missing required column/
    );
  });

  it('rejects an unrecognized decision, citing only the row number', () => {
    const text = [HEADER, row('a@synthetic.test', 'A', 'maybe')].join('\n');
    expect(() => parseWorksheet(text)).toThrow(/row 2 has an unrecognized decision/);
    try {
      parseWorksheet(text);
    } catch (e) {
      expect(e.message).not.toContain('synthetic.test'); // no row content in errors
    }
  });

  it('rejects approve without a name', () => {
    const text = [HEADER, row('a@synthetic.test', '', 'approve')].join('\n');
    expect(() => parseWorksheet(text)).toThrow(/approves without an approved_public_name/);
  });

  it('rejects an empty account_email', () => {
    const text = [HEADER, row('', 'A', 'approve')].join('\n');
    expect(() => parseWorksheet(text)).toThrow(/row 2 has an empty account_email/);
  });
});

describe('mergeWorksheets', () => {
  const a = { accountEmail: 'a@synthetic.test', decision: 'approve', publicName: 'A' };
  const b = { accountEmail: 'b@synthetic.test', decision: 'omit', publicName: null };

  it('merges disjoint worksheets', () => {
    const merged = mergeWorksheets([[a], [b]]);
    expect(merged.size).toBe(2);
    expect(merged.get('a@synthetic.test')).toEqual({ decision: 'approve', publicName: 'A' });
  });

  it('tolerates identical duplicates', () => {
    expect(mergeWorksheets([[a], [a]]).size).toBe(1);
  });

  it('rejects conflicting duplicates without leaking content', () => {
    const conflicting = { ...a, publicName: 'Different' };
    expect(() => mergeWorksheets([[a], [conflicting]])).toThrow(/worksheets disagree/);
    try {
      mergeWorksheets([[a], [conflicting]]);
    } catch (e) {
      expect(e.message).not.toContain('synthetic.test');
      expect(e.message).not.toContain('Different');
    }
  });
});
