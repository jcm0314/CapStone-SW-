// scripts/doctor/lib.mjs
// doctor 공용 유틸리티 (외부 의존성 없음, Node 18+ / Windows·WSL·Linux 공용)
// - 하위 프로세스 실행(타임아웃·프로세스 트리 종료), HTTP 요청(타임아웃), 포트 검사
// - .env 파서, 비밀값 마스킹/가림, semver 범위 비교, 최소 YAML 파서, .gitignore 매처
// - 파일 트리 순회, 대소문자 정확 일치 검사, JS 주석 제거

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import { spawn, spawnSync } from 'node:child_process';

export const IS_WIN = process.platform === 'win32';

// ---------------------------------------------------------------------------
// 하위 프로세스 관리: 실행 중인 모든 자식 프로세스를 추적하고, 종료 시 반드시 정리한다.
// ---------------------------------------------------------------------------
export const children = new Set();

/** 프로세스 트리를 종료한다 (Windows: taskkill /T, POSIX: 프로세스 그룹 시그널). */
export function killTree(child, { sync = false } = {}) {
  if (!child || child.exitCode !== null || child.signalCode !== null || !child.pid) {
    children.delete(child);
    return;
  }
  try {
    if (IS_WIN) {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: 5000 });
    } else if (sync) {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch { /* 무시 */ } }
    } else {
      try { process.kill(-child.pid, 'SIGTERM'); } catch { try { child.kill('SIGTERM'); } catch { /* 무시 */ } }
      const t = setTimeout(() => {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch { /* 무시 */ } }
      }, 1500);
      t.unref();
    }
  } catch { /* 이미 종료됨 */ }
  children.delete(child);
}

export function killAllChildren(opts) {
  for (const c of [...children]) killTree(c, opts);
}

const MAX_BUF = 8 * 1024 * 1024;

/**
 * 명령을 실행하고 완료까지 기다린다. 모든 호출에 타임아웃이 걸린다.
 * @returns {Promise<{code:number|null, signal:string|null, stdout:string, stderr:string, timedOut:boolean, error?:string, ms:number}>}
 */
export function run(cmd, args = [], { cwd, env, timeout = 60_000, shell = false, input } = {}) {
  const started = Date.now();
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(cmd, args, {
        cwd,
        env: env || process.env,
        shell,
        windowsHide: true,
        detached: !IS_WIN, // POSIX: 프로세스 그룹 단위로 종료하기 위함
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (e) {
      resolve({ code: null, signal: null, stdout: '', stderr: '', timedOut: false, error: e.message, ms: 0 });
      return;
    }
    children.add(child);
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    child.stdout.on('data', (d) => { if (stdout.length < MAX_BUF) stdout += d.toString('utf8'); });
    child.stderr.on('data', (d) => { if (stderr.length < MAX_BUF) stderr += d.toString('utf8'); });
    const timer = setTimeout(() => { timedOut = true; killTree(child); }, timeout);
    const finish = (code, signal, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      children.delete(child);
      resolve({ code, signal, stdout, stderr, timedOut, error, ms: Date.now() - started });
    };
    child.on('error', (e) => finish(null, null, e.code === 'ENOENT' ? `명령을 찾을 수 없음: ${cmd}` : e.message));
    child.on('close', (code, signal) => finish(code, signal));
    if (input != null) child.stdin.end(input); else child.stdin.end();
  });
}

/** 장시간 실행 프로세스(서버)를 띄운다. 호출자가 killTree로 종료해야 한다(종료 핸들러도 정리함). */
export function startProcess(cmd, args = [], { cwd, env } = {}) {
  const child = spawn(cmd, args, {
    cwd, env: env || process.env, windowsHide: true, detached: !IS_WIN, stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.add(child);
  const out = { text: '' };
  const onData = (d) => { if (out.text.length < MAX_BUF) out.text += d.toString('utf8'); };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.on('error', (e) => { out.text += `\n[spawn error] ${e.message}`; });
  child.on('close', () => children.delete(child));
  return { child, out };
}

/** PATH(및 Windows PATHEXT)에서 실행 파일을 찾는다. 프로세스를 띄우지 않는다. */
export function which(name) {
  const exts = IS_WIN ? (process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';').filter(Boolean) : [''];
  const dirs = (process.env.PATH || process.env.Path || '').split(path.delimiter).filter(Boolean);
  for (const d of dirs) {
    for (const ext of exts) {
      const cand = path.join(d, IS_WIN && !name.toLowerCase().endsWith(ext.toLowerCase()) ? name + ext : name);
      try {
        const st = fs.statSync(cand);
        if (st.isFile()) return cand;
      } catch { /* 없음 */ }
    }
  }
  return null;
}

/** npm 실행 방법: 가능하면 현재 node + npm-cli.js 를 직접 사용(Windows .cmd shell 문제 회피). */
export function npmInvocation() {
  const cands = [];
  if (process.env.npm_execpath && /\.c?js$/.test(process.env.npm_execpath)) cands.push(process.env.npm_execpath);
  const nodeDir = path.dirname(process.execPath);
  cands.push(path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  cands.push(path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  cands.push('/usr/lib/node_modules/npm/bin/npm-cli.js', '/usr/local/lib/node_modules/npm/bin/npm-cli.js');
  for (const c of cands) {
    if (fs.existsSync(c)) return { cmd: process.execPath, pre: [c], shell: false, label: c };
  }
  const found = which('npm');
  if (found) return { cmd: IS_WIN ? 'npm' : found, pre: [], shell: IS_WIN, label: found };
  return null;
}

// ---------------------------------------------------------------------------
// 네트워크 유틸
// ---------------------------------------------------------------------------

/** HTTP(S) 요청. 항상 타임아웃. 실패 시 {error} 반환(throw 하지 않음). */
export function httpReq(url, { method = 'GET', headers = {}, body, timeout = 8000, maxBody = 256 * 1024 } = {}) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(url); } catch (e) { resolve({ error: `잘못된 URL: ${e.message}` }); return; }
    const mod = u.protocol === 'https:' ? https : http;
    let done = false;
    const finish = (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
    if (body != null && !Object.keys(headers).some((k) => k.toLowerCase() === 'content-length')) {
      headers = { ...headers, 'Content-Length': Buffer.byteLength(body) };
    }
    const req = mod.request(u, { method, headers, timeout }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { if (data.length < maxBody) data += c; });
      res.on('end', () => finish({ status: res.statusCode, headers: res.headers, body: data }));
      res.on('error', (e) => finish({ error: e.message }));
    });
    const timer = setTimeout(() => { req.destroy(new Error(`타임아웃(${timeout}ms)`)); }, timeout + 500);
    req.on('timeout', () => req.destroy(new Error(`타임아웃(${timeout}ms)`)));
    req.on('error', (e) => finish({ error: e.code ? `${e.code} ${e.message}` : e.message }));
    if (body != null) req.write(body);
    req.end();
  });
}

export async function dnsLookup(host, timeout = 5000) {
  let timer;
  try {
    return await Promise.race([
      dns.promises.lookup(host, { all: true }).then((r) => ({ addresses: r.map((x) => x.address) })),
      new Promise((resolve) => { timer = setTimeout(() => resolve({ error: `DNS 타임아웃(${timeout}ms)` }), timeout); }),
    ]);
  } catch (e) {
    return { error: `${e.code || ''} ${e.message}`.trim() };
  } finally { clearTimeout(timer); }
}

/** OS가 할당한 빈 포트 번호 */
export function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function tryConnect(port, host, timeout = 700) {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host });
    const t = setTimeout(() => { sock.destroy(); resolve(false); }, timeout);
    sock.on('connect', () => { clearTimeout(t); sock.destroy(); resolve(true); });
    sock.on('error', () => { clearTimeout(t); resolve(false); });
  });
}

function tryListen(port, host) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.once('error', (e) => resolve(e.code || 'ERR'));
    srv.listen({ port, host, exclusive: true }, () => srv.close(() => resolve('OK')));
  });
}

/** 포트 점유 여부: 접속 시도 + 바인드 시도. 반환 'free' | 'busy' | 'denied' */
export async function portStatus(port) {
  if (await tryConnect(port, '127.0.0.1')) return 'busy';
  const r = await tryListen(port, '0.0.0.0');
  if (r === 'OK') return 'free';
  if (r === 'EADDRINUSE') return 'busy';
  if (r === 'EACCES') return 'denied';
  return 'free';
}

export async function waitForPort(port, host = '127.0.0.1', timeoutMs = 15000, isAlive = () => true) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (!isAlive()) return false;
    if (await tryConnect(port, host, 500)) return true;
    await sleep(250);
  }
  return false;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// 비밀값 보호
// ---------------------------------------------------------------------------
const knownSecrets = new Set();

export function registerSecret(v) {
  if (typeof v === 'string' && v.length >= 6) knownSecrets.add(v);
}

export function isSensitiveName(name) {
  return /(KEY|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|CREDENTIAL|AUTH)/i.test(name);
}

/** 값 자체는 절대 출력하지 않는다: "설정됨(길이 N)" 형태로만 표기 */
export function mask(v) {
  if (v == null) return '미설정';
  if (v === '') return '빈 문자열';
  return `설정됨(길이 ${String(v).length})`;
}

/** 출력 직전 텍스트에서 비밀값/키 패턴을 가린다. */
export function redact(text) {
  if (text == null) return text;
  let s = String(text);
  for (const sec of knownSecrets) {
    if (s.includes(sec)) s = s.split(sec).join('[가림]');
  }
  s = s.replace(/AIza[0-9A-Za-z_-]{20,}/g, 'AIza[가림]');
  s = s.replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '[JWT 가림]');
  s = s.replace(/sb_(secret|publishable)_[A-Za-z0-9_-]{8,}/g, 'sb_$1_[가림]');
  s = s.replace(/([?&](?:key|apikey|api_key|token)=)[^&\s"']+/gi, '$1[가림]');
  return s;
}

// ---------------------------------------------------------------------------
// .env 파서 (dotenv 호환 수준)
// ---------------------------------------------------------------------------
export function parseEnvFile(text) {
  const out = {};
  const problems = [];
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    line = line.replace(/^\s*export\s+/, '');
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/);
    if (!m) { problems.push(`${i + 1}행: KEY=VALUE 형식이 아님`); continue; }
    const key = m[1];
    let val = m[2];
    if (/^\s+|\s+$/.test(m[2]) && !/^["']/.test(m[2].trim())) val = val.trim();
    const q = val[0];
    if (q === '"' || q === "'" || q === '`') {
      let end = val.indexOf(q, 1);
      if (end === -1) {
        // 여러 줄 값
        let acc = val.slice(1);
        while (++i < lines.length) {
          const idx = lines[i].indexOf(q);
          if (idx !== -1) { acc += '\n' + lines[i].slice(0, idx); break; }
          acc += '\n' + lines[i];
        }
        val = acc;
      } else {
        val = val.slice(1, end);
      }
      if (q === '"') val = val.replace(/\\n/g, '\n');
    } else {
      val = val.replace(/\s+#.*$/, '').trim();
    }
    if (key.includes('-') || key.includes('.')) problems.push(`${i + 1}행: 변수명 "${key}"에 '-' 또는 '.' 포함 (셸/Vite에서 사용 불가)`);
    if (Object.prototype.hasOwnProperty.call(out, key)) problems.push(`${i + 1}행: "${key}" 중복 정의 (나중 값이 무시될 수 있음)`);
    out[key] = val;
  }
  return { vars: out, problems };
}

// ---------------------------------------------------------------------------
// semver (외부 의존성 없이 필요한 만큼만 구현)
// ---------------------------------------------------------------------------
export function parseVer(v) {
  if (v == null) return null;
  const m = String(v).trim().replace(/^[=v\s]+/, '').match(/^(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?(?:-([0-9A-Za-z.-]+))?/i);
  if (!m) return null;
  const n = (x) => (x == null || x === 'x' || x === 'X' || x === '*' ? null : Number(x));
  return { major: Number(m[1]), minor: n(m[2]), patch: n(m[3]), pre: m[4] || null };
}

export function cmpVer(a, b) {
  const A = typeof a === 'string' ? parseVer(a) : a;
  const B = typeof b === 'string' ? parseVer(b) : b;
  for (const k of ['major', 'minor', 'patch']) {
    const x = A[k] ?? 0; const y = B[k] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  if (A.pre && !B.pre) return -1;
  if (!A.pre && B.pre) return 1;
  return 0;
}

function comparatorToTests(tok) {
  const m = tok.match(/^(>=|<=|>|<|=|\^|~>?|)\s*(.*)$/);
  const op = m[1]; const ver = m[2];
  if (ver === '' || ver === '*' || /^x$/i.test(ver) || ver === 'latest') return [() => true];
  const p = parseVer(ver);
  if (!p) return [() => false];
  const ge = (lo) => (v) => cmpVer(v, lo) >= 0;
  const lt = (hi) => (v) => cmpVer(v, hi) < 0;
  const V = (a, b, c) => ({ major: a, minor: b, patch: c, pre: null });
  const lo = V(p.major, p.minor ?? 0, p.patch ?? 0); lo.pre = p.pre;
  switch (op) {
    case '^': {
      let hi;
      if (p.major > 0 || p.minor == null) hi = V(p.major + 1, 0, 0);
      else if (p.minor > 0 || p.patch == null) hi = V(0, p.minor + 1, 0);
      else hi = V(0, 0, p.patch + 1);
      hi.pre = '0';
      return [ge(lo), lt(hi)];
    }
    case '~': case '~>': {
      const hi = p.minor == null ? V(p.major + 1, 0, 0) : V(p.major, p.minor + 1, 0);
      hi.pre = '0';
      return [ge(lo), lt(hi)];
    }
    case '>=': return [ge(lo)];
    case '>': {
      if (p.minor == null) return [ge(V(p.major + 1, 0, 0))];
      if (p.patch == null) return [ge(V(p.major, p.minor + 1, 0))];
      return [(v) => cmpVer(v, lo) > 0];
    }
    case '<': return [lt(Object.assign(lo, { pre: lo.pre || (p.patch == null ? '0' : null) }))];
    case '<=': {
      if (p.minor == null) return [lt(V(p.major + 1, 0, 0))];
      if (p.patch == null) return [lt(V(p.major, p.minor + 1, 0))];
      return [(v) => cmpVer(v, lo) <= 0];
    }
    default: {
      if (p.minor == null) { const hi = V(p.major + 1, 0, 0); hi.pre = '0'; return [ge(lo), lt(hi)]; }
      if (p.patch == null) { const hi = V(p.major, p.minor + 1, 0); hi.pre = '0'; return [ge(lo), lt(hi)]; }
      return [(v) => cmpVer(v, lo) === 0];
    }
  }
}

/** 버전이 범위(range)를 만족하는지. 해석 불가 범위(git URL, file: 등)는 null. */
export function satisfies(version, range) {
  if (range == null) return null;
  const r = String(range).trim();
  if (/^(git|https?|file|link|npm|workspace|github):|\//.test(r)) return null;
  const v = parseVer(version);
  if (!v) return null;
  return r.split('||').some((set) => {
    let s = set.trim();
    const hy = s.match(/^(\S+)\s+-\s+(\S+)$/);
    if (hy) s = `>=${hy[1]} <=${hy[2]}`;
    const toks = s.replace(/(>=|<=|>|<|=|\^|~)\s+/g, '$1').split(/\s+/).filter(Boolean);
    if (!toks.length) return true;
    return toks.every((t) => comparatorToTests(t).every((fn) => fn(v)));
  });
}

// ---------------------------------------------------------------------------
// 최소 YAML 파서 (블록 맵/시퀀스, 따옴표 스칼라, 간단한 flow, 블록 스칼라, 멀티 도큐먼트)
// 구조 검사 목적이며 완전한 YAML 1.2 구현이 아니다. 오류는 issues 배열에 모은다.
// ---------------------------------------------------------------------------
function stripYamlComment(s) {
  let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) { if (q === "'" && s[i + 1] === "'") { i++; continue; } q = null; } else if (c === '\\' && q === '"') i++; continue; }
    if (c === '"' || c === "'") { if (i === 0 || /[\s:\[\{,-]/.test(s[i - 1])) q = c; continue; }
    if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i).replace(/\s+$/, '');
  }
  return s.replace(/\s+$/, '');
}

function parseFlow(str) {
  // 매우 단순한 flow 파서: [a, b, "c"] / {a: 1, b: x}
  let i = 0;
  const ws = () => { while (i < str.length && /\s/.test(str[i])) i++; };
  const val = () => {
    ws();
    if (str[i] === '[') {
      i++; const arr = [];
      ws(); if (str[i] === ']') { i++; return arr; }
      for (;;) { arr.push(val()); ws(); if (str[i] === ',') { i++; continue; } if (str[i] === ']') { i++; break; } throw new Error('flow 시퀀스 닫힘 누락'); }
      return arr;
    }
    if (str[i] === '{') {
      i++; const obj = {};
      ws(); if (str[i] === '}') { i++; return obj; }
      for (;;) {
        ws(); let k = '';
        if (str[i] === '"' || str[i] === "'") { k = quoted(); } else { while (i < str.length && !/[:,}]/.test(str[i])) k += str[i++]; k = k.trim(); }
        ws(); let v = null;
        if (str[i] === ':') { i++; v = val(); }
        obj[k] = v; ws();
        if (str[i] === ',') { i++; continue; } if (str[i] === '}') { i++; break; } throw new Error('flow 맵 닫힘 누락');
      }
      return obj;
    }
    if (str[i] === '"' || str[i] === "'") return quoted();
    let s = ''; while (i < str.length && !/[,\]\}]/.test(str[i])) s += str[i++];
    return scalar(s.trim());
  };
  const quoted = () => {
    const q = str[i++]; let s = '';
    while (i < str.length) {
      const c = str[i++];
      if (c === q) { if (q === "'" && str[i] === "'") { s += "'"; i++; continue; } return s; }
      if (c === '\\' && q === '"') { const n = str[i++]; s += n === 'n' ? '\n' : n === 't' ? '\t' : n; continue; }
      s += c;
    }
    throw new Error('따옴표 닫힘 누락');
  };
  const v = val(); ws();
  if (i < str.length) throw new Error(`flow 뒤 잉여 문자: "${str.slice(i)}"`);
  return v;
}

function scalar(raw) {
  const s = raw.trim();
  if (s === '' || s === '~' || s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return Number(s);
  if (/^-?\d+\.\d+$/.test(s)) return Number(s);
  if (s[0] === '"' || s[0] === "'" || s[0] === '[' || s[0] === '{') return parseFlow(s);
  return s;
}

export function parseYaml(text) {
  const issues = [];
  const rawLines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const docs = [[]];
  rawLines.forEach((raw, idx) => {
    if (/^---(\s|$)/.test(raw)) { docs.push([]); return; }
    if (/^\.\.\.(\s|$)/.test(raw)) return;
    const lead = raw.match(/^[ \t]*/)[0];
    if (lead.includes('\t') && raw.trim()) issues.push(`${idx + 1}행: 들여쓰기에 탭 문자 사용 (YAML은 공백만 허용)`);
    const content = stripYamlComment(raw.slice(lead.length));
    docs[docs.length - 1].push({ indent: lead.replace(/\t/g, '  ').length, content, no: idx + 1, raw });
  });

  const results = [];
  for (const docLines of docs) {
    const L = docLines.filter((l) => l.content !== '');
    if (!L.length) continue;
    let i = 0;
    const blockScalar = (parentIndent, style) => {
      const parts = [];
      while (i < L.length && L[i].indent > parentIndent) { parts.push(L[i].raw.trim()); i++; }
      return style.startsWith('>') ? parts.join(' ') : parts.join('\n');
    };
    const splitKey = (c) => {
      // 'key: value' 또는 'key:' 분리. 따옴표 키 지원.
      let k; let rest;
      if (c[0] === '"' || c[0] === "'") {
        const end = c.indexOf(c[0], 1);
        if (end === -1) return null;
        k = c.slice(1, end); rest = c.slice(end + 1);
        if (!/^\s*:(\s|$)/.test(rest)) return null;
        rest = rest.replace(/^\s*:/, '');
      } else {
        const m = c.match(/^([^\s#'"{\[][^#]*?)\s*:(\s+|$)(.*)$/);
        if (!m || m[1].includes(': ')) return null;
        k = m[1]; rest = m[3];
      }
      return { key: k.trim(), rest: rest.trim() };
    };
    const value = (rest, indent) => {
      if (rest === '') {
        if (i < L.length && L[i].indent > indent) return block(L[i].indent);
        if (i < L.length && L[i].indent === indent && /^-(\s|$)/.test(L[i].content)) return seq(indent);
        return null;
      }
      if (/^[|>][-+0-9]*$/.test(rest)) return blockScalar(indent, rest);
      if ((rest[0] === '[' || rest[0] === '{')) {
        let acc = rest;
        const bal = (s) => (s.match(/[\[{]/g) || []).length - (s.match(/[\]}]/g) || []).length;
        while (bal(acc) > 0 && i < L.length) { acc += ' ' + L[i].content.trim(); i++; }
        try { return parseFlow(acc); } catch (e) { issues.push(`flow 구문 오류: ${e.message}`); return acc; }
      }
      try { return scalar(rest); } catch (e) { issues.push(`스칼라 구문 오류: ${e.message}`); return rest; }
    };
    const map = (indent) => {
      const obj = {};
      while (i < L.length) {
        const ln = L[i];
        if (ln.indent < indent) break;
        if (ln.indent > indent) { issues.push(`${ln.no}행: 예상치 못한 들여쓰기 (${ln.indent}칸, 기대 ${indent}칸)`); i++; continue; }
        if (/^-(\s|$)/.test(ln.content)) break;
        const kv = splitKey(ln.content);
        if (!kv) { issues.push(`${ln.no}행: "key: value" 형식이 아님 → "${ln.content.slice(0, 40)}"`); i++; continue; }
        i++;
        if (Object.prototype.hasOwnProperty.call(obj, kv.key)) issues.push(`${ln.no}행: 중복 키 "${kv.key}"`);
        obj[kv.key] = value(kv.rest, indent);
      }
      return obj;
    };
    const seq = (indent) => {
      const arr = [];
      while (i < L.length) {
        const ln = L[i];
        if (ln.indent !== indent || !/^-(\s|$)/.test(ln.content)) {
          if (ln.indent > indent) { issues.push(`${ln.no}행: 예상치 못한 들여쓰기`); i++; continue; }
          break;
        }
        const rest = ln.content.replace(/^-\s*/, '');
        const off = ln.content.length - rest.length;
        if (rest === '') { i++; arr.push(i < L.length && L[i].indent > indent ? block(L[i].indent) : null); continue; }
        if (splitKey(rest) && !/^["'].*["']$/.test(rest)) {
          // 시퀀스 항목 안의 맵: 가상 줄로 치환 후 맵 파싱
          L[i] = { ...ln, indent: indent + off, content: rest };
          arr.push(map(indent + off));
          continue;
        }
        if (/^-(\s|$)/.test(rest)) {
          L[i] = { ...ln, indent: indent + off, content: rest };
          arr.push(seq(indent + off));
          continue;
        }
        i++;
        arr.push(value(rest, indent));
      }
      return arr;
    };
    const block = (indent) => (/^-(\s|$)/.test(L[i].content) ? seq(indent) : map(indent));
    let doc;
    if (L.length === 1 && !splitKey(L[0].content) && !/^-(\s|$)/.test(L[0].content)) { doc = scalar(L[0].content); i = 1; } else doc = block(L[0].indent);
    if (i < L.length) issues.push(`${L[i].no}행: 해석되지 않은 줄 (들여쓰기 확인)`);
    results.push(doc);
  }
  return { docs: results, issues };
}

// ---------------------------------------------------------------------------
// .gitignore 매처 (git 바이너리 없이도 동작하는 근사 구현)
// ---------------------------------------------------------------------------
function globToRe(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; }
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else if (c === '[') { const end = glob.indexOf(']', i); if (end > i) { re += glob.slice(i, end + 1); i = end; } else re += '\\['; }
    else re += c.replace(/[.+^${}()|\\]/g, '\\$&');
  }
  return re;
}

export function makeIgnoreMatcher(gitignoreText) {
  const rules = [];
  for (let line of gitignoreText.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    line = line.replace(/\s+$/, '');
    if (!line || line.startsWith('#')) continue;
    let neg = false;
    if (line.startsWith('!')) { neg = true; line = line.slice(1); }
    let dirOnly = false;
    if (line.endsWith('/')) { dirOnly = true; line = line.slice(0, -1); }
    const anchored = line.includes('/');
    if (line.startsWith('/')) line = line.slice(1);
    const re = new RegExp('^' + (anchored ? '' : '(?:.*/)?') + globToRe(line) + '$');
    rules.push({ neg, dirOnly, re, src: (neg ? '!' : '') + line });
  }
  return (rel, isDir = false) => {
    const parts = rel.split('/');
    let ignored = false; let by = null;
    for (let k = 1; k <= parts.length; k++) {
      const sub = parts.slice(0, k).join('/');
      const subIsDir = k < parts.length || isDir;
      for (const r of rules) {
        if (r.dirOnly && !subIsDir) continue;
        if (r.re.test(sub)) { ignored = !r.neg; by = r.src; }
      }
      if (ignored && k < parts.length) return { ignored: true, by };
    }
    return { ignored, by };
  };
}

// ---------------------------------------------------------------------------
// 파일 시스템 유틸
// ---------------------------------------------------------------------------
export const DEFAULT_EXCLUDES = new Set(['node_modules', '.git', 'dist', 'coverage', '.vite', '.terraform', '.next', 'build']);

/** 재귀 순회. root 기준 '/' 구분 상대 경로를 반환. */
export function walk(root, sub = '', { exclude = DEFAULT_EXCLUDES, filter = () => true, maxFiles = 50_000 } = {}) {
  const out = [];
  const stack = [sub];
  while (stack.length) {
    const rel = stack.pop();
    let ents;
    try { ents = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { if (!exclude.has(e.name)) stack.push(r); }
      else if (e.isFile() && filter(r)) { out.push(r); if (out.length >= maxFiles) return out; }
    }
  }
  return out.sort();
}

const dirCache = new Map();
function listDir(abs) {
  if (!dirCache.has(abs)) {
    try { dirCache.set(abs, fs.readdirSync(abs)); } catch { dirCache.set(abs, null); }
  }
  return dirCache.get(abs);
}

/**
 * 대소문자를 구분하여 경로 존재 여부 확인 (Windows/macOS의 대소문자 무시 FS에서도 Linux와 같은 판정).
 * @returns {{state:'exact'|'case-mismatch'|'missing', actual?:string}}
 */
export function exactCase(root, rel) {
  const parts = rel.split('/').filter((p) => p && p !== '.');
  let cur = root; const actual = [];
  let mismatch = false;
  for (const p of parts) {
    if (p === '..') { cur = path.dirname(cur); actual.push('..'); continue; }
    const names = listDir(cur);
    if (!names) return { state: 'missing' };
    if (names.includes(p)) { actual.push(p); cur = path.join(cur, p); continue; }
    const ci = names.find((n) => n.toLowerCase() === p.toLowerCase());
    if (!ci) return { state: 'missing' };
    mismatch = true; actual.push(ci); cur = path.join(cur, ci);
  }
  return mismatch ? { state: 'case-mismatch', actual: actual.join('/') } : { state: 'exact' };
}

export function readText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

export function readJson(p) {
  const t = readText(p);
  if (t == null) return null;
  try { return JSON.parse(t.replace(/^\uFEFF/, '')); } catch { return null; }
}

export function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

export function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

/** JS/JSX 주석 제거 (문자열·템플릿 리터럴 인지, 줄 번호 보존) */
export function stripJsComments(src) {
  let out = '';
  let i = 0; const n = src.length;
  let mode = null; // null | "'" | '"' | '`' | 'line' | 'block'
  while (i < n) {
    const c = src[i]; const d = src[i + 1];
    if (mode === 'line') { if (c === '\n') { mode = null; out += c; } i++; continue; }
    if (mode === 'block') { if (c === '*' && d === '/') { mode = null; i += 2; continue; } out += c === '\n' ? '\n' : ''; i++; continue; }
    if (mode) {
      out += c;
      if (c === '\\') { out += d ?? ''; i += 2; continue; }
      if (c === mode || (c === '\n' && mode !== '`')) mode = null;
      i++; continue;
    }
    if (c === '/' && d === '/') { mode = 'line'; i += 2; continue; }
    if (c === '/' && d === '*') { mode = 'block'; i += 2; continue; }
    if (c === "'" || c === '"' || c === '`') mode = c;
    out += c; i++;
  }
  return out;
}

export function lineOf(text, index) {
  let n = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

export function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** WSL 여부 감지 */
export function detectWsl() {
  if (process.platform !== 'linux') return null;
  if (process.env.WSL_DISTRO_NAME) return { distro: process.env.WSL_DISTRO_NAME };
  const v = readText('/proc/version') || '';
  if (/microsoft|WSL/i.test(v)) return { distro: '(알 수 없음)' };
  return null;
}

/** 컨테이너 내부 실행 여부 */
export function detectContainer() {
  if (exists('/.dockerenv')) return 'docker';
  const cg = readText('/proc/1/cgroup') || '';
  if (/docker|containerd|kubepods/.test(cg)) return 'container';
  return null;
}

export function tmpPath(name) {
  return path.join(os.tmpdir(), name);
}

/** C:\a\b → /mnt/c/a/b (Windows에서 WSL 명령에 경로를 넘길 때) */
export function winToWslPath(p) {
  const m = p.match(/^([A-Za-z]):[\\/](.*)$/);
  if (!m) return p.replace(/\\/g, '/');
  return `/mnt/${m[1].toLowerCase()}/${m[2].replace(/\\/g, '/')}`;
}
