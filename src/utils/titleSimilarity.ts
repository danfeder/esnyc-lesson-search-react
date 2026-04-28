const SIMILARITY_THRESHOLD = 0.3;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function titlesAreSimilar(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const wa = new Set(na.split(' '));
  const wb = new Set(nb.split(' '));
  const intersection = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  if (union === 0) return false;
  return intersection / union >= SIMILARITY_THRESHOLD;
}
