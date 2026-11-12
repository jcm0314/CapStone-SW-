/**
 * Web Worker Helper Service
 * Offloads CPU-intensive 2-Stage Fuzzy Substring Matching and PII Anonymization to a background Worker thread
 * when running in the browser, with automatic synchronous fallback in Node.js / SSR / Vitest environments.
 */

import { enrichEvidences } from '../utils/evidenceEnricher.js';
import { anonymizePII } from '../utils/piiAnonymizer.js';

/**
 * Synchronous fallback for enriching grounding evidence quotes with character offsets.
 * Unmatched (possibly hallucinated) quotes are forced to type "verify" with scoreImpact 0.
 */
export function enrichEvidencesSync(targetText, rawGroundingEvidences = [], threshold = 0.70) {
  return enrichEvidences(targetText, rawGroundingEvidences, threshold);
}

/**
 * Runs 2-Stage Fuzzy Quote Matching in a background Web Worker when available,
 * falling back to synchronous execution in Node.js or test environments.
 */
export async function enrichEvidencesInWorker(targetText, rawGroundingEvidences = [], threshold = 0.70) {
  if (typeof Worker === 'undefined') {
    return enrichEvidencesSync(targetText, rawGroundingEvidences, threshold);
  }

  return new Promise((resolve) => {
    let settled = false;
    let worker = null;

    const fallback = () => {
      if (settled) return;
      settled = true;
      if (worker) {
        try { worker.terminate(); } catch { /* ignore */ }
      }
      resolve(enrichEvidencesSync(targetText, rawGroundingEvidences, threshold));
    };

    try {
      worker = new Worker(
        new URL('../workers/evaluatorWorker.js', import.meta.url),
        { type: 'module' }
      );

      const timer = setTimeout(fallback, 3000);

      worker.onmessage = (e) => {
        if (settled) return;
        const { type, payload } = e.data || {};
        if (type === 'COMPLETE' && Array.isArray(payload)) {
          settled = true;
          clearTimeout(timer);
          worker.terminate();
          resolve(payload);
        }
      };

      worker.onerror = () => {
        clearTimeout(timer);
        fallback();
      };

      worker.postMessage({
        type: 'MATCH_EVIDENCES',
        payload: { targetText, rawGroundingEvidences, threshold }
      });
    } catch {
      fallback();
    }
  });
}

/**
 * Runs PII Anonymization in a background Web Worker when available for large texts (>2,000 chars),
 * or synchronously for short texts / non-worker environments.
 */
export async function anonymizePIIInWorker(rawText, name) {
  if (typeof Worker === 'undefined' || !rawText || rawText.length < 2000) {
    return anonymizePII(rawText, name);
  }

  return new Promise((resolve) => {
    let settled = false;
    let worker = null;

    const fallback = () => {
      if (settled) return;
      settled = true;
      if (worker) {
        try { worker.terminate(); } catch { /* ignore */ }
      }
      resolve(anonymizePII(rawText, name));
    };

    try {
      worker = new Worker(
        new URL('../workers/evaluatorWorker.js', import.meta.url),
        { type: 'module' }
      );

      const timer = setTimeout(fallback, 2000);

      worker.onmessage = (e) => {
        if (settled) return;
        const { type, payload } = e.data || {};
        if (type === 'COMPLETE' && payload) {
          settled = true;
          clearTimeout(timer);
          worker.terminate();
          resolve(payload);
        }
      };

      worker.onerror = () => {
        clearTimeout(timer);
        fallback();
      };

      worker.postMessage({
        type: 'ANONYMIZE_PII',
        payload: { rawText, name }
      });
    } catch {
      fallback();
    }
  });
}

export function runWorkerEvaluation({ name, jobTemplate, rawText, onProgress }) {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(
        new URL('../workers/evaluatorWorker.js', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (e) => {
        const { type, percent, status, payload } = e.data;

        if (type === 'PROGRESS') {
          if (onProgress) onProgress({ percent, status });
        } else if (type === 'COMPLETE') {
          worker.terminate();
          resolve(payload);
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };

      worker.postMessage({
        type: 'PARSE_EVALUATION',
        payload: { name, jobTemplate, rawText }
      });
    } catch (err) {
      reject(err);
    }
  });
}
