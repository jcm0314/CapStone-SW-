// [e] 테스트 & 빌드: 정적 테스트 집계, 문서 수치 비교, vitest run(JSON 리포트), 서버 테스트 분리 요약,
//     vite build(임시 outDir) 번들 크기/대형 청크/Worker 청크/번들 내 비밀값 스캔
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import { run as exec, walk, readText, readJson, exists, fmtBytes, stripJsComments } from './lib.mjs';

const TEST_RE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const LARGE_CHUNK = 500 * 1024; // vite 기본 chunkSizeWarningLimit (500 kB)

/** package.json bin 필드로 실행 파일 경로를 찾는다 */
export function resolveBin(root, pkgName, binName) {
  const dir = path.join(root, 'node_modules', ...pkgName.split('/'));
  const pj = readJson(path.join(dir, 'package.json'));
  if (!pj) return null;
  const rel = typeof pj.bin === 'string' ? pj.bin : pj.bin?.[binName || pkgName.split('/').pop()];
  if (!rel) return null;
  const p = path.join(dir, rel);
  return exists(p) ? p : null;
}

/** 문서에 적힌 테스트 수치 수집 */
function collectDocClaims(root) {
  const claims = [];
  const files = ['README.md', 'docs/MILESTONES.md', 'CONTRIBUTING.md', 'docs/ARCHITECTURE.md'];
  const pats = [
    { re: /Vitest-(\d+)_Unit_Tests/g, tests: 1 },
    { re: /(\d+)\s*개\s*파일\s*,?\s*(\d+)\s*개\s*테스트/g, files: 1, tests: 2 },
    { re: /(\d+)\s*개\s*파일\s+(\d+)\s*건/g, files: 1, tests: 2 },
    { re: /테스트\s*(\d+)\s*건/g, tests: 1 },
    { re: /(\d+)\s*tests?\s*(?:\/|,|across|in)\s*(\d+)\s*(?:suites?|files?)/gi, tests: 1, files: 2 },
    { re: /(\d+)\s*개\s*(?:의\s*)?(?:단위\s*)?테스트(?!\s*파일)/g, tests: 1 },
    { re: /(\d+)\s*개\s*(?:테스트\s*)?(?:스위트|suite)/gi, files: 1 },
  ];
  for (const f of files) {
    const t = readText(path.join(root, f));
    if (!t) continue;
    const lines = t.split(/\r?\n/);
    lines.forEach((line, i) => {
      const seen = new Set();
      for (const p of pats) {
        for (const m of line.matchAll(p.re)) {
          const key = `${m.index}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const c = { src: `${f}:${i + 1}`, text: m[0] };
          if (p.tests) c.tests = Number(m[p.tests]);
          if (p.files) c.files = Number(m[p.files]);
          if (c.tests != null && c.tests < 3) continue; // 노이즈 제거
          claims.push(c);
        }
      }
    });
  }
  // 같은 줄에서 겹치는 매치 제거 (더 구체적인 것 우선)
  const byLine = new Map();
  for (const c of claims) {
    const prev = byLine.get(c.src + c.tests + c.files);
    if (!prev) byLine.set(c.src + c.tests + c.files, c);
  }
  return [...byLine.values()];
}

/** 정적 테스트 집계: 테스트 파일 수, it()/test() 호출 수 */
function staticTestCount(root) {
  const files = walk(root, '', { filter: (f) => TEST_RE.test(f) });
  let tests = 0; let eachCalls = 0; const perFile = [];
  for (const f of files) {
    const src = stripJsComments(readText(path.join(root, f)) || '');
    const n = (src.match(/(?:^|[^.\w])(?:it|test)(?:\.(?:only|concurrent|sequential|fails))?\s*\(/g) || []).length;
    const each = (src.match(/(?:^|[^.\w])(?:it|test)\.each\s*[(`]/g) || []).length;
    const skipped = (src.match(/(?:^|[^.\w])(?:it|test)\.(?:skip|todo)\s*\(/g) || []).length;
    tests += n; eachCalls += each;
    perFile.push(`${f}: ${n}개${each ? ` (+each ${each})` : ''}${skipped ? ` (skip/todo ${skipped})` : ''}`);
  }
  return { files, tests, eachCalls, perFile };
}

export async function run(ctx, { pass, warn, fail, skip }) {
  const { root, pkg } = ctx;
  const nmOk = (await ctx.need('nodeModules')).ok;
  const stat = staticTestCount(root);
  const claims = collectDocClaims(root);

  // e.static-count
  await ctx.check({ id: 'e.static-count', title: '테스트 정적 집계 (파일/케이스 수)' }, async () => {
    if (!stat.files.length) return warn('테스트 파일 없음', 'src/**/*.test.js 형식으로 테스트를 추가하세요.');
    ctx.state.staticTests = stat;
    return pass(`테스트 파일 ${stat.files.length}개, it/test 호출 ${stat.tests}개${stat.eachCalls ? ` (+ it.each ${stat.eachCalls}개, 실행 시 늘어날 수 있음)` : ''}`, stat.perFile);
  });

  // e.vitest — 실제 실행
  let vitestSummary = null;
  await ctx.check({ id: 'e.vitest', title: 'Vitest 전체 실행 (vitest run)', needs: ['nodeModules'] }, async () => {
    const bin = resolveBin(root, 'vitest', 'vitest');
    if (!bin) return fail('vitest 실행 파일을 찾을 수 없음 (node_modules/vitest)', '`npm ci`');
    const outFile = path.join(os.tmpdir(), `doctor-vitest-${process.pid}-${Date.now()}.json`);
    const args = [bin, 'run', '--reporter=default', '--reporter=json', `--outputFile.json=${outFile}`];
    const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1', BROWSER: 'none' };
    // 게이트웨이 테스트가 실제 키로 외부 호출하지 않도록 키 제거
    for (const k of ['ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'VERTEX_API_KEY', 'VITE_GEMINI_API_KEY']) env[k] = '';
    let r = await exec(process.execPath, args, { cwd: root, timeout: 600_000, env });
    let report = readJson(outFile);
    if (!report && /outputFile|Unknown option|unknown/i.test(r.stderr)) {
      // 구버전 CLI 호환: 단일 json 리포터
      r = await exec(process.execPath, [bin, 'run', '--reporter=json', `--outputFile=${outFile}`], { cwd: root, timeout: 600_000, env });
      report = readJson(outFile);
    }
    try { fs.unlinkSync(outFile); } catch { /* 무시 */ }
    const tail = (r.stdout + '\n' + r.stderr).trim().split('\n').slice(-25);
    if (r.timedOut) return fail('vitest가 10분 내에 끝나지 않음 (watch 모드 또는 열린 핸들)', '`npx vitest run --reporter=verbose` 로 멈추는 테스트를 찾으세요.', tail);
    if (!report) {
      const m = (r.stdout + r.stderr).match(/Tests\s+(?:(\d+)\s+failed\s*\|\s*)?(\d+)\s+passed\s*\((\d+)\)/);
      if (m) {
        vitestSummary = { total: Number(m[3]), passed: Number(m[2]), failed: Number(m[1] || 0), files: null, failedNames: [] };
        return (vitestSummary.failed ? fail : pass)(`통과 ${m[2]} / 실패 ${m[1] || 0} / 전체 ${m[3]} (JSON 리포트 없음, 출력에서 추출)`, '실패 테스트는 `npx vitest run` 출력 참고', tail);
      }
      return fail(`vitest 실행 실패 (exit ${r.code}) — 결과를 해석할 수 없음`, '`npx vitest run` 을 직접 실행해 오류를 확인하세요. (jsdom 미설치, 설정 오류, Node 버전 미달이 흔한 원인)', tail);
    }
    const results = report.testResults || [];
    const failedNames = [];
    const serverRes = { passed: 0, failed: 0, files: 0 };
    const fileErrors = [];
    for (const tr of results) {
      const rel = path.relative(root, tr.name || '').replace(/\\/g, '/');
      const isServer = rel.startsWith('server/');
      if (isServer) serverRes.files++;
      if ((tr.status === 'failed') && !(tr.assertionResults || []).some((a) => a.status === 'failed')) {
        fileErrors.push(`${rel}: 파일 수준 오류 — ${(tr.message || '').split('\n')[0].slice(0, 200)}`);
      }
      for (const a of tr.assertionResults || []) {
        if (isServer) { if (a.status === 'passed') serverRes.passed++; else if (a.status === 'failed') serverRes.failed++; }
        if (a.status === 'failed') failedNames.push(`${rel} › ${a.fullName || a.title} — ${(a.failureMessages || [''])[0].split('\n')[0].slice(0, 200)}`);
      }
    }
    vitestSummary = {
      total: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests, skipped: (report.numPendingTests || 0) + (report.numTodoTests || 0),
      files: results.length, failedFiles: report.numFailedTestSuites, failedNames, server: serverRes, ms: r.ms,
    };
    ctx.state.vitest = vitestSummary;
    const head = `통과 ${vitestSummary.passed} / 실패 ${vitestSummary.failed} / 건너뜀 ${vitestSummary.skipped} · 전체 ${vitestSummary.total}개, 파일 ${results.length}개 (${(r.ms / 1000).toFixed(1)}초)`;
    const details = [...fileErrors, ...failedNames];
    const unhandled = (r.stdout + r.stderr).match(/Unhandled (?:Rejection|Error)s?/g);
    if (unhandled) details.push(`경고: Vitest가 처리되지 않은 오류 ${unhandled.length}건을 보고 (테스트 통과여도 exit 1 가능)`);
    if (vitestSummary.failed || fileErrors.length || (r.code !== 0 && !vitestSummary.failed)) {
      return fail(`${head}${r.code !== 0 && !vitestSummary.failed && !fileErrors.length ? ` — exit ${r.code}` : ''}`, '실패 테스트를 개별 실행해 확인: `npx vitest run <파일> -t "<테스트명>"`', details.length ? details : tail);
    }
    return pass(head, details);
  });

  // e.server-tests — 게이트웨이 테스트 별도 요약 (같은 vitest 스위트에 포함)
  await ctx.check({ id: 'e.server-tests', title: '서버(게이트웨이) 테스트 요약', needs: ['nodeModules'] }, async () => {
    const serverTests = stat.files.filter((f) => f.startsWith('server/'));
    if (!serverTests.length) return warn('server/ 테스트 없음', 'server/index.test.js 처럼 엔드포인트 테스트를 추가하세요.');
    if (!vitestSummary?.server) return skip('vitest 결과 없음 (e.vitest 실패/생략)');
    const s = vitestSummary.server;
    const note = `별도 서버 테스트 스크립트 없음 — 루트 vitest 스위트에 포함되어 함께 실행됨 (${serverTests.join(', ')})`;
    if (s.failed) return fail(`서버 테스트 실패 ${s.failed}건 (통과 ${s.passed})`, '`npx vitest run server/` 로 확인', [note]);
    if (!s.files) return warn('vitest 결과에 server/ 테스트가 없음 (include 패턴 확인)', 'vite.config.js test.include 가 server/ 를 제외하는지 확인', [note]);
    return pass(`서버 테스트 ${s.passed}건 통과 (파일 ${s.files}개)`, [note]);
  });

  // e.doc-claims — 문서의 테스트 수치와 비교
  await ctx.check({ id: 'e.doc-claims', title: '문서(README 등)의 테스트 수치 ↔ 실제' }, async () => {
    const actualTests = vitestSummary?.total ?? null;
    const actualFiles = vitestSummary?.files ?? null;
    const basis = actualTests != null ? '실행 결과' : '정적 집계';
    const T = actualTests ?? stat.tests; const F = actualFiles ?? stat.files.length;
    if (!claims.length) return pass(`문서에 테스트 수치 표기 없음 (실제 ${T}개/${F}파일)`);
    const mism = []; const ok = [];
    for (const c of claims) {
      const bad = (c.tests != null && c.tests !== T) || (c.files != null && c.files !== F);
      (bad ? mism : ok).push(`${c.src} "${c.text}"${bad ? ` ≠ 실제 ${c.tests != null ? `${T}개 테스트` : ''}${c.tests != null && c.files != null ? ', ' : ''}${c.files != null ? `${F}개 파일` : ''}` : ' 일치'}`);
    }
    const details = [`비교 기준: ${basis} — 테스트 ${T}개, 파일 ${F}개`, ...mism, ...ok];
    if (mism.length) return warn(`문서 수치 불일치 ${mism.length}건 (예: ${mism[0]})`, `README 배지(Vitest-N_Unit_Tests)와 본문, docs/MILESTONES.md 의 수치를 실제 값(${T}개 / ${F}개 파일)으로 갱신하세요.`, details);
    return pass(`문서 수치 ${claims.length}건 모두 실제(${T}개/${F}파일)와 일치`, details);
  });

  // e.build — vite build (임시 outDir, 저장소의 dist/는 건드리지 않음)
  ctx.setFact('buildDir', false, 'vite build 실패 또는 미실행 (e.build 참고)');
  await ctx.check({ id: 'e.build', title: 'vite build (프로덕션 빌드)', needs: ['nodeModules'] }, async () => {
    const bin = resolveBin(root, 'vite', 'vite');
    if (!bin) return fail('vite 실행 파일을 찾을 수 없음', '`npm ci`');
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-vite-build-'));
    const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', BROWSER: 'none', NODE_ENV: 'production' };
    const r = await exec(process.execPath, [bin, 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'info'], { cwd: root, timeout: 600_000, env });
    const outText = (r.stdout + '\n' + r.stderr);
    const tail = outText.trim().split('\n').slice(-20);
    if (r.timedOut) return fail('빌드가 10분 내에 끝나지 않음', '메모리 부족이면 NODE_OPTIONS=--max-old-space-size=4096', tail);
    if (r.code !== 0) {
      const errLine = outText.split('\n').find((l) => /error|Error|failed to resolve|Could not resolve/.test(l)) || `exit ${r.code}`;
      let fix = '`npm run build` 를 직접 실행해 오류 위치를 확인하세요.';
      if (/@rollup\/rollup-|@esbuild\/|Host version|platform/i.test(outText)) fix = 'node_modules가 다른 OS에서 설치됨: node_modules 삭제 후 현재 환경에서 `npm ci` (a.native-bin 참고)';
      else if (/heap out of memory|ENOMEM/i.test(outText)) fix = 'NODE_OPTIONS=--max-old-space-size=4096 npm run build';
      else if (/Could not resolve|failed to resolve import/i.test(outText)) fix = 'import 경로/대소문자 확인 (d.imports 참고)';
      return fail(`빌드 실패: ${errLine.trim().slice(0, 200)}`, fix, tail);
    }
    ctx.state.buildDir = outDir;
    ctx.setFact('buildDir', true, null, { dir: outDir });
    // 산출물 분석
    const files = walk(outDir, '', { exclude: new Set() });
    let total = 0; let totalGz = 0;
    const rows = []; const large = [];
    for (const f of files) {
      const buf = fs.readFileSync(path.join(outDir, f));
      total += buf.length;
      if (/\.(js|css|html|mjs)$/.test(f)) {
        const gz = zlib.gzipSync(buf, { level: 9 }).length;
        totalGz += gz;
        rows.push({ f, size: buf.length, gz });
        if (/\.(js|mjs)$/.test(f) && buf.length > LARGE_CHUNK) large.push(`${f} ${fmtBytes(buf.length)} (gzip ${fmtBytes(gz)})`);
      }
    }
    rows.sort((a, b) => b.size - a.size);
    ctx.state.buildFiles = files;
    const details = [`출력 폴더(임시): ${outDir}`, `전체 ${files.length}개 파일 ${fmtBytes(total)} · JS/CSS/HTML gzip 합계 ${fmtBytes(totalGz)} · ${(r.ms / 1000).toFixed(1)}초`];
    for (const x of rows.slice(0, 12)) details.push(`${x.f}  ${fmtBytes(x.size)}  (gzip ${fmtBytes(x.gz)})`);
    const workerChunks = files.filter((f) => /worker/i.test(f));
    details.push(`Worker 관련 청크: ${workerChunks.join(', ') || '없음'}`);
    const warnLines = outText.split('\n').filter((l) => /\(!\)|warning|Some chunks are larger/i.test(l)).map((l) => l.trim()).slice(0, 8);
    if (warnLines.length) details.push(...warnLines.map((l) => `빌드 경고: ${l}`));
    if (large.length) {
      return warn(`500 kB 초과 JS 청크 ${large.length}개: ${large[0]}`, '코드 분할 권장: 무거운 컴포넌트(recharts, pdfjs-dist, DepartmentCreditDashboard 등)를 React.lazy(() => import(...)) 로 지연 로드하거나 build.rollupOptions.output.manualChunks 로 vendor 분리', [...large.slice(1), ...details]);
    }
    return pass(`빌드 성공 · ${fmtBytes(total)} (gzip ${fmtBytes(totalGz)})`, details);
  });

  // e.bundle-secrets — 번들에 비밀값/키 패턴이 포함되었는지
  await ctx.check({ id: 'e.bundle-secrets', title: '빌드 번들 내 비밀값 노출 스캔', needs: ['buildDir'] }, async () => {
    const dir = ctx.state.buildDir;
    const hits = []; const urls = new Set();
    for (const f of walk(dir, '', { exclude: new Set(), filter: (x) => /\.(js|mjs|html|css|map)$/.test(x) })) {
      const t = readText(path.join(dir, f)) || '';
      if (/AIza[0-9A-Za-z_-]{35}/.test(t)) hits.push(`${f}: Google API 키 패턴(AIza…) 발견`);
      for (const m of t.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g)) {
        let role = '?';
        try { role = JSON.parse(Buffer.from(m[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()).role; } catch { /* 무시 */ }
        if (role === 'service_role') hits.push(`${f}: Supabase service_role JWT 발견 (치명적)`);
      }
      if (/sb_secret_[A-Za-z0-9_-]{10,}/.test(t)) hits.push(`${f}: Supabase secret 키 발견`);
      if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(t)) hits.push(`${f}: 개인키(PEM) 발견`);
      for (const m of t.matchAll(/https:\/\/[a-z0-9.-]+\.(?:run\.app|supabase\.co|googleapis\.com)[^\s"'`)]*/g)) urls.add(m[0].replace(/\?.*/, ''));
      if (f.endsWith('.map')) hits.push(`${f}: 소스맵이 배포 산출물에 포함됨 (원본 소스 노출)`);
    }
    const details = [...urls].slice(0, 15).map((u) => `하드코딩된 외부 URL: ${u}`);
    if (hits.some((h) => !h.includes('소스맵'))) return fail(`번들에 비밀값 패턴 ${hits.length}건: ${hits[0]}`, '해당 키를 즉시 폐기·재발급하고, 값을 VITE_* 가 아닌 서버 환경변수로 옮긴 뒤 재빌드하세요.', [...hits, ...details]);
    if (hits.length) return warn(hits[0], 'vite.config.js build.sourcemap 을 false 로 두거나 배포 시 .map 제외', [...hits.slice(1), ...details]);
    return pass('API 키/서비스 키 패턴 없음', details);
  });
}
