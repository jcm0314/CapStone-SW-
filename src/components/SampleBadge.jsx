import React from 'react';
import { FlaskConical } from 'lucide-react';

export const SAMPLE_NOTE = 'AI를 실행하지 않은 예시 결과입니다.';

/**
 * 샘플(예시) 결과 표시.
 * - variant="badge": 제목 옆에 붙는 작은 배지
 * - variant="note": 배지 + 한 줄 안내 문구 (결과 상단 / 보고서 / 공유 화면)
 */
export default function SampleBadge({ variant = 'badge', className = '' }) {
  const badge = (
    <span
      data-testid="sample-badge"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/40 whitespace-nowrap print:bg-amber-100 print:text-amber-900 print:border-amber-400"
      title={SAMPLE_NOTE}
    >
      <FlaskConical className="w-3 h-3" aria-hidden="true" />
      샘플 데이터
    </span>
  );

  if (variant === 'badge') return <span className={className}>{badge}</span>;

  return (
    <div
      role="note"
      className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl border border-amber-400/30 bg-amber-400/5 text-xs text-amber-200 print:bg-amber-50 print:text-amber-900 ${className}`}
    >
      {badge}
      <span>{SAMPLE_NOTE} 점수와 근거는 화면 구성을 보여 주기 위한 예시이며, 실제 평가는 자기소개서를 넣고 평가를 실행해야 생성됩니다.</span>
    </div>
  );
}
