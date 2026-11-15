// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { extractDocxText, documentXmlToText } from './docxReader';

const fixture = () => {
  const buf = readFileSync(new URL('./__fixtures__/sample.docx', import.meta.url));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};

describe('docxReader', () => {
  it('압축된 docx 에서 문단·탭·특수문자를 살려 본문을 읽는다', async () => {
    const text = await extractDocxText(fixture());
    expect(text).toBe('자기소개서 - 백엔드\nRedis 캐싱으로 응답 시간을 80% 단축했습니다 & 장애를 줄였습니다.\n연락처: hong@example.com');
  });

  it('zip 이 아니면 빈 문자열', async () => {
    expect(await extractDocxText(new TextEncoder().encode('not a zip').buffer)).toBe('');
  });

  it('XML 태그와 숫자 엔티티를 정리한다', () => {
    expect(documentXmlToText('<w:p><w:r><w:t>A&#44032;&#x1100;</w:t></w:r></w:p><w:p></w:p><w:p></w:p><w:p><w:t>B</w:t></w:p>')).toBe('A가ᄀ\n\nB');
  });
});
