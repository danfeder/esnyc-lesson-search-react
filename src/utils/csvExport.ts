/**
 * Shared CSV download helper for the admin export buttons
 * (AdminInvitations, AdminUsers).
 *
 * escapeCsvCell: cells beginning with = + - @ TAB or CR are prefixed with a
 * single quote so spreadsheet apps render them as literal text, and embedded
 * `"` are doubled per RFC 4180 so values containing quotes don't break rows.
 */
export function escapeCsvCell(raw: string): string {
  const value = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${value.replace(/"/g, '""')}"`;
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const blob = new window.Blob([toCsv(rows)], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
