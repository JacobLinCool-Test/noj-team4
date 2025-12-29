export type CsvValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date;

type CsvOptions = {
  includeBom?: boolean;
};

function sanitizeForCsv(value: string): string {
  const trimmed = value.replace(/\r?\n/g, ' ').trim();
  if (/^[=+\-@]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

function toCell(value: CsvValue): string {
  if (value === null || value === undefined) return '""';
  if (value instanceof Date) {
    return `"${value.toISOString()}"`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return `"${String(value)}"`;
  }
  const safe = sanitizeForCsv(String(value));
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildCsv(rows: CsvValue[][], options: CsvOptions = {}): string {
  const lines = rows.map((row) => row.map(toCell).join(','));
  const content = lines.join('\r\n');
  if (options.includeBom) {
    return `\uFEFF${content}`;
  }
  return content;
}
