// Supabase's PostgREST API caps any single response at a max-rows limit
// (1000 by default) configured on the project itself — client-side
// `.limit()`/`.range()` values above that cap are silently clamped down to
// it, they can't raise it. Once a table crosses that row count, any
// unpaginated `.select()` across the whole table starts silently dropping
// rows. This fetches in pages until a short page confirms there's nothing
// left, so aggregate admin stats stay correct regardless of table size.
export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) throw error;
    const page = data || [];
    all.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
