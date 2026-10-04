import { describe, it, expect } from 'vitest';
import { parseTextFile, parseBinaryTextFallback, parseCandidateFile, cleanPdfBinaryNoise } from './fileParser';

describe('Client-side File Parser Engine (.txt, .pdf, .docx)', () => {
  it('TXT 파일을 UTF-8 텍스트로 정상 파싱해야 함', async () => {
    const textContent = '안녕하십니까. 백엔드 지원자 홍길동입니다. Redis 캐싱으로 성능을 80% 단축시켰습니다.';
    const blob = new Blob([textContent], { type: 'text/plain' });
    const file = new File([blob], 'candidate_hong.txt', { type: 'text/plain' });

    const result = await parseCandidateFile(file);

    expect(result.filename).toBe('candidate_hong.txt');
    expect(result.filetype).toBe('TXT');
    expect(result.extractedText).toContain('Redis 캐싱으로 성능을 80% 단축시켰습니다.');
  });

  it('PDF 바이너리 태그 및 키워드 노이즈 정제 검증', () => {
    const rawNoise = 'PDF-1.4 1 0 obj Title LG Careers Creator Mozilla 5.0 Skia PDF FlateDecode Length 293 stream x 지원자 김민준 자기소개서 백엔드 시스템 구축 99% 달성 endobj StructElem NonStruct';
    const cleaned = cleanPdfBinaryNoise(rawNoise);

    expect(cleaned).not.toContain('PDF-1.4');
    expect(cleaned).not.toContain('FlateDecode');
    expect(cleaned).not.toContain('StructElem');
    expect(cleaned).toContain('지원자 김민준 자기소개서');
    expect(cleaned).toContain('백엔드 시스템 구축');
  });

  it('바이너리 ArrayBuffer에서 한글 및 텍스트 청크를 정상 추출하고 PDF 노이즈 제거해야 함', () => {
    const encoder = new TextEncoder();
    const buffer = encoder.encode('PDF-1.4 %obj 1 0 지원자 김민준 자기소개서 백엔드 시스템 구축 99% 달성 endobj');

    const extracted = parseBinaryTextFallback(buffer.buffer);
    expect(extracted).toContain('지원자 김민준 자기소개서');
    expect(extracted).toContain('백엔드 시스템 구축');
    expect(extracted).not.toContain('FlateDecode');
  });

  it('지원되지 않는 인코딩이나 빈 파일 발생 시 가이드 메시지 반환', async () => {
    const blob = new Blob([''], { type: 'text/plain' });
    const file = new File([blob], 'empty.txt', { type: 'text/plain' });

    const result = await parseCandidateFile(file);
    expect(result.filename).toBe('empty.txt');
    expect(result.extractedText).toBe('');
  });
});
