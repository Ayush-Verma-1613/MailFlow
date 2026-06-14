/**
 * CSV formula-injection guard (CSV injection / DDE).
 *
 * When a spreadsheet (Excel, Google Sheets, LibreOffice) opens an exported CSV,
 * a cell whose value begins with `=`, `+`, `-`, `@`, or a control character
 * (TAB / CR) is interpreted as a *formula*. Because contact fields (name, tags,
 * custom fields) are attacker-controllable, an exported file could execute
 * `=cmd|'/c calc'!A1`-style payloads on a victim's machine.
 *
 * We neutralise such cells by prefixing a single quote, which spreadsheets
 * render as a literal leading apostrophe and treat the rest as plain text.
 *
 * Reference: OWASP "CSV Injection".
 */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

/** Make a value safe to write into a CSV cell. Always returns a string. */
export function sanitizeCsvCell(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  return FORMULA_TRIGGER.test(s) ? `'${s}` : s;
}
