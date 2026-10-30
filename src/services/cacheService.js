/**
 * IndexedDB & LocalStorage Client-Side Caching Service for Evaluation Results
 * Prevents redundant API calls and eliminates token costs for re-evaluated candidates.
 */

import { getCompanyPromptSettings } from './promptStudioService';

const DB_NAME = 'HR_AX_EVALUATOR_DB';
const STORE_NAME = 'evaluation_cache';
const DB_VERSION = 1;

/**
 * Generates a unique cache key based on full rawText hash, job ID, and active Prompt Studio settings
 */
export function generateCacheKey(rawText, applyJobId) {
  if (!rawText) return '';
  const normalizedText = rawText.trim();
  const length = normalizedText.length;
  const promptSettings = getCompanyPromptSettings();
  const promptSignature = JSON.stringify({
    c: promptSettings.companyName,
    v: promptSettings.coreValues,
    t: promptSettings.tabooWords,
    i: promptSettings.customInstruction
  });
  return `cache_${applyJobId}_${length}_${hashCode(normalizedText)}_${hashCode(promptSignature)}`;
}

/**
 * Simple string hash code helper
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Opens IndexedDB database connection
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => resolve(null); // Fallback to localStorage gracefully
    request.onsuccess = (e) => resolve(e.target.result);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
      }
    };
  });
}

/**
 * Gets cached evaluation result by rawText and applyJobId
 */
export async function getCachedAnalysis(rawText, applyJobId) {
  const cacheKey = generateCacheKey(rawText, applyJobId);
  if (!cacheKey) return null;

  try {
    const db = await openDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(cacheKey);

        req.onsuccess = () => {
          if (req.result && req.result.data) {
            resolve({ ...req.result.data, isCached: true });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    }

    // LocalStorage fallback
    const localData = localStorage.getItem(cacheKey);
    if (localData) {
      return { ...JSON.parse(localData), isCached: true };
    }
  } catch (err) {
    console.warn('Cache read failed:', err);
  }

  return null;
}

/**
 * Saves evaluation result to IndexedDB cache
 */
export async function saveAnalysisToCache(rawText, applyJobId, resultData) {
  const cacheKey = generateCacheKey(rawText, applyJobId);
  if (!cacheKey || !resultData) return;

  const record = {
    cacheKey,
    applyJobId,
    timestamp: Date.now(),
    data: resultData
  };

  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(record);
    } else {
      localStorage.setItem(cacheKey, JSON.stringify(resultData));
    }
  } catch (err) {
    console.warn('Cache write failed:', err);
  }
}

/**
 * Retrieves all stored candidate analyses from cache for batch CSV export
 */
export async function getAllCachedAnalyses() {
  try {
    const db = await openDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const results = (req.result || []).map(r => r.data);
          resolve(results);
        };
        req.onerror = () => resolve([]);
      });
    }
  } catch (err) {
    console.warn('Get all cache failed:', err);
  }
  return [];
}
