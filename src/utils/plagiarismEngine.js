/**
 * N-Gram Character & Sentence-Level Mutual Plagiarism Detection Engine
 * Calculates pairwise similarity matrices for candidate cover letters to detect copy-paste abuse.
 */

/**
 * Generates character n-grams from text
 */
function getNGrams(text, n = 3) {
  const cleanText = text.replace(/[\s\r\n\t]+/g, '');
  const nGrams = new Set();
  if (cleanText.length < n) return nGrams;

  for (let i = 0; i <= cleanText.length - n; i++) {
    nGrams.add(cleanText.slice(i, i + n));
  }
  return nGrams;
}

/**
 * Calculates N-Gram Jaccard Similarity between two cover letter texts (0.0 to 1.0)
 */
export function calculateNGramSimilarity(text1, text2, n = 3) {
  if (!text1 || !text2) return 0;
  if (text1 === text2) return 1.0;

  const nGrams1 = getNGrams(text1, n);
  const nGrams2 = getNGrams(text2, n);

  if (nGrams1.size === 0 || nGrams2.size === 0) return 0;

  let intersectionSize = 0;
  nGrams1.forEach(gram => {
    if (nGrams2.has(gram)) {
      intersectionSize++;
    }
  });

  const unionSize = nGrams1.size + nGrams2.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
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
 * @param {Array} applicants - Array of applicant objects
 * @returns {Array<Array<{ applicant1: object, applicant2: object, plagiarismRate: number, isHighRisk: boolean }>>}
 */
export function generatePlagiarismMatrix(applicants = []) {
  const count = applicants.length;
  const matrix = Array.from({ length: count }, () => Array(count).fill(null));

  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      if (i === j) {
        matrix[i][j] = {
          applicant1: applicants[i],
          applicant2: applicants[j],
          plagiarismRate: 100,
          isSelf: true,
          isHighRisk: false
        };
      } else {
        const rate = calculatePlagiarismPercentage(
          applicants[i].rawText || '',
          applicants[j].rawText || ''
        );
        matrix[i][j] = {
          applicant1: applicants[i],
          applicant2: applicants[j],
          plagiarismRate: rate,
          isSelf: false,
          isHighRisk: rate >= 40 // Flag if 40%+ mutual similarity
        };
      }
    }
  }

  return matrix;
}
