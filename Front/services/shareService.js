/**
 * Multi-Interviewer Collaboration & Cloud Sync Share Service
 * Hybrid Offline-First + Cloud Centralized Gateway Sync
 */

const STORAGE_PREFIX = 'checkmate_shared_eval_';
const SHARED_INDEX_KEY = 'checkmate_shared_index';

// Resolve Backend API Base URL
// VITE_API_GATEWAY_URL 만 사용합니다. window.location.origin 대체는 프론트 nginx 의 index.html 을 받아
// "Unexpected token '<'" 를 일으켰으므로 제거했습니다 (#24). production 빌드는 미설정 시 실패합니다 (vite.config.js).
export function getApiBaseUrl() {
  const configured = (import.meta.env?.VITE_API_GATEWAY_URL || '').trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  if (import.meta.env?.PROD) {
    throw new Error('VITE_API_GATEWAY_URL 이 설정되지 않은 빌드입니다 (docs/DEPLOY.md).');
  }
  return 'http://127.0.0.1:3001'; // 로컬 개발 전용
}

// Generate unique Share ID (e.g., eval_8f9a2b1c)
export function generateShareId() {
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `eval_${randomPart}`;
}

/**
 * Creates and saves a shared evaluation snapshot to both Cloud Gateway & LocalStorage
 * @param {Object} applicant - Target applicant object with analysis
 * @param {Object} options - { expiresHours, creatorName, creatorRole, tenantId }
 * @returns {Promise<{ shareId: string, shareUrl: string, expiresAt: string, sharePayload: Object }>}
 */
export async function createSharedEvaluation(applicant, options = {}) {
  if (!applicant || !applicant.analysis) {
    throw new Error('공유할 지원자 평가 결과가 존재하지 않습니다.');
  }

  const shareId = generateShareId();
  const now = new Date();
  const expiresHours = options.expiresHours || 72; // default 3 days
  const expiresAt = new Date(now.getTime() + expiresHours * 60 * 60 * 1000).toISOString();

  const sharePayload = {
    shareId,
    createdAt: now.toISOString(),
    expiresAt,
    tenantId: options.tenantId || applicant.orgId || 'toss-payments',
    createdBy: {
      name: options.creatorName || '인사담당자',
      role: options.creatorRole || 'RECRUITER'
    },
    applicantSnapshot: {
      id: applicant.id,
      name: applicant.name,
      orgId: applicant.orgId || options.tenantId,
      applyJobId: applicant.applyJobId || 'dev',
      rawText: applicant.rawText,
      analysis: applicant.analysis,
      isHumanVerified: applicant.isHumanVerified || false,
      reviewerNote: applicant.reviewerNote || ''
    },
    collaborativeNotes: [
      {
        id: 'note_init',
        author: options.creatorName || '인사담당자',
        role: options.creatorRole || 'RECRUITER',
        timestamp: now.toISOString(),
        content: '1차 AI 서류 심사가 완료되어 기술 면접관 공유 링크가 생성되었습니다. 면접 전 1:1 형광펜 원문과 역량 검증 질문을 확인해 주세요.'
      }
    ]
  };

  // 1. Persist to LocalStorage (Instant UI responsiveness)
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_PREFIX}${shareId}`, JSON.stringify(sharePayload));

    try {
      const existingIndex = JSON.parse(localStorage.getItem(SHARED_INDEX_KEY) || '[]');
      const newIndex = [{ shareId, applicantName: applicant.name, expiresAt, createdAt: now.toISOString() }, ...existingIndex.slice(0, 49)];
      localStorage.setItem(SHARED_INDEX_KEY, JSON.stringify(newIndex));
    } catch {
      // ignore
    }
  }

  // 2. Synchronize to Central Cloud Gateway (BFF Sync)
  try {
    const apiBase = getApiBaseUrl();
    await fetch(`${apiBase}/api/v1/shares`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': sharePayload.tenantId
      },
      body: JSON.stringify({
        shareId,
        applicantSnapshot: sharePayload.applicantSnapshot,
        tenantId: sharePayload.tenantId,
        createdBy: sharePayload.createdBy,
        expiresHours,
        collaborativeNotes: sharePayload.collaborativeNotes
      })
    });
  } catch (cloudErr) {
    console.warn('[Cloud Sync Notice] Gateway sync deferred, saved in offline-first mode:', cloudErr.message);
  }

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?share=${shareId}`
    : `https://checkmate-hr.app/?share=${shareId}`;

  return {
    shareId,
    shareUrl,
    expiresAt,
    sharePayload
  };
}

/**
 * Loads a shared evaluation by shareId (Cloud-first with LocalStorage fallback)
 * @param {string} shareId 
 * @returns {Promise<Object>} The shared evaluation payload
 */
export async function getSharedEvaluation(shareId) {
  if (!shareId) return null;

  // 1. Attempt Cloud Gateway Fetch
  try {
    const apiBase = getApiBaseUrl();
    const resp = await fetch(`${apiBase}/api/v1/shares/${shareId}`);
    if (resp.status === 410) {
      throw new Error('해당 공유 링크의 유효 기간(TTL)이 만료되었습니다.');
    }
    if (resp.ok) {
      const cloudPayload = await resp.json();
      // Cache latest to LocalStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${STORAGE_PREFIX}${shareId}`, JSON.stringify(cloudPayload));
      }
      return cloudPayload;
    }
  } catch (cloudErr) {
    if (cloudErr.message.includes('만료')) throw cloudErr;
    console.warn('[Cloud Fetch Notice] Fallback to local offline cache:', cloudErr.message);
  }

  // 2. Offline Fallback: LocalStorage
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(`${STORAGE_PREFIX}${shareId}`);
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw);

    // Check expiration
    if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) {
      throw new Error('해당 공유 링크의 유효 기간(TTL)이 만료되었습니다.');
    }

    return payload;
  } catch (err) {
    if (err.message.includes('만료')) throw err;
    console.error('Failed to parse shared payload:', err);
    return null;
  }
}

/**
 * Adds an interviewer comment/note to a shared evaluation (Sync to Cloud + Local)
 * @param {string} shareId 
 * @param {Object} note - { author, role, content, scoreAdjustment }
 */
export async function addCollaborativeNote(shareId, note) {
  if (!shareId || !note || !note.content) return null;

  const newNote = {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    author: note.author || '면접관',
    role: note.role || 'INTERVIEWER',
    timestamp: new Date().toISOString(),
    content: note.content.trim(),
    scoreAdjustment: note.scoreAdjustment || 0
  };

  // 1. Sync to Cloud Gateway
  try {
    const apiBase = getApiBaseUrl();
    const resp = await fetch(`${apiBase}/api/v1/shares/${shareId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNote)
    });
    if (resp.ok) {
      const result = await resp.json();
      const updatedNotes = result.collaborativeNotes;
      
      // Update local storage
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${shareId}`);
      if (raw) {
        const payload = JSON.parse(raw);
        payload.collaborativeNotes = updatedNotes;
        localStorage.setItem(`${STORAGE_PREFIX}${shareId}`, JSON.stringify(payload));
        return payload;
      }
    }
  } catch (cloudErr) {
    console.warn('[Cloud Note Sync Notice] Fallback to local storage update:', cloudErr.message);
  }

  // 2. Local Fallback Update
  const payload = await getSharedEvaluation(shareId);
  if (!payload) throw new Error('공유 평가서를 찾을 수 없습니다.');

  payload.collaborativeNotes = [...(payload.collaborativeNotes || []), newNote];

  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_PREFIX}${shareId}`, JSON.stringify(payload));
  }

  return payload;
}
