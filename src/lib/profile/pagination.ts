export const PROFILE_PAGE_SIZE = 500;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function loadAllPages<T>(fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PROFILE_PAGE_SIZE) {
    const result = await fetchPage(from, from + PROFILE_PAGE_SIZE - 1);
    if (result.error) throw new Error(result.error.message);
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < PROFILE_PAGE_SIZE) return rows;
  }
}
