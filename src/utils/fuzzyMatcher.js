/**
 * Levenshtein Distance & Jaccard Similarity Fuzzy Matching Engine
 * Solves line breaks (\n), whitespace mismatches, and minor typos in AI Grounding Quotes
 */

/**
 * Calculates Levenshtein Distance between two strings
 */
export function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates normalized similarity ratio (0.0 to 1.0)
 */
export function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const s1 = str1.trim().replace(/\s+/g, ' ');
  const s2 = str2.trim().replace(/\s+/g, ' ');
  if (s1 === s2) return 1.0;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLen;
}

/**
 * Normalizes text by removing redundant whitespace and line breaks for comparison
 */
function normalizeText(text) {
  return text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Searches for the best fuzzy matching substring in rawText for targetQuote
 * Returns { start, end, matchText, similarity } or null
 */
export function findFuzzyMatch(rawText, targetQuote, threshold = 0.85) {
  if (!rawText || !targetQuote) return null;

  // 1. Exact match fast path
  const exactIndex = rawText.indexOf(targetQuote);
  if (exactIndex !== -1) {
    return {
      start: exactIndex,
      end: exactIndex + targetQuote.length,
      matchText: targetQuote,
      similarity: 1.0,
      isExact: true
    };
  }

  // 2. Fast path for whitespace/line-break normalized match
  const normRaw = normalizeText(rawText);
  const normQuote = normalizeText(targetQuote);

  if (normRaw.includes(normQuote)) {
    // Locate original boundaries in rawText
    const words = normQuote.split(' ');
    const firstWord = words[0];
    const lastWord = words[words.length - 1];

    let searchStart = 0;
    while (searchStart < rawText.length) {
      const idx = rawText.indexOf(firstWord, searchStart);
      if (idx === -1) break;

      const endIdx = rawText.indexOf(lastWord, idx + firstWord.length);
      if (endIdx !== -1) {
        const candidateEnd = endIdx + lastWord.length;
        const candidateText = rawText.slice(idx, candidateEnd);
        const sim = calculateSimilarity(candidateText, targetQuote);

        if (sim >= threshold) {
          return {
            start: idx,
            end: candidateEnd,
            matchText: candidateText,
            similarity: sim,
            isExact: false
          };
        }
      }
      searchStart = idx + 1;
    }
  }

  // 3. Sliding window sentence search for typos/differences
  const quoteLen = targetQuote.length;
  let bestMatch = null;
  let maxSimilarity = 0;

  // Slide window with variable length (+/- 20%)
  const minWin = Math.max(10, Math.floor(quoteLen * 0.8));
  const maxWin = Math.min(rawText.length, Math.ceil(quoteLen * 1.2));

  for (let i = 0; i <= rawText.length - minWin; i += 3) {
    for (let win = minWin; win <= maxWin && i + win <= rawText.length; win += 5) {
      const windowText = rawText.slice(i, i + win);
      const sim = calculateSimilarity(windowText, targetQuote);

      if (sim > maxSimilarity) {
        maxSimilarity = sim;
        bestMatch = {
          start: i,
          end: i + win,
          matchText: windowText,
          similarity: sim,
          isExact: false
        };
      }
    }
  }

  if (maxSimilarity >= threshold && bestMatch) {
    return bestMatch;
  }

  return null;
}
