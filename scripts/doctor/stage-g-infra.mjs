// [g] 컨테이너 & 인프라 정적 검사 (Dockerfile, nginx.conf, docker-compose.yml, CI 워크플로)
import path from 'node:path';
import { readText, exists, parseYaml } from './lib.mjs';

export async function run(ctx, { pass, warn, fail }) {
  const { root } = ctx;

  await ctx.check({ id: 'g.dockerfile', title: 'Dockerfile 및 server/Dockerfile 검사' }, async () => {
    const dfRoot = readText(path.join(root, 'Dockerfile'));
    const dfServer = readText(path.join(root, 'server', 'Dockerfile'));
    if (!dfRoot) return fail('루트 Dockerfile 없음', 'Dockerfile이 존재하는지 확인하세요.');
    if (!dfServer) return fail('server/Dockerfile 없음', 'server/Dockerfile이 존재하는지 확인하세요.');

    const problems = [];
    if (/node:20/i.test(dfRoot) || /node:20/i.test(dfServer)) {
      problems.push('Node 20 베이스 이미지 참조 발견 (Node 22 LTS 권장)');
    }
    if (!/ARG\s+VITE_API_GATEWAY_URL/.test(dfRoot)) {
      problems.push('루트 Dockerfile에 ARG VITE_API_GATEWAY_URL 누락');
    }
    if (problems.length) {
      return warn(problems.join(' · '), 'Dockerfile 설정을 점검하세요.', problems);
    }
    return pass('Dockerfile 및 server/Dockerfile Node 22 & 빌드 인자 구성 정상');
  });

  await ctx.check({ id: 'g.nginx', title: 'nginx.conf 라우팅 및 /api 처리 검사' }, async () => {
    const conf = readText(path.join(root, 'nginx.conf'));
    if (!conf) return warn('nginx.conf 없음', '프론트엔드 컨테이너 배포 시 nginx.conf가 필요합니다.');
    if (/error_page\s+405\s+=200/.test(conf)) {
      return fail('error_page 405 =200 설정이 남아 있음 (POST /api 요청이 index.html 200으로 반환됨)', 'nginx.conf에서 error_page 405 =200을 제거하고 /api/ 404 JSON 응답을 설정하세요.');
    }
    return pass('nginx.conf SPA 폴백 및 /api JSON 404 분리 정상');
  });

  await ctx.check({ id: 'g.compose', title: 'docker-compose.yml 및 CI 워크플로 구문 검사' }, async () => {
    const composePath = path.join(root, 'docker-compose.yml');
    const ciPath = path.join(root, '.github', 'workflows', 'ci-cd.yml');
    const issues = [];

    if (exists(composePath)) {
      const y = parseYaml(readText(composePath) || '');
      if (y.issues.length) issues.push(...y.issues.map((i) => `docker-compose.yml: ${i}`));
    }
    if (exists(ciPath)) {
      const y = parseYaml(readText(ciPath) || '');
      if (y.issues.length) issues.push(...y.issues.map((i) => `ci-cd.yml: ${i}`));
    }

    if (issues.length) return warn(`YAML 구문 주의사항 ${issues.length}건`, 'YAML 들여쓰기 및 구문을 확인하세요.', issues);
    return pass('docker-compose.yml 및 CI 워크플로 YAML 구문 정상');
  });
}

