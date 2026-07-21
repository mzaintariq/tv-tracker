import { TvTimeImportError } from "./errors";

export type CsvRow = Record<string, string>;

const MAX_FIELD_LENGTH = 100_000;

export function parseCsv(input: string, expectedHeaders: readonly string[]): CsvRow[] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"'; index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); records.push(row); row = []; field = ""; }
    else field += char;
    if (field.length > MAX_FIELD_LENGTH) throw new TvTimeImportError("csv_field_too_large", "A CSV field exceeds the supported size.");
  }
  if (quoted) throw new TvTimeImportError("csv_unclosed_quote", "A CSV contains an unclosed quoted field.");
  if (field || row.length) { row.push(field.replace(/\r$/, "")); records.push(row); }
  const [headers, ...values] = records;
  const expected = new Set(expectedHeaders);
  if (!headers || headers.length === 0 || new Set(headers).size !== headers.length || headers.some((header) => !expected.has(header))) {
    throw new TvTimeImportError("csv_schema_mismatch", "A TV Time CSV has an unsupported schema.");
  }
  return values.filter((value) => value.some(Boolean)).map((value) => {
    if (value.length !== headers.length) throw new TvTimeImportError("csv_column_mismatch", "A CSV row has the wrong number of columns.");
    const supplied = Object.fromEntries(headers.map((header, index) => [header, value[index] ?? ""]));
    return Object.fromEntries(expectedHeaders.map((header) => [header, supplied[header] ?? ""]));
  });
}
