// Strips the standalone word "Tequila" from a brand name (e.g. "Dulce Vida
// Tequila" -> "Dulce Vida") so the same brand doesn't show up twice in the
// scroller just because one signup included the word and another didn't.
export function normalizeBrandName(name: string): string {
  return name
    .replace(/\bTequila\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
