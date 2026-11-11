/**
 * N-Gram Character & Sentence-Level Mutual Plagiarism Detection Engine
 * Pre-computes candidate N-Gram sets in O(N * L) and evaluates upper-triangle matrix pairs.
 */

const BOILERPLATE_STOP_PHRASES = /\[(?:지원동기|직무역량|협업경험|입사\s*후\s*포부|성장과정|성격의\s*장단점)[^\]]*\]/g;

/**
 * Generates character n-grams from text after stripping common boilerplate headers
 */
function getNGrams(text, n = 3) {
  const withoutHeaders = String(text || '').replace(BOILERPLATE_STOP_PHRASES, '');
  const cleanText = withoutHeaders.replace(/[\s\r\n\t]+/g, '');
  const nGrams = new Set();
  if (cleanText.length < n) return nGrams;

  for (let i = 0; i <= cleanText.length - n; i++) {
    nGrams.add(cleanText.slice(i, i + n));
  }
  return nGrams;
}

/**
 * Computes Jaccard similarity directly from two precomputed N-Gram Sets
 */
function computeSetJaccard(nGrams1, nGrams2) {
  if (nGrams1.size === 0 || nGrams2.size === 0) return 0;

  let intersectionSize = 0;
  const [smaller, larger] = nGrams1.size <= nGrams2.size ? [nGrams1, nGrams2] : [nGrams2, nGrams1];
  smaller.forEach((gram) => {
    if (larger.has(gram)) {
      intersectionSize++;
    }
  });

  const unionSize = nGrams1.size + nGrams2.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

/**
 * Calculates N-Gram Jaccard Similarity between two cover letter texts (0.0 to 1.0)
 */
export function calculateNGramSimilarity(text1, text2, n = 3) {
  if (!text1 || !text2) return 0;
  if (text1 === text2) return 1.0;

  const nGrams1 = getNGrams(text1, n);
  const nGrams2 = getNGrams(text2, n);
  return computeSetJaccard(nGrams1, nGrams2);
}

/**
 * Calculates similarity percentage (0% to 100%)
 */
export function calculatePlagiarismPercentage(text1, text2) {
  const similarity = calculateNGramSimilarity(text1, text2, 3);
  return Math.round(similarity * 100);
}

/**
 * Generates a pairwise plagiarism matrix for an array of applicants
 * Pre-caches N-Gram sets in O(N * L) and computes upper-triangular pairs (j > i)
 * @param {Array} applicants - Array of applicant objects
 * @returns {Array<Array<{ applicant1: object, applicant2: object, plagiarismRate: number, isHighRisk: boolean }>>}
 */
export function generatePlagiarismMatrix(applicants = []) {
  const count = applicants.length;
  const matrix = Array.from({ length: count }, () => Array(count).fill(null));
  const cachedNGramSets = applicants.map((app) => getNGrams(app?.rawText || '', 3));

  for (let i = 0; i < count; i++) {
    matrix[i][i] = {
      applicant1: applicants[i],
      applicant2: applicants[i],
      plagiarismRate: 100,
      isSelf: true,
      isHighRisk: false
    };

    for (let j = i + 1; j < count; j++) {
      const textI = applicants[i]?.rawText || '';
      const textJ = applicants[j]?.rawText || '';
      const sim = textI && textI === textJ ? 1.0 : computeSetJaccard(cachedNGramSets[i], cachedNGramSets[j]);
      const rate = Math.round(sim * 100);
      const isHighRisk = rate >= 40;

      matrix[i][j] = {
        applicant1: applicants[i],
        applicant2: applicants[j],
        plagiarismRate: rate,
        isSelf: false,
        isHighRisk
      };
      matrix[j][i] = {
        applicant1: applicants[j],
        applicant2: applicants[i],
        plagiarismRate: rate,
        isSelf: false,
        isHighRisk
      };
    }
  }

  return matrix;
}
