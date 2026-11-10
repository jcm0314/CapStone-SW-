// [a] 실행 환경: Node/npm 버전, OS/WSL, /mnt/c 실행, 네이티브 바이너리 플랫폼 불일치, git, docker
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  IS_WIN, run as exec, which, npmInvocation, satisfies, parseVer, readText, readJson, exists, isDir,
  detectWsl, detectContainer, parseYaml, winToWslPath,
} from './lib.mjs';

/** 각 위치에서 Node 버전 표기를 수집 (engines/.nvmrc/CI/Dockerfile) */
export function collectNodeVersionPins(root, pkg) {
  const pins = [];
  if (pkg?.engines?.node) pins.push({ src: 'package.json engines.node', value: pkg.engines.node });
  const nvmrc = readText(path.join(root, '.nvmrc'));
  if (nvmrc != null) pins.push({ src: '.nvmrc', value: nvmrc.trim() });
  const nodeVersionFile = readText(path.join(root, '.node-version'));
  if (nodeVersionFile != null) pins.push({ src: '.node-version', value: nodeVersionFile.trim() });
  const wfDir = path.join(root, '.github', 'workflows');
  if (isDir(wfDir)) {
    for (const f of fs.readdirSync(wfDir).filter((x) => /\.ya?ml$/.test(x))) {
      const txt = readText(path.join(wfDir, f)) || '';
      for (const m of txt.matchAll(/node-version\s*:\s*\[?\s*['"]?([^'"\],\n]+)/g)) pins.push({ src: `.github/workflows/${f} node-version`, value: m[1].trim() });
    }
  }
  for (const df of ['Dockerfile', 'Dockerfile.server', 'server/Dockerfile']) {
    const txt = readText(path.join(root, df));
    if (!txt) continue;
    for (const m of txt.matchAll(/^\s*FROM\s+(?:--platform=\S+\s+)?node:([^\s@]+)/gim)) pins.push({ src: `${df} FROM node:${m[1]}`, value: m[1].split('-')[0] });
  }
  return pins;
}

function majorOf(v) {
  const p = parseVer(String(v).replace(/^lts\/.*/i, ''));
  return p ? p.major : null;
}

/** linux에서 glibc / musl 판별 */
function linuxLibc() {
  try {
    const rep = process.report?.getReport?.();
    if (rep?.header?.glibcVersionRuntime) return 'gnu';
  } catch { /* 무시 */ }
  return exists('/etc/alpine-release') ? 'musl' : 'gnu';
}

/** node_modules/<name>/package.json 위치들 (최상위 + 1단계 중첩) */
function findPackageDirs(nm, name) {
  const out = [];
  const top = path.join(nm, ...name.split('/'));
  if (exists(path.join(top, 'package.json'))) out.push(top);
  let ents = [];
  try { ents = fs.readdirSync(nm); } catch { return out; }
  for (const e of ents) {
    if (e.startsWith('.')) continue;
    const dirs = e.startsWith('@') ? (() => { try { return fs.readdirSync(path.join(nm, e)).map((x) => path.join(nm, e, x)); } catch { return []; } })() : [path.join(nm, e)];
    for (const d of dirs) {
      const nested = path.join(d, 'node_modules', ...name.split('/'));
      if (exists(path.join(nested, 'package.json'))) out.push(nested);
    }
  }
  return out;
}

/** 패키지 디렉터리 기준으로 Node 해석 규칙대로 의존 패키지를 찾는다 */
function resolveFrom(pkgDir, depName, nmRoot) {
  // Node 해석 규칙: <dir>/node_modules/<dep> 를 상위 디렉터리로 올라가며 탐색 (프로젝트 루트까지)
  const stop = path.resolve(path.dirname(nmRoot));
  let cur = path.resolve(pkgDir);
  for (;;) {
    const cand = path.join(cur, 'node_modules', ...depName.split('/'));
    if (exists(path.join(cand, 'package.json'))) return cand;
    if (cur === stop) break;
    const parent = path.dirname(cur);
    if (parent === cur || !parent.startsWith(stop)) break;
    cur = parent;
  }
  return null;
}

function listScope(nm, scope, prefix = '') {
  try { return fs.readdirSync(path.join(nm, scope)).filter((x) => x.startsWith(prefix)).map((x) => `${scope}/${x}`); } catch { return []; }
}

export async function run(ctx, { pass, warn, fail, skip }) {
  const { root, pkg } = ctx;
  const nm = path.join(root, 'node_modules');
  const wsl = detectWsl();
  const container = detectContainer();

  // a.node — Node 버전 vs engines
  await ctx.check({ id: 'a.node', title: 'Node.js 버전', needs: ['pkg'] }, async () => {
    const range = pkg.engines?.node;
    const cur = process.versions.node;
    if (!range) return warn(`현재 v${cur}, package.json에 engines.node 미지정`, 'package.json에 "engines": {"node": ">=22.12.0"} 처럼 지원 범위를 명시하세요.');
    const ok = satisfies(cur, range);
    if (ok === false) {
      return fail(`현재 v${cur}이(가) engines "${range}"를 만족하지 않음 (vitest 5·@supabase·@google-cloud 패키지가 Node 22+ 요구)`,
        'nvm(nvm-windows) / fnm 으로 Node 22 LTS 설치: `nvm install 22 && nvm use 22` (WSL: `curl -fsSL https://fnm.vercel.app/install | bash && fnm install 22`).');
    }
    return pass(`v${cur} (engines "${range}" 충족)`, [`실행 파일: ${process.execPath}`]);
  });

  // a.node-pins — .nvmrc / CI / Dockerfile 의 Node 버전 일관성
  await ctx.check({ id: 'a.node-pins', title: 'Node 버전 표기 일관성 (.nvmrc/CI/Docker)', needs: ['pkg'] }, async () => {
    const pins = collectNodeVersionPins(root, pkg);
    const details = pins.map((p) => `${p.src}: ${p.value}`);
    const curMajor = Number(process.versions.node.split('.')[0]);
    const majors = new Set();
    const problems = [];
    const engines = pkg.engines?.node;
    for (const p of pins) {
      if (p.src.startsWith('package.json')) continue;
      const mj = majorOf(p.value);
      if (mj == null) continue;
      majors.add(mj);
      if (engines) {
        // 표기된 메이저의 최신 버전이 engines를 만족할 수 있는지 (예: '22' → 22.99.0)
        if (satisfies(`${mj}.99.99`, engines) === false) problems.push(`${p.src}=${p.value} 은(는) engines "${engines}"를 만족할 수 없음`);
      }
    }
    if (majors.size > 1) problems.push(`메이저 버전이 서로 다름: ${[...majors].join(', ')}`);
    const nvm = pins.find((p) => p.src === '.nvmrc');
    if (nvm && majorOf(nvm.value) !== curMajor) problems.push(`.nvmrc(${nvm.value})와 현재 Node 메이저(${curMajor}) 불일치 → \`nvm use\` 필요`);
    if (nvm && /^\d+$/.test(nvm.value) && engines && /\d+\.\d+/.test(engines)) {
      details.push(`참고: .nvmrc가 메이저만(${nvm.value}) 지정 → 오래된 22.x(예: 22.11)가 선택되면 engines "${engines}" 미충족 가능`);
    }
    if (problems.length) return warn(problems[0], '.nvmrc, .github/workflows/*.yml(node-version), Dockerfile(FROM node:XX)을 같은 메이저로 맞추세요.', [...problems.slice(1), ...details]);
    return pass(`모두 Node ${[...majors].join('/') || '?'} 계열`, details);
  });

  // a.npm — npm 버전 & lockfileVersion 호환
  await ctx.check({ id: 'a.npm', title: 'npm 버전', needs: ['npm'] }, async () => {
    const inv = npmInvocation();
    const r = await exec(inv.cmd, [...inv.pre, '--version'], { cwd: root, timeout: 20_000, shell: inv.shell });
    if (r.code !== 0) return fail(`npm 실행 실패: ${(r.error || r.stderr || 'timeout').trim().split('\n')[0]}`, 'Node 설치에 포함된 npm이 손상되었을 수 있습니다. Node를 재설치하세요.');
    const ver = r.stdout.trim();
    const lock = readJson(path.join(root, 'package-lock.json'));
    const lv = lock?.lockfileVersion;
    const details = [`npm ${ver} (${inv.label})`, `package-lock.json lockfileVersion: ${lv ?? '없음'}`];
    if (lv >= 3 && satisfies(ver, '>=7') === false) return fail(`npm ${ver}는 lockfileVersion ${lv}를 읽지 못함`, 'npm 9+ 사용: `npm i -g npm@10`', details);
    if (satisfies(ver, '>=9') === false) return warn(`npm ${ver}가 오래됨`, 'Node 22에 포함된 npm 10 사용을 권장합니다.', details);
    return pass(`npm ${ver}`, details);
  });

  // a.os — OS / WSL / 컨테이너
  await ctx.check({ id: 'a.os', title: '운영체제 / WSL / 컨테이너 감지' }, async () => {
    const details = [
      `platform=${process.platform} arch=${process.arch} release=${os.release()}`,
      `WSL: ${wsl ? `예 (${wsl.distro})` : '아니오'} · 컨테이너: ${container || '아니오'}`,
      `CPU ${os.cpus().length}개 · 메모리 ${(os.totalmem() / 1024 ** 3).toFixed(1)} GB (여유 ${(os.freemem() / 1024 ** 3).toFixed(1)} GB)`,
      `작업 경로: ${root}`,
    ];
    if (os.totalmem() < 3 * 1024 ** 3) return warn('메모리 3GB 미만 — vite build/vitest가 OOM으로 실패할 수 있음', 'NODE_OPTIONS=--max-old-space-size=4096 설정 또는 WSL 메모리 상향(.wslconfig memory=)', details);
    return pass(`${process.platform}/${process.arch}${wsl ? ' (WSL)' : ''}${container ? ` (${container})` : ''}`, details);
  });

  // a.path — WSL에서 /mnt/c 실행, Windows 경로 길이 등
  await ctx.check({ id: 'a.path', title: '저장소 위치 (WSL /mnt/c, 경로 길이, 공백/한글)' }, async () => {
    const issues = [];
    if (wsl && /^\/mnt\/[a-z]\//.test(root)) {
      issues.push('WSL에서 Windows 드라이브(/mnt/c)의 저장소를 직접 사용 중 — 파일 I/O가 매우 느리고(9P), Windows/Linux가 같은 node_modules를 공유하면 네이티브 바이너리가 충돌');
    }
    if (IS_WIN && root.length > 180) issues.push(`경로 길이 ${root.length}자 — node_modules 깊은 경로에서 MAX_PATH(260) 초과 위험`);
    if (/\s/.test(root)) issues.push('경로에 공백 포함 — 일부 셸 스크립트/husky 훅에서 오류 가능');
    // eslint-disable-next-line no-control-regex
    if (/[^\x00-\x7F]/.test(root)) issues.push('경로에 비ASCII(한글 등) 문자 포함 — 일부 도구(esbuild/docker mount)에서 문제 가능');
    if (!issues.length) return pass(root);
    const fix = wsl && /^\/mnt\//.test(root)
      ? 'WSL 리눅스 파일시스템으로 복제해 사용: `git clone <repo> ~/CapStone-SW- && cd ~/CapStone-SW- && npm ci`. 또는 Windows에서만 npm을 사용하고 WSL에서는 npm ci를 다시 하지 마세요.'
      : '저장소를 짧은 ASCII 경로(예: C:\\dev\\capstone)로 옮기세요. Windows: `git config --system core.longpaths true`.';
    return warn(issues[0], fix, issues.slice(1));
  });

  // a.native-bin — esbuild / rollup 플랫폼 바이너리 불일치 (Windows↔WSL node_modules 공유 문제)
  await ctx.check({ id: 'a.native-bin', title: '네이티브 바이너리 플랫폼 일치 (esbuild/rollup)', needs: ['nodeModules'] }, async () => {
    const plat = process.platform; const arch = process.arch;
    const details = [];
    const problems = [];
    const libc = plat === 'linux' ? linuxLibc() : null;

    // esbuild
    const esbuildExpected = `@esbuild/${plat}-${arch}`;
    const esbuildDirs = findPackageDirs(nm, 'esbuild');
    const foreignEsbuild = listScope(nm, '@esbuild').filter((x) => x !== esbuildExpected);
    for (const dir of esbuildDirs) {
      const ver = readJson(path.join(dir, 'package.json'))?.version;
      const rel = path.relative(root, dir).replace(/\\/g, '/');
      const binDir = resolveFrom(dir, esbuildExpected, nm);
      if (!binDir) {
        problems.push(`${rel}@${ver}: 현재 플랫폼용 ${esbuildExpected} 가 없음${foreignEsbuild.length ? ` (설치된 것: ${foreignEsbuild.join(', ')})` : ''}`);
        continue;
      }
      const bver = readJson(path.join(binDir, 'package.json'))?.version;
      if (bver !== ver) problems.push(`${rel}@${ver} ↔ ${path.relative(root, binDir).replace(/\\/g, '/')}@${bver} 버전 불일치 ("Host version does not match binary version" 오류 원인)`);
      else details.push(`${rel}@${ver} → ${esbuildExpected}@${bver} OK`);
    }
    if (!esbuildDirs.length) details.push('esbuild 미설치 (vite 의존성이므로 비정상일 수 있음)');
    if (foreignEsbuild.length) details.push(`다른 플랫폼 esbuild 패키지 존재: ${foreignEsbuild.join(', ')}${pkg?.optionalDependencies?.['@esbuild/win32-x64'] ? ' (package.json optionalDependencies에 @esbuild/win32-x64 명시됨)' : ''}`);

    // rollup
    const rollupDirs = findPackageDirs(nm, 'rollup');
    const rollupCandidates = plat === 'linux' ? [`@rollup/rollup-linux-${arch}-${libc}`]
      : plat === 'win32' ? [`@rollup/rollup-win32-${arch}-msvc`, `@rollup/rollup-win32-${arch}-gnu`]
        : [`@rollup/rollup-${plat}-${arch}`];
    const rollupInstalled = listScope(nm, '@rollup', 'rollup-');
    const foreignRollup = rollupInstalled.filter((x) => !rollupCandidates.includes(x) && !/rollup-(pluginutils|plugin-)/.test(x));
    for (const dir of rollupDirs) {
      const rp = readJson(path.join(dir, 'package.json'));
      const rel = path.relative(root, dir).replace(/\\/g, '/');
      const found = rollupCandidates.map((c) => ({ c, d: resolveFrom(dir, c, nm) })).find((x) => x.d);
      if (!found) {
        problems.push(`${rel}@${rp?.version}: 현재 플랫폼용 ${rollupCandidates[0]} 가 없음${foreignRollup.length ? ` (설치된 것: ${foreignRollup.join(', ')})` : ''} → "Cannot find module @rollup/rollup-..." 오류 원인`);
        continue;
      }
      const want = rp?.optionalDependencies?.[found.c];
      const have = readJson(path.join(found.d, 'package.json'))?.version;
      if (want && have !== want) problems.push(`${rel}@${rp.version}는 ${found.c}@${want}를 기대하지만 ${have} 설치됨`);
      else details.push(`${rel}@${rp?.version} → ${found.c}@${have} OK`);
    }
    if (foreignRollup.length) details.push(`다른 플랫폼 rollup 패키지 존재: ${foreignRollup.join(', ')}`);

    if (problems.length) {
      return fail(`node_modules가 다른 OS/아키텍처에서 설치된 것으로 보임 — ${problems[0]}`,
        `현재 환경(${plat}/${arch}${libc ? '-' + libc : ''})에서 다시 설치: \`${IS_WIN ? 'Remove-Item -Recurse -Force node_modules; npm ci' : 'rm -rf node_modules && npm ci'}\`. Windows와 WSL이 같은 폴더의 node_modules를 공유하지 마세요.`,
        [...problems.slice(1), ...details]);
    }
    if (foreignEsbuild.length || foreignRollup.length) {
      return pass(`현재 플랫폼 바이너리 정상 (다른 플랫폼 패키지도 함께 존재: ${[...foreignEsbuild, ...foreignRollup].length}개)`, details);
    }
    return pass(`${plat}/${arch}${libc ? '-' + libc : ''} 바이너리 일치`, details);
  });

  // a.git — git 사용 가능 여부, 훅 설정
  await ctx.check({ id: 'a.git', title: 'git 사용 가능 여부 / husky 훅 경로' }, async () => {
    const g = await ctx.need('git');
    if (!g.ok) {
      const hint = IS_WIN
        ? 'Git for Windows 설치(winget install --id Git.Git) 후 새 터미널을 여세요. 또는 WSL에서 git 작업: `wsl bash -lc "cd /mnt/c/... && git status"`'
        : '`sudo apt-get install -y git`';
      return warn(`git을 찾을 수 없음 (${g.reason}) — husky 훅/대소문자 인덱스 검사를 건너뜀`, hint);
    }
    const ver = (await exec('git', ['--version'], { timeout: 10_000 })).stdout.trim();
    const repo = await ctx.need('gitRepo');
    if (!repo.ok) {
      return warn(`${ver} — 그러나 ${repo.reason}`, '`git config --global --add safe.directory <경로>` (WSL에서 /mnt/c 저장소는 소유자 불일치로 자주 발생)');
    }
    const details = [ver];
    const hooksPath = (await exec('git', ['config', '--get', 'core.hooksPath'], { cwd: root, timeout: 10_000 })).stdout.trim();
    const autocrlf = (await exec('git', ['config', '--get', 'core.autocrlf'], { cwd: root, timeout: 10_000 })).stdout.trim();
    details.push(`core.hooksPath=${hooksPath || '(미설정)'} · core.autocrlf=${autocrlf || '(미설정)'}`);
    const usesHusky = Boolean(pkg?.devDependencies?.husky || pkg?.dependencies?.husky);
    if (usesHusky && !/\.husky/.test(hooksPath)) {
      return warn(`${ver}, 그러나 husky 훅이 설치되지 않음 (core.hooksPath 미설정)`, '`npm install` 또는 `npx husky` 실행 시 prepare 스크립트가 core.hooksPath=.husky/_ 를 설정합니다.', details);
    }
    if (IS_WIN && autocrlf === 'true') details.push('Windows core.autocrlf=true → .husky/* 가 CRLF로 체크아웃되면 WSL/Linux에서 훅 실패 가능 (.gitattributes에 "* text=auto eol=lf" 권장)');
    return pass(ver, details);
  });

  // a.docker — docker 사용 가능 여부
  await ctx.check({ id: 'a.docker', title: 'Docker 사용 가능 여부' }, async () => {
    const d = await ctx.need('docker');
    if (d.ok) {
      const comp = await exec('docker', ['compose', 'version', '--short'], { timeout: 15_000 });
      const details = [`Docker Engine ${d.version}`, comp.code === 0 ? `docker compose ${comp.stdout.trim()}` : 'docker compose 플러그인 없음'];
      if (comp.code !== 0) return warn(`Docker ${d.version}, 그러나 compose v2 플러그인 없음`, '`sudo apt-get install docker-compose-plugin` (구버전 docker-compose v1은 지원 종료)', details);
      return pass(`Docker ${d.version}`, details);
    }
    if (container) return skip(`컨테이너 내부 실행 — Docker 검사 생략 (${d.reason})`);
    // Windows에서 Docker가 WSL 안에만 있는 경우 안내
    if (IS_WIN && which('wsl')) {
      const r = await exec('wsl', ['-e', 'docker', 'version', '--format', '{{.Server.Version}}'], { timeout: 20_000 });
      if (r.code === 0 && r.stdout.trim()) {
        return warn(`Windows PATH에는 docker가 없지만 WSL 안에 Docker ${r.stdout.trim().replace(/\0/g, '')} 존재`,
          `WSL에서 실행: wsl bash -lc "cd ${winToWslPath(root)} && docker compose config -q"`);
      }
    }
    const fix = wsl
      ? 'WSL: `sudo service docker start` (또는 systemd 사용 시 `sudo systemctl start docker`), 권한 오류면 `sudo usermod -aG docker $USER` 후 재로그인'
      : 'Docker Desktop 실행 또는 WSL에 Docker Engine 설치 후 `wsl docker ...` 사용';
    return warn(`Docker 사용 불가 — ${d.reason} (g 단계 일부 SKIP)`, fix);
  });
}
