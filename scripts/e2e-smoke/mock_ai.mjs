// Usage: node mock_ai.mjs <url> <outdir>
// Replaces Gemini responses with deterministic fakes to test the full pipeline
// (PII masking -> 4 agents -> quote matching -> highlight UI) without a real API key.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const [, , url, out] = process.argv;
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true });
const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const ev = [];
const prompts = [];
page.on('dialog', async d => { ev.push('DIALOG: ' + d.message().slice(0, 200)); await d.dismiss(); });
page.on('pageerror', e => ev.push('PAGEERROR: ' + e.message.slice(0, 200)));

const PII_TEXT =
  '저는 단국대학교 컴퓨터공학과 홍길동입니다. 연락처는 010-1234-5678 이고 이메일은 hong@test.com 입니다. ' +
  '쇼핑몰 API 응답이 3초로 느린 문제를 발견하고 Redis 캐싱을 도입하여 0.4초까지 줄였습니다. ' +
  '팀 프로젝트에서 코드리뷰 문화를 만들었습니다. 열정을 다해 최고의 시너지를 내겠습니다.';

function bodyFor(prompt) {
  const textBlock = (prompt.match(/"""\s*([\s\S]*?)\s*"""/) || [])[1] || '';
  const sentences = textBlock.split(/(?<=[.다])\s+/).filter(Boolean);
  const pick = re => sentences.find(s => re.test(s)) || sentences[0] || '';
  if (prompt.includes('"Grounding Agent"')) {
    return { groundingEvidences: [
      { quote: pick(/Redis/), type: 'positive', competencyId: 'problem_solving', scoreImpact: 15, title: '정량 성과', explanation: 'mock' },
      { quote: pick(/열정/), type: 'risk', competencyId: 'ethics', scoreImpact: -5, title: '상투적 표현', explanation: 'mock' },
      { quote: '저는 구글에서 5년간 근무하며 연봉 2억을 받았습니다.', type: 'positive', competencyId: 'tech_skill', scoreImpact: 20, title: '환각 테스트(원문에 없음)', explanation: 'mock-hallucination' },
    ], agentSummary: 'mock' };
  }
  if (prompt.includes('"Critic Agent')) return { aiTextProbability: 30, exaggerationRisk: 'MEDIUM', critiqueNotes: 'mock', flaggedQuotes: [], recommendedPenalty: 5 };
  if (prompt.includes('"Supervisor Agent')) return { summary: { totalScore: 77, decision: 'INTERVIEW', decisionReason: 'mock supervisor', aiTextProbability: 30 }, competencyScores: { problem_solving: 85, tech_skill: 75, teamwork: 70, growth: 70, ethics: 65 }, executiveComments: 'mock' };
  if (prompt.includes('"Interviewer Agent"')) return { interviewQuestions: [{ basedQuote: pick(/Redis/), category: '기술적 사실 검증', question: 'MOCK 질문: 캐시 무효화는?', intent: 'mock', checklist: ['a', 'b'] }] };
  return { error: 'unknown agent' };
}

await page.route(/generativelanguage\.googleapis\.com/, async route => {
  const req = JSON.parse(route.request().postData() || '{}');
  const prompt = (req.contents || []).flatMap(c => c.parts || []).map(p => p.text || '').join('\n');
  prompts.push(prompt);
  const json = bodyFor(prompt);
  await route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }], usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 300 } }) });
});

await page.goto(url, { waitUntil: 'networkidle' });
// enable BYOK so the browser calls Gemini directly (intercepted above)
await page.getByText('B2B 일괄 결제').first().click();
await page.locator('input[placeholder*="AIza"]').fill('AIzaSyA' + 'x'.repeat(32));
await page.getByRole('button', { name: '저장 및 적용' }).click();
await page.waitForTimeout(500);

await page.locator('input[type=text]').first().fill('홍길동');
await page.locator('textarea').first().fill(PII_TEXT);
const t0 = Date.now();
await page.getByText('역량 정밀 평가 실행').first().click();
await page.waitForFunction(() => /홍길동|익명/.test(document.body.innerText) && /77\s*\/\s*100점/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => ev.push('결과 화면 대기 타임아웃'));
ev.push(`평가 소요: ${Date.now() - t0}ms, Gemini 호출 수: ${prompts.length}`);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${out}/M1_result_top.png` });

const body = await page.innerText('body');
const marks = await page.locator('mark').allInnerTexts();
// 1) PII sent to LLM?
const leaks = ['홍길동', '단국대학교', '010-1234-5678', 'hong@test.com'].map(s => `${s}:${prompts.some(p => p.includes(s)) ? 'LLM에 전송됨❌' : '마스킹됨✅'}`);
ev.push('LLM 프롬프트 PII: ' + leaks.join(' | '));
// 2) PII visible on screen under "PII Masked" badge?
const onScreen = ['단국대학교', '010-1234-5678', 'hong@test.com'].map(s => `${s}:${body.includes(s) ? '화면 노출' : '가려짐'}`);
ev.push(`화면 "PII Masked" 배지: ${/PII Masked/.test(body) ? '있음' : '없음'} / 본문 PII: ${onScreen.join(' | ')}`);
// 3) highlight + hallucinated quote handling
ev.push(`하이라이트 수: ${marks.length} → ${marks.map(m => m.slice(0, 30)).join(' / ')}`);
ev.push(`환각 인용(원문에 없음) 화면 표시: ${body.includes('구글에서 5년간') ? '표시됨' : '표시 안 됨'} / 해당 카드 유형: ${/환각 테스트[\s\S]{0,200}(검증필요|verify|면접 확인)/i.test(body) ? 'verify로 전환✅' : '확인 필요'}`);
ev.push(`최종 점수/판정 표시: ${(body.match(/(\d{2,3})\s*\/\s*100점/) || [])[1]} / 면접질문 mock 반영: ${body.includes('MOCK 질문') ? '예' : '아니오'}`);
await page.locator('text=전체 보기').first().scrollIntoViewIfNeeded().catch(() => {});
await page.screenshot({ path: `${out}/M2_evidence.png` });
fs.writeFileSync(`${out}/prompts.txt`, prompts.join('\n\n==========\n\n'));
console.log(ev.join('\n'));
await b.close();
