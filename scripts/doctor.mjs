#!/usr/bin/env node
// scripts/doctor.mjs
// Check-Mate (HR AX Smart Evaluator) 종합 진단 도구 ("doctor")
//
// 사용법:  node scripts/doctor.mjs [--quick] [--stage a,c|env,deps] [--network] [--json] [--verbose] [--no-color] [--help]
// 종료 코드: 0 = 모두 통과, 1 = FAIL 존재, 2 = WARN만 존재
//
// 원칙
//  - 외부 의존성 없음(Node 내장 모듈만 사용). Windows PowerShell / WSL / Linux 공용.
//  - 모든 하위 프로세스·네트워크 호출에 타임아웃.
//  - 비밀값은 절대 출력하지 않음(길이만 표기, 출력 직전 패턴 가림).
//  - 유료 API(Gemini 생성 요청)는 호출하지 않음.
//  - 저장소 파일을 수정하지 않음(빌드 산출물은 OS 임시 폴더에 생성).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { killAllChildren, redact, readJson, exists, which, run, IS_WIN, satisfies, npmInvocation } from './doctor/lib.mjs';

import * as stageEnv from './doctor/stage-a-env.mjs';
import * as stageDeps from './doctor/stage-b-deps.mjs';
import * as stageConfig from './doctor/stage-c-config.mjs';
import * as stageStatic from './doctor/stage-d-static.mjs';
import * as stageTests from './doctor/stage-e-tests.mjs';
import * as stageRuntime from './doctor/stage-f-runtime.mjs';
import * as stageInfra from './doctor/stage-g-infra.mjs';
import * as stageNetwork from './doctor/stage-h-network.mjs';

const DOCTOR_VERSION = '1.0.0';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const STAGES = [
  { key: 'a', name: 'env', title: '실행 환경 (Node/npm/OS/WSL/git/docker)', mod: stageEnv },
  { key: 'b', name: 'deps', title: '의존성 (node_modules/lockfile/중복/peer)', mod: stageDeps },
  { key: 'c', name: 'config', title: '설정 & 환경변수 (.env/VITE_/키 형식/vite·vitest)', mod: stageConfig },
  { key: 'd', name: 'static', title: '정적 코드 상태 (import 해석/대소문자/JSON/인코딩)', mod: stageStatic },
  { key: 'e', name: 'tests', title: '테스트 & 빌드 (vitest/vite build/번들)', mod: stageTests },
  { key: 'f', name: 'runtime', title: '런타임 스모크 (게이트웨이/vite preview/포트)', mod: stageRuntime },
  { key: 'g', name: 'infra', title: '컨테이너 & 인프라 (Docker/nginx/k8s/terraform/CI)', mod: stageInfra },
  { key: 'h', name: 'network', title: '외부 연결 (선택, --network)', mod: stageNetwork },
];

// ---------------------------------------------------------------------------
// 인자 파싱
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const o = { quick: false, stages: null, network: false, json: false, verbose: false, color: true, help: false, unknown: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--quick' || a === '-q') o.quick = true;
    else if (a === '--network' || a === '-n') o.network = true;
    else if (a === '--json') o.json = true;
    else if (a === '--verbose' || a === '-v') o.verbose = true;
    else if (a === '--no-color') o.color = false;
    else if (a === '--help' || a === '-h') o.help = true;
    else if (a === '--stage' || a === '-s' || a.startsWith('--stage=')) {
      const val = a.includes('=') ? a.split('=')[1] : argv[++i];
      if (!val) { o.unknown.push('--stage (값 누락)'); continue; }
      o.stages = o.stages || new Set();
      for (const part of val.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)) {
        const st = STAGES.find((s) => s.key === part || s.name === part);
        if (st) o.stages.add(st.key); else o.unknown.push(`--stage ${part}`);
      }
    } else o.unknown.push(a);
  }
  if (process.env.NO_COLOR || !process.stdout.isTTY) o.color = false;
  return o;
}

const HELP = `
Check-Mate doctor ${DOCTOR_VERSION} — 개발/배포 환경 종합 진단 도구

사용법:
  node scripts/doctor.mjs [옵션]

옵션:
  --quick, -q          a~d 단계만 실행 (환경·의존성·설정·정적 검사, 수 초 내 완료)
  --stage, -s <목록>   특정 단계만 실행. 쉼표 구분, 문자 또는 이름
                         a=env  b=deps  c=config  d=static
                         e=tests  f=runtime  g=infra  h=network
                       예) --stage e   --stage deps,config   --stage=f
  --network, -n        h 단계(외부 연결: Supabase/Cloud Run/Gemini 엔드포인트 도달성, npm audit) 포함
                       ※ 생성(generateContent) 요청은 절대 보내지 않습니다.
  --json               사람이 읽는 출력 대신 JSON 결과를 stdout에 출력
  --verbose, -v        PASS 항목의 세부 내용까지 출력
  --no-color           색상 끄기 (NO_COLOR 환경변수도 지원)
  --help, -h           이 도움말

종료 코드:
  0  모든 검사 통과(PASS/SKIP만 존재)
  1  FAIL이 하나 이상 존재
  2  FAIL 없이 WARN만 존재

보고서:
  실행할 때마다 OS 임시 폴더에 doctor-report-<시각>.log 를 저장하고 경로를 출력합니다.

PowerShell 5.1에서 한글이 깨질 때:
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
`;

// ---------------------------------------------------------------------------
// 출력
// ---------------------------------------------------------------------------
const C = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', gray: '\x1b[90m' };
const STATUS_COLOR = { PASS: 'green', WARN: 'yellow', FAIL: 'red', SKIP: 'gray' };

function makePrinter(opts) {
  const log = [];
  const paint = (color, s) => (opts.color && C[color] ? C[color] + s + C.reset : s);
  const out = (plain, colored = plain) => {
    log.push(redact(plain));
    if (!opts.json) process.stdout.write(redact(colored) + '\n');
  };
  const fileOnly = (plain) => log.push(redact(plain));
  return { log, paint, out, fileOnly };
}

function formatResult(r, p, opts) {
  const tag = `[${r.status}]`;
  const head = `${tag} ${r.id.padEnd(22)} ${r.title}${r.msg ? ' — ' + r.msg : ''}`;
  const headColored = `${p.paint(STATUS_COLOR[r.status], p.paint('bold', tag))} ${p.paint('dim', r.id.padEnd(22))} ${r.title}${r.msg ? ' — ' + r.msg : ''}`;
  p.out(head, headColored);
  const pad = '       ';
  if (r.fix && (r.status === 'WARN' || r.status === 'FAIL' || r.status === 'SKIP')) {
    p.out(`${pad}해결: ${r.fix}`, `${pad}${p.paint('cyan', '해결:')} ${r.fix}`);
  }
  const details = r.details || [];
  if (!details.length) return;
  const showAll = opts.verbose;
  const show = r.status === 'PASS' || r.status === 'SKIP' ? (showAll ? details : []) : (showAll ? details : details.slice(0, 10));
  for (const d of show) p.out(`${pad}· ${d}`, `${pad}${p.paint('gray', '· ' + d)}`);
  if (show.length < details.length) {
    const hidden = details.slice(show.length);
    for (const d of hidden) p.fileOnly(`${pad}· ${d}`);
    if (!opts.json && (r.status === 'WARN' || r.status === 'FAIL')) {
      process.stdout.write(`${pad}${p.paint('gray', `… 외 ${hidden.length}건 (--verbose 또는 보고서 파일 참고)`)}\n`);
    }
  }
}

// ---------------------------------------------------------------------------
// 컨텍스트 & 선행조건
// ---------------------------------------------------------------------------
function createContext(opts, printer) {
  const results = [];
  const facts = new Map();
  const memo = new Map();
  const pkg = readJson(path.join(ROOT, 'package.json'));

  const prereqs = {
    pkg: async () => (pkg ? { ok: true } : { ok: false, reason: 'package.json을 읽을 수 없음' }),
    nodeModules: async () => (exists(path.join(ROOT, 'node_modules'))
      ? { ok: true } : { ok: false, reason: 'node_modules 없음 (npm ci 필요)' }),
    nodeEngines: async () => {
      const range = pkg?.engines?.node;
      if (!range) return { ok: true };
      const ok = satisfies(process.versions.node, range);
      return ok === false ? { ok: false, reason: `Node ${process.versions.node}이(가) engines "${range}"를 만족하지 않음` } : { ok: true };
    },
    npm: async () => (npmInvocation() ? { ok: true } : { ok: false, reason: 'npm 실행 파일을 찾을 수 없음' }),
    git: async () => {
      if (!which('git')) return { ok: false, reason: 'git이 PATH에 없음' };
      const r = await run('git', ['--version'], { cwd: ROOT, timeout: 10_000 });
      return r.code === 0 ? { ok: true } : { ok: false, reason: `git 실행 실패: ${(r.error || r.stderr).trim()}` };
    },
    gitRepo: async () => {
      const g = await need('git');
      if (!g.ok) return g;
      const r = await run('git', ['rev-parse', '--is-inside-work-tree'], { cwd: ROOT, timeout: 10_000 });
      return r.code === 0 && r.stdout.trim() === 'true' ? { ok: true } : { ok: false, reason: 'git 저장소가 아니거나 safe.directory 제한' };
    },
    docker: async () => {
      if (!which('docker')) return { ok: false, reason: 'docker CLI가 PATH에 없음' };
      const r = await run('docker', ['version', '--format', '{{.Server.Version}}'], { timeout: 15_000 });
      if (r.code === 0 && r.stdout.trim()) return { ok: true, version: r.stdout.trim() };
      return { ok: false, reason: `Docker 데몬 응답 없음 (${(r.error || r.stderr || '').trim().split('\n')[0] || 'timeout'})` };
    },
  };

  async function need(name) {
    if (facts.has(name)) return facts.get(name);
    if (memo.has(name)) return memo.get(name);
    const fn = prereqs[name];
    const p = fn ? fn().catch((e) => ({ ok: false, reason: e.message })) : Promise.resolve({ ok: false, reason: `선행 검사 '${name}' 미실행 (해당 단계를 함께 실행하세요)` });
    memo.set(name, p);
    return p;
  }

  const ctx = {
    root: ROOT,
    opts,
    pkg,
    state: {},
    results,
    need,
    setFact(name, ok, reason, extra = {}) { facts.set(name, { ok, reason, ...extra }); },
    currentStage: null,
    /**
     * 검사 하나 실행. def = {id, title, needs?:string[]}, fn → {status,msg,fix,details}
     */
    async check(def, fn) {
      const started = Date.now();
      let r;
      for (const n of def.needs || []) {
        const st = await need(n);
        if (!st.ok) {
          r = { status: 'SKIP', msg: `선행 조건 미충족: ${st.reason}`, fix: st.fix };
          break;
        }
      }
      if (!r) {
        try {
          r = await fn();
        } catch (e) {
          r = { status: 'FAIL', msg: `검사기 내부 오류: ${e.message}`, fix: 'doctor 스크립트 버그일 수 있습니다. --verbose 결과와 함께 보고해 주세요.', details: [String(e.stack || '').split('\n').slice(0, 4).join(' | ')] };
        }
      }
      if (!r || !['PASS', 'WARN', 'FAIL', 'SKIP'].includes(r.status)) r = { status: 'FAIL', msg: '검사기가 올바른 결과를 반환하지 않음' };
      const full = { stage: ctx.currentStage, id: def.id, title: def.title, status: r.status, msg: redact(r.msg || ''), fix: redact(r.fix || ''), details: (r.details || []).map((d) => redact(String(d))), ms: Date.now() - started };
      results.push(full);
      formatResult(full, printer, opts);
      return full;
    },
  };
  return ctx;
}

// 결과 생성 헬퍼 (스테이지 모듈에서 사용)
export const pass = (msg, details) => ({ status: 'PASS', msg, details });
export const warn = (msg, fix, details) => ({ status: 'WARN', msg, fix, details });
export const fail = (msg, fix, details) => ({ status: 'FAIL', msg, fix, details });
export const skip = (msg, fix, details) => ({ status: 'SKIP', msg, fix, details });

// ---------------------------------------------------------------------------
// 메인
// ---------------------------------------------------------------------------
let shuttingDown = false;
function installSignalHandlers(printer) {
  const onSignal = (sig) => {
    if (shuttingDown) return;
    shuttingDown = true;
    killAllChildren({ sync: true });
    if (!printer.opts?.json) process.stderr.write(`\n[doctor] ${sig} 수신 — 실행 중인 하위 프로세스를 모두 종료했습니다.\n`);
    process.exit(130);
  };
  process.on('SIGINT', () => onSignal('SIGINT'));
  process.on('SIGTERM', () => onSignal('SIGTERM'));
  if (!IS_WIN) process.on('SIGHUP', () => onSignal('SIGHUP'));
  process.on('exit', () => killAllChildren({ sync: true }));
  process.on('uncaughtException', (e) => {
    killAllChildren({ sync: true });
    process.stderr.write(`[doctor] 예기치 못한 오류: ${redact(e.stack || e.message)}\n`);
    process.exit(1);
  });
  process.on('unhandledRejection', (e) => {
    killAllChildren({ sync: true });
    process.stderr.write(`[doctor] 처리되지 않은 Promise 거부: ${redact(e?.stack || e)}\n`);
    process.exit(1);
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { process.stdout.write(HELP); return 0; }
  const printer = makePrinter(opts);
  printer.opts = opts;
  installSignalHandlers(printer);

  if (opts.unknown.length) {
    process.stderr.write(`알 수 없는 옵션: ${opts.unknown.join(', ')}\n--help 로 사용법을 확인하세요.\n`);
    return 1;
  }

  // 실행할 단계 결정
  let selected;
  if (opts.stages) selected = STAGES.filter((s) => opts.stages.has(s.key));
  else if (opts.quick) selected = STAGES.filter((s) => 'abcd'.includes(s.key));
  else selected = STAGES.filter((s) => s.key !== 'h' || opts.network);
  // --stage h 를 명시하면 --network 를 켠 것으로 간주
  if (opts.stages?.has('h')) opts.network = true;

  const startedAt = new Date();
  const ts = startedAt.toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  const reportPath = path.join(os.tmpdir(), `doctor-report-${ts}.log`);

  printer.out(`Check-Mate doctor ${DOCTOR_VERSION}  (${startedAt.toLocaleString('ko-KR')})`, printer.paint('bold', `Check-Mate doctor ${DOCTOR_VERSION}`) + printer.paint('gray', `  (${startedAt.toLocaleString('ko-KR')})`));
  printer.out(`프로젝트: ${ROOT}`);
  printer.out(`실행 환경: Node ${process.version} · ${process.platform}/${process.arch} · 단계: ${selected.map((s) => s.key).join(',')}${opts.network ? ' (네트워크 포함)' : ''}`);

  const ctx = createContext(opts, printer);
  for (const st of selected) {
    ctx.currentStage = st.key;
    printer.out('');
    printer.out(`━━ [${st.key}] ${st.title} ━━`, printer.paint('blue', printer.paint('bold', `━━ [${st.key}] ${st.title} ━━`)));
    const t0 = Date.now();
    try {
      await st.mod.run(ctx, { pass, warn, fail, skip });
    } catch (e) {
      await ctx.check({ id: `${st.key}.internal`, title: '단계 실행' }, async () => fail(`단계 실행 중 예외: ${e.message}`, 'doctor 버그일 수 있습니다. 출력과 함께 보고해 주세요.', [String(e.stack || '').split('\n').slice(0, 5).join(' | ')]));
    }
    printer.fileOnly(`   (단계 ${st.key} 소요 ${((Date.now() - t0) / 1000).toFixed(1)}초)`);
    if (shuttingDown) break;
  }
  killAllChildren();

  // 요약
  const res = ctx.results;
  const count = (s) => res.filter((r) => r.status === s).length;
  const counts = { PASS: count('PASS'), WARN: count('WARN'), FAIL: count('FAIL'), SKIP: count('SKIP') };
  const exitCode = counts.FAIL ? 1 : counts.WARN ? 2 : 0;
  const elapsed = ((Date.now() - startedAt.getTime()) / 1000).toFixed(1);

  printer.out('');
  printer.out('━━ 요약 ━━', printer.paint('bold', '━━ 요약 ━━'));
  printer.out(
    `PASS ${counts.PASS} · WARN ${counts.WARN} · FAIL ${counts.FAIL} · SKIP ${counts.SKIP}  (총 ${res.length}개 검사, ${elapsed}초)`,
    `${printer.paint('green', `PASS ${counts.PASS}`)} · ${printer.paint('yellow', `WARN ${counts.WARN}`)} · ${printer.paint('red', `FAIL ${counts.FAIL}`)} · ${printer.paint('gray', `SKIP ${counts.SKIP}`)}  (총 ${res.length}개 검사, ${elapsed}초)`
  );
  for (const s of ['FAIL', 'WARN']) {
    const items = res.filter((r) => r.status === s);
    if (!items.length) continue;
    printer.out(`${s} 목록:`, printer.paint(STATUS_COLOR[s], `${s} 목록:`));
    for (const r of items) printer.out(`  - ${r.id}: ${r.title} — ${r.msg}`);
  }
  const verdict = exitCode === 0 ? '모든 검사를 통과했습니다.' : exitCode === 1 ? 'FAIL 항목을 먼저 해결하세요. (docs/TROUBLESHOOTING.md 참고)' : 'FAIL은 없지만 WARN 항목을 검토하세요.';
  printer.out(`종료 코드 ${exitCode}: ${verdict}`);

  // 보고서 파일 (UTF-8 BOM: PowerShell 5.1 Get-Content/메모장 호환)
  const header = [
    `# Check-Mate doctor 보고서`,
    `# 생성: ${startedAt.toISOString()}  / 버전 ${DOCTOR_VERSION}`,
    `# 인자: ${process.argv.slice(2).join(' ') || '(없음)'}`,
    `# Node ${process.version} ${process.platform}/${process.arch}  OS ${os.type()} ${os.release()}`,
    '',
  ];
  try {
    fs.writeFileSync(reportPath, '﻿' + header.concat(printer.log).join(os.EOL) + os.EOL, 'utf8');
    printer.out(`보고서: ${reportPath}`, `${printer.paint('bold', '보고서:')} ${reportPath}`);
  } catch (e) {
    printer.out(`보고서 저장 실패: ${e.message}`);
  }

  if (opts.json) {
    const payload = {
      tool: 'check-mate-doctor', version: DOCTOR_VERSION, startedAt: startedAt.toISOString(), elapsedSec: Number(elapsed),
      root: ROOT, node: process.version, platform: process.platform, arch: process.arch,
      options: { quick: opts.quick, stages: selected.map((s) => s.key), network: opts.network },
      summary: counts, exitCode, reportPath, results: res,
    };
    process.stdout.write(redact(JSON.stringify(payload, null, 2)) + '\n');
  }
  return exitCode;
}

main().then((code) => {
  killAllChildren({ sync: true });
  process.exitCode = code;
  // 남은 핸들(타이머 등)로 인해 종료가 지연되지 않도록
  setTimeout(() => process.exit(code), 200).unref();
}).catch((e) => {
  killAllChildren({ sync: true });
  process.stderr.write(`[doctor] 치명적 오류: ${redact(e.stack || e.message)}\n`);
  process.exit(1);
});
