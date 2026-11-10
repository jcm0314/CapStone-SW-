// [d] 정적 코드 상태: 상대 import 해석(대소문자 구분), 서버 ESM 확장자, 패키지 선언 여부,
//     미사용 의존성/고아 모듈, JSON 파싱, 인코딩/BOM/병합 충돌 마커, 파일명 대소문자 충돌, git 인덱스 대소문자, 문법 검사, lint
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import {
  run as exec, walk, readText, readJson, exists, exactCase, stripJsComments, lineOf, npmInvocation, DEFAULT_EXCLUDES,
} from './lib.mjs';

const CODE_RE = /\.(m?js|jsx|cjs|ts|tsx)$/;
const EXTS = ['', '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json'];
const BUILTINS = new Set(builtinModules.flatMap((m) => [m, `node:${m}`]));

/** 소스에서 import 지정자 추출 (정적/동적/export from/require/new URL) */
export function extractImports(src) {
  const code = stripJsComments(src);
  const out = [];
  const push = (spec, idx, kind) => out.push({ spec, line: lineOf(code, idx), kind });
  for (const m of code.matchAll(/^[ \t]*(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"\n]+)['"]/gm)) push(m[1], m.index, 'static');
  for (const m of code.matchAll(/\bimport\(\s*['"]([^'"\n]+)['"]\s*\)/g)) push(m[1], m.index, 'dynamic');
  for (const m of code.matchAll(/\brequire\(\s*['"]([^'"\n]+)['"]\s*\)/g)) push(m[1], m.index, 'require');
  for (const m of code.matchAll(/new\s+URL\(\s*['"](\.{1,2}\/[^'"\n]+)['"]\s*,\s*import\.meta\.url\s*\)/g)) push(m[1], m.index, 'url');
  return out;
}

/** 상대 import 해석: {state:'exact'|'case-mismatch'|'missing', path, actual} */
export function resolveRelative(root, fromFile, spec, { exts = EXTS } = {}) {
  const clean = spec.replace(/[?#].*$/, '');
  const base = clean.startsWith('/') ? clean.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), clean));
  const cands = [];
  for (const e of exts) cands.push(base + e);
  for (const e of exts.filter(Boolean)) cands.push(`${base}/index${e}`);
  let caseHit = null;
  for (const c of cands) {
    const st = exactCase(root, c);
    if (st.state === 'exact') {
      try { if (fs.statSync(path.join(root, c)).isFile()) return { state: 'exact', path: c }; } catch { /* 디렉터리 */ }
    } else if (st.state === 'case-mismatch' && !caseHit) {
      try { if (fs.statSync(path.join(root, c)).isFile()) caseHit = { state: 'case-mismatch', path: c, actual: st.actual }; } catch { /* 무시 */ }
    }
  }
  return caseHit || { state: 'missing', path: base };
}

function pkgNameOf(spec) {
  if (spec.startsWith('@')) return spec.split('/').slice(0, 2).join('/');
  return spec.split('/')[0];
}

function scanFiles(root) {
  const files = [
    ...walk(root, 'src', { filter: (f) => CODE_RE.test(f) }),
    ...walk(root, 'server', { filter: (f) => CODE_RE.test(f) }),
    ...walk(root, 'scripts', { filter: (f) => CODE_RE.test(f) }),
  ];
  for (const f of fs.readdirSync(root)) if (/\.config\.(m?js|cjs|ts)$/.test(f)) files.push(f);
  return files;
}

export async function run(ctx, { pass, warn, fail, skip }) {
  const { root, pkg } = ctx;
  const files = scanFiles(root);
  const graph = new Map(); // file -> Set(resolved files)
  const bareUses = []; // {file, spec, pkg, line}
  const isTest = (f) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(f);

  // d.imports — 상대 import 해석 (대소문자 구분)
  await ctx.check({ id: 'd.imports', title: '상대 import 경로 해석 (대소문자 구분, Linux/CI 기준)' }, async () => {
    const missing = []; const caseBad = []; const serverNoExt = []; let count = 0;
    for (const f of files) {
      const src = readText(path.join(root, f));
      if (src == null) continue;
      const edges = new Set();
      for (const im of extractImports(src)) {
        const { spec } = im;
        if (spec.startsWith('.') || (spec.startsWith('/') && f.startsWith('src/'))) {
          count++;
          const r = resolveRelative(root, f, spec);
          if (r.state === 'missing') missing.push(`${f}:${im.line} '${spec}' → 파일 없음`);
          else if (r.state === 'case-mismatch') caseBad.push(`${f}:${im.line} '${spec}' → 실제 파일명 ${r.actual} (Windows에선 동작, Linux/Docker/CI에서 실패)`);
          else edges.add(r.path);
          // Node가 직접 실행하는 ESM(server/, scripts/)은 확장자 필수
          if ((f.startsWith('server/') || f.startsWith('scripts/')) && spec.startsWith('.') && !/\.[cm]?js$|\.json$/.test(spec.replace(/[?#].*$/, '')) && im.kind !== 'url') {
            serverNoExt.push(`${f}:${im.line} '${spec}' — Node ESM은 확장자 생략 import를 해석하지 못함 (ERR_MODULE_NOT_FOUND)`);
          }
        } else if (!spec.startsWith('/') && !/^(https?|data|virtual):/.test(spec)) {
          bareUses.push({ file: f, spec, pkg: pkgNameOf(spec), line: im.line, kind: im.kind });
        }
      }
      graph.set(f, edges);
    }
    ctx.state.importGraph = graph;
    const all = [...caseBad, ...missing, ...serverNoExt];
    if (all.length) return fail(`해석 실패 ${missing.length}건, 대소문자 불일치 ${caseBad.length}건, 서버 확장자 누락 ${serverNoExt.length}건`, '경로/파일명 대소문자를 실제 파일과 정확히 일치시키세요. 파일명 대소문자만 바꿀 때는 `git mv Foo.jsx foo.jsx`(Windows는 두 단계: git mv Foo.jsx tmp && git mv tmp foo.jsx).', all);
    return pass(`파일 ${files.length}개, 상대 import ${count}개 모두 해석됨`);
  });

  // d.bare-imports — 패키지 import 가 package.json 에 선언되었는지 / 서버 prod 의존성
  await ctx.check({ id: 'd.bare-imports', title: '패키지 import 선언 여부 (dependencies/devDependencies)', needs: ['pkg'] }, async () => {
    const deps = pkg.dependencies || {}; const dev = pkg.devDependencies || {}; const opt = pkg.optionalDependencies || {};
    const undeclared = []; const devInServer = []; const builtinInClient = []; const unresolved = [];
    const nm = path.join(root, 'node_modules');
    const nmOk = exists(nm);
    for (const u of bareUses) {
      if (BUILTINS.has(u.spec) || BUILTINS.has(u.pkg)) {
        if (u.file.startsWith('src/') && !isTest(u.file)) builtinInClient.push(`${u.file}:${u.line} '${u.spec}' (브라우저 번들에서 사용 불가)`);
        continue;
      }
      if (u.pkg === pkg.name) continue;
      if (!(u.pkg in deps) && !(u.pkg in dev) && !(u.pkg in opt)) { undeclared.push(`${u.file}:${u.line} '${u.spec}' → ${u.pkg} 미선언`); continue; }
      if (u.file.startsWith('server/') && !isTest(u.file) && !(u.pkg in deps)) devInServer.push(`${u.file}:${u.line} '${u.pkg}' 은 devDependencies — server/Dockerfile의 \`npm ci --omit=dev\` 이미지에서 ERR_MODULE_NOT_FOUND`);
      if (nmOk) {
        const pdir = path.join(nm, ...u.pkg.split('/'));
        const pj = readJson(path.join(pdir, 'package.json'));
        if (!pj) { unresolved.push(`${u.file}:${u.line} '${u.spec}' → node_modules/${u.pkg} 없음`); continue; }
        const sub = u.spec.slice(u.pkg.length);
        if (sub) {
          const key = '.' + sub;
          const inExports = pj.exports && typeof pj.exports === 'object' && (key in pj.exports || Object.keys(pj.exports).some((k) => k.includes('*') && key.startsWith(k.split('*')[0])));
          if (!inExports && !exists(path.join(pdir, sub))) unresolved.push(`${u.file}:${u.line} '${u.spec}' → 하위 경로가 패키지 exports/파일에 없음 (패키지 메이저 버전 변경?)`);
        }
      }
    }
    const details = [`패키지 import ${bareUses.length}건 검사`];
    if (undeclared.length || devInServer.length || unresolved.length) {
      return fail(`미선언 ${undeclared.length}건, 서버의 devDependency 사용 ${devInServer.length}건, 해석 불가 ${unresolved.length}건`, '사용하는 패키지를 package.json에 선언(`npm i <pkg>`), 서버 런타임 패키지는 dependencies로 이동', [...undeclared, ...devInServer, ...unresolved, ...details]);
    }
    if (builtinInClient.length) return warn(`브라우저 코드에서 Node 내장 모듈 import ${builtinInClient.length}건`, 'src/ 코드에서는 Node 내장 모듈 대신 브라우저 API 사용', builtinInClient);
    return pass(`모든 패키지 import가 선언되어 있음${nmOk ? ' (node_modules 해석 포함)' : ''}`, details);
  });

  // d.unused-deps — 선언했지만 import 되지 않는 의존성
  await ctx.check({ id: 'd.unused-deps', title: '사용되지 않는 의존성', needs: ['pkg'] }, async () => {
    const used = new Set(bareUses.map((u) => u.pkg));
    // 문자열로 참조되는 도구들
    const extraText = ['postcss.config.js', 'tailwind.config.js', 'index.html', 'package.json', '.husky/pre-commit'].map((f) => readText(path.join(root, f)) || '').join('\n');
    const tooling = /^(@types\/|vite$|vitest$|husky$|lint-staged$|jsdom$|happy-dom$|autoprefixer$|postcss$|tailwindcss$|eslint|prettier|typescript$|@esbuild\/|@rollup\/)/;
    const unusedProd = []; const unusedDev = [];
    for (const n of Object.keys(pkg.dependencies || {})) if (!used.has(n) && !new RegExp(`['"]${n.replace(/[/.]/g, '\\$&')}['"]`).test(extraText)) unusedProd.push(n);
    for (const n of Object.keys(pkg.devDependencies || {})) if (!used.has(n) && !tooling.test(n) && !extraText.includes(n)) unusedDev.push(n);
    // 서버 전용 패키지가 dependencies에 있는 것은 정상이지만, 클라이언트에서 쓰이지 않는 무거운 SDK 안내
    const serverOnly = Object.keys(pkg.dependencies || {}).filter((n) => bareUses.some((u) => u.pkg === n) && bareUses.filter((u) => u.pkg === n).every((u) => u.file.startsWith('server/')));
    const details = [`서버 전용 dependencies: ${serverOnly.join(', ') || '없음'}`];
    if (unusedProd.length || unusedDev.length) return warn(`미사용 의존성: ${[...unusedProd, ...unusedDev].join(', ')}`, '정말 쓰지 않으면 `npm uninstall <pkg>` (설치/빌드 시간·취약점 표면 감소)', details);
    return pass('선언된 의존성이 모두 코드에서 사용됨', details);
  });

  // d.orphans — 엔트리(src/main.jsx)에서 도달할 수 없는 모듈
  await ctx.check({ id: 'd.orphans', title: '사용되지 않는 소스 모듈 (main.jsx에서 도달 불가)' }, async () => {
    const graph = ctx.state.importGraph;
    if (!graph) return skip('d.imports 결과 없음');
    const entry = ['src/main.jsx', 'src/main.tsx', 'src/main.js'].find((f) => graph.has(f));
    if (!entry) return skip('src/main.* 엔트리 없음');
    const seen = new Set([entry]); const q = [entry];
    while (q.length) { const f = q.shift(); for (const e of graph.get(f) || []) if (!seen.has(e)) { seen.add(e); q.push(e); } }
    const orphans = [...graph.keys()].filter((f) => f.startsWith('src/') && !isTest(f) && !seen.has(f));
    const testOnly = orphans.filter((f) => [...graph.entries()].some(([k, v]) => isTest(k) && v.has(f)));
    const details = orphans.map((f) => `${f}${testOnly.includes(f) ? ' (테스트에서만 사용)' : ''}`);
    if (orphans.length) return warn(`앱 번들에 포함되지 않는 모듈 ${orphans.length}개: ${orphans.map((f) => path.posix.basename(f)).join(', ')}`, '미연동 기능이면 연결 계획을 tasks/ 에 기록하거나, 불필요하면 삭제하세요 (예: supabaseClient.js·workerService.js 미연동).', details);
    return pass(`src 모듈 ${seen.size}개 모두 main.jsx에서 도달 가능`);
  });

  // d.json — JSON 파일 파싱
  await ctx.check({ id: 'd.json', title: 'JSON 파일 파싱' }, async () => {
    const jsons = walk(root, '', { filter: (f) => /\.json$/.test(f) && !/tsconfig.*\.json$|jsconfig.*\.json$|\.vscode\//.test(f) });
    const bad = []; const bom = [];
    for (const f of jsons) {
      const t = readText(path.join(root, f));
      if (t == null) continue;
      if (t.charCodeAt(0) === 0xfeff) bom.push(f);
      try { JSON.parse(t.replace(/^﻿/, '')); } catch (e) { bad.push(`${f}: ${e.message}`); }
    }
    if (bad.length) return fail(`JSON 파싱 실패 ${bad.length}개: ${bad[0]}`, '쉼표/따옴표/병합 충돌 마커(<<<<<<<)를 확인하세요. package-lock.json 충돌은 `npm install --package-lock-only`로 재생성.', bad);
    if (bom.length) return warn(`UTF-8 BOM이 있는 JSON ${bom.length}개: ${bom.join(', ')} (PowerShell 5.1 Out-File/Set-Content 기본값이 원인)`, 'BOM 없는 UTF-8로 저장 (VS Code: "UTF-8" 선택). PowerShell 5.1에서는 [IO.File]::WriteAllText 사용', bom);
    return pass(`${jsons.length}개 JSON 파일 정상`);
  });

  // d.encoding — UTF-8 유효성/BOM/병합 충돌 마커/CRLF 혼재
  await ctx.check({ id: 'd.encoding', title: '소스 인코딩(UTF-8)/BOM/병합 충돌 마커' }, async () => {
    const targets = [...files, ...walk(root, '', { filter: (f) => /\.(css|html|ya?ml|conf|tf|sh)$|^Dockerfile|\.env\.example$/.test(path.posix.basename(f)) || /^Dockerfile/.test(path.posix.basename(f)) })];
    const dec = new TextDecoder('utf-8', { fatal: true });
    const invalid = []; const bom = []; const conflict = []; const crlf = []; let lf = 0;
    for (const f of [...new Set(targets)]) {
      let buf; try { buf = fs.readFileSync(path.join(root, f)); } catch { continue; }
      if (buf.length > 5 * 1024 * 1024) continue;
      try { dec.decode(buf); } catch { invalid.push(`${f} (CP949/EUC-KR 등으로 저장된 것으로 보임 → 한글 깨짐/빌드 오류)`); continue; }
      if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) bom.push(f);
      const t = buf.toString('utf8');
      if (/^(<{7}|>{7})( |$)|^={7}$/m.test(t) && !/\.md$/.test(f)) conflict.push(`${f}:${lineOf(t, t.search(/^(<{7}|={7}|>{7})/m))}`);
      if (t.includes('\r\n')) crlf.push(f); else lf++;
    }
    const details = [`검사 파일 ${new Set(targets).size}개 · LF ${lf}개 · CRLF ${crlf.length}개`];
    if (crlf.length) details.push(`CRLF 파일: ${crlf.slice(0, 15).join(', ')}${crlf.length > 15 ? ' …' : ''}`);
    if (conflict.length) return fail(`병합 충돌 마커 발견: ${conflict.join(', ')}`, '충돌을 해결하고 <<<<<<< ======= >>>>>>> 줄을 제거하세요.', details);
    if (invalid.length) return fail(`UTF-8이 아닌 파일 ${invalid.length}개: ${invalid[0]}`, 'VS Code에서 "인코딩하여 다시 열기 → Korean(EUC-KR)" 후 "UTF-8로 저장"', [...invalid, ...details]);
    const shCrlf = crlf.filter((f) => /\.sh$|^\.husky\//.test(f) || /^Dockerfile|\/Dockerfile/.test(f));
    if (shCrlf.length) return warn(`셸 스크립트/Dockerfile이 CRLF: ${shCrlf.join(', ')}`, 'LF로 변환하고 .gitattributes에 "*.sh text eol=lf" 추가', details);
    if (bom.length) return warn(`UTF-8 BOM 파일 ${bom.length}개: ${bom.slice(0, 5).join(', ')}`, 'BOM 없는 UTF-8로 저장 (셸 스크립트·JSON·shebang 파일은 BOM이 있으면 오동작)', details);
    return pass('모두 UTF-8, 충돌 마커 없음', details);
  });

  // d.case-collisions — 대소문자만 다른 파일명
  await ctx.check({ id: 'd.case-collisions', title: '대소문자만 다른 파일명 충돌' }, async () => {
    const all = walk(root, '', { exclude: DEFAULT_EXCLUDES });
    const map = new Map();
    for (const f of all) { const k = f.toLowerCase(); if (!map.has(k)) map.set(k, []); map.get(k).push(f); }
    const coll = [...map.values()].filter((v) => v.length > 1).map((v) => v.join(' ↔ '));
    if (coll.length) return fail(`대소문자만 다른 파일 ${coll.length}쌍 — Windows/macOS에서 체크아웃 시 한쪽이 덮어써짐`, '하나로 합치거나 이름을 바꾸세요 (git mv).', coll);
    return pass(`${all.length}개 파일, 충돌 없음`);
  });

  // d.git-case — git 인덱스 경로와 실제 디스크 대소문자 일치
  await ctx.check({ id: 'd.git-case', title: 'git 인덱스 ↔ 디스크 파일명 대소문자 일치', needs: ['gitRepo'] }, async () => {
    const r = await exec('git', ['ls-files', '-z'], { cwd: root, timeout: 30_000 });
    if (r.code !== 0) return warn(`git ls-files 실패: ${r.stderr.trim().split('\n')[0]}`, 'git 저장소 상태를 확인하세요.');
    const tracked = r.stdout.split('\0').filter(Boolean);
    const bad = [];
    for (const f of tracked) {
      const st = exactCase(root, f);
      if (st.state === 'case-mismatch') bad.push(`인덱스 ${f} ↔ 디스크 ${st.actual}`);
    }
    const ic = (await exec('git', ['config', '--get', 'core.ignorecase'], { cwd: root, timeout: 10_000 })).stdout.trim();
    const details = [`추적 파일 ${tracked.length}개 · core.ignorecase=${ic || '(미설정)'}`];
    if (bad.length) return fail(`대소문자 불일치 ${bad.length}건 — CI(Linux)에서는 인덱스 이름으로 체크아웃되어 import 실패`, '`git mv -f <인덱스이름> <실제이름>` 으로 인덱스 이름을 바로잡고 커밋하세요.', [...bad, ...details]);
    return pass(`추적 파일 ${tracked.length}개 일치`, details);
  });

  // d.syntax — Node가 직접 실행하는 파일 문법 검사 (node --check)
  await ctx.check({ id: 'd.syntax', title: '서버/스크립트 문법 검사 (node --check)' }, async () => {
    const targets = files.filter((f) => /^(server|scripts)\/.*\.(m?js|cjs)$/.test(f) && !isTest(f));
    const bad = [];
    for (const f of targets) {
      const r = await exec(process.execPath, ['--check', path.join(root, f)], { cwd: root, timeout: 20_000 });
      if (r.code !== 0) bad.push(`${f}: ${(r.stderr || '').split('\n').find((l) => /Error/.test(l)) || r.stderr.trim().split('\n')[0]}`);
    }
    if (bad.length) return fail(`문법 오류 ${bad.length}개: ${bad[0]}`, '해당 파일의 오류 줄을 수정하세요.', bad);
    return pass(`${targets.length}개 파일 문법 정상`, targets);
  });

  // d.lint — lint 스크립트 (있으면 실행만 하고 수정하지 않음)
  await ctx.check({ id: 'd.lint', title: 'Lint', needs: ['pkg'] }, async () => {
    const script = pkg.scripts?.lint;
    const hasEslintCfg = fs.readdirSync(root).some((f) => /^(\.eslintrc(\..+)?|eslint\.config\.(m?js|cjs|ts))$/.test(f));
    if (!script) {
      return skip(`package.json에 lint 스크립트 없음${hasEslintCfg ? ' (eslint 설정 파일은 존재)' : ', ESLint 미설정'}`, '도입 권장: `npm i -D eslint @eslint/js eslint-plugin-react-hooks` 후 "lint": "eslint ." 추가 (react-hooks 규칙이 Invalid hook call류 버그를 사전에 잡음)');
    }
    const nmOk = (await ctx.need('nodeModules')).ok;
    if (!nmOk) return skip('node_modules 없음');
    const inv = npmInvocation();
    if (!inv) return skip('npm 없음');
    const r = await exec(inv.cmd, [...inv.pre, 'run', 'lint', '--silent'], { cwd: root, timeout: 300_000, shell: inv.shell, env: { ...process.env, FORCE_COLOR: '0' } });
    const lines = (r.stdout + r.stderr).trim().split('\n').filter(Boolean);
    const summary = lines.reverse().find((l) => /problem|error|warning/i.test(l)) || '';
    if (r.timedOut) return warn('lint 시간 초과(300초)', '`npm run lint` 직접 실행');
    if (r.code !== 0) return fail(`lint 실패 (exit ${r.code}) ${summary}`, '`npm run lint` 로 상세 확인 (doctor는 자동 수정하지 않음; 필요 시 `npx eslint . --fix`)', lines.slice(0, 30).reverse());
    return pass(`lint 통과 ${summary}`);
  });
}
