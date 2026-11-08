export type RichTableCell = { text: string; header: boolean; colspan: number; rowspan: number };
export type RichTable = { rows: RichTableCell[][]; caption: string };

/** Decode data, never HTML. Bounds also apply to data coming from the database. */
export function decodeRichTable(payload: string): RichTable | null {
  try {
    if (payload.length > 1_000_000) return null;
    const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value.caption !== "string" || !Array.isArray(value.rows) || !value.rows.length || value.rows.length > 100) return null;
    for (const row of value.rows) {
      if (!Array.isArray(row) || !row.length || row.length > 100) return null;
      for (const cell of row) {
        if (!cell || typeof cell.text !== "string" || typeof cell.header !== "boolean" ||
          !Number.isInteger(cell.colspan) || cell.colspan < 1 || cell.colspan > 100 ||
          !Number.isInteger(cell.rowspan) || cell.rowspan < 1 || cell.rowspan > 100) return null;
      }
    }
    return value as RichTable;
  } catch {
    return null;
  }
}
