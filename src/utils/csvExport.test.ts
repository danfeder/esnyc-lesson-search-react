import { describe, it, expect } from 'vitest';
import { escapeCsvCell, toCsv } from '@/utils/csvExport';

describe('escapeCsvCell', () => {
  it('wraps plain values in quotes', () => {
    expect(escapeCsvCell('plain')).toBe('"plain"');
  });
  it('doubles embedded quotes (RFC 4180)', () => {
    expect(escapeCsvCell('P.S. "Green" Academy')).toBe('"P.S. ""Green"" Academy"');
  });
  it.each(['=SUM(A1)', '+1', '-5', '@cmd', '\tx', '\rx'])(
    'prefixes a leading formula character with a quote: %j',
    (raw) => {
      expect(escapeCsvCell(raw)).toBe(`"'${raw}"`);
    }
  );
  it('leaves an empty string as an empty quoted cell', () => {
    expect(escapeCsvCell('')).toBe('""');
  });
});

describe('toCsv', () => {
  it('joins cells with commas and rows with newlines', () => {
    expect(
      toCsv([
        ['a', 'b'],
        ['c', 'd'],
      ])
    ).toBe('"a","b"\n"c","d"');
  });
});
