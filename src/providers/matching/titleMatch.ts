import type { AnimeTitle } from '@/data/models/anime';

/** Lowercase, punctuation-free, whitespace-collapsed form used for comparison. */
export function normalizeTitle(value?: string | null): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PART_PATTERNS: RegExp[] = [
  /\[?тв[-\s]?(\d{1,2})\]?/i,
  /\bseason\s*(\d{1,2})\b/i,
  /\b(\d{1,2})(?:st|nd|rd|th)\s+season\b/i,
  /\bpart\s*(\d{1,2})\b/i,
  /\b(?:ii|iii|iv|2|3|4)\s*$/i,
];

const ROMAN: Record<string, number> = { ii: 2, iii: 3, iv: 4 };

/** Season/part number encoded in a title, when there is one. */
export function extractPart(value?: string | null): number | undefined {
  const raw = String(value ?? '');
  for (const pattern of PART_PATTERNS) {
    const match = pattern.exec(raw);
    if (!match) continue;
    const captured = match[1] ?? match[0];
    const numeric = Number.parseInt(captured, 10);
    if (Number.isFinite(numeric) && numeric > 0 && numeric < 40) return numeric;
    const roman = ROMAN[captured.toLowerCase().trim()];
    if (roman) return roman;
  }
  return undefined;
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  }
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  const window = shorter.length;
  let best = 0;
  for (let offset = 0; offset + window <= longer.length; offset += 1) {
    const slice = longer.slice(offset, offset + window);
    let equal = 0;
    for (let index = 0; index < window; index += 1) {
      if (slice[index] === shorter[index]) equal += 1;
    }
    best = Math.max(best, equal / window);
  }
  return best;
}

/** How well one name matches any of a set of known names. */
export function bestNameSimilarity(names: string[], value?: string | null): number {
  const wanted = normalizeTitle(value);
  if (!wanted) return 0;
  return names.reduce((best, name) => Math.max(best, similarity(name, wanted)), 0);
}

export interface MatchTarget {
  names: string[];
  year?: number;
  part?: number;
  type?: string;
}

export interface MatchCandidate {
  title: AnimeTitle;
  year?: number;
  type?: string;
}

export interface TitleMatch {
  candidate: MatchCandidate;
  score: number;
}

/** Names AnimAlc knows for a title, in comparison order. */
export function matchTargetOf(title: AnimeTitle): MatchTarget {
  return {
    names: [title.title, title.titleEn, title.titleOriginal, ...title.alternativeTitles]
      .map((name) => normalizeTitle(name))
      .filter((name) => name.length > 1),
    year: title.year,
    part: extractPart(title.title) ?? extractPart(title.titleOriginal),
    type: title.type,
  };
}

export function scoreCandidate(target: MatchTarget, candidate: MatchCandidate): number {
  const names = [candidate.title.title, candidate.title.titleEn, candidate.title.titleOriginal, ...candidate.title.alternativeTitles]
    .map((name) => normalizeTitle(name))
    .filter((name) => name.length > 1);
  if (!target.names.length || !names.length) return 0;

  let best = 0;
  for (const wanted of target.names) {
    for (const name of names) {
      best = Math.max(best, similarity(wanted, name));
    }
  }
  if (best < 0.55) return 0;

  // An explicit year/type wins; otherwise they are read off the title.
  const candidateYear = candidate.year ?? candidate.title.year;
  const candidateType = candidate.type ?? candidate.title.type;

  let score = best;
  if (target.year && candidateYear) {
    score += target.year === candidateYear ? 0.2 : Math.abs(target.year - candidateYear) <= 1 ? 0.05 : -0.35;
  }
  // A missing part marker is common, so only a contradicting one counts.
  const candidatePart = extractPart(candidate.title.title) ?? extractPart(candidate.title.titleOriginal);
  if (target.part && candidatePart) {
    score += target.part === candidatePart ? 0.15 : -0.35;
  }
  if (target.type && candidateType && target.type !== 'UNKNOWN' && candidateType !== 'UNKNOWN') {
    score += target.type === candidateType ? 0.05 : -0.15;
  }
  return Math.max(0, Math.min(1, score));
}

/**
 * The only candidate that is clearly the same release, or nothing. A low
 * threshold would attach the wrong season, film or OVA to a title, so an
 * uncertain match is reported as no match at all.
 */
export function bestMatch(target: MatchTarget, candidates: MatchCandidate[], threshold = 0.82): TitleMatch | undefined {
  const scored = candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(target, candidate) }))
    .filter((entry) => entry.score >= threshold)
    .sort((a, b) => b.score - a.score);
  return scored[0];
}
