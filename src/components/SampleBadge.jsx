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
      className="inline-flex items-center gap-1 px-1.5 py-px rounded-sm text-[11px] font-medium border border-line-strong text-fg-muted whitespace-nowrap print:text-amber-900 print:border-amber-400"
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
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 rounded border-l-[3px] border-accent bg-subtle text-[13px] text-fg print:bg-amber-50 print:text-amber-900 ${className}`}
    >
      {badge}
      <span className="break-keep">
        {SAMPLE_NOTE}{' '}
        <span className="text-fg-muted">실제 결과는 새 평가를 실행해야 만들어집니다.</span>
      </span>
    </div>
  );
}
