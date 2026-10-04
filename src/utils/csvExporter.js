/**
 * Utility for exporting candidate evaluation matrices to UTF-8 CSV / Excel files
 */

/**
 * Converts array of applicant analysis results to UTF-8 CSV string with BOM
 * @param {Array} applicants - Array of applicant analysis objects
 * @returns {string} - CSV string formatted with UTF-8 BOM
 */
export function generateApplicantsCSV(applicants = []) {
  const headers = [
    '지원자 성명',
    '지원 직무',
    '종합 점수',
    '최종 판정',
    'AI 작성 확률(%)',
    '문제 해결력',
    '직무 전문성',
    '협업 및 커뮤니케이션',
    '성장 가능성',
    '윤리 및 조직 적합성',
    '긍정 근거 수',
    '리스크 근거 수',
    '면접 검증 필요 수',
    '판정 사유'
  ];

  const rows = applicants.map(app => {
    const summary = app.analysis?.summary || {};
    const comp = app.analysis?.competencyScores || {};
    const evidences = app.analysis?.groundingEvidences || [];

    const positiveCount = evidences.filter(e => e.type === 'positive').length;
    const riskCount = evidences.filter(e => e.type === 'risk').length;
    const verifyCount = evidences.filter(e => e.type === 'verify').length;

    const decisionText = 
      summary.decision === 'STRONG_PASS' ? '합격 우수' :
      summary.decision === 'REJECT' ? '서류 탈락' :
      summary.decision === 'HOLD' ? '보류' : '면접 검증';

    return [
      `"${app.name || '미지정'}"`,
      `"${app.applyJobTitle || '백엔드 엔지니어'}"`,
      summary.totalScore || 0,
      `"${decisionText}"`,
      `${summary.aiTextProbability || 0}%`,
      comp.problem_solving || 0,
      comp.tech_skill || 0,
      comp.teamwork || 0,
      comp.growth || 0,
      comp.ethics || 0,
      positiveCount,
      riskCount,
      verifyCount,
      `"${(summary.decisionReason || '').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\r\n');

  // Add UTF-8 BOM (\uFEFF) for Excel compatibility
  return '\uFEFF' + csvContent;
}

/**
 * Triggers browser file download of CSV content
 */
export function downloadApplicantsCSV(applicants, filename = `HR_AX_Evaluation_Report_${new Date().toISOString().slice(0, 10)}.csv`) {
  if (!applicants || applicants.length === 0) {
    alert('다운로드할 지원자 평가 데이터가 없습니다.');
    return;
  }

  const csvData = generateApplicantsCSV(applicants);
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
