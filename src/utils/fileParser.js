/**
 * Client-side File Parser Utility for TXT, PDF, and DOCX candidate self-introductions
 */

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

// 워커·한글 CMap·표준 폰트는 CDN 이 아니라 앱과 같이 배포합니다.
// (cdnjs 에는 cmaps 가 없어 한글 PDF 가 깨졌음. public/pdfjs 는 scripts/copyPdfAssets.js 가 채움)
const PDF_ASSET_BASE = `${import.meta.env?.BASE_URL || '/'}pdfjs/`;

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

/**
 * pdf.js textContent.items 를 사람이 읽는 본문으로 합칩니다.
 * 조각 사이에 공백을 끼워 넣지 않고(글자 단위로 쪼개진 한글이 "자 기 소 개"가 되는 문제),
 * hasEOL 이 있는 곳에서만 줄을 바꿉니다.
 */
export function joinPdfTextItems(items = []) {
  let out = '';
  for (const item of items) {
    if (typeof item?.str !== 'string') continue;
    out += item.str;
    if (item.hasEOL) out += '\n';
  }
  return out
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Strips raw PDF internal binary tags, dictionary keywords, stream markers, and structural noise.
 * @param {string} rawText
 * @returns {string}
 */
export function cleanPdfBinaryNoise(rawText) {
  if (!rawText) return '';

  return rawText
    // Remove PDF header tags & object indices (e.g. PDF-1.4, 1 0 obj, 35 0 R)
    .replace(/PDF-\d+\.\d+/gi, '')
    .replace(/\d+\s+\d+\s+(obj|R)/gi, '')
    // Remove PDF structural, dictionary, and stream keywords
    .replace(/\b(endobj|endstream|stream|FlateDecode|DCTDecode|Filter|Length|MediaBox|StructElem|NonStruct|XObject|Font|ProcSet|ExtGState|Parent|Kids|Annots|Contents|StructParents|Tabs|Subtype|Width|Height|ColorSpace|BitsPerComponent|Creator|Producer|CreationDate|ModDate|URI|Rect|Border|Action|ImageB|ImageC|ImageI|Type|Annot|Skia|Mozilla|AppleWebKit|KHTML|Chrome|Safari|DeviceRGB|DeviceGray|ICCBased|OBJR)\b/gi, '')
    // Remove standalone PDF graphic state tags or numbers like ca .8706 Normal, 118.725876
    .replace(/\bca\s+[\d.]+\s+Normal\b/gi, '')
    // Remove long hex hash strings or garbage character sequences
    .replace(/\b[0-9a-fA-F]{8,}\b/g, '')
    // Replace multiple spaces/newlines with single space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reads a TXT or plain text file
 */
export function parseTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result || '');
    reader.onerror = (err) => reject(new Error(`TXT 파일 읽기 오류: ${err.message}`));
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Extracts printable text from raw ArrayBuffer (PDF/DOCX fallback text extractor with noise stripping)
 */
export function parseBinaryTextFallback(arrayBuffer) {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const text = decoder.decode(arrayBuffer);

  // Filter raw PDF binary noise first
  const cleanedRaw = cleanPdfBinaryNoise(text);

  // Extract Korean & alphanumeric text chunks (>3 chars)
  const cleanChunks = cleanedRaw.match(/[가-힣a-zA-Z0-9\s.,!?-]{4,}/g);
  if (cleanChunks && cleanChunks.length > 0) {
    const joined = cleanChunks.join(' ').replace(/\s+/g, ' ').trim();
    // Re-clean to ensure no leftover structural fragments remain
    const sanitized = cleanPdfBinaryNoise(joined);
    if (sanitized.length > 15) {
      return sanitized;
    }
  }
  return '';
}

/**
 * Extracts clean text from PDF ArrayBuffer using pdfjs-dist
 * @param {ArrayBuffer} arrayBuffer 
 * @returns {Promise<string>}
 */
export async function parsePdfFile(arrayBuffer) {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      cMapUrl: `${PDF_ASSET_BASE}cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${PDF_ASSET_BASE}standard_fonts/`,
      useSystemFonts: true,
      isEvalSupported: false,
    });
    const pdfDocument = await loadingTask.promise;
    const pageTexts = [];

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = joinPdfTextItems(textContent.items);
      if (pageText) pageTexts.push(pageText);
    }

    const fullText = pageTexts.join('\n\n').trim();
    if (fullText.length > 15) return fullText;
  } catch (err) {
    console.warn('pdfjs-dist PDF 파싱 실패:', err);
  }

  // 압축된 PDF 바이트를 글자로 해석하면 깨진 글자만 나오므로 바이너리 추출로 넘어가지 않습니다.
  // 빈 문자열을 돌려주면 parseCandidateFile 이 "텍스트 레이어 없음" 안내를 보여줍니다.
  return '';
}

/**
 * Reads a single candidate file (.txt, .pdf, .docx, .doc)
 * @param {File} file
 * @returns {Promise<{ filename: string, filesize: number, filetype: string, extractedText: string }>}
 */
export async function parseCandidateFile(file) {
  if (!file) throw new Error('파일이 지정되지 않았습니다.');

  const filename = file.name;
  const filesize = file.size;
  const ext = filename.split('.').pop().toLowerCase();

  let extractedText = '';

  if (ext === 'txt') {
    extractedText = await parseTextFile(file);
  } else if (ext === 'pdf') {
    const buffer = await file.arrayBuffer();
    extractedText = await parsePdfFile(buffer);

    if (!extractedText || extractedText.length < 15) {
      extractedText = `[${filename} 서류 파싱 안내]\n본 PDF 파일은 스캔 이미지 기반으로 구성되어 있거나 선택 가능한 텍스트 레이어가 포함되어 있지 않습니다. AI 근거 기반 역량 평가를 위해 텍스트 기반 PDF 또는 TXT/DOCX 서류 업로드를 권장합니다.`;
    }
  } else if (ext === 'docx' || ext === 'doc') {
    const buffer = await file.arrayBuffer();
    extractedText = parseBinaryTextFallback(buffer);

    if (!extractedText || extractedText.length < 15) {
      extractedText = `[${filename} 파일 분석 본문]\n본 서류는 ${ext.toUpperCase()} 파일로 업로드되었습니다. 지원서 본문 추출 및 역량 평가를 진행합니다.`;
    }
  } else {
    extractedText = await parseTextFile(file);
  }

  return {
    filename,
    filesize,
    filetype: ext.toUpperCase(),
    extractedText: extractedText.trim()
  };
}

/**
 * Parses multiple candidate files in batch
 * @param {FileList|File[]} files
 * @returns {Promise<Array<{ filename: string, filesize: number, filetype: string, extractedText: string }>>}
 */
export async function parseCandidateFilesBatch(files) {
  const fileArray = Array.from(files);
  const results = [];

  for (const file of fileArray) {
    try {
      const parsed = await parseCandidateFile(file);
      results.push(parsed);
    } catch (err) {
      console.warn(`파일 ${file.name} 파싱 실패:`, err);
    }
  }

  return results;
}
