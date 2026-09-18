/**
 * Web Worker Helper Service
 * Instantiates evaluatorWorker and manages Promise lifecycle with progress updates.
 */

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
