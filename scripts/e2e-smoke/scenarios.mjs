// Usage: node scenarios.mjs <url> <outdir>
// Walks through user scenarios on the Check-Mate web app, logging what works / breaks.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const [, , url, out] = process.argv;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();

let step = 'init';
let lastDialog = '';
const report = [];
const events = [];
const hook = (p, tag) => {
  p.on('console', m => { if (m.type() === 'error') events.push(`${tag}[${step}] console.error: ${m.text().slice(0, 250)}`); });
  p.on('pageerror', e => events.push(`${tag}[${step}] PAGEERROR: ${e.message.slice(0, 250)}`));
  p.on('dialog', async d => { lastDialog = d.message().slice(0, 200); events.push(`${tag}[${step}] DIALOG(${d.type()}): ${d.message().slice(0, 250)}`); await d.dismiss().catch(() => {}); });
  p.on('response', async r => {
    const u = r.url();
    if (/googleapis|\/api\/|supabase/.test(u)) {
      let body = '';
      try { body = (await r.text()).slice(0, 200).replace(/\s+/g, ' '); } catch {}
      events.push(`${tag}[${step}] NET ${r.request().method()} ${u.replace(/key=[^&]+/, 'key=***').slice(0, 120)} -> ${r.status()} ${body}`);
    }
  });
  p.on('requestfailed', r => events.push(`${tag}[${step}] REQFAIL ${r.url().slice(0, 120)} ${r.failure()?.errorText}`));
};
hook(page, 'main');

const shot = async (name, p = page, full = false) => p.screenshot({ path: `${out}/${name}.png`, fullPage: full }).catch(() => {});
const bodyText = async (p = page) => (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ');
const clickText = async (txt, opts = {}) => {
  const loc = page.getByText(txt, { exact: false }).first();
  await loc.scrollIntoViewIfNeeded({ timeout: 5000 });
  await loc.click({ timeout: 5000, ...opts });
};
async function run(name, fn) {
  step = name;
  const t0 = Date.now();
  try {
    const note = await fn();
    report.push(`✅ ${name} (${Date.now() - t0}ms) ${note || ''}`);
  } catch (e) {
    report.push(`❌ ${name}: ${e.message.split('\n')[0].slice(0, 250)}`);
    await shot(`ERR_${name.replace(/[^\w가-힣]+/g, '_')}`);
  }
}

await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

// S1: landing state
await run('S01_첫화면', async () => {
  const t = await bodyText();
  const m = t.match(/(\d{2,3})\s*\/\s*100점/);
  return `초기 표시 점수: ${m ? m[1] : '없음'} / AI 미실행 상태에서 결과 표시 여부: ${m ? '예(샘플)' : '아니오'}`;
});

// S2: run AI on built-in sample (default B2B managed mode)
await run('S02_AI평가_샘플_B2B기본모드', async () => {
  await clickText('이서연');
  await page.waitForTimeout(500);
  lastDialog = '';
  await clickText('역량 정밀 평가 실행');
  // wait for a result / error, up to 90s
  const t0 = Date.now();
  let last = '';
  while (Date.now() - t0 < 90000) {
    await page.waitForTimeout(2000);
    last = await bodyText();
    if (lastDialog || /평가 완료/.test(last)) break;
  }
  await shot('S02_after_eval');
  const score = last.match(/이서연 지원자 서류 종합 평가.{0,400}?(\d{2,3})\s*\/\s*100점/);
  return `알림창: ${lastDialog || '없음'} | 이서연 결과 점수: ${score ? score[1] : '없음'}`;
});

// S3: direct text with PII → AI
await run('S03_직접입력_PII포함_평가', async () => {
  await page.locator('input[type=text]').first().fill('홍길동');
  await page.locator('textarea').first().fill(
    '저는 단국대학교 컴퓨터공학과 홍길동입니다. 연락처 010-1234-5678, 이메일 hong@test.com. ' +
    '쇼핑몰 API 응답이 3초로 느린 문제를 Redis 캐싱으로 0.4초까지 줄였습니다. 열정을 다해 최고의 시너지를 내겠습니다.');
  lastDialog = '';
  await clickText('역량 정밀 평가 실행');
  await page.waitForTimeout(15000);
  await shot('S03_after_eval');
  return `알림창: ${lastDialog || '없음'}`;
});

// reload to restore sample state for UI-only scenarios
await page.goto(url, { waitUntil: 'networkidle' });

// S4: evidence highlight click
await run('S04_근거문장_클릭_형광펜', async () => {
  await clickText('🔴 리스크');
  await page.waitForTimeout(400);
  await clickText('전체 보기');
  const marks = await page.locator('mark').count();
  const card = page.locator('[class*=cursor-pointer]').filter({ hasText: /근거|성과|확인/ }).first();
  await card.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);
  await shot('S04_highlight', page, false);
  return `본문 <mark> 하이라이트 수: ${marks}`;
});

// S5: HITL modal
await run('S05_HITL_보정모달', async () => {
  await clickText('HITL 환각 교정');
  await page.waitForTimeout(800);
  await shot('S05_hitl_open');
  const t = await bodyText();
  const btn = page.getByRole('button', { name: /저장|적용|확정|반영/ }).first();
  const has = await btn.count();
  if (has) { await btn.click({ timeout: 5000 }); await page.waitForTimeout(800); }
  await shot('S05_hitl_after');
  await page.keyboard.press('Escape');
  return `저장버튼: ${has ? '있음→클릭' : '없음'} / 체크박스(최종판단 본인) 문구: ${/최종|본인/.test(t) ? '있음' : '없음'}`;
});

// S6: share link + open as interviewer in another context
let shareUrl = null;
await run('S06_면접관_공유링크_생성', async () => {
  await page.goto(url, { waitUntil: 'networkidle' });
  await clickText('면접관 공유');
  await page.waitForTimeout(1500);
  await shot('S06_share_modal');
  const t = await bodyText();
  const m = t.match(/https?:\/\/\S+(share|eval_)\S*/);
  const inputs = await page.locator('input').evaluateAll(els => els.map(e => e.value).filter(v => /share|eval_/.test(v)));
  shareUrl = (m && m[0]) || inputs[0] || null;
  return `공유 URL: ${shareUrl || '찾지 못함'}`;
});

await run('S07_공유링크_다른기기에서_열기', async () => {
  if (!shareUrl) throw new Error('S06에서 링크를 얻지 못해 건너뜀');
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const p2 = await ctx2.newPage(); hook(p2, 'device2');
  await p2.goto(shareUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await p2.waitForTimeout(2000);
  await shot('S07_device2', p2);
  const t = await bodyText(p2);
  await ctx2.close();
  return `기기2 화면에 지원자 결과 표시: ${/김민준|종합 평가|100점/.test(t) ? '예' : '아니오'} | 앞부분: ${t.slice(0, 120)}`;
});

// S8: memo + score adjust
await run('S08_면접관_메모_등록', async () => {
  await page.keyboard.press('Escape');
  await page.goto(url, { waitUntil: 'networkidle' });
  const memo = page.locator('input[placeholder*="면접 질문에 대한"]').first();
  await memo.scrollIntoViewIfNeeded();
  await clickText('+5점');
  await memo.fill('테스트 메모: Redis 경험 확인 필요');
  await page.getByRole('button', { name: '등록' }).first().click();
  await page.waitForTimeout(1500);
  const t = await bodyText();
  await shot('S08_memo');
  return `등록한 메모 화면 반영: ${t.includes('Redis 경험 확인 필요') ? '예' : '아니오'}`;
});

// S9: applicant comparison / Top-N / plagiarism
await run('S09_지원자비교_탭', async () => {
  await clickText('지원자 비교');
  await page.waitForTimeout(1200);
  await shot('S09_compare', page, true);
  const t = await bodyText();
  return `표절 매트릭스: ${/표절|유사도/.test(t) ? '있음' : '없음'} | Top-N 컷오프: ${/상위\s*\d+명|컷오프|Cut/i.test(t) ? '있음' : '없음'} | CSV: ${/CSV|엑셀/.test(t) ? '있음' : '없음'}`;
});

// S10: tenant switch
await run('S10_테넌트_전환', async () => {
  await page.goto(url, { waitUntil: 'networkidle' });
  await clickText('토스페이먼츠');
  await page.waitForTimeout(600);
  await shot('S10_tenant_menu');
  const opt = page.getByText('당근', { exact: false }).first();
  await opt.click({ timeout: 5000 });
  await page.waitForTimeout(1200);
  await shot('S10_tenant_daangn');
  const t = await bodyText();
  return `전환 후 헤더에 당근: ${/당근/.test(t.slice(0, 300)) ? '예' : '아니오'} | 지원자 비교 수: ${(t.match(/지원자 비교\s*(\d+)/) || [])[1] || '?'}`;
});

// S11: role / profile menu (SSO, prompt studio, credits)
await run('S11_역할_프로필메뉴', async () => {
  await clickText('Recruiter');
  await page.waitForTimeout(600);
  await shot('S11_role_menu');
  const t1 = await bodyText();
  await page.keyboard.press('Escape');
  await page.locator('header button').last().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);
  await shot('S11_profile_menu');
  const t2 = await bodyText();
  return `역할목록: ${['Admin', 'Recruiter', 'Interviewer', 'ADMIN', 'INTERVIEWER'].filter(r => t1.includes(r)).join(',')} | 프롬프트 스튜디오 노출: ${/Prompt Studio|프롬프트 스튜디오/i.test(t1 + t2) ? '예' : '아니오'}`;
});

// S12: report export
await run('S12_평가보고서_출력', async () => {
  await page.goto(url, { waitUntil: 'networkidle' });
  await clickText('HR 서류 평가 보고서 출력');
  await page.waitForTimeout(1200);
  await shot('S12_report');
  const t = await bodyText();
  return `보고서 모달: ${/보고서|Report/.test(t) ? '열림' : '안 열림'}`;
});

// S13: file upload (txt)
await run('S13_TXT_파일업로드', async () => {
  await page.goto(url, { waitUntil: 'networkidle' });
  await clickText('PDF / TXT 파일 업로드');
  const f = `${out}/sample_cv.txt`;
  fs.writeFileSync(f, '이름: 김테스트\n저는 물류 시스템의 배치 처리 시간을 2시간에서 20분으로 줄였습니다. Kafka 를 도입했습니다.');
  const input = page.locator('input[type=file]').first();
  await input.setInputFiles(f);
  await page.waitForTimeout(2500);
  await shot('S13_upload');
  const t = await bodyText();
  return `업로드 후 본문/목록 반영: ${/김테스트|물류|sample_cv/.test(t) ? '예' : '아니오'}`;
});

// S14: own API key mode with fake key → client-side Gemini path
await run('S14_개인API키모드_가짜키', async () => {
  await page.goto(url, { waitUntil: 'networkidle' });
  await clickText('B2B 일괄 결제');
  await page.waitForTimeout(800);
  await shot('S14_key_modal');
  const keyInput = page.locator('input[type=password], input[placeholder*="API"], input[placeholder*="AIza"]').first();
  if (!(await keyInput.count())) return 'API 키 입력창을 찾지 못함 (모달 구조 확인 필요)';
  await keyInput.fill('AIzaFAKEKEY_for_test_000000000000000');
  const save = page.getByRole('button', { name: /저장|적용|연결|확인|사용/ }).first();
  await save.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  lastDialog = '';
  await clickText('역량 정밀 평가 실행');
  await page.waitForTimeout(20000);
  await shot('S14_after_eval');
  return `알림창: ${lastDialog || '없음'}`;
});

fs.writeFileSync(`${out}/report.txt`, report.join('\n'));
fs.writeFileSync(`${out}/events.txt`, events.join('\n'));
console.log(report.join('\n'));
console.log(`\n(events: ${events.length})`);
await browser.close();
