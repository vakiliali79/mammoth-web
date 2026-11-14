/** Normalises Persian/Arabic variants so search is forgiving. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[آأإ]/g, "ا")
    .replace(/[‌‍ً-ْ]/g, "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesQuery(query: string, ...fields: string[]): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  const haystack = normalizeText(fields.join(" "));
  return q.split(" ").every((term) => haystack.includes(term));
}
