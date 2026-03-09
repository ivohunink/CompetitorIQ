/**
 * String similarity utilities for duplicate feature detection.
 * Pure TypeScript — no external dependencies.
 */

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Generate character trigrams from a string. */
export function trigrams(s: string): Set<string> {
  const n = normalize(s);
  const set = new Set<string>();
  for (let i = 0; i <= n.length - 3; i++) {
    set.add(n.slice(i, i + 3));
  }
  return set;
}

/** Dice coefficient over trigrams (0–1). */
export function trigramSimilarity(a: string, b: string): number {
  const setA = trigrams(a);
  const setB = trigrams(b);

  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  Array.from(setA).forEach((t) => {
    if (setB.has(t)) intersection++;
  });

  return (2 * intersection) / (setA.size + setB.size);
}

/**
 * Check if one string is an acronym of the other.
 * E.g., "SSO" ↔ "Single Sign-On", "2FA" ↔ "Two-Factor Authentication"
 */
export function isAcronymMatch(a: string, b: string): boolean {
  const normA = a.trim();
  const normB = b.trim();

  // Determine which might be the acronym (shorter one)
  const [short, long] =
    normA.length < normB.length ? [normA, normB] : [normB, normA];

  // Only check if the short one looks like an acronym (2-5 uppercase chars or digits)
  if (!/^[A-Z0-9]{2,6}$/i.test(short.replace(/\s/g, ""))) return false;

  const acronym = short.toUpperCase().replace(/\s/g, "");
  const words = long.split(/[\s\-]+/).filter((w) => w.length > 0);

  if (words.length !== acronym.length) return false;

  for (let i = 0; i < acronym.length; i++) {
    if (words[i][0].toUpperCase() !== acronym[i]) return false;
  }

  return true;
}

/**
 * Combined similarity score.
 * Returns max of trigram similarity and acronym bonus (1.0 if acronym match).
 */
export function computeSimilarity(a: string, b: string): number {
  if (isAcronymMatch(a, b)) return 1.0;
  return trigramSimilarity(a, b);
}
