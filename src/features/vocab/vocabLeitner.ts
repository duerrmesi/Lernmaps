import type { VocabItem } from '../../types';

export interface BoxInfo {
  box: number;
  label: string;
  shortLabel: string;
  intervalDays: number;
  color: string;
  badgeClass: string;
  bgClass: string;
}

export const BOX_CONFIG: Record<number, BoxInfo> = {
  1: {
    box: 1,
    label: 'Box 1 (Täglich)',
    shortLabel: 'Box 1',
    intervalDays: 1,
    color: '#ef4444',
    badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
    bgClass: 'bg-red-500',
  },
  2: {
    box: 2,
    label: 'Box 2 (2 Tage)',
    shortLabel: 'Box 2',
    intervalDays: 2,
    color: '#f97316',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
    bgClass: 'bg-orange-500',
  },
  3: {
    box: 3,
    label: 'Box 3 (7 Tage)',
    shortLabel: 'Box 3',
    intervalDays: 7,
    color: '#eab308',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    bgClass: 'bg-amber-500',
  },
  4: {
    box: 4,
    label: 'Box 4 (14 Tage)',
    shortLabel: 'Box 4',
    intervalDays: 14,
    color: '#3b82f6',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
    bgClass: 'bg-blue-500',
  },
  5: {
    box: 5,
    label: 'Box 5 (Gemeistert / 30 Tage)',
    shortLabel: 'Box 5',
    intervalDays: 30,
    color: '#10b981',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    bgClass: 'bg-emerald-500',
  },
};

export const PRESET_LANGUAGES = [
  { name: 'Englisch', code: 'en-US', flag: '🇬🇧' },
  { name: 'Spanisch', code: 'es-ES', flag: '🇪🇸' },
  { name: 'Französisch', code: 'fr-FR', flag: '🇫🇷' },
  { name: 'Italienisch', code: 'it-IT', flag: '🇮🇹' },
  { name: 'Latein', code: 'it-IT', flag: '🏛️' },
  { name: 'Russisch', code: 'ru-RU', flag: '🇷🇺' },
  { name: 'Deutsch / DaF', code: 'de-DE', flag: '🇩🇪' },
  { name: 'Sonstige', code: 'en-US', flag: '🌐' },
];

/**
 * Checks whether a vocabulary item is due for review based on its nextReview date.
 */
export function isVocabDue(item: VocabItem, referenceDate = new Date()): boolean {
  if (!item.nextReview) return true;
  const reviewTime = new Date(item.nextReview).getTime();
  return reviewTime <= referenceDate.getTime();
}

/**
 * Calculate the next box and review timestamp based on Leitner spaced repetition.
 */
export function calculateNextReview(
  currentBox: number,
  isCorrect: boolean,
  baseDate = new Date()
): { nextBox: number; nextReview: string; intervalDays: number } {
  if (!isCorrect) {
    // Falls falsch beantwortet: fällt genau 1 Stufe zurück (mindestens Box 1) und ist sofort wieder fällig
    const nextBox = Math.max(1, currentBox - 1);
    return {
      nextBox,
      nextReview: baseDate.toISOString(),
      intervalDays: 0,
    };
  }

  // Richtig beantwortet: Steigt um 1 Box auf (maximal Box 5)
  const nextBox = Math.min(5, Math.max(1, currentBox + 1));
  const intervalDays = BOX_CONFIG[nextBox]?.intervalDays || 1;

  const nextDate = new Date(baseDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return {
    nextBox,
    nextReview: nextDate.toISOString(),
    intervalDays,
  };
}

/**
 * Levenshtein distance calculation to detect minor typos.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Normalize text for forgiving comparison.
 */
export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'«»„“]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips common German & English articles/prepositions (der, die, das, ein, the, a, an, to) from the beginning.
 */
function stripArticle(text: string): string {
  return text.replace(/^(der|die|das|ein|eine|einen|einem|einer|the|a|an|to)\s+/i, '').trim();
}

export type AnswerCheckResult =
  | { status: 'exact'; matchedVariant: string }
  | { status: 'close'; matchedVariant: string; distance: number }
  | { status: 'incorrect' };

/**
 * Compares the user input against target answers (supports comma/slash/semicolon-separated synonyms).
 */
export function checkTranslationAnswer(userInput: string, targetAnswer: string): AnswerCheckResult {
  const cleanInput = normalizeAnswer(userInput);
  const inputNoArticle = stripArticle(cleanInput);

  if (!cleanInput) return { status: 'incorrect' };

  // Split targets by comma, semicolon, slash, or "oder"
  const variants = targetAnswer
    .split(/[,;/]|\boder\b/i)
    .map((v) => v.trim())
    .filter(Boolean);

  if (variants.length === 0) {
    variants.push(targetAnswer.trim());
  }

  let bestClose: { matchedVariant: string; distance: number } | null = null;

  for (const rawVariant of variants) {
    const cleanVariant = normalizeAnswer(rawVariant);
    const variantNoArticle = stripArticle(cleanVariant);

    // 1. Exact match
    if (cleanInput === cleanVariant || (inputNoArticle && inputNoArticle === variantNoArticle)) {
      return { status: 'exact', matchedVariant: rawVariant };
    }

    // 2. Minor typo check (Levenshtein distance <= 2 for words of length >= 4, or <= 1 for shorter)
    const dist = Math.min(
      levenshteinDistance(cleanInput, cleanVariant),
      levenshteinDistance(inputNoArticle, variantNoArticle)
    );

    const maxAllowedDist = Math.max(cleanVariant.length, cleanInput.length) >= 5 ? 2 : 1;

    if (dist <= maxAllowedDist) {
      if (!bestClose || dist < bestClose.distance) {
        bestClose = { matchedVariant: rawVariant, distance: dist };
      }
    }
  }

  if (bestClose) {
    return { status: 'close', matchedVariant: bestClose.matchedVariant, distance: bestClose.distance };
  }

  return { status: 'incorrect' };
}
