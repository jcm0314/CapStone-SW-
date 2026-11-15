import fs from 'fs';
import path from 'path';

const OUT_DIR = '/Users/jcm0314/.gemini/antigravity-ide/scratch/CapStone-SW-/docs/assets/live';
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function getPageTarget() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const targets = await res.json();
  const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('checkmate.psyrod.dev'));
  if (!pageTarget) {
    throw new Error('Check-Mate page target not found');
  }
  return pageTarget;
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.pending = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message));
          } else {
            resolve(msg.result);
          }
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    return res.result?.value;
  }

  async screenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const filePath = path.join(OUT_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${filename} (${buffer.length} bytes)`);
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  const target = await getPageTarget();
  console.log(`Connecting to page target: ${target.title} (${target.url})`);
  const cdp = new CDPClient(target.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false
  });

  // 먼저 사이트 새로고침 및 라이트 모드 리셋
  await cdp.send('Page.navigate', { url: 'https://checkmate.psyrod.dev/' });
  await cdp.wait(2500);

  // 1. 지원자 목록 첫 화면
  console.log('1. Capturing 01_live_applicant_list.png ...');
  await cdp.screenshot('01_live_applicant_list.png');

  // 2. ⌘K 커맨드 팔레트 열기
  console.log('2. Opening Command Palette...');
  await cdp.evaluate(`
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
  `);
  await cdp.wait(800);
  await cdp.screenshot('02_live_command_palette.png');

  // ⌘K 닫기
  await cdp.evaluate(`
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  `);
  await cdp.wait(500);

  // 3. '새 평가' 버튼 클릭 (헤더 네비게이션)
  console.log('3. Clicking "새 평가" button...');
  const clickedNew = await cdp.evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const newBtn = btns.find(b => b.textContent.trim() === '새 평가');
      if (newBtn) {
        newBtn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log('Clicked "새 평가":', clickedNew);
  await cdp.wait(1200);
  console.log('3. Capturing 03_live_applicant_input.png ...');
  await cdp.screenshot('03_live_applicant_input.png');

  // 4. 자소서 텍스트 입력 및 PII 마스킹 상태 캡처
  console.log('4. Entering sample resume with 7 PII tokens...');
  await cdp.evaluate(`
    (() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const sample = '안녕하세요. 백엔드 개발자 지원자 홍길동(010-1234-5678, gildong@dankook.ac.kr)입니다.\\n' +
          '단국대학교 컴퓨터공학과를 졸업하였으며, 주민번호는 990101-1234567입니다.\\n' +
          '지난 1년간 대용량 트래픽 처리 백엔드 시스템을 설계하여 Redis 캐싱 및 인덱스 최적화를 통해 응답 시간을 45% 단축하고, MSA 간 메시지 큐(RabbitMQ) 기반 비동기 파이프라인을 구축한 경험이 있습니다.';
        
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeSetter.call(textarea, sample);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));

        // 지원자 이름 입력창도 채우기
        const nameInput = document.querySelector('input[placeholder*="이름"], input[type="text"]');
        if (nameInput) {
          const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          inputSetter.call(nameInput, '홍길동');
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          nameInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return true;
      }
      return false;
    })()
  `);
  await cdp.wait(1500);
  console.log('4. Capturing 04_live_pii_masking.png ...');
  await cdp.screenshot('04_live_pii_masking.png');

  // 5. 다크 모드 캡처
  console.log('5. Toggling dark mode...');
  await cdp.evaluate(`
    document.documentElement.classList.add('dark');
  `);
  await cdp.wait(800);
  console.log('5. Capturing 05_live_dark_mode.png ...');
  await cdp.screenshot('05_live_dark_mode.png');

  // 라이트 모드 복원
  await cdp.evaluate(`
    document.documentElement.classList.remove('dark');
  `);

  cdp.close();
  console.log('🎉 All live screenshots captured with Retina 2x quality!');
}

main().catch(err => {
  console.error('Failed to capture CDP screenshots:', err);
  process.exit(1);
});
