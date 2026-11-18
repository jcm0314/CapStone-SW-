// 실제 Claude 4-에이전트 평가 실측 (서버 handleEvaluation과 같은 경로: PII 마스킹 → executeMultiAgentEvaluation)
// 측정: 건당 소요시간, 토큰, 비용, AI 인용문 원문 매칭(정확/퍼지/실패), 점수·판정
// 실행: node --env-file=.env scripts/bench/claude_bench.mjs   (실제 API 호출 = 과금, 샘플 6건 ≈ 45원)
import fs from 'node:fs';
import { executeMultiAgentEvaluation } from '../../Front/services/multiAgentEvaluator.js';
import { JOB_TEMPLATES } from '../../Front/data/jobTemplates.js';
import { anonymizePII } from '../../Front/utils/piiAnonymizer.js';
import * as cc from '../../Front/services/agents/claudeClient.js';

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY가 없습니다. node --env-file=.env scripts/bench/claude_bench.mjs 로 실행하세요.');
  process.exit(1);
}

// claude-haiku-5-5 단가 ($/token, 프롬프트 100K 이하). 다른 모델로 돌리면 이 값도 바꾸세요.
const PRICE = { in: 0.10 / 1e6, out: 0.50 / 1e6 };
const KRW = 1400;

// 실제 클라이언트를 감싸서 usage만 기록
const real = cc.createClaudeClient({ apiKey: process.env.ANTHROPIC_API_KEY });
let calls = [];
cc.__setClaudeClientForTests({
  beta: { messages: { create: async (p) => {
    const t = Date.now();
    const r = await real.beta.messages.create(p);
    calls.push({ ms: Date.now() - t, in: r.usage?.input_tokens || 0, out: r.usage?.output_tokens || 0, model: r.model });
    return r;
  } } }
});

// BENCH_SAMPLES=경로 로 다른 샘플 파일(예: samples_long.json)을 쓸 수 있음. 결과 파일 이름에 그 이름이 붙음.
const SAMPLE_FILE = process.env.BENCH_SAMPLES || new URL('./samples.json', import.meta.url);
const SAMPLE_TAG = process.env.BENCH_SAMPLES ? `.${process.env.BENCH_SAMPLES.split('/').pop().replace(/\.json$/, '')}` : '';
const SAMPLES = JSON.parse(fs.readFileSync(SAMPLE_FILE));
const rows = [];
for (const s of SAMPLES) {
  calls = [];
  const job = JOB_TEMPLATES.find(j => j.id === s.job) || JOB_TEMPLATES[0];
  const clean = anonymizePII(s.text, s.name).anonymizedText;
  const t0 = Date.now();
  try {
    const r = await executeMultiAgentEvaluation({ name: s.name, jobTemplate: job, cleanText: clean, originalRawText: clean, promptAddendum: '', tenantId: 'bench' });
    const ms = Date.now() - t0;
    const ev = r.analysis.groundingEvidences;
    const exact = ev.filter(e => clean.includes(e.quote)).length;
    const fuzzy = ev.filter(e => e.matched && !clean.includes(e.quote)).length;
    const fail = ev.filter(e => !e.matched).length;
    const tin = calls.reduce((a, c) => a + c.in, 0), tout = calls.reduce((a, c) => a + c.out, 0);
    const usd = tin * PRICE.in + tout * PRICE.out;
    const types = ev.reduce((a, e) => (a[e.type] = (a[e.type] || 0) + 1, a), {});
    rows.push({ id: s.id, chars: s.text.length, sec: +(ms / 1000).toFixed(1), calls: calls.length, tin, tout, usd, krw: +(usd * KRW).toFixed(2),
      quotes: ev.length, exact, fuzzy, fail, score: r.analysis.summary.totalScore, decision: r.analysis.summary.decision,
      aiProb: r.analysis.summary.aiTextProbability, risk: r.agentMetadata.criticReport.exaggerationRisk, types, q: r.analysis.interviewQuestions.length,
      model: calls[0]?.model, perCallSec: calls.map(c => +(c.ms / 1000).toFixed(1)),
      sampleEvidence: ev.slice(0, 3).map(e => `${e.type}: ${e.quote.slice(0, 50)}`), firstQ: r.analysis.interviewQuestions[0]?.question,
      reason: r.analysis.summary.decisionReason });
    console.error(`✓ ${s.id} ${(ms / 1000).toFixed(1)}s`);
  } catch (e) {
    rows.push({ id: s.id, error: `${e.code || ''} ${e.message}` });
    console.error(`✗ ${s.id} ${e.code} ${e.message}`);
  }
}
const outFile = new URL(`./claude_bench_result${SAMPLE_TAG}.${new Date().toISOString().slice(0, 10)}.json`, import.meta.url);
fs.writeFileSync(outFile, JSON.stringify(rows, null, 2));

console.log('\n샘플\t글자\t시간(s)\t토큰(in/out)\t원\t인용(정확/퍼지/실패)\t점수\t판정');
for (const r of rows) {
  if (r.error) { console.log(`${r.id}\tERROR ${r.error}`); continue; }
  console.log(`${r.id}\t${r.chars}\t${r.sec}\t${r.tin}/${r.tout}\t${r.krw}\t${r.quotes}(${r.exact}/${r.fuzzy}/${r.fail})\t${r.score}\t${r.decision}`);
}
const ok = rows.filter(r => !r.error);
if (ok.length) {
  const avg = k => (ok.reduce((a, r) => a + r[k], 0) / ok.length).toFixed(1);
  const q = ok.reduce((a, r) => a + r.quotes, 0), ex = ok.reduce((a, r) => a + r.exact, 0);
  console.log(`\n평균 ${avg('sec')}초 · 평균 ${avg('krw')}원/건 · 인용 원문 정확 일치 ${ex}/${q}`);
}
console.log(`결과 저장: ${outFile.pathname}`);
