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

  while (true) {
    const pageSize = limit ? Math.min(500, limit - rows.length) : 500;
    const page = await requestPage(rows.length, rows.length + pageSize - 1, rows.length === 0);
    if (page.error) return { data: null, error: page.error };
    if (rows.length === 0) total = page.count ?? null;
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
    // Advance by rows actually received: a project's cap can be below 500.
    // When a total is unavailable, continue until an empty page, not a short one.
  }
}
