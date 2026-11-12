/**
 * production 빌드 전 필수 환경변수 검사 (#24)
 *
 * VITE_API_GATEWAY_URL 없이 빌드하면 프론트가 자기 자신(nginx)에게 /api/* 를 요청하고,
 * nginx 가 HTML 을 돌려줘 "Unexpected token '<'" 오류가 납니다. 그래서 빌드 단계에서 바로 실패시킵니다.
 */

export function validateProductionBuildEnv(env) {
  const raw = (env.VITE_API_GATEWAY_URL || '').trim();

  if (!raw) {
    throw new Error(
      [
        '',
        '❌ [빌드 중단] VITE_API_GATEWAY_URL 이 설정되지 않았습니다.',
        '   프론트가 AI 평가(/api/v1/evaluate)·공유(/api/v1/shares)를 호출할 API 게이트웨이 주소가 필요합니다.',
        '   예) VITE_API_GATEWAY_URL=https://hr-evaluator-api-gateway-xxxx.a.run.app npm run build',
        '   Docker: docker build --build-arg VITE_API_GATEWAY_URL=https://... .',
        '   자세한 배포 절차: docs/DEPLOY.md',
        ''
      ].join('\n')
    );
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`❌ [빌드 중단] VITE_API_GATEWAY_URL 이 올바른 URL 이 아닙니다: "${raw}" (예: https://api.example.com)`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`❌ [빌드 중단] VITE_API_GATEWAY_URL 은 http(s) 주소여야 합니다: "${raw}"`);
  }
  return raw;
}
