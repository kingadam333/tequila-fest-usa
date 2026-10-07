// Best Table Contest. Attendees rate each brand table 1-10 in five
// categories at /vote (logged in, one ballot per account per table, editable
// while voting is open). A brand's score is the average of every rating it got
// across all five categories; a table needs MIN_VOTES ballots to be eligible.
// Each city has a winner; the Ohio winner is the best of the three Ohio city
// winners (rules as announced on /brand-packages).

export const CONTEST_CATEGORIES = [
  { key: "taste", label: "Tequila Taste" },
  { key: "decoration", label: "Table Decoration" },
  { key: "staff", label: "Staff" },
  { key: "souvenirs", label: "Souvenirs" },
  { key: "overall", label: "Overall Best Experience" },
] as const;

export type CategoryKey = (typeof CONTEST_CATEGORIES)[number]["key"];
export type Scores = Record<CategoryKey, number>;

export const MIN_VOTES = 10;
export const OHIO_CITIES = ["cleveland", "cincinnati", "columbus"];

/** Returns clean 1-10 integer scores for every category, or null if any is missing/out of range. */
export function parseScores(raw: unknown): Scores | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out = {} as Scores;
  for (const { key } of CONTEST_CATEGORIES) {
    const n = Number(r[key]);
    if (!Number.isInteger(n) || n < 1 || n > 10) return null;
    out[key] = n;
  }
  return out;
}

export type EntryResult = {
  entryId: string;
  brand: string;
  votes: number;
  score: number | null; // average of all ratings, 2dp
  categories: Record<CategoryKey, number | null>;
  eligible: boolean;
};

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);

export function computeResults(
  entries: { id: string; brand_name: string }[],
  votes: ({ entry_id: string } & Scores)[],
): EntryResult[] {
  return entries
    .map((e) => {
      const mine = votes.filter((v) => v.entry_id === e.id);
      const categories = Object.fromEntries(
        CONTEST_CATEGORIES.map(({ key }) => [key, avg(mine.map((v) => v[key]))]),
      ) as Record<CategoryKey, number | null>;
      const all = mine.flatMap((v) => CONTEST_CATEGORIES.map(({ key }) => v[key]));
      return { entryId: e.id, brand: e.brand_name, votes: mine.length, score: avg(all), categories, eligible: mine.length >= MIN_VOTES };
    })
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || (b.score ?? 0) - (a.score ?? 0) || b.votes - a.votes);
}

/** Top eligible entry, or null if nobody has MIN_VOTES yet. Ties go to the table with more votes (then it's a tie for the admin to call). */
export const winnerOf = (results: EntryResult[]) => results.find((r) => r.eligible) ?? null;
