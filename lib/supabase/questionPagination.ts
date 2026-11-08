type Page<T> = {
  data: T[] | null;
  error: { message: string } | null;
  count?: number | null;
};

/** API row caps apply to each request, not the size of the complete question bank. */
export async function loadQuestionPages<T>(
  requestPage: (from: number, to: number, withCount: boolean) => PromiseLike<Page<T>>,
  limit?: number
): Promise<Page<T>> {
  const rows: T[] = [];
  let total: number | null = null;
  let pageSize = limit ? Math.min(500, limit) : 500;

  while (true) {
    const target = Math.min(total ?? Infinity, limit || Infinity);
    const concurrency: number = total === null ? 1 : 4;
    const from = rows.length;
    const ranges: number[] = Array.from({ length: concurrency }, (_, i) => from + i * pageSize)
      .filter((start) => start < target);
    const pages: Page<T>[] = await Promise.all(ranges.map((start) => requestPage(start, Math.min(start + pageSize, target) - 1, start === 0)));
    for (let i = 0; i < pages.length; i += 1) {
      const page: Page<T> = pages[i];
      if (page.error) return { data: null, error: page.error };
      const first = rows.length === 0;
      if (first) total = page.count ?? null;
      const received = page.data ?? [];
      rows.push(...received);

      if ((limit && rows.length >= limit) || (total !== null && rows.length >= total)) {
        return { data: rows, error: null, count: total };
      }
      if (received.length === 0) {
        if (total !== null && rows.length < total) {
          return { data: null, error: { message: "The question bank changed while loading. Please reload the page." } };
        }
        return { data: rows, error: null, count: total };
      }
      const requested = Math.min(pageSize, target - ranges[i]);
      if (received.length < requested) {
        pageSize = received.length;
        // A server cap changed: discard speculative pages and continue at the
        // actual next offset instead of skipping records.
        break;
      }
    }
  }
}
