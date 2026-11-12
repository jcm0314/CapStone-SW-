// [b] 의존성: node_modules, lockfile 동기화, npm ls, React 중복, peer, 핵심 패키지 해석, engines
import fs from 'node:fs';
import path from 'node:path';
import { run as exec, npmInvocation, readJson, exists, satisfies } from './lib.mjs';

const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'];

function installedVersion(nm, name) {
  return readJson(path.join(nm, ...name.split('/'), 'package.json'))?.version ?? null;
}

/** lock 항목이 현재 플랫폼에서 설치 대상인지 (os/cpu 필드) */
function platformMatches(entry) {
  const ok = (list, val) => {
    if (!Array.isArray(list) || !list.length) return true;
    const neg = list.filter((x) => x.startsWith('!')).map((x) => x.slice(1));
    const posi = list.filter((x) => !x.startsWith('!'));
    if (neg.includes(val)) return false;
    return posi.length ? posi.includes(val) : true;
  };
  return ok(entry.os, process.platform) && ok(entry.cpu, process.arch);
}

export async function run(ctx, { pass, warn, fail, skip }) {
  const { root, pkg } = ctx;
  const nm = path.join(root, 'node_modules');
  const lockPath = path.join(root, 'package-lock.json');
  const lock = readJson(lockPath);

  // b.node_modules
  await ctx.check({ id: 'b.node_modules', title: 'node_modules 설치 여부', needs: ['pkg'] }, async () => {
    if (!exists(nm)) {
      return fail('node_modules 폴더가 없음 — 테스트/빌드/런타임 검사가 SKIP됨', 'lockfile 그대로 설치: `npm ci` (package-lock.json을 수정하지 않음)');
    }
    let count = 0;
    try {
      for (const e of fs.readdirSync(nm)) {
        if (e.startsWith('.')) continue;
        count += e.startsWith('@') ? fs.readdirSync(path.join(nm, e)).length : 1;
      }
    } catch { /* 무시 */ }
    const hidden = exists(path.join(nm, '.package-lock.json'));
    if (count < 5) return fail(`node_modules에 패키지가 거의 없음 (${count}개) — 설치가 중단된 것으로 보임`, '`npm ci` 재실행');
    return pass(`${count}개 패키지 설치됨`, [hidden ? 'node_modules/.package-lock.json 존재(npm 7+ 설치)' : 'node_modules/.package-lock.json 없음 (pnpm/yarn 또는 오래된 npm으로 설치?)']);
  });

  // b.lockfile — 존재 / package.json과 동기화
  await ctx.check({ id: 'b.lockfile', title: 'package-lock.json 존재 및 package.json 동기화', needs: ['pkg'] }, async () => {
    if (!exists(lockPath)) return fail('package-lock.json 없음 — CI의 `npm ci`와 Dockerfile의 `npm ci`가 실패함', '`npm install` 로 lockfile 생성 후 커밋');
    if (!lock) return fail('package-lock.json JSON 파싱 실패 (병합 충돌 마커?)', '충돌을 해결하거나 `npm install --package-lock-only` 로 재생성');
    const rootEntry = lock.packages?.[''];
    if (!rootEntry) return warn(`lockfileVersion ${lock.lockfileVersion} — packages[""] 항목이 없어 비교 불가`, 'npm 7+ 로 lockfile 재생성');
    const diffs = [];
    for (const f of DEP_FIELDS) {
      const a = pkg[f] || {}; const b = rootEntry[f] || {};
      for (const [k, v] of Object.entries(a)) {
        if (!(k in b)) diffs.push(`${f}.${k}: package.json에는 "${v}", lockfile에는 없음`);
        else if (b[k] !== v) diffs.push(`${f}.${k}: package.json "${v}" ≠ lockfile "${b[k]}"`);
      }
      for (const k of Object.keys(b)) if (!(k in a)) diffs.push(`${f}.${k}: lockfile에만 존재 (package.json에서 삭제됨)`);
    }
    if (pkg.name && lock.name && pkg.name !== lock.name) diffs.push(`name: package.json "${pkg.name}" ≠ lockfile "${lock.name}"`);
    if (JSON.stringify(pkg.engines || {}) !== JSON.stringify(rootEntry.engines || {})) diffs.push(`engines 불일치: package.json ${JSON.stringify(pkg.engines || {})} / lockfile ${JSON.stringify(rootEntry.engines || {})} (npm ci는 통과하지만 재생성 권장)`);
    // 범위를 만족하는 버전이 lock에 있는지
    for (const f of DEP_FIELDS) {
      for (const [k, range] of Object.entries(pkg[f] || {})) {
        const e = lock.packages[`node_modules/${k}`];
        if (!e) { if (f !== 'optionalDependencies') diffs.push(`${k}: lockfile packages에 node_modules/${k} 항목 없음`); continue; }
        if (satisfies(e.version, range) === false) diffs.push(`${k}: lockfile 버전 ${e.version}이(가) "${range}"를 만족하지 않음`);
      }
    }
    const hard = diffs.filter((d) => !d.startsWith('engines'));
    if (hard.length) return fail(`package.json과 lockfile 불일치 ${hard.length}건 — \`npm ci\`가 "not in sync" 오류로 실패`, '`npm install` 로 lockfile 갱신 후 package.json과 함께 커밋', diffs);
    if (diffs.length) return warn(diffs[0], '`npm install --package-lock-only` 로 lockfile 메타데이터 갱신', diffs.slice(1));
    return pass(`lockfileVersion ${lock.lockfileVersion}, 직접 의존성 ${Object.keys(rootEntry.dependencies || {}).length + Object.keys(rootEntry.devDependencies || {}).length}개 동기화됨`);
  });

  // b.installed-vs-lock — 실제 설치 버전이 lockfile과 같은지 (stale node_modules)
  await ctx.check({ id: 'b.installed-vs-lock', title: '설치된 버전 ↔ lockfile 일치 (stale node_modules)', needs: ['nodeModules'] }, async () => {
    if (!lock?.packages) return skip('lockfile 없음/해석 불가');
    const missing = []; const mismatch = []; let checked = 0;
    for (const [key, e] of Object.entries(lock.packages)) {
      if (!key || !/^node_modules\/(@[^/]+\/)?[^/]+$/.test(key)) continue; // 최상위만
      if (e.link) continue;
      const name = key.slice('node_modules/'.length);
      const v = installedVersion(nm, name);
      checked++;
      if (v == null) {
        if (e.optional || e.peer || !platformMatches(e)) continue;
        if (e.dev && process.env.NODE_ENV === 'production') continue;
        missing.push(`${name}@${e.version}`);
      } else if (v !== e.version) mismatch.push(`${name}: 설치 ${v} / lockfile ${e.version}`);
    }
    if (missing.length || mismatch.length) {
      const st = missing.length ? fail : warn;
      return st(`lockfile 대비 누락 ${missing.length}개, 버전 다름 ${mismatch.length}개 (최상위 ${checked}개 검사)`, '`npm ci` 로 lockfile과 정확히 일치하게 재설치', [...missing.map((m) => `누락: ${m}`), ...mismatch]);
    }
    return pass(`최상위 ${checked}개 패키지가 lockfile과 일치`);
  });

  // b.npm-ls — npm ls 의 missing/invalid/extraneous/peer 문제
  await ctx.check({ id: 'b.npm-ls', title: '`npm ls --depth=0` 무결성', needs: ['nodeModules', 'npm'] }, async () => {
    const inv = npmInvocation();
    const r = await exec(inv.cmd, [...inv.pre, 'ls', '--depth=0', '--json', '--long=false'], { cwd: root, timeout: 120_000, shell: inv.shell });
    if (r.timedOut) return warn('npm ls 시간 초과(120초)', '/mnt/c 등 느린 파일시스템이면 리눅스 경로로 옮기세요.');
    let j;
    try { j = JSON.parse(r.stdout); } catch { return warn(`npm ls 출력 해석 실패 (exit ${r.code})`, '`npm ls --depth=0` 을 직접 실행해 확인', [r.stderr.trim().split('\n').slice(0, 5).join(' | ')]); }
    const probs = [...(j.problems || [])];
    for (const [name, d] of Object.entries(j.dependencies || {})) {
      if (d.missing && !probs.some((p) => p.includes(name))) probs.push(`missing: ${name}@${d.required?.version || d.required || ''}`);
      if (d.invalid && !probs.some((p) => p.includes(name))) probs.push(`invalid: ${name}@${d.version}`);
      if (d.extraneous) probs.push(`extraneous: ${name}@${d.version}`);
    }
    // optional 플랫폼 패키지(예: @esbuild/win32-x64)가 다른 OS에서 missing으로 보고되는 것은 정상
    const optional = Object.keys(ctx.pkg.optionalDependencies || {});
    const benign = probs.filter((p) => optional.some((o) => p.includes(o)) && /missing/.test(p));
    const real = probs.filter((p) => !benign.includes(p));
    const details = [...real, ...benign.map((b) => `(무시: 다른 플랫폼용 optional) ${b}`)];
    if (real.length) {
      const sev = real.some((p) => /missing|invalid/.test(p)) ? fail : warn;
      return sev(`npm ls 문제 ${real.length}건: ${real[0]}`, 'missing/invalid → `npm ci`, extraneous → `npm prune` (또는 npm ci)', details);
    }
    return pass(`문제 없음 (exit ${r.code})`, details);
  });

  // b.optional-platform — package.json에 플랫폼 전용 패키지를 직접 명시한 경우
  await ctx.check({ id: 'b.optional-platform', title: '플랫폼 전용 패키지 직접 명시 여부', needs: ['pkg'] }, async () => {
    const all = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}), ...(pkg.optionalDependencies || {}) };
    const plat = Object.keys(all).filter((n) => /^@esbuild\/|^@rollup\/rollup-|^@swc\/core-|^lightningcss-|^@tailwindcss\/oxide-/.test(n));
    if (!plat.length) return pass('없음');
    const details = plat.map((n) => `${n}: "${all[n]}"`);
    const esb = exists(path.join(nm, 'esbuild', 'package.json')) ? readJson(path.join(nm, 'esbuild', 'package.json')).version : lock?.packages?.['node_modules/esbuild']?.version;
    if (esb) details.push(`실제 esbuild(vite 의존) 버전: ${esb} — @esbuild/<플랫폼> 은 esbuild와 정확히 같은 버전이어야 함`);
    return warn(`플랫폼 전용 바이너리 패키지를 package.json에 직접 명시: ${plat.join(', ')}`,
      'esbuild/rollup이 optionalDependencies로 자동 설치하므로 package.json에서 제거하세요(다른 OS·버전 불일치·EBADPLATFORM 혼란 원인). 제거 후 `npm install`로 lockfile 갱신.', details);
  });

  // b.react-dup — React 중복 사본 / react-dom 버전 일치
  await ctx.check({ id: 'b.react-dup', title: 'React 중복 사본 / react·react-dom 버전 일치', needs: ['nodeModules'] }, async () => {
    const copies = [];
    const scan = (dir, depth) => {
      if (depth > 3) return;
      let ents; try { ents = fs.readdirSync(dir); } catch { return; }
      for (const e of ents) {
        if (e.startsWith('.')) continue;
        const sub = e.startsWith('@') ? (() => { try { return fs.readdirSync(path.join(dir, e)).map((x) => `${e}/${x}`); } catch { return []; } })() : [e];
        for (const s of sub) {
          const pdir = path.join(dir, s);
          if (s === 'react' || s === 'react-dom') {
            const v = readJson(path.join(pdir, 'package.json'))?.version;
            if (v) copies.push({ name: s, v, where: path.relative(root, pdir).replace(/\\/g, '/') });
          }
          const nested = path.join(pdir, 'node_modules');
          if (exists(nested)) scan(nested, depth + 1);
        }
      }
    };
    scan(nm, 0);
    const reacts = copies.filter((c) => c.name === 'react');
    const doms = copies.filter((c) => c.name === 'react-dom');
    const details = copies.map((c) => `${c.where}@${c.v}`);
    if (!reacts.length) return fail('react가 설치되어 있지 않음', '`npm ci`');
    if (reacts.length > 1) return fail(`react 사본 ${reacts.length}개 — "Invalid hook call" 오류 원인`, '`npm dedupe` 후 `npm ls react` 로 확인. 필요하면 package.json "overrides"로 단일 버전 고정', details);
    if (doms.length && doms[0].v !== reacts[0].v) return fail(`react ${reacts[0].v} ≠ react-dom ${doms[0].v}`, '두 패키지를 같은 버전으로 맞추세요: `npm i react@<ver> react-dom@<ver>`', details);
    if (doms.length > 1) return warn(`react-dom 사본 ${doms.length}개`, '`npm dedupe`', details);
    return pass(`react ${reacts[0].v} 단일 사본${doms.length ? `, react-dom ${doms[0].v}` : ''}`, details);
  });

  // b.peers — 직접 의존성의 peerDependencies 충족 여부
  await ctx.check({ id: 'b.peers', title: 'peerDependencies 충족', needs: ['nodeModules', 'pkg'] }, async () => {
    const direct = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
    const issues = []; let checked = 0;
    for (const name of direct) {
      const pj = readJson(path.join(nm, ...name.split('/'), 'package.json'));
      if (!pj?.peerDependencies) continue;
      for (const [peer, range] of Object.entries(pj.peerDependencies)) {
        const optional = pj.peerDependenciesMeta?.[peer]?.optional;
        const v = installedVersion(nm, peer);
        checked++;
        if (v == null) { if (!optional) issues.push(`${name} → peer ${peer}@"${range}" 미설치`); continue; }
        const ok = satisfies(v, range);
        if (ok === false) issues.push(`${name} → peer ${peer}@"${range}" 요구, 설치 ${v}`);
      }
    }
    if (issues.length) return warn(`peer 의존성 문제 ${issues.length}건: ${issues[0]}`, '요구 범위에 맞게 버전을 조정하거나 호환 버전으로 업/다운그레이드하세요. (npm 7+는 peer 충돌 시 ERESOLVE로 설치 실패할 수 있음)', issues);
    return pass(`직접 의존성의 peer ${checked}건 모두 충족`);
  });

  // b.engines — 설치된 직접 의존성의 engines.node 요구
  await ctx.check({ id: 'b.engines', title: '의존성 engines.node 요구 vs 현재 Node', needs: ['nodeModules', 'pkg'] }, async () => {
    const direct = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
    const bad = []; const strict = [];
    for (const name of direct) {
      const pj = readJson(path.join(nm, ...name.split('/'), 'package.json'));
      const range = pj?.engines?.node;
      if (!range) continue;
      const ok = satisfies(process.versions.node, range);
      if (ok === false) bad.push(`${name}@${pj.version}: engines.node "${range}"`);
      else strict.push(`${name}@${pj.version}: "${range}"`);
    }
    if (bad.length) return fail(`현재 Node ${process.versions.node}을(를) 지원하지 않는 의존성 ${bad.length}개: ${bad[0]}`, 'Node를 요구 버전 이상으로 올리세요 (package.json engines 참고).', bad);
    return pass(`engines 요구가 있는 직접 의존성 ${strict.length}개 모두 충족`, strict);
  });

  // b.resolve — 핵심 패키지 실제 해석/로드 (자식 프로세스에서)
  await ctx.check({ id: 'b.resolve', title: '핵심 패키지 해석/로드 (react, vite, vitest, express, supabase …)', needs: ['nodeModules', 'pkg'] }, async () => {
    const all = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const key = ['react', 'react-dom', 'vite', 'vitest', '@vitejs/plugin-react', 'jsdom', 'express', 'cors', 'express-rate-limit', 'dotenv',
      '@supabase/supabase-js', '@google/genai', '@google/generative-ai', '@google-cloud/vertexai', '@google-cloud/bigquery',
      'recharts', 'lucide-react', 'pdfjs-dist', 'react-window', 'canvas-confetti', 'tailwindcss', 'postcss', 'autoprefixer', '@testing-library/react']
      .filter((k) => k in all);
    // import까지 해보는 패키지 (부작용 적은 것), 나머지는 resolve만
    const importable = new Set(['react', 'react-dom', 'express', 'cors', 'express-rate-limit', 'dotenv', '@supabase/supabase-js', 'canvas-confetti', 'react-window']);
    const script = `
      const names = ${JSON.stringify(key)};
      const imp = new Set(${JSON.stringify([...importable])});
      const out = {};
      for (const n of names) {
        try {
          const url = import.meta.resolve(n);
          if (imp.has(n)) { await import(n); out[n] = { ok: true, mode: 'import', url }; }
          else out[n] = { ok: true, mode: 'resolve', url };
        } catch (e) {
          let pjOk = false;
          try { await import('node:fs').then(fs => { pjOk = fs.existsSync('node_modules/' + n + '/package.json'); }); } catch {}
          out[n] = { ok: false, pj: pjOk, err: String(e && e.message || e).split('\\n')[0].slice(0, 200) };
        }
      }
      process.stdout.write(JSON.stringify(out));
    `;
    const r = await exec(process.execPath, ['--input-type=module', '-e', script], { cwd: root, timeout: 90_000, env: { ...process.env, NODE_ENV: 'test' } });
    let res;
    try { res = JSON.parse(r.stdout); } catch { return fail(`해석 스크립트 실패 (exit ${r.code}${r.timedOut ? ', 시간 초과' : ''})`, '`npm ci` 후 재시도', [(r.stderr || '').trim().split('\n').slice(0, 4).join(' | ')]); }
    const bad = Object.entries(res).filter(([, v]) => !v.ok);
    // vitest / vite 처럼 exports에 '.'가 없거나 조건부인 경우 package.json 존재로 대체 판정
    const hard = bad.filter(([, v]) => !v.pj);
    const soft = bad.filter(([, v]) => v.pj);
    const details = Object.entries(res).map(([n, v]) => `${n}: ${v.ok ? `OK(${v.mode})` : `실패 — ${v.err}`}`);
    const claudeSdk = ['@anthropic-ai/sdk'].filter((k) => k in all);
    details.push(claudeSdk.length ? `Claude SDK: ${claudeSdk.join(', ')} (src/services/agents/claudeClient.js, 서버 전용)` : 'Claude SDK(@anthropic-ai/sdk) 미설치 — 게이트웨이 평가 불가');
    if (hard.length) return fail(`해석 실패 ${hard.length}개: ${hard.map(([n]) => n).join(', ')}`, '`npm ci` 로 재설치. 계속 실패하면 node_modules 삭제 후 재설치', details);
    if (soft.length) return warn(`설치는 되어 있으나 로드 실패: ${soft.map(([n, v]) => `${n}(${v.err})`).join('; ')}`, '해당 패키지의 Node 버전 요구사항(engines)과 플랫폼 바이너리를 확인하세요.', details);
    return pass(`${Object.keys(res).length}개 패키지 해석 성공`, details);
  });
}
