/**
 * .docx 본문 추출 (외부 라이브러리 없이 브라우저 기본 DecompressionStream 사용)
 * docx = zip 파일 → word/document.xml 을 풀어서 <w:t> 글자, <w:p> 문단, <w:tab>/<w:br> 를 텍스트로 바꿉니다.
 * 예전에는 zip 바이트를 그대로 글자로 해석해 깨진 글자가 나왔습니다.
 */

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

function findEntry(bytes, targetName) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // End of Central Directory: 파일 끝에서 거꾸로 찾기 (주석 최대 65535바이트)
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (view.getUint32(i, true) === SIG_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('docx(zip) 형식이 아닙니다.');

  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== SIG_CENTRAL) break;
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    if (name === targetName) {
      if (view.getUint32(localOffset, true) !== SIG_LOCAL) throw new Error('docx 내부 구조가 손상되었습니다.');
      const lNameLen = view.getUint16(localOffset + 26, true);
      const lExtraLen = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      return { method, data: bytes.subarray(start, start + compSize) };
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

async function inflateRaw(data) {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const XML_ENTITIES = { '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&apos;': "'" };

/** word/document.xml → 문단 단위 텍스트 */
export function documentXmlToText(xml) {
  return xml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g, '\u0000$1\u0000')
    .replace(/<[^>]+>/g, '')
    .replace(/\u0000/g, '')
    .replace(/&(lt|gt|amp|quot|apos);/g, (m) => XML_ENTITIES[m])
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** .docx ArrayBuffer → 본문 텍스트 (읽을 수 없으면 '') */
export async function extractDocxText(arrayBuffer) {
  try {
    const entry = findEntry(new Uint8Array(arrayBuffer), 'word/document.xml');
    if (!entry) return '';
    let xmlBytes;
    if (entry.method === 0) xmlBytes = entry.data;
    else if (entry.method === 8 && typeof DecompressionStream !== 'undefined') xmlBytes = await inflateRaw(entry.data);
    else return '';
    return documentXmlToText(new TextDecoder('utf-8').decode(xmlBytes));
  } catch (err) {
    console.warn('docx 본문 추출 실패:', err);
    return '';
  }
}
