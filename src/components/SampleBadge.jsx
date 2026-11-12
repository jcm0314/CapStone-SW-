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
      className="chip chip-warn print:bg-amber-100 print:text-amber-900 print:border-amber-400"
      title={SAMPLE_NOTE}
    >
      <FlaskConical className="w-3 h-3" aria-hidden="true" />
      샘플 데이터
    </span>
  );

  if (variant === 'badge') return <span className={`inline-flex ${className}`}>{badge}</span>;

  return (
    <div
      role="note"
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 px-3.5 py-2.5 rounded-lg border border-warn-line bg-warn-soft text-[13px] text-fg print:bg-amber-50 print:text-amber-900 ${className}`}
    >
      {badge}
      <span className="break-keep">
        <strong className="font-semibold">{SAMPLE_NOTE}</strong>{' '}
        <span className="text-fg-muted">점수와 근거는 화면 구성을 보여 주기 위한 예시이며, 실제 평가는 자기소개서를 넣고 평가를 실행해야 생성됩니다.</span>
      </span>
    </div>
  );
}
