// pdf.js 한글 CMap·표준 폰트를 public/pdfjs 로 복사합니다 (npm run dev / build 전에 자동 실행).
// CDN(cdnjs)에는 cmaps 가 없어서 한글 PDF 글자가 깨졌기 때문에 앱과 같이 배포합니다.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'pdfjs-dist');
const dest = join(root, 'public', 'pdfjs');

if (!existsSync(src)) {
  console.warn('[copyPdfAssets] pdfjs-dist 가 없어 건너뜁니다. npm install 을 먼저 실행하세요.');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
for (const dir of ['cmaps', 'standard_fonts']) {
  cpSync(join(src, dir), join(dest, dir), { recursive: true });
}
console.log('[copyPdfAssets] public/pdfjs/{cmaps,standard_fonts} 준비 완료');
