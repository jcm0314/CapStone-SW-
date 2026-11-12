/**
 * 지원자 등록/목록을 Spring 코어 API 와 동기화 (VITE_SPRING_API_URL 이 있을 때만 동작).
 *
 * 동작 요약
 * - 등록: 브라우저에서 AI 평가가 끝난 지원자를 POST /tenants/{tenantId}/applicants 로 저장하고,
 *         점수가 있으면 PATCH .../status 로 COMPLETED + 점수를 기록합니다. (같은 지원자는 한 번만 전송)
 * - 목록: GET /tenants/{tenantId}/applicants 결과 중 이 브라우저에 없는 지원자를 목록에 추가합니다.
 *         (AI 근거/면접질문은 아직 서버에 없으므로 점수·원문만 표시)
 * - tenantId 는 로그인 토큰의 user.tenantId 만 사용합니다 (서버가 경로-토큰 불일치를 404 로 차단).
 *
 * 개발용 로그인 (docs/API_SPEC_SPRING.md 참고)
 * - VITE_SPRING_DEV_PASSWORD 가 설정되고 production 빌드가 아닐 때만, 프론트 데모 테넌트에 대응하는
 *   Spring local 시드 계정(recruiter@toss.test / recruiter@daangn.test)으로 자동 로그인합니다.
 * - 대응 계정이 없는 테넌트(예: woowa)는 동기화하지 않고 기존 localStorage 동작만 합니다.
 */

import { ApiError, apiRequest, isSpringApiEnabled, login } from './apiClient';

/** 프론트 데모 테넌트 id → Spring local 시드 계정 */
export const DEV_ACCOUNT_BY_TENANT = {
  'toss-payments': 'recruiter@toss.test',
  daangn: 'recruiter@daangn.test'
};

const SESSION_KEY_PREFIX = 'checkmate_spring_session_';
const ID_MAP_KEY_PREFIX = 'checkmate_spring_ids_';
const PASS_DECISIONS = new Set(['STRONG_PASS', 'INTERVIEW', 'PASS']);
const inFlight = new Set();

export { isSpringApiEnabled };

function isDevLoginAllowed() {
  const env = import.meta.env || {};
  return Boolean(env.VITE_SPRING_DEV_PASSWORD) && env.MODE !== 'production';
}

function readJson(storage, key, fallback) {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getIdMap(frontendTenantId) {
  if (typeof window === 'undefined') return {};
  return readJson(window.localStorage, ID_MAP_KEY_PREFIX + frontendTenantId, {});
}

function rememberSpringId(frontendTenantId, localId, springId) {
  if (typeof window === 'undefined') return;
  const map = getIdMap(frontendTenantId);
  map[localId] = springId;
  window.localStorage.setItem(ID_MAP_KEY_PREFIX + frontendTenantId, JSON.stringify(map));
}

export function clearSpringSession(frontendTenantId) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SESSION_KEY_PREFIX + frontendTenantId);
}

/**
 * 프론트 테넌트에 대응하는 Spring 세션(JWT)을 반환. 없으면 개발용 자동 로그인을 시도하고, 불가하면 null.
 * @returns {Promise<{ token: string, user: { tenantId: string } } | null>}
 */
export async function getSpringSession(frontendTenantId) {
  if (!isSpringApiEnabled() || typeof window === 'undefined') return null;

  const cached = readJson(window.sessionStorage, SESSION_KEY_PREFIX + frontendTenantId, null);
  if (cached?.token && cached.expiresAt > Date.now() + 30_000) return cached;

  const email = DEV_ACCOUNT_BY_TENANT[frontendTenantId];
  if (!email || !isDevLoginAllowed()) return null;

  const result = await login(email, import.meta.env.VITE_SPRING_DEV_PASSWORD);
  const session = {
    token: result.accessToken,
    user: result.user,
    expiresAt: Date.now() + (result.expiresIn || 3600) * 1000
  };
  window.sessionStorage.setItem(SESSION_KEY_PREFIX + frontendTenantId, JSON.stringify(session));
  return session;
}

/** 401 이면 세션을 버리고 한 번 재로그인 후 재시도 */
async function withSession(frontendTenantId, fn) {
  const session = await getSpringSession(frontendTenantId);
  if (!session) return null;
  try {
    return await fn(session);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      clearSpringSession(frontendTenantId);
      const retry = await getSpringSession(frontendTenantId);
      return retry ? fn(retry) : null;
    }
    throw err;
  }
}

function applicantsPath(session) {
  return `/api/v1/tenants/${session.user.tenantId}/applicants`;
}

/** Spring ApplicantResponse → 프론트 지원자 객체 (분석 결과는 점수만 있는 최소 형태) */
export function toFrontendApplicant(springApplicant, frontendTenantId) {
  const score = springApplicant.finalScore ?? 0;
  return {
    id: `spring_${springApplicant.id}`,
    springApplicantId: springApplicant.id,
    source: 'SPRING',
    orgId: frontendTenantId,
    name: springApplicant.name,
    applyJobId: 'spring',
    applyJobTitle: springApplicant.targetRole,
    status: springApplicant.status,
    appliedAt: springApplicant.createdAt,
    rawText: springApplicant.coverLetterText || '',
    analysis: {
      summary: {
        totalScore: score,
        decision: springApplicant.passRecommendation ? 'INTERVIEW' : 'HOLD',
        decisionReason: 'Spring 서버에 저장된 지원자입니다. AI 근거·면접 질문은 이 브라우저에서 평가한 경우에만 표시됩니다.',
        aiTextProbability: 0
      },
      competencyScores: {},
      groundingEvidences: [],
      interviewQuestions: []
    }
  };
}

/** GET 목록. 동기화 불가(비활성/세션 없음)면 null */
export async function fetchSpringApplicants(frontendTenantId) {
  return withSession(frontendTenantId, (session) => apiRequest(applicantsPath(session), { token: session.token }));
}

/**
 * 로컬 목록에 서버에만 있는 지원자를 덧붙인 새 목록을 반환 (이미 로컬에 있으면 건너뜀).
 */
export function mergeSpringApplicants(localList, springList, frontendTenantId) {
  if (!Array.isArray(springList) || springList.length === 0) return localList;
  const idMap = getIdMap(frontendTenantId);
  const knownSpringIds = new Set([
    ...Object.values(idMap),
    ...localList.map((a) => a.springApplicantId).filter(Boolean)
  ]);
  const additions = springList
    .filter((s) => !knownSpringIds.has(s.id))
    .map((s) => toFrontendApplicant(s, frontendTenantId));
  return additions.length > 0 ? [...localList, ...additions] : localList;
}

/** 단일 지원자 등록 (+ 점수가 있으면 COMPLETED 상태 기록). 반환: Spring 지원자 id 또는 null */
export async function registerApplicantToSpring(frontendTenantId, applicant) {
  return withSession(frontendTenantId, async (session) => {
    const created = await apiRequest(applicantsPath(session), {
      method: 'POST',
      token: session.token,
      body: {
        name: applicant.name,
        targetRole: applicant.applyJobTitle || applicant.applyJobId || '미지정',
        coverLetterText: applicant.rawText,
        anonymized: true
      }
    });

    const summary = applicant.analysis?.summary;
    if (created?.id && typeof summary?.totalScore === 'number') {
      await apiRequest(`${applicantsPath(session)}/${created.id}/status`, {
        method: 'PATCH',
        token: session.token,
        body: {
          status: 'COMPLETED',
          finalScore: Math.round(summary.totalScore),
          passRecommendation: PASS_DECISIONS.has(summary.decision)
        }
      });
    }
    return created?.id ?? null;
  });
}

/**
 * 아직 서버에 없는 지원자만 등록 (원문이 있는 것만). 실패해도 화면 동작은 막지 않습니다.
 * @returns {Promise<number>} 새로 등록한 수
 */
export async function syncApplicantsToSpring(frontendTenantId, applicants) {
  if (!isSpringApiEnabled() || !Array.isArray(applicants)) return 0;
  const idMap = getIdMap(frontendTenantId);
  const pending = applicants.filter(
    (a) => a?.id && a.rawText && !a.springApplicantId && !idMap[a.id] && !inFlight.has(`${frontendTenantId}:${a.id}`)
  );

  let created = 0;
  for (const applicant of pending) {
    const key = `${frontendTenantId}:${applicant.id}`;
    inFlight.add(key);
    try {
      const springId = await registerApplicantToSpring(frontendTenantId, applicant);
      if (!springId) break; // 세션 없음 → 이 테넌트는 동기화하지 않음
      rememberSpringId(frontendTenantId, applicant.id, springId);
      created += 1;
    } catch (err) {
      console.warn(`[Spring 동기화] ${applicant.name} 등록 실패:`, err.message);
    } finally {
      inFlight.delete(key);
    }
  }
  return created;
}
