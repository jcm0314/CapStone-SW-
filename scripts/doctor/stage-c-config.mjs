// [c] 설정 & 환경변수: 코드가 읽는 env 정적 추출, .env 파일 파싱(값 비노출), VITE_ 노출 위험,
//     Supabase URL/anon key 형식, Gemini 키 형식, .gitignore, vite/vitest 설정, Worker 경로, index.html
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  run as exec, walk, readText, readJson, exists, exactCase, stripJsComments, lineOf, parseEnvFile,
  registerSecret, isSensitiveName, mask, makeIgnoreMatcher,
} from './lib.mjs';

const CODE_RE = /\.(m?js|jsx|ts|tsx|cjs)$/;
const VITE_BUILTINS = new Set(['MODE', 'BASE_URL', 'PROD', 'DEV', 'SSR']);
export const ENV_FILES = ['.env', '.env.local', '.env.development', '.env.development.local', '.env.production', '.env.production.local', '.env.test', '.env.test.local', 'server/.env'];

/** 알려진 환경변수 설명 (README/코드 기준) */
export const KNOWN_VARS = {
  VITE_API_GATEWAY_URL: { side: 'client', level: 'recommended', desc: 'B2B 게이트웨이 주소(빌드 시 번들에 삽입). 미설정 시 같은 origin의 /api 로 요청 → nginx 정적 서버는 404 반환 (src/services/aiEvaluator.js, shareService.js, enterpriseVertexService.js)' },
  VITE_SUPABASE_URL: { side: 'client', level: 'optional', desc: 'Supabase 프로젝트 URL (미설정 시 Supabase 비활성, src/services/supabaseClient.js)' },
  VITE_SUPABASE_ANON_KEY: { side: 'client', level: 'optional', desc: 'Supabase anon(공개) 키 — service_role 키를 넣으면 절대 안 됨' },
  ANTHROPIC_API_KEY: { side: 'server', level: 'recommended', desc: '게이트웨이 전용 Claude API 키(브라우저에 두지 않음). 미설정 시 POST /api/v1/evaluate → 503 SERVER_API_KEY_NOT_CONFIGURED' },
  ANTHROPIC_MODEL: { side: 'server', level: 'optional', desc: 'Claude 모델 ID 오버라이드 (기본 claude-opus-5-5)' },
  ANTHROPIC_EFFORT: { side: 'server', level: 'optional', desc: 'Claude effort (low|medium|high|xhigh|max, 기본 medium)' },
  ANTHROPIC_TIMEOUT_MS: { side: 'server', level: 'optional', desc: 'Claude 호출 1회 타임아웃(ms, 기본 120000)' },
  PORT: { side: 'server', level: 'optional', desc: '게이트웨이 포트 (기본 3001, Cloud Run은 8080 주입)' },
  CORS_ALLOWED_ORIGINS: { side: 'server', level: 'recommended', desc: '허용 Origin(쉼표 구분). 미설정 시 모든 Origin 허용(*)' },
  NODE_ENV: { side: 'server', level: 'optional', desc: "'test'이면 서버가 listen하지 않음" },
  SSO_TOKEN_SECRET: { side: 'server', level: 'optional', desc: '게이트웨이 SSO 토큰 HMAC-SHA256 서명 시크릿' },
};

/** src/, server/ 와 루트 설정 파일에서 환경변수 사용처를 정적으로 추출 */
export function extractEnvUsage(root) {
  const files = [...walk(root, 'src', { filter: (f) => CODE_RE.test(f) }), ...walk(root, 'server', { filter: (f) => CODE_RE.test(f) })];
  for (const f of fs.readdirSync(root)) if (/^(vite|vitest)\.config\.(m?js|ts)$/.test(f)) files.push(f);
  const usage = new Map(); // name -> {client:Set, server:Set, locs:[]}
  const add = (name, kind, file, line) => {
    if (!usage.has(name)) usage.set(name, { name, kinds: new Set(), locs: [] });
    const u = usage.get(name); u.kinds.add(kind); u.locs.push(`${file}:${line}`);
  };
  const processEnvInClient = [];
  for (const f of files) {
    const raw = readText(path.join(root, f));
    if (raw == null) continue;
    const src = stripJsComments(raw);
    const isTest = /\.(test|spec)\.[jt]sx?$/.test(f);
    const patterns = [
      [/import\.meta\.env\??\.([A-Za-z_][A-Za-z0-9_]*)/g, 'import.meta.env'],
      [/import\.meta\.env\??\.?\[\s*['"]([A-Za-z0-9_]+)['"]\s*\]/g, 'import.meta.env'],
      [/process\.env\??\.([A-Za-z_][A-Za-z0-9_]*)/g, 'process.env'],
      [/process\.env\??\.?\[\s*['"]([A-Za-z0-9_]+)['"]\s*\]/g, 'process.env'],
    ];
    for (const [re, kind] of patterns) {
      for (const m of src.matchAll(re)) {
        if (kind === 'import.meta.env' && VITE_BUILTINS.has(m[1])) continue;
        add(m[1], kind, f + (isTest ? ' (test)' : ''), lineOf(src, m.index));
        if (kind === 'process.env' && f.startsWith('src/') && !isTest) processEnvInClient.push(`${f}:${lineOf(src, m.index)} process.env.${m[1]}`);
      }
    }
    for (const m of src.matchAll(/(?:const|let|var)\s*\{([^}]+)\}\s*=\s*(process\.env|import\.meta\.env)/g)) {
      for (const part of m[1].split(',')) {
        const name = part.split(/[:=]/)[0].trim();
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) add(name, m[2], f, lineOf(src, m.index));
      }
    }
  }
  return { usage, processEnvInClient, scanned: files.length };
}

/** 환경변수 값 출처: process.env + .env 파일들 (값은 내부에만 보관, 출력하지 않음) */
export function loadEnvSources(root) {
  const files = {};
  for (const f of ENV_FILES) {
    const p = path.join(root, f);
    if (!exists(p)) continue;
    const parsed = parseEnvFile(readText(p) || '');
    files[f] = parsed;
    for (const [k, v] of Object.entries(parsed.vars)) if (isSensitiveName(k) || k.startsWith('VITE_SUPABASE')) registerSecret(v);
  }
  for (const [k, v] of Object.entries(process.env)) if (isSensitiveName(k)) registerSecret(v);
  /** name → [{src, value}] */
  const lookup = (name) => {
    const out = [];
    if (process.env[name] != null) out.push({ src: 'process.env', value: process.env[name] });
    for (const [f, p] of Object.entries(files)) if (name in p.vars) out.push({ src: f, value: p.vars[name] });
    return out;
  };
  return { files, lookup };
}

function b64urlJson(seg) {
  try { return JSON.parse(Buffer.from(seg.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch { return null; }
}

/** 첫 번째로 값이 있는 출처 */
function firstVal(srcs) { return srcs.find((s) => s.value !== '') || null; }

export async function run(ctx, { pass, warn, fail, skip }) {
  const { root, pkg } = ctx;
  const { usage, processEnvInClient, scanned } = extractEnvUsage(root);
  const env = loadEnvSources(root);
  ctx.state.envUsage = usage;
  ctx.state.envSources = env;

  // c.env-usage — 코드가 읽는 환경변수 목록 / 클라이언트 접두사 오류
  await ctx.check({ id: 'c.env-usage', title: '코드가 읽는 환경변수 (정적 추출)' }, async () => {
    const details = [];
    const badClient = [];
    for (const u of [...usage.values()].sort((a, b) => a.name.localeCompare(b.name))) {
      const kinds = [...u.kinds].join('+');
      const known = KNOWN_VARS[u.name];
      details.push(`${u.name} [${kinds}] ${u.locs.slice(0, 3).join(', ')}${u.locs.length > 3 ? ` 외 ${u.locs.length - 3}곳` : ''}${known ? '' : ' (문서화되지 않은 변수)'}`);
      if (u.kinds.has('import.meta.env') && !u.name.startsWith('VITE_')) badClient.push(`${u.name} (${u.locs[0]})`);
    }
    if (badClient.length) return fail(`VITE_ 접두사 없는 import.meta.env 변수 — 번들에서 항상 undefined: ${badClient.join(', ')}`, '변수명을 VITE_로 시작하게 바꾸거나 vite.config.js의 envPrefix를 조정하세요.', details);
    if (processEnvInClient.length) return warn(`브라우저 코드(src/)에서 process.env 사용 — Vite 번들에서 ReferenceError/undefined`, 'src/ 에서는 import.meta.env.VITE_* 를 사용하세요.', [...processEnvInClient, ...details]);
    return pass(`${usage.size}개 변수 (파일 ${scanned}개 스캔)`, details);
  });

  // c.env-files — .env 파일 파싱 결과 (값은 길이만)
  await ctx.check({ id: 'c.env-files', title: '.env 파일 파싱 (값은 마스킹)' }, async () => {
    const names = Object.keys(env.files);
    if (!names.length) {
      return pass('.env 파일 없음 — 모든 값은 프로세스 환경변수/기본값 사용', ['Vite는 .env, .env.local, .env.[mode], .env.[mode].local 을 프로젝트 루트에서 읽고, server/index.js(dotenv)는 실행 cwd의 .env 를 읽습니다.']);
    }
    const details = []; const problems = []; const unknown = [];
    for (const [f, p] of Object.entries(env.files)) {
      details.push(`${f}: ${Object.keys(p.vars).length}개 키`);
      for (const [k, v] of Object.entries(p.vars)) {
        details.push(`  ${k} = ${mask(v)}`);
        if (!usage.has(k) && !KNOWN_VARS[k]) unknown.push(`${f}: ${k}`);
        if (/^\s|\s$/.test(v)) problems.push(`${f}: ${k} 값 앞뒤에 공백 포함`);
        if (k.startsWith('VITE_') && f === 'server/.env') problems.push(`${f}: VITE_* 는 서버 .env에서 의미 없음 (Vite는 루트 .env만 읽음)`);
      }
      for (const pr of p.problems) problems.push(`${f}: ${pr}`);
    }
    if (exists(path.join(root, 'server/.env'))) problems.push('server/.env 존재 — `node server/index.js`를 루트에서 실행하면 dotenv는 루트 .env 를 읽으므로 이 파일은 무시됨');
    if (problems.length) return warn(problems[0], '.env 형식(KEY=VALUE, 따옴표 짝, 중복 키)을 확인하세요.', [...problems.slice(1), ...details]);
    if (unknown.length) return warn(`코드에서 사용하지 않는 키 ${unknown.length}개 (오타 가능성): ${unknown.slice(0, 3).join(', ')}`, '키 이름이 코드의 변수명(c.env-usage 참고)과 정확히 일치하는지 확인하세요.', details);
    return pass(`${names.join(', ')}`, details);
  });

  // c.env-missing — 중요 변수 설정 여부
  await ctx.check({ id: 'c.env-missing', title: '환경변수 설정 현황 (설정/누락)' }, async () => {
    const names = new Set([...usage.keys(), ...Object.keys(KNOWN_VARS).filter((k) => usage.has(k) || KNOWN_VARS[k].level === 'recommended')]);
    const details = []; const missingRec = [];
    for (const n of [...names].sort()) {
      const srcs = env.lookup(n);
      const v = firstVal(srcs);
      const k = KNOWN_VARS[n];
      details.push(`${n}: ${v ? `${mask(v.value)} ← ${srcs.map((s) => s.src).join(', ')}` : '미설정'}${k ? ` · ${k.desc}` : ''}`);
      if (!v && k?.level === 'recommended') missingRec.push(n);
    }
    if (missingRec.length) {
      return warn(`권장 변수 미설정: ${missingRec.join(', ')} (로컬 데모는 동작하지만 배포/B2B 모드에 영향)`,
        '루트에 .env.local 생성(커밋 금지) 예: VITE_API_GATEWAY_URL=http://localhost:3001 / 서버: ANTHROPIC_API_KEY=... CORS_ALLOWED_ORIGINS=http://localhost:3000. 배포는 Secret Manager/K8s Secret 사용.', details);
    }
    return pass('권장 변수 모두 설정됨', details);
  });

  // c.vite-secret-exposure — VITE_ 로 비밀값 노출
  await ctx.check({ id: 'c.vite-secret', title: 'VITE_* 로 비밀값이 클라이언트 번들에 노출되는지' }, async () => {
    const risky = [...usage.keys()].filter((n) => n.startsWith('VITE_') && isSensitiveName(n) && !/ANON_KEY|PUBLISHABLE|PUBLIC/.test(n));
    const setRisky = []; const details = [];
    for (const n of risky) {
      const v = firstVal(env.lookup(n));
      details.push(`${n}: 코드 사용처 ${usage.get(n).locs.join(', ')} · 값 ${v ? mask(v.value) + ' ← ' + v.src : '미설정'}`);
      if (v) setRisky.push(`${n} (${v.src})`);
    }
    // 파일에 정의만 되어 있는 VITE_*SECRET 류
    for (const [f, p] of Object.entries(env.files)) {
      for (const k of Object.keys(p.vars)) {
        if (k.startsWith('VITE_') && isSensitiveName(k) && !/ANON_KEY|PUBLISHABLE|PUBLIC/.test(k) && !risky.includes(k) && p.vars[k]) setRisky.push(`${k} (${f})`);
      }
    }
    if (setRisky.length) {
      return warn(`비밀값으로 보이는 VITE_ 변수에 값이 설정됨 → \`vite build\` 시 JS 번들에 평문 포함: ${setRisky.join(', ')}`,
        'AI 키는 서버 환경변수 ANTHROPIC_API_KEY(게이트웨이)로만 두고 .env*에서 VITE_* 비밀 변수를 삭제하세요. 이미 배포됐다면 키를 즉시 폐기·재발급하세요.', details);
    }
    if (risky.length) {
      return warn(`코드가 ${risky.join(', ')} 를 읽음 — 값이 설정되면 번들에 노출되는 구조 (현재 미설정)`,
        '비밀값은 import.meta.env(VITE_*)로 읽지 말고 서버(게이트웨이)에서만 사용하세요.', details);
    }
    return pass('비밀값 성격의 VITE_ 변수 없음');
  });

  // c.supabase-url
  await ctx.check({ id: 'c.supabase-url', title: 'Supabase URL 형식 (VITE_SUPABASE_URL)' }, async () => {
    const v = firstVal(env.lookup('VITE_SUPABASE_URL'));
    if (!v) return skip('미설정 — Supabase 연동 비활성(선택 기능, isSupabaseConfigured=false)');
    const s = v.value.trim(); const problems = [];
    let u; try { u = new URL(s); } catch { return fail(`URL 형식이 아님 (${v.src})`, '형식: https://<project-ref>.supabase.co'); }
    if (u.protocol !== 'https:') problems.push('https:// 가 아님 → supabaseClient.js의 startsWith("https://") 검사에서 비활성 처리됨');
    if (!/\.supabase\.(co|in)$/.test(u.hostname)) problems.push(`호스트 ${u.hostname} 가 *.supabase.co 가 아님 (커스텀 도메인이면 무시)`);
    if (u.pathname && u.pathname !== '/') problems.push(`경로 "${u.pathname}" 포함 — /rest/v1 등은 붙이지 마세요`);
    if (s.endsWith('/')) problems.push('끝에 / 포함 (일부 SDK 버전에서 // 경로 생성)');
    ctx.state.supabaseRef = u.hostname.split('.')[0];
    if (problems.length) return (problems[0].includes('https') ? fail : warn)(problems[0], '형식: VITE_SUPABASE_URL=https://<project-ref>.supabase.co (Supabase 대시보드 → Project Settings → API)', problems.slice(1));
    return pass(`https://${u.hostname} (${v.src})`);
  });

  // c.supabase-key
  await ctx.check({ id: 'c.supabase-key', title: 'Supabase anon key 형식 (VITE_SUPABASE_ANON_KEY)' }, async () => {
    const v = firstVal(env.lookup('VITE_SUPABASE_ANON_KEY'));
    if (!v) return skip('미설정 — Supabase 연동 비활성(선택 기능)');
    const s = v.value.trim();
    if (s.startsWith('sb_secret_')) return fail(`secret 키(sb_secret_…)가 클라이언트 변수에 설정됨 (${v.src}) — 번들에 노출되어 RLS 우회 가능`, '즉시 Supabase 대시보드에서 키를 회전하고 publishable(sb_publishable_…) 또는 anon 키를 사용하세요.');
    if (s.startsWith('sb_publishable_')) return pass(`publishable 키 형식 (${mask(s)}, ${v.src})`);
    const parts = s.split('.');
    if (parts.length !== 3) return warn(`JWT(xxx.yyy.zzz) 형식이 아님 (${mask(s)}, ${v.src})`, 'Supabase 대시보드 → Project Settings → API 의 anon public 키를 그대로 복사하세요.');
    const header = b64urlJson(parts[0]); const payload = b64urlJson(parts[1]);
    if (!header || !payload) return warn('JWT 디코딩 실패', 'anon 키를 다시 복사하세요 (줄바꿈/따옴표 포함 여부 확인).');
    const details = [`alg=${header.alg} role=${payload.role} ref=${payload.ref ?? '?'} iss=${payload.iss ?? '?'}`];
    if (payload.role === 'service_role') return fail(`service_role 키가 VITE_ 변수에 설정됨 (${v.src}) — 브라우저 번들에 노출되어 RLS가 완전히 우회됨`, '즉시 키를 회전(JWT secret 재발급)하고 anon 키로 교체하세요.', details);
    if (payload.role !== 'anon') return warn(`role=${payload.role} (anon 아님)`, 'anon public 키를 사용하세요.', details);
    if (payload.exp && payload.exp * 1000 < Date.now()) return warn(`키 만료됨 (exp ${new Date(payload.exp * 1000).toISOString()})`, '대시보드에서 새 anon 키를 복사하세요.', details);
    if (ctx.state.supabaseRef && payload.ref && payload.ref !== ctx.state.supabaseRef) return fail(`anon 키의 프로젝트(ref=${payload.ref})와 URL 프로젝트(${ctx.state.supabaseRef}) 불일치 → 401 Invalid API key`, '같은 프로젝트의 URL과 anon 키를 사용하세요.', details);
    return pass(`anon JWT 형식 정상 (${mask(s)}, ${v.src})`, details);
  });

  // c.anthropic-key
  await ctx.check({ id: 'c.anthropic-key', title: 'Claude API 키 형식 (ANTHROPIC_API_KEY, 서버 전용)' }, async () => {
    const legacy = ['GEMINI_API_KEY', 'VERTEX_API_KEY', 'VITE_GEMINI_API_KEY'].filter((n) => firstVal(env.lookup(n)));
    const v = firstVal(env.lookup('ANTHROPIC_API_KEY'));
    const legacyNote = legacy.length ? [`더 이상 사용하지 않는 변수: ${legacy.join(', ')} (삭제 권장)`] : [];
    if (!v) return skip('키 미설정 — 게이트웨이 /api/v1/evaluate 는 503 SERVER_API_KEY_NOT_CONFIGURED', '게이트웨이 실행 환경(.env)에 ANTHROPIC_API_KEY 설정 (console.anthropic.com 에서 발급)', legacyNote);
    const s = v.value;
    const details = [`ANTHROPIC_API_KEY: ${mask(s)} ← ${v.src}`, ...legacyNote];
    const problems = [];
    if (s !== s.trim()) problems.push('앞뒤 공백/줄바꿈 포함 → 401 authentication_error');
    if (!/^sk-ant-/.test(s.trim())) problems.push('Anthropic API 키 형식(sk-ant-...)이 아님');
    if (/YOUR_|REPLACE|CHANGE_ME|xxx/i.test(s)) problems.push('플레이스홀더 값');
    if (problems.length) return warn(problems[0], 'console.anthropic.com 에서 키를 다시 복사하세요 (따옴표·공백 없이).', [...problems.slice(1), ...details]);
    return pass('ANTHROPIC_API_KEY 형식 정상', details);
  });

  // c.gitignore-env — .env 가 커밋되지 않도록
  await ctx.check({ id: 'c.gitignore-env', title: '.env 파일 gitignore 처리' }, async () => {
    const gi = readText(path.join(root, '.gitignore'));
    if (gi == null) return fail('.gitignore 없음', '.gitignore 생성: node_modules, dist, .env, .env.*, !.env.example');
    const isIgnored = makeIgnoreMatcher(gi);
    const probe = ['.env', '.env.local', '.env.production', '.env.development', '.env.production.local', 'server/.env'];
    const notIgnored = probe.filter((f) => !isIgnored(f).ignored);
    const existing = Object.keys(env.files);
    const exposed = existing.filter((f) => !isIgnored(f).ignored);
    const details = probe.map((f) => `${f}: ${isIgnored(f).ignored ? `무시됨 (${isIgnored(f).by})` : '무시되지 않음'}${existing.includes(f) ? ' [파일 존재]' : ''}`);
    // git이 있으면 실제 추적 여부 확인
    const g = await ctx.need('gitRepo');
    if (g.ok) {
      const r = await exec('git', ['ls-files', '--', '.env', '.env.*', 'server/.env', '**/.env'], { cwd: root, timeout: 15_000 });
      const tracked = r.stdout.split('\n').map((s) => s.trim()).filter((s) => s && !/\.example$|\.sample$|\.template$/.test(s));
      if (tracked.length) return fail(`.env 파일이 git에 커밋되어 있음: ${tracked.join(', ')}`, '`git rm --cached <파일>` 후 .gitignore에 추가하고, 포함된 키는 모두 폐기·재발급하세요.', details);
    } else details.push(`(git 미사용: ${g.reason} — 추적 여부는 확인하지 못함)`);
    if (exposed.length) return fail(`존재하는 ${exposed.join(', ')} 이(가) .gitignore로 보호되지 않음 — \`git add .\` 시 커밋됨`, '.gitignore에 `.env` 와 `.env.*` (그리고 `!.env.example`) 추가', details);
    if (notIgnored.length) return warn(`.gitignore가 ${notIgnored.join(', ')} 를 무시하지 않음 (현재 "*.local"만 있음)`, '.gitignore에 다음 추가:\n         .env\n         .env.*\n         !.env.example', details);
    return pass('.env 계열 파일 모두 무시됨', details);
  });

  // c.env-example
  await ctx.check({ id: 'c.env-example', title: '.env.example (환경변수 템플릿) 존재' }, async () => {
    const cand = ['.env.example', '.env.sample', '.env.template'].find((f) => exists(path.join(root, f)));
    const need = [...usage.keys()].filter((n) => KNOWN_VARS[n]?.level !== 'optional' || n.startsWith('VITE_')).sort();
    if (!cand) return warn('.env.example 없음 — 신규 개발자가 필요한 변수(VITE_API_GATEWAY_URL, ANTHROPIC_API_KEY 등)를 알 수 없음', `.env.example 생성 후 키 이름만 기재(값 비움): ${need.join(', ')}`);
    const p = parseEnvFile(readText(path.join(root, cand)) || '');
    const missing = [...usage.keys()].filter((n) => !(n in p.vars) && n !== 'NODE_ENV');
    const realLooking = Object.entries(p.vars).filter(([, v]) => /^AIza[0-9A-Za-z_-]{35}$/.test(v) || /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(v)).map(([k]) => k);
    if (realLooking.length) return fail(`${cand}에 실제 키로 보이는 값: ${realLooking.join(', ')}`, '값을 비우고 해당 키는 폐기·재발급하세요.');
    if (missing.length) return warn(`${cand}에 누락된 변수: ${missing.join(', ')}`, `${cand}에 누락된 키를 추가하세요.`);
    return pass(`${cand} — 코드 사용 변수 모두 포함`);
  });

  // c.vite-config — 정적 분석 + 실제 로드
  await ctx.check({ id: 'c.vite-config', title: 'vite.config 로드 및 설정 점검' }, async () => {
    const cfgFile = ['vite.config.js', 'vite.config.mjs', 'vite.config.ts', 'vite.config.cjs'].find((f) => exists(path.join(root, f)));
    if (!cfgFile) return warn('vite.config.* 없음 (기본값 사용, React 플러그인 미적용)', 'vite.config.js 생성 및 @vitejs/plugin-react 등록');
    const txt = readText(path.join(root, cfgFile));
    const details = [`파일: ${cfgFile}`];
    const problems = [];
    if (!/plugin-react/.test(txt)) problems.push('@vitejs/plugin-react 미사용 — JSX/Fast Refresh 문제 가능');
    if (cfgFile.endsWith('.js') && pkg?.type !== 'module' && /^\s*import\s/m.test(txt)) problems.push('package.json "type":"module" 없이 ESM 문법 사용 → vite.config.mjs로 변경 필요');
    const portM = txt.match(/port\s*:\s*(\d+)/);
    if (portM) { details.push(`server.port: ${portM[1]}`); ctx.state.vitePort = Number(portM[1]); }
    if (/open\s*:\s*true/.test(txt)) details.push('server.open: true — WSL/CI에서는 브라우저 열기 실패 메시지가 나올 수 있음(무해). BROWSER=none 으로 끌 수 있음');
    if (!/\bworker\s*:/.test(txt)) details.push('worker 설정 없음 (기본 format "iife"). Worker가 import/코드 분할을 쓰면 worker: { format: "es" } 필요');
    // 문서의 포트 표기와 비교
    const docs = ['README.md', 'CONTRIBUTING.md', 'docs/ARCHITECTURE.md'].map((f) => [f, readText(path.join(root, f)) || '']);
    for (const [f, t] of docs) {
      const m = t.match(/localhost:(\d{4})(?!\d)/g) || [];
      const ports = [...new Set(m.map((x) => Number(x.split(':')[1])))].filter((p) => p !== 3001 && p !== 4000 && p !== 80);
      if (portM && ports.length && !ports.includes(Number(portM[1]))) problems.push(`${f}가 localhost:${ports.join('/')} 를 안내하지만 vite server.port는 ${portM[1]}`);
    }
    // 실제 로드 (node_modules 필요)
    const nmOk = (await ctx.need('nodeModules')).ok;
    if (nmOk) {
      const script = `
        const m = await import(${JSON.stringify(pathToFileURL(path.join(root, cfgFile)).href)});
        let c = m.default;
        if (typeof c === 'function') c = await c({ command: 'build', mode: 'production', isSsrBuild: false, isPreview: false });
        const plugins = (c.plugins || []).flat(Infinity).filter(Boolean).map(p => p.name || '?');
        process.stdout.write(JSON.stringify({ plugins, server: c.server || null, preview: c.preview || null, test: c.test || null, build: c.build || null, envPrefix: c.envPrefix || null, worker: c.worker ? Object.keys(c.worker) : null, base: c.base || '/' }));
      `;
      const r = await exec(process.execPath, ['--input-type=module', '-e', script], { cwd: root, timeout: 60_000 });
      if (r.code !== 0) {
        return fail(`${cfgFile} 로드 실패: ${(r.stderr || r.error || '').trim().split('\n').find((l) => /Error|error/.test(l)) || 'exit ' + r.code}`, '`npx vite build --debug` 로 원인을 확인하고, 설정 파일의 import 대상 패키지가 설치되어 있는지 확인하세요.', [(r.stderr || '').trim().split('\n').slice(0, 6).join(' | ')]);
      }
      try {
        const c = JSON.parse(r.stdout);
        ctx.state.viteConfig = c;
        details.push(`plugins: ${c.plugins.join(', ') || '(없음)'} · base: ${c.base}${c.envPrefix ? ` · envPrefix: ${c.envPrefix}` : ''}`);
        if (c.test) details.push(`test: ${JSON.stringify(c.test)}`);
        if (c.build?.chunkSizeWarningLimit) details.push(`build.chunkSizeWarningLimit: ${c.build.chunkSizeWarningLimit}`);
        if (c.base && c.base !== '/' && c.base !== './') details.push(`base="${c.base}" — 하위 경로 배포 시 nginx try_files 도 같은 경로여야 함`);
      } catch { details.push('설정 직렬화 실패(무시)'); }
    } else details.push('node_modules 없음 → 실제 로드 검사 생략');
    if (problems.length) return warn(problems[0], 'vite.config.js 또는 문서의 포트 안내를 일치시키세요.', [...problems.slice(1), ...details]);
    return pass(`${cfgFile} 정상${nmOk ? ' (실제 로드 성공)' : ''}`, details);
  });

  // c.vitest-config
  await ctx.check({ id: 'c.vitest-config', title: 'Vitest 설정 (환경/jsdom/별도 설정 파일)' }, async () => {
    const vitestCfg = ['vitest.config.js', 'vitest.config.mjs', 'vitest.config.ts', 'vitest.workspace.js', 'vitest.workspace.ts'].filter((f) => exists(path.join(root, f)));
    const viteTxt = readText(path.join(root, 'vite.config.js')) || '';
    const details = [];
    const problems = [];
    if (vitestCfg.length) details.push(`별도 설정: ${vitestCfg.join(', ')} (vite.config.js의 test 블록보다 우선)`);
    else details.push('vite.config.js 의 test 블록 사용');
    const envM = viteTxt.match(/environment\s*:\s*['"](\w+)['"]/);
    const envName = envM ? envM[1] : (ctx.state.viteConfig?.test?.environment || 'node');
    details.push(`기본 테스트 환경: ${envName}${/globals\s*:\s*true/.test(viteTxt) ? ' · globals: true' : ''}`);
    if (envName === 'jsdom' && !pkg?.devDependencies?.jsdom && !pkg?.dependencies?.jsdom) problems.push('environment "jsdom"이지만 jsdom 미설치 → "Cannot find package jsdom"');
    if (envName === 'happy-dom' && !pkg?.devDependencies?.['happy-dom']) problems.push('environment "happy-dom"이지만 happy-dom 미설치');
    if (pkg?.scripts?.test && /vitest(?!.*\brun\b)/.test(pkg.scripts.test) && !/--run/.test(pkg.scripts.test)) problems.push(`"test": "${pkg.scripts.test}" — run 없이 watch 모드로 실행되어 CI/husky에서 멈출 수 있음`);
    // 파일별 환경 지정 현황
    const tests = walk(root, '', { filter: (f) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(f) });
    const nodeEnv = tests.filter((f) => /@vitest-environment\s+node/.test(readText(path.join(root, f)) || ''));
    details.push(`테스트 파일 ${tests.length}개 중 @vitest-environment node 지정: ${nodeEnv.join(', ') || '없음'}`);
    const serverTests = tests.filter((f) => f.startsWith('server/'));
    const missingNode = serverTests.filter((f) => !nodeEnv.includes(f));
    if (missingNode.length) problems.push(`서버 테스트가 jsdom 환경에서 실행됨: ${missingNode.join(', ')} → 파일 첫 줄에 // @vitest-environment node`);
    if (problems.length) return warn(problems[0], 'vite.config.js test 설정과 package.json scripts.test 를 확인하세요.', [...problems.slice(1), ...details]);
    return pass(`환경 ${envName}, 테스트 파일 ${tests.length}개`, details);
  });

  // c.workers — Worker import 경로 / 사용 여부 / pdf.js worker
  await ctx.check({ id: 'c.workers', title: 'Web Worker 경로 및 사용 여부' }, async () => {
    const files = walk(root, 'src', { filter: (f) => CODE_RE.test(f) && !/\.(test|spec)\./.test(f) });
    const refs = []; const problems = []; const details = [];
    for (const f of files) {
      const src = stripJsComments(readText(path.join(root, f)) || '');
      for (const m of src.matchAll(/new\s+(?:Shared)?Worker\s*\(\s*new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)([^)]*\))?/g)) {
        refs.push({ from: f, spec: m[1], line: lineOf(src, m.index), opts: m[2] || '' });
      }
      for (const m of src.matchAll(/import\s+\w+\s+from\s+['"]([^'"]+\?worker[^'"]*)['"]/g)) refs.push({ from: f, spec: m[1].replace(/\?.*$/, ''), line: lineOf(src, m.index), opts: '?worker' });
      for (const m of src.matchAll(/new\s+(?:Shared)?Worker\s*\(\s*['"]([^'"]+)['"]/g)) problems.push(`${f}:${lineOf(src, m.index)} new Worker('${m[1]}') — 문자열 경로는 빌드 후 404. new URL('${m[1]}', import.meta.url) 사용 필요`);
      if (/GlobalWorkerOptions\.workerSrc\s*=\s*[`'"]https?:\/\//.test(src)) {
        details.push(`${f}: pdf.js workerSrc를 외부 CDN(cdnjs)에서 로드 — 오프라인/CSP/사내망 환경과 CDN에 해당 버전이 없을 때 PDF 파싱 실패 (h 단계 --network 로 CDN 존재 확인 가능)`);
        ctx.state.pdfWorkerCdn = true;
      }
    }
    for (const r of refs) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(r.from), r.spec));
      const st = exactCase(root, target);
      if (st.state === 'missing') problems.push(`${r.from}:${r.line} Worker 파일 없음: ${target}`);
      else if (st.state === 'case-mismatch') problems.push(`${r.from}:${r.line} 대소문자 불일치: ${target} (실제 ${st.actual}) → Linux/CI 빌드 실패`);
      else details.push(`${r.from}:${r.line} → ${target} 존재${/type\s*:\s*['"]module['"]/.test(r.opts) ? " (type: 'module')" : ''}`);
      // 해당 Worker 를 생성하는 모듈이 실제로 import 되는지
      const base = path.posix.basename(r.from).replace(/\.[jt]sx?$/, '');
      const importers = files.filter((f) => f !== r.from && new RegExp(`from\\s+['"][^'"]*/${base}(\\.[jt]sx?)?['"]`).test(readText(path.join(root, f)) || ''));
      if (!importers.length) details.push(`주의: ${r.from} 를 import하는 모듈이 없음 → Worker가 실제로 사용되지 않음 (README "Web Worker 미사용"과 일치)`);
      else details.push(`${r.from} 사용처: ${importers.join(', ')}`);
      ctx.state.workerFiles = (ctx.state.workerFiles || []).concat(target);
    }
    if (problems.length) return fail(problems[0], 'Worker는 new Worker(new URL("<worker-path>", import.meta.url), { type: "module" }) 형식으로 생성하고 파일명 대소문자를 정확히 맞추세요.', [...problems.slice(1), ...details]);
    if (!refs.length) return pass('Worker 생성 코드 없음', details);
    const unused = details.some((d) => d.startsWith('주의:'));
    if (unused || ctx.state.pdfWorkerCdn) return warn(unused ? 'Worker 파일은 존재하나 생성 모듈이 어디에서도 import되지 않음 (사용되지 않는 코드)' : 'pdf.js Worker를 외부 CDN에서 로드', unused ? '사용할 계획이면 src/services/workerService.js 를 호출부에 연결, 아니면 제거 (tasks/18 참고)' : "로컬 번들 사용 권장: import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'; GlobalWorkerOptions.workerSrc = workerUrl;", details);
    return pass(`Worker ${refs.length}개 경로 정상`, details);
  });

  // c.index-html
  await ctx.check({ id: 'c.index-html', title: 'index.html 엔트리/정적 자산 참조' }, async () => {
    const html = readText(path.join(root, 'index.html'));
    if (!html) return fail('index.html 없음', 'Vite 프로젝트 루트에 index.html이 필요합니다.');
    const problems = []; const details = [];
    for (const m of html.matchAll(/<script[^>]*\bsrc=["']([^"']+)["']/g)) {
      if (/^https?:/.test(m[1])) { details.push(`외부 스크립트: ${m[1]}`); continue; }
      const st = exactCase(root, m[1].replace(/^\//, ''));
      if (st.state !== 'exact') problems.push(`엔트리 스크립트 ${m[1]}: ${st.state === 'missing' ? '파일 없음' : '대소문자 불일치 ' + st.actual}`);
      else details.push(`엔트리: ${m[1]} 존재`);
    }
    for (const m of html.matchAll(/<link[^>]*\bhref=["'](\/[^"']+)["']/g)) {
      const p = m[1].replace(/^\//, '');
      if (!exists(path.join(root, 'public', p)) && !exists(path.join(root, p))) problems.push(`<link href="${m[1]}"> 대상이 public/ 에 없음 → 배포 후 404 (콘솔 오류)`);
    }
    for (const m of html.matchAll(/<link[^>]*\bhref=["'](https?:[^"']+)["']/g)) details.push(`외부 리소스: ${m[1]}`);
    const rootId = html.match(/<div[^>]*id=["']([^"']+)["']/)?.[1];
    const mainTxt = readText(path.join(root, 'src/main.jsx')) || '';
    const mountId = mainTxt.match(/getElementById\(['"]([^'"]+)['"]\)/)?.[1];
    if (mountId && rootId !== mountId) problems.push(`main.jsx는 #${mountId}에 마운트하지만 index.html에는 #${rootId ?? '없음'} → 빈 화면`);
    else details.push(`마운트 대상 #${mountId} 일치`);
    if (problems.length) return warn(problems[0], 'index.html의 경로를 수정하거나 public/에 파일을 추가하세요 (예: public/vite.svg 또는 favicon 링크 제거).', [...problems.slice(1), ...details]);
    return pass('엔트리와 참조 자산 정상', details);
  });

  // c.css-pipeline — tailwind/postcss
  await ctx.check({ id: 'c.css', title: 'Tailwind/PostCSS 설정' }, async () => {
    const tw = ['tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.mjs', 'tailwind.config.ts'].find((f) => exists(path.join(root, f)));
    const pc = ['postcss.config.js', 'postcss.config.cjs', 'postcss.config.mjs'].find((f) => exists(path.join(root, f)));
    const details = [];
    if (!tw && !pc) return pass('Tailwind/PostCSS 미사용');
    const problems = [];
    if (tw) {
      const t = readText(path.join(root, tw));
      if (!/src\/\*\*\/\*\.\{?[^}]*jsx/.test(t)) problems.push(`${tw} content에 src/**/*.jsx 패턴 없음 → 프로덕션 빌드에서 클래스가 제거(빈 스타일)`);
      details.push(`${tw}: content ${t.match(/content\s*:\s*\[([^\]]*)\]/s)?.[1].replace(/\s+/g, ' ').trim()}`);
    }
    if (pc) {
      const t = readText(path.join(root, pc));
      for (const plugin of ['tailwindcss', 'autoprefixer']) {
        if (new RegExp(`\\b${plugin}\\b`).test(t) && !pkg?.devDependencies?.[plugin] && !pkg?.dependencies?.[plugin]) problems.push(`${pc}가 ${plugin}을 사용하지만 package.json에 없음`);
      }
      const twVer = pkg?.devDependencies?.tailwindcss || pkg?.dependencies?.tailwindcss;
      if (twVer && /^\^?4/.test(twVer) && /tailwindcss\s*:/.test(t)) problems.push('Tailwind v4는 postcss 플러그인이 @tailwindcss/postcss 로 분리됨');
      details.push(`${pc} 플러그인: ${(t.match(/(\w+)\s*:\s*\{\}/g) || []).join(', ')}`);
    }
    const css = readText(path.join(root, 'src/index.css')) || '';
    if (tw && !/@tailwind\s+(base|components|utilities)|@import\s+["']tailwindcss/.test(css)) problems.push('src/index.css에 @tailwind 지시어 없음');
    if (problems.length) return warn(problems[0], 'tailwind.config.js의 content / postcss.config.js 플러그인 / src/index.css 지시어를 확인하세요.', [...problems.slice(1), ...details]);
    return pass('Tailwind content/PostCSS 플러그인 정상', details);
  });

  // c.hooks — husky / lint-staged 구성
  await ctx.check({ id: 'c.hooks', title: 'husky 훅 / lint-staged 구성' }, async () => {
    const hookDir = path.join(root, '.husky');
    if (!exists(hookDir)) return pass('husky 미사용');
    const hooks = fs.readdirSync(hookDir).filter((f) => !f.startsWith('_') && !f.startsWith('.') && fs.statSync(path.join(hookDir, f)).isFile());
    const details = []; const problems = [];
    for (const h of hooks) {
      const buf = fs.readFileSync(path.join(hookDir, h));
      const txt = buf.toString('utf8');
      details.push(`.husky/${h}: ${txt.trim().split(/\r?\n/).join(' ; ')}`);
      if (buf.includes(Buffer.from('\r\n'))) problems.push(`.husky/${h} 가 CRLF 줄바꿈 → Linux/WSL/macOS에서 "sh\\r: not found" 오류`);
      if (buf[0] === 0xef && buf[1] === 0xbb) problems.push(`.husky/${h} 에 UTF-8 BOM → 첫 명령 인식 실패`);
      if (/^#!.*\n.*husky\.sh/m.test(txt)) problems.push(`.husky/${h}: husky v4~8 형식(. "$(dirname -- "$0")/_/husky.sh") — v9에서는 해당 줄 삭제 권장`);
      for (const m of txt.matchAll(/npm (?:run )?([\w:-]+)/g)) {
        const s = m[1] === 'test' ? 'test' : m[1];
        if (!['ci', 'install', 'exec', 'npx'].includes(s) && !pkg?.scripts?.[s]) problems.push(`.husky/${h}가 존재하지 않는 스크립트 "npm run ${s}" 호출`);
      }
      if (h === 'pre-commit' && /\bnpm test\b/.test(txt) && pkg?.['lint-staged']) details.push('pre-commit이 전체 테스트(npm test)를 실행하고 package.json의 lint-staged 설정은 사용되지 않음 → 커밋마다 전체 스위트 실행(느림)');
    }
    if (problems.length) return fail(problems[0], 'CRLF → LF 변환: VS Code 우하단 "CRLF"→"LF" 저장, 또는 `git config core.autocrlf input` 후 재체크아웃. .gitattributes에 ".husky/* text eol=lf" 추가 권장.', [...problems.slice(1), ...details]);
    const unusedLs = details.some((d) => d.includes('lint-staged 설정은 사용되지 않음'));
    if (unusedLs) return warn('pre-commit이 전체 vitest 스위트를 실행하고 lint-staged 설정은 미사용', '.husky/pre-commit 내용을 `npx lint-staged` 로 바꾸면 변경 파일 관련 테스트만 실행됩니다 (package.json lint-staged: vitest related --run).', details);
    return pass(`훅 ${hooks.length}개 정상`, details);
  });
}
