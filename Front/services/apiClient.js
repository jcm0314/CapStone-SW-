/**
 * Spring Boot 코어 API 클라이언트 (server-spring, docs/API_SPEC_SPRING.md)
 *
 * - Base URL: VITE_SPRING_API_URL (예: http://localhost:8081). 비어 있으면 Spring 연동 전체가 꺼지고
 *   기존 localStorage 동작을 그대로 사용합니다.
 * - 인증: Authorization: Bearer <JWT>
 * - 응답: Spring 공통 포맷 { success, data, error: { code, message } } → 성공 시 data 반환, 실패 시 ApiError throw
 */

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN_ERROR' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function getSpringApiUrl() {
  const raw = (import.meta.env?.VITE_SPRING_API_URL || '').trim();
  return raw.replace(/\/+$/, '');
}

export function isSpringApiEnabled() {
  return Boolean(getSpringApiUrl());
}

/**
 * Spring API 호출.
 * @param {string} path '/api/v1/...' 형태의 경로
 * @param {{ method?: string, body?: unknown, token?: string|null }} [options]
 * @returns {Promise<any>} 응답의 data 필드
 */
export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const baseUrl = getSpringApiUrl();
  if (!baseUrl) {
    throw new ApiError('VITE_SPRING_API_URL 이 설정되지 않아 Spring API 를 호출할 수 없습니다.', {
      code: 'SPRING_API_DISABLED'
    });
  }

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (networkError) {
    throw new ApiError(`Spring API(${baseUrl})에 연결할 수 없습니다: ${networkError.message}`, {
      code: 'NETWORK_ERROR'
    });
  }

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // 예: 잘못된 URL 로 프론트 nginx 가 index.html(200)을 돌려준 경우
      throw new ApiError(
        `Spring API 가 JSON 이 아닌 응답을 반환했습니다 (HTTP ${response.status}). VITE_SPRING_API_URL(${baseUrl}) 을 확인하세요.`,
        { status: response.status, code: 'NON_JSON_RESPONSE' }
      );
    }
  }

  if (!response.ok || json?.success === false) {
    throw new ApiError(json?.error?.message || `Spring API 요청 실패 (HTTP ${response.status})`, {
      status: response.status,
      code: json?.error?.code || 'HTTP_ERROR'
    });
  }

  return json?.data ?? null;
}

/**
 * POST /api/v1/auth/login
 * @returns {Promise<{ accessToken: string, tokenType: string, expiresIn: number, user: object }>}
 */
export function login(email, password) {
  return apiRequest('/api/v1/auth/login', { method: 'POST', body: { email, password } });
}

/** GET /api/v1/auth/me */
export function fetchMe(token) {
  return apiRequest('/api/v1/auth/me', { token });
}
