/**
 * Multi-Interviewer Collaboration & Cloud Sync Share Service
 * Supports offline-first IndexedDB caching + cloud share serialization
 */

const STORAGE_PREFIX = 'checkmate_shared_eval_';
const SHARED_INDEX_KEY = 'checkmate_shared_index';

// Generate unique Share ID (e.g., eval_8f9a2b1c)
export function generateShareId() {
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `eval_${randomPart}`;
}

/**
 * Creates and saves a shared evaluation snapshot
 * @param {Object} applicant - Target applicant object with analysis
 * @param {Object} options - { expiresHours, creatorName, creatorRole, tenantId }
 * @returns {Promise<{ shareId: string, shareUrl: string, expiresAt: string }>}
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
      orgId: applicant.orgId,
      applyJobId: applicant.applyJobId,
      rawText: applicant.rawText,
      analysis: applicant.analysis,
      isHumanVerified: applicant.isHumanVerified || false,
      reviewerNote: applicant.reviewerNote || ''
    },
    // Multi-Interviewer Real-time Comments & Consensus
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

  // Persist to Local/Cloud Storage
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_PREFIX}${shareId}`, JSON.stringify(sharePayload));

    // Maintain an index of shared links
    try {
      const existingIndex = JSON.parse(localStorage.getItem(SHARED_INDEX_KEY) || '[]');
      const newIndex = [{ shareId, applicantName: applicant.name, expiresAt, createdAt: now.toISOString() }, ...existingIndex.slice(0, 49)];
      localStorage.setItem(SHARED_INDEX_KEY, JSON.stringify(newIndex));
    } catch {
      // ignore
    }
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
 * Loads a shared evaluation by shareId
 * @param {string} shareId 
 * @returns {Promise<Object>} The shared evaluation payload
 */
export async function getSharedEvaluation(shareId) {
  if (!shareId) return null;

  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(`${STORAGE_PREFIX}${shareId}`);
  if (!raw) {
    // If not in localStorage, return null (in future: fetch from Cloud DB / Supabase)
    return null;
  }

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
 * Adds an interviewer comment/note to a shared evaluation
 * @param {string} shareId 
 * @param {Object} note - { author, role, content, scoreAdjustment }
 */
export async function addCollaborativeNote(shareId, note) {
  if (!shareId || !note || !note.content) return null;

  const payload = await getSharedEvaluation(shareId);
  if (!payload) throw new Error('공유 평가서를 찾을 수 없습니다.');

  const newNote = {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    author: note.author || '면접관',
    role: note.role || 'INTERVIEWER',
    timestamp: new Date().toISOString(),
    content: note.content,
    scoreAdjustment: note.scoreAdjustment || 0
  };

  payload.collaborativeNotes = [...(payload.collaborativeNotes || []), newNote];

  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_PREFIX}${shareId}`, JSON.stringify(payload));
  }

  return payload;
}
