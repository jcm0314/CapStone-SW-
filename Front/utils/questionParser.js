const QUESTION_HEADER_RE =
  /^(?:\[?\s*(?:문항\s*\d+|Q\s*\d+|질문\s*\d+|\d+\s*[.)])\s*\]?[:.\-\s]*)(.+)?$/i;

/**
 * 자기소개서 원문을 문항 제목 + 본문 배열로 분리한다.
 */
export function parseCoverLetterQuestions(rawText = '') {
  const text = String(rawText || '').trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(QUESTION_HEADER_RE);
    const isHeader =
      match &&
      line.length <= 120 &&
      // 연도(예: 2024. 03)나 숫자 목록 본문이 아닌 문항 헤더인지 휴리스틱 판별
      !/^\d{4}\./.test(line);

    if (isHeader) {
      if (current && (current.answer.trim() || sections.length === 0)) {
        sections.push({
          ...current,
          answer: current.answer.trim()
        });
      }
      current = {
        index: sections.length + 1,
        question: line,
        answerLines: []
      };
      // answer property convenience
      current.answer = '';
    } else if (current) {
      current.answer = current.answer ? `${current.answer}\n${rawLine}` : rawLine;
    } else if (line) {
      current = {
        index: 1,
        question: '자기소개서 본문',
        answer: rawLine
      };
    }
  }

  if (current) {
    sections.push({
      index: current.index,
      question: current.question,
      answer: (current.answer || '').trim()
    });
  }

  // 헤더가 전혀 없어서 1개 덩어리인데 문단이 2개 이상이면 문단별로 분리
  if (sections.length === 1 && sections[0].question === '자기소개서 본문') {
    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 20);
    if (paragraphs.length >= 2) {
      return paragraphs.map((p, idx) => ({
        index: idx + 1,
        question: `문항 ${idx + 1}`,
        answer: p
      }));
    }
  }

  return sections.filter((s) => s.answer.length > 0 || s.question.length > 0);
}

/**
 * 문항별 텍스트와 AI 분석 결과(highlights, totalScore)를 결합해 문항별 점수와 근거를 산출한다.
 */
export function buildQuestionEvaluations(applicant) {
  const analysis = applicant?.analysis;
  if (!analysis) return [];

  if (Array.isArray(analysis.questionEvaluations) && analysis.questionEvaluations.length > 0) {
    return analysis.questionEvaluations;
  }

  const parsed = parseCoverLetterQuestions(applicant?.rawText || '');
  if (parsed.length === 0) return [];

  const baseScore = Number(analysis?.summary?.totalScore ?? 75);
  const highlights = Array.isArray(analysis?.highlights) ? analysis.highlights : [];

  return parsed.map((sec) => {
    const answerLower = sec.answer.toLowerCase();
    const matchedHighlights = highlights.filter((h) => {
      const quote = (h.quote || h.text || '').trim();
      if (!quote) return false;
      const snippet = quote.slice(0, Math.min(20, quote.length)).toLowerCase();
      return answerLower.includes(snippet);
    });

    const posCount = matchedHighlights.filter((h) => h.type !== 'warning' && h.type !== 'negative').length;
    const warnCount = matchedHighlights.filter((h) => h.type === 'warning' || h.type === 'negative').length;
    const lengthBonus = sec.answer.length >= 300 ? 3 : sec.answer.length < 100 ? -6 : 0;
    const score = Math.max(
      0,
      Math.min(100, Math.round(baseScore + posCount * 3 - warnCount * 4 + lengthBonus))
    );

    const rationale =
      matchedHighlights.length > 0
        ? matchedHighlights.map((h) => h.reason || h.comment || h.quote).filter(Boolean).slice(0, 2).join(' · ')
        : sec.answer.length >= 200
          ? '직무 관련 경험과 서술 분량이 안정적으로 작성되었습니다.'
          : '서술 분량이 짧아 구체적인 사례·수치 보완을 확인하는 것이 좋습니다.';

    return {
      index: sec.index,
      question: sec.question,
      answer: sec.answer,
      charCount: sec.answer.length,
      score,
      matchedHighlights,
      rationale
    };
  });
}
