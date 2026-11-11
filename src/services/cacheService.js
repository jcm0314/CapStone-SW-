/**
 * IndexedDB & LocalStorage Client-Side Caching Service for Evaluation Results
 * Prevents redundant API calls and eliminates token costs for re-evaluated candidates.
 */

const DB_NAME = 'HR_AX_EVALUATOR_DB';
const STORE_NAME = 'evaluation_cache';
const DB_VERSION = 1;

/**
 * Generates a unique cache key based on the FULL (whitespace-normalized) rawText and job ID.
 * Previously only the first 100 chars + length were hashed, so texts sharing a prefix and length collided.
 */
export function generateCacheKey(rawText, applyJobId) {
  if (!rawText) return '';
  const normalized = rawText.trim().replace(/\s+/g, ' ');
  return `cache_${applyJobId}_${normalized.length}_${fnv1a(normalized, 0x811c9dc5)}${fnv1a(normalized, 0x01000193)}`;
}

/**
 * 32-bit FNV-1a hash (synchronous, deterministic). Two seeds are combined for a ~64-bit key.
 */
function fnv1a(str, seed) {
  let hash = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
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
