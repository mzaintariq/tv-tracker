export const EXPORT_PAGE_SIZE = 500;
export const EXPORT_ID_CHUNK_SIZE = 200;
export const EXPORT_METADATA_CONCURRENCY = 4;

type PageResult<T> = { data: T[] | null; error: unknown };

export async function loadExportPages<T>(fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
    const result = await fetchPage(from, from + EXPORT_PAGE_SIZE - 1);
    if (result.error) throw new Error("Export data could not be loaded.");
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < EXPORT_PAGE_SIZE) return rows;
  }
}

export function uniqueChunks(values: readonly string[], size = EXPORT_ID_CHUNK_SIZE): string[][] {
  const unique = [...new Set(values)];
  return Array.from({ length: Math.ceil(unique.length / size) }, (_, index) => unique.slice(index * size, (index + 1) * size));
}

export async function mapWithConcurrency<T, R>(items: readonly T[], concurrency: number, work: (item: T, index: number) => Promise<R>): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error("Concurrency must be positive.");
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await work(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}
