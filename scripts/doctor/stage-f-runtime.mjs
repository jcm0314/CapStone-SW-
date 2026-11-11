// [f] 런타임 스모크: 포트 점유, Express 게이트웨이 기동 후 엔드포인트/헤더/오류 처리 검사,
//     proxyServer.js 기동, vite preview 로 빌드 산출물 서빙 확인.
// 안전: Gemini 키 환경변수를 비운 상태로 기동하며, 외부 AI 호출을 유발하는 요청(name+rawText 포함 evaluate)은 보내지 않는다.
import path from 'node:path';
import {
  startProcess, killTree, getFreePort, portStatus, waitForPort, httpReq, readText, exists,
} from './lib.mjs';
import { resolveBin } from './stage-e-tests.mjs';

function safeEnv(extra) {
  const env = { ...process.env, ...extra };
  for (const k of ['GEMINI_API_KEY', 'VERTEX_API_KEY', 'VITE_GEMINI_API_KEY', 'GCP_PROJECT_ID', 'GOOGLE_APPLICATION_CREDENTIALS', 'BIGQUERY_DATASET_ID']) env[k] = '';
  env.FORCE_COLOR = '0'; env.NO_COLOR = '1'; env.BROWSER = 'none';
  return env;
}

const tailOf = (t, n = 12) => (t || '').trim().split('\n').slice(-n);

export async function run(ctx, { pass, warn, fail, skip }) {
  const { root } = ctx;

  // f.ports — 개발/운영 포트 점유 확인
  await ctx.check({ id: 'f.ports', title: '로컬 포트 점유 확인' }, async () => {
    const vitePort = ctx.state.vitePort || Number((readText(path.join(root, 'vite.config.js')) || '').match(/port\s*:\s*(\d+)/)?.[1]) || 5173;
    const list = [
      [vitePort, `vite dev (vite.config.js server.port)`],
      [5173, 'vite dev 기본 포트'],
      [4173, 'vite preview 기본 포트'],
      [3001, '게이트웨이 server/index.js 기본 PORT / docker-compose api-gateway'],
      [4000, 'server/proxyServer.js 기본 PORT'],
      [80, 'docker-compose frontend (80:80)'],
      [6379, 'docker-compose redis-cache'],
      [8080, 'Cloud Run/컨테이너 PORT'],
    ];
    const uniq = [...new Map(list.map((x) => [x[0], x])).values()];
    const busy = []; const details = [];
    for (const [p, why] of uniq) {
      const st = await portStatus(p);
      details.push(`${p}: ${st === 'free' ? '사용 가능' : st === 'busy' ? '사용 중' : '권한 필요(1024 미만)'} — ${why}`);
      if (st === 'busy') busy.push(`${p}(${why})`);
    }
    if (busy.length) {
      const fix = process.platform === 'win32'
        ? 'PowerShell: `Get-NetTCPConnection -LocalPort <포트> | Select OwningProcess` → `Stop-Process -Id <PID>` (또는 netstat -ano | findstr :<포트>)'
        : '`lsof -i :<포트>` 또는 `ss -ltnp | grep <포트>` 로 PID 확인 후 종료. Windows 쪽 프로세스가 WSL 포트를 점유할 수도 있음';
      return warn(`사용 중인 포트: ${busy.join(', ')} — 해당 서비스 기동 시 EADDRINUSE`, `${fix}. 또는 PORT=<다른 포트> 로 실행 / vite --port <다른 포트>`, details);
    }
    return pass('주요 포트 모두 사용 가능', details);
  });

  // ---------------- 게이트웨이 스모크 ----------------
  const entry = 'server/index.js';
  const gw = { base: null, proc: null };
  ctx.setFact('gatewayUp', false, '게이트웨이 기동 실패/미실행 (f.gw.start 참고)');
  try {
    await ctx.check({ id: 'f.gw.start', title: `게이트웨이 기동 (node ${entry}, 임의 포트)`, needs: ['nodeModules'] }, async () => {
      if (!exists(path.join(root, entry))) return fail(`${entry} 없음`, '게이트웨이 엔트리 경로를 확인하세요.');
      const src = readText(path.join(root, entry)) || '';
      if (!/process\.env\.PORT/.test(src)) return warn(`${entry} 가 PORT 환경변수를 읽지 않음 — 임의 포트 기동 불가, Cloud Run(8080) 배포 실패 위험`, 'const PORT = process.env.PORT || 3001; 형태로 수정하세요.');
      const port = await getFreePort();
      const { child, out } = startProcess(process.execPath, [entry], { cwd: root, env: safeEnv({ PORT: String(port), NODE_ENV: 'production' }) });
      gw.proc = child;
      const up = await waitForPort(port, '127.0.0.1', 20_000, () => child.exitCode === null);
      if (!up) {
        const t = out.text;
        let fix = '`node server/index.js` 를 직접 실행해 오류를 확인하세요.';
        if (/ERR_MODULE_NOT_FOUND|Cannot find (module|package)/.test(t)) fix = '의존성 누락: `npm ci` (서버 패키지는 dependencies에 있어야 함)';
        else if (/EADDRINUSE/.test(t)) fix = '포트 충돌: 다른 PORT 사용';
        return fail(`기동 실패 (${child.exitCode !== null ? `프로세스 종료 code=${child.exitCode}` : '20초 내 포트 미개방'})`, fix, tailOf(t));
      }
      gw.base = `http://127.0.0.1:${port}`;
      ctx.setFact('gatewayUp', true);
      return pass(`포트 ${port}에서 기동 (GEMINI_API_KEY 비운 상태, NODE_ENV=production)`, tailOf(out.text, 5));
    });

    const N = ['gatewayUp'];

    await ctx.check({ id: 'f.gw.health', title: 'GET /health', needs: N }, async () => {
      const r = await httpReq(`${gw.base}/health`, { timeout: 5000 });
      if (r.error) return fail(`요청 실패: ${r.error}`, '게이트웨이 로그 확인');
      let j = null; try { j = JSON.parse(r.body); } catch { /* 무시 */ }
      if (r.status !== 200) return fail(`HTTP ${r.status}`, 'K8s/Cloud Run/compose 헬스체크가 실패합니다. /health 라우트를 확인하세요.');
      if (!j || j.status !== 'UP') return warn(`200이지만 본문이 {status:"UP"} 형식이 아님`, 'server/index.test.js 기대값과 일치시키세요.', [r.body.slice(0, 200)]);
      return pass(`200 ${JSON.stringify({ status: j.status, service: j.service })}`);
    });

    await ctx.check({ id: 'f.gw.root', title: 'GET / (서비스 정보)', needs: N }, async () => {
      const r = await httpReq(`${gw.base}/`, { timeout: 5000 });
      if (r.error) return fail(`요청 실패: ${r.error}`, '게이트웨이 로그 확인');
      if (r.status !== 200) return warn(`HTTP ${r.status}`, '루트 정보 엔드포인트 확인');
      let j = null; try { j = JSON.parse(r.body); } catch { /* 무시 */ }
      return pass(`200 ${j?.service || ''} ${j?.version || ''}`.trim(), j?.endpoints ? Object.entries(j.endpoints).map(([k, v]) => `${k}: ${v}`) : []);
    });

    await ctx.check({ id: 'f.gw.ratelimit', title: '레이트 리밋 헤더 (/api/*)', needs: N }, async () => {
      const r = await httpReq(`${gw.base}/api/v1/tenants`, { timeout: 5000 });
      if (r.error) return fail(`요청 실패: ${r.error}`, '게이트웨이 로그 확인');
      const h = r.headers;
      const limit = h['ratelimit-limit'] ?? (h.ratelimit ? (String(h.ratelimit).match(/limit=(\d+)/)?.[1] ?? h.ratelimit) : null) ?? h['x-ratelimit-limit'];
      const remaining = h['ratelimit-remaining'] ?? (String(h.ratelimit || '').match(/remaining=(\d+)/)?.[1]) ?? h['x-ratelimit-remaining'];
      const policy = h['ratelimit-policy'];
      const details = [`HTTP ${r.status}`, `RateLimit-Limit=${limit ?? '없음'} Remaining=${remaining ?? '없음'} Reset=${h['ratelimit-reset'] ?? '-'} Policy=${policy ?? '-'}`];
      if (!limit) return warn('레이트 리밋 헤더 없음 — express-rate-limit 미적용 또는 standardHeaders:false', "app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: N, standardHeaders: true }))", details);
      // README 표기와 비교
      const readme = readText(path.join(root, 'README.md')) || '';
      const claim = readme.match(/Rate Limit\s*(\d+)\s*\/\s*15m/i);
      const hres = await httpReq(`${gw.base}/health`, { timeout: 5000 });
      if (hres.headers?.['ratelimit-limit'] || hres.headers?.ratelimit) details.push('참고: /health 에도 레이트 리밋이 적용됨 (헬스체크 폭주 시 429 → 재시작 루프 위험)');
      else details.push('/health 는 레이트 리밋 제외 (정상)');
      details.push("app.set('trust proxy', 1) 사용 — 프록시가 2단 이상(LB→nginx→app)이면 클라이언트 IP 식별이 틀어질 수 있음");
      if (claim && Number(claim[1]) !== Number(limit)) return warn(`실제 한도 ${limit}/15분 ≠ README 표기 "${claim[0]}"`, 'README의 아키텍처 다이어그램 수치나 server/index.js의 max 값을 일치시키세요.', details);
      return pass(`한도 ${limit} (남은 ${remaining})`, details);
    });

    await ctx.check({ id: 'f.gw.cors', title: 'CORS (preflight / 허용 Origin)', needs: N }, async () => {
      const evil = 'http://doctor-untrusted.invalid';
      const r = await httpReq(`${gw.base}/api/v1/shares`, {
        method: 'OPTIONS', timeout: 5000,
        headers: { Origin: evil, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
      });
      if (r.error) return fail(`preflight 실패: ${r.error}`, 'cors 미들웨어 확인');
      const acao = r.headers['access-control-allow-origin'];
      const details = [`OPTIONS → HTTP ${r.status}`, `Access-Control-Allow-Origin: ${acao ?? '(없음)'}`, `Allow-Methods: ${r.headers['access-control-allow-methods'] ?? '-'}`, `Allow-Headers: ${r.headers['access-control-allow-headers'] ?? '-'}`];
      const ok = await httpReq(`${gw.base}/health`, { headers: { Origin: 'http://localhost:3000' }, timeout: 5000 });
      details.push(`Origin http://localhost:3000 → ACAO: ${ok.headers?.['access-control-allow-origin'] ?? '(없음)'}`);
      if (r.status >= 400) return fail(`preflight가 HTTP ${r.status} — 브라우저 POST가 CORS 오류로 차단됨`, 'cors()가 라우트보다 먼저 등록되고 OPTIONS를 처리하는지 확인', details);
      if (acao === '*' || acao === evil) {
        return warn(`모든 Origin 허용(${acao === '*' ? '*' : '요청 Origin 반사'}) — CORS_ALLOWED_ORIGINS 미설정 시 기본 동작`, '운영 환경에 CORS_ALLOWED_ORIGINS=https://<프론트 도메인> 설정 (docker-compose.yml, infra/k8s/configmap.yaml에는 있음, Cloud Run/terraform에는 없음)', details);
      }
      return pass('신뢰하지 않는 Origin 거부', details);
    });

    await ctx.check({ id: 'f.gw.security-headers', title: '보안 응답 헤더', needs: N }, async () => {
      const r = await httpReq(`${gw.base}/health`, { timeout: 5000 });
      if (r.error) return fail(`요청 실패: ${r.error}`, '게이트웨이 로그 확인');
      const h = r.headers; const missing = []; const details = [];
      if (h['x-powered-by']) missing.push(`X-Powered-By: ${h['x-powered-by']} 노출 (프레임워크 식별)`);
      for (const [k, why] of [['x-content-type-options', 'MIME 스니핑 방지'], ['x-frame-options', '클릭재킹 방지(또는 CSP frame-ancestors)'], ['strict-transport-security', 'HTTPS 강제(TLS 종단 뒤에서도 권장)'], ['referrer-policy', '리퍼러 노출 제한'], ['content-security-policy', 'API 응답 CSP']]) {
        if (!h[k]) missing.push(`${k} 없음 — ${why}`); else details.push(`${k}: ${h[k]}`);
      }
      if (missing.length) return warn(`보안 헤더 미흡 ${missing.length}건 (${missing[0]})`, '`npm i helmet` 후 server/index.js에 app.use(helmet()) 및 app.disable("x-powered-by") 추가', [...missing, ...details]);
      return pass('주요 보안 헤더 존재', details);
    });

    await ctx.check({ id: 'f.gw.404', title: '존재하지 않는 경로 → 404', needs: N }, async () => {
      const r = await httpReq(`${gw.base}/api/v1/__doctor_not_found__`, { timeout: 5000 });
      const r2 = await httpReq(`${gw.base}/api/v1/evaluate`, { timeout: 5000 }); // GET (POST 전용 라우트)
      if (r.error) return fail(`요청 실패: ${r.error}`, '게이트웨이 로그 확인');
      const ct = r.headers['content-type'] || '';
      const details = [`GET /api/v1/__doctor_not_found__ → ${r.status} (${ct})`, `GET /api/v1/evaluate → ${r2.status} (${r2.headers?.['content-type'] || ''})`];
      if (r.status !== 404) return fail(`HTTP ${r.status} (404 기대)`, '마지막에 404 핸들러 추가', details);
      if (!/json/.test(ct)) return warn('404 응답이 JSON이 아닌 HTML("Cannot GET …") — API 클라이언트의 res.json()이 SyntaxError', "라우트 뒤에 app.use('/api', (req,res)=>res.status(404).json({error:'NOT_FOUND'})) 추가", details);
      return pass('404 JSON', details);
    });

    await ctx.check({ id: 'f.gw.bad-json', title: '잘못된 JSON 본문 → 4xx (500 아님)', needs: N }, async () => {
      const r = await httpReq(`${gw.base}/api/v1/shares`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"shareId": "x", broken', timeout: 5000 });
      if (r.error) return fail(`요청 실패: ${r.error}`, '게이트웨이 로그 확인');
      const ct = r.headers['content-type'] || '';
      const leaks = /\n\s+at\s|node_modules|[A-Za-z]:\\|\/app\/|\/mnt\//.test(r.body);
      const details = [`HTTP ${r.status} (${ct})`, `본문 앞부분: ${r.body.replace(/\s+/g, ' ').slice(0, 160)}`];
      if (r.status >= 500) return fail(`HTTP ${r.status} — 클라이언트 입력 오류가 서버 오류로 처리됨`, 'JSON 파싱 오류 핸들러 추가: app.use((err,req,res,next)=> err.type==="entity.parse.failed" ? res.status(400).json({error:"INVALID_JSON"}) : next(err))', details);
      if (r.status !== 400) return warn(`HTTP ${r.status} (400 기대)`, 'JSON 파싱 오류는 400으로 응답하세요.', details);
      if (leaks) return warn('400이지만 응답에 스택 트레이스/서버 경로 노출', 'NODE_ENV=production 확인 및 JSON 오류 핸들러로 메시지 통제', details);
      if (!/json/.test(ct)) return warn('400이지만 HTML 오류 페이지로 응답 (JSON 아님)', 'JSON 오류 핸들러 추가 (위 참고)', details);
      return pass('400 JSON', details);
    });

    await ctx.check({ id: 'f.gw.validation', title: '필수값 검증 → 400 (외부 AI 호출 없음)', needs: N }, async () => {
      // name/rawText 없이 호출 → 키 확인/외부 호출 이전 단계에서 400이어야 함
      const r1 = await httpReq(`${gw.base}/api/v1/evaluate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', timeout: 8000 });
      const r2 = await httpReq(`${gw.base}/api/v1/shares`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', timeout: 5000 });
      const r3 = await httpReq(`${gw.base}/api/v1/shares/__doctor_missing__/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', timeout: 5000 });
      const details = [`POST /api/v1/evaluate {} → ${r1.status ?? r1.error}`, `POST /api/v1/shares {} → ${r2.status ?? r2.error}`, `POST /api/v1/shares/<없음>/notes {} → ${r3.status ?? r3.error}`];
      const bad = [r1, r2, r3].filter((r) => r.error || r.status >= 500);
      if (bad.length) return fail(`검증 누락으로 5xx/오류 ${bad.length}건`, '요청 본문 검증을 라우트 첫 단계에서 수행하세요.', details);
      if ([r1, r2, r3].some((r) => r.status !== 400 && r.status !== 404)) return warn('일부 엔드포인트가 400/404 이외 응답', '필수값 누락 시 400을 반환하세요.', details);
      return pass('필수값 누락 시 400', details);
    });

    await ctx.check({ id: 'f.gw.shares', title: '공유 스냅샷 왕복 (POST → GET → notes)', needs: N }, async () => {
      const id = `doctor_${Date.now()}`;
      const body = JSON.stringify({ shareId: id, applicantSnapshot: { id: 'doctor', name: 'doctor', analysis: { summary: { totalScore: 1 } } }, expiresHours: 1 });
      const c = await httpReq(`${gw.base}/api/v1/shares`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, timeout: 5000 });
      const g = await httpReq(`${gw.base}/api/v1/shares/${id}`, { timeout: 5000 });
      const n = await httpReq(`${gw.base}/api/v1/shares/${id}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: 'doctor note' }), timeout: 5000 });
      const details = [`POST → ${c.status}`, `GET → ${g.status}`, `POST notes → ${n.status}`, '저장소는 프로세스 메모리(Map) — 재시작/다중 인스턴스(Cloud Run, K8s replicas: 2)에서는 공유 링크가 사라지거나 404 (README "알려진 한계")'];
      if (c.status !== 201 || g.status !== 200 || n.status !== 200) return fail('공유 API 왕복 실패', 'server/index.js /api/v1/shares 라우트 확인 (npx vitest run server/)', details);
      return pass('201 → 200 → 200', details);
    });

    await ctx.check({ id: 'f.gw.body-limit', title: '본문 크기 제한 (10mb 초과 → 413)', needs: N }, async () => {
      const big = '{"shareId":"x","applicantSnapshot":"' + 'a'.repeat(11 * 1024 * 1024) + '"}';
      const r = await httpReq(`${gw.base}/api/v1/shares`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: big, timeout: 15000 });
      if (r.error) return warn(`요청 오류: ${r.error} (서버가 연결을 끊었을 수 있음)`, 'express.json({ limit }) 및 프록시 body 제한(nginx client_max_body_size, ingress proxy-body-size) 확인');
      if (r.status === 413) return pass('413 Payload Too Large', ['ingress annotation proxy-body-size: 10m 과 일치']);
      if (r.status >= 500) return fail(`HTTP ${r.status}`, '크기 초과 오류가 500으로 처리됨 — 오류 핸들러 확인');
      return warn(`HTTP ${r.status} (413 기대)`, 'express.json({ limit: "10mb" }) 확인');
    });
  } finally {
    if (gw.proc) killTree(gw.proc);
  }

  // f.proxy — server/proxyServer.js (엔터프라이즈 Vertex 프록시) 기동 확인
  await ctx.check({ id: 'f.proxy', title: 'server/proxyServer.js 기동 (GCP 자격 없이)', needs: ['nodeModules'] }, async () => {
    const f = 'server/proxyServer.js';
    if (!exists(path.join(root, f))) return skip('파일 없음');
    const refs = ['Dockerfile', 'Dockerfile.server', 'server/Dockerfile', 'docker-compose.yml', 'cloudbuild.yaml', 'package.json'].filter((x) => /proxyServer/.test(readText(path.join(root, x)) || ''));
    const port = await getFreePort();
    const { child, out } = startProcess(process.execPath, [f], { cwd: root, env: safeEnv({ PORT: String(port), NODE_ENV: 'production' }) });
    try {
      const up = await waitForPort(port, '127.0.0.1', 30_000, () => child.exitCode === null);
      if (!up) return fail(`기동 실패 (${child.exitCode !== null ? `종료 code=${child.exitCode}` : '30초 내 포트 미개방'})`, '`node server/proxyServer.js` 직접 실행으로 확인 (@google-cloud/* 설치 여부)', tailOf(out.text));
      const h = await httpReq(`http://127.0.0.1:${port}/health`, { timeout: 5000 });
      const e = await httpReq(`http://127.0.0.1:${port}/api/v1/enterprise/vertex-evaluator`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'doctor', applyJobId: 'dev', rawText: 'doctor smoke' }), timeout: 10000 });
      const details = [`GET /health → ${h.status ?? h.error}`, `POST vertex-evaluator (GCP_PROJECT_ID 비움) → ${e.status ?? e.error} (고정 목업 응답)`, `배포 설정에서 참조: ${refs.join(', ') || '없음 (Dockerfile/compose/CI 어디에서도 실행하지 않음)'}`];
      if (e.status >= 500 || e.error) return fail('vertex-evaluator 폴백 응답 실패', 'server/proxyServer.js 확인', details);
      if (h.status === 404 || !refs.length) return warn(`기동은 되지만 ${h.status === 404 ? '/health 엔드포인트 없음' : ''}${h.status === 404 && !refs.length ? ', ' : ''}${!refs.length ? '어떤 배포 설정에서도 사용되지 않음' : ''}`, '사용하지 않는 서버면 제거하거나, 사용한다면 /health 추가 및 Dockerfile/compose에 서비스로 등록하세요. (server/index.js 에도 같은 /api/v1/enterprise/vertex-evaluator 라우트가 있어 혼동 소지)', details);
      return pass(`포트 ${port}에서 기동`, details);
    } finally { killTree(child); }
  });

  // f.preview — vite preview 로 빌드 산출물 서빙
  await ctx.check({ id: 'f.preview', title: 'vite preview — index.html/자산/SPA 폴백', needs: ['nodeModules', 'buildDir'] }, async () => {
    const bin = resolveBin(root, 'vite', 'vite');
    const dir = ctx.state.buildDir;
    const port = await getFreePort();
    const { child, out } = startProcess(process.execPath, [bin, 'preview', '--outDir', dir, '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: root, env: safeEnv({}) });
    try {
      const up = await waitForPort(port, '127.0.0.1', 20_000, () => child.exitCode === null);
      if (!up) return fail('vite preview 기동 실패', '`npm run build && npm run preview` 직접 실행', tailOf(out.text));
      const base = `http://127.0.0.1:${port}`;
      const idx = await httpReq(`${base}/`, { timeout: 8000 });
      if (idx.status !== 200) return fail(`GET / → ${idx.status ?? idx.error}`, '빌드 산출물(index.html) 확인');
      const details = [`GET / → 200 (${(idx.body || '').length} bytes)`];
      const problems = [];
      if (!/<div[^>]+id=["']root["']/.test(idx.body)) problems.push('index.html에 #root 없음');
      const assets = [...new Set([...idx.body.matchAll(/(?:src|href)=["'](\/[^"']+\.(?:js|mjs|css|svg|png|ico|jpg|webp|woff2?))["']/g)].map((m) => m[1]))];
      for (const a of assets) {
        const r = await httpReq(`${base}${a}`, { timeout: 8000, maxBody: 1024 });
        const ct = r.headers?.['content-type'] || '';
        details.push(`${a} → ${r.status ?? r.error} ${ct}`);
        if (r.status !== 200) problems.push(`${a} → ${r.status ?? r.error}${a === '/vite.svg' ? ' (index.html의 favicon이 public/에 없음)' : ''}`);
        else if (/\.m?js$/.test(a) && !/javascript/.test(ct)) problems.push(`${a} Content-Type ${ct} — module 스크립트는 JS MIME 필요 (빈 화면 원인)`);
      }
      const deep = await httpReq(`${base}/shared/eval_doctor?x=1`, { timeout: 8000 });
      details.push(`GET /shared/eval_doctor (SPA 딥링크) → ${deep.status}${/id=["']root["']/.test(deep.body || '') ? ' index.html' : ''}`);
      if (deep.status !== 200) problems.push(`SPA 딥링크 → ${deep.status} (preview 기준; nginx는 try_files 폴백 필요)`);
      for (const w of (ctx.state.buildFiles || []).filter((f) => /worker/i.test(f) && /\.m?js$/.test(f))) {
        const r = await httpReq(`${base}/${w}`, { timeout: 8000, maxBody: 1024 });
        details.push(`Worker 청크 /${w} → ${r.status}`);
        if (r.status !== 200) problems.push(`Worker 청크 /${w} → ${r.status}`);
      }
      if (problems.length) {
        const onlyFavicon = problems.every((p) => p.includes('favicon'));
        return (onlyFavicon ? warn : fail)(problems[0], onlyFavicon ? 'public/vite.svg 추가 또는 index.html의 <link rel="icon" href="/vite.svg"> 수정' : '빌드 산출물과 base 설정을 확인하세요.', [...problems.slice(1), ...details]);
      }
      return pass(`index.html + 자산 ${assets.length}개 200, SPA 딥링크 200`, details);
    } finally { killTree(child); }
  });
}
