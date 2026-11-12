import React from 'react';
import { ArrowRight, Highlighter, MessagesSquare, ListChecks } from 'lucide-react';

/** 메인 소개 영역: 핵심 기능(근거 문장 형광펜)을 예시 화면과 함께 보여 줍니다. */
export default function Hero({ onStart, onSeeEvidence }) {
  return (
    <section aria-labelledby="hero-title" className="card overflow-hidden">
      <div className="grid lg:grid-cols-[1fr_1.05fr]">
        {/* Copy */}
        <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
          <span className="chip chip-brand self-start">
            <Highlighter className="w-3 h-3" /> 근거 문장 형광펜
          </span>
          <h1
            id="hero-title"
            className="mt-4 text-[26px] sm:text-[30px] lg:text-[34px] leading-[1.25] font-bold tracking-[-0.03em] text-fg break-keep"
          >
            자소서를 붙여 넣으면
            <br className="hidden sm:block" /> AI가 평가 근거가 된 문장에
            <br className="hidden sm:block" /> <span className="hl hl-warn cursor-default">형광펜을 칠해 줍니다</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-fg-muted break-keep max-w-[460px]">
            점수만 알려 주지 않습니다. 어떤 문장 때문에 그 점수가 나왔는지 원문에서 바로 확인하고,
            확인이 필요한 문장으로 면접 질문까지 이어서 받아 보세요.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={onStart} className="btn btn-primary btn-lg">
              평가 시작하기 <ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={onSeeEvidence} className="btn btn-secondary btn-lg">
              예시 결과 보기
            </button>
          </div>

          <ol className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[13px]">
            {[
              { n: 1, icon: ListChecks, t: '직무 · 가중치 선택' },
              { n: 2, icon: Highlighter, t: '자소서 붙여 넣기' },
              { n: 3, icon: MessagesSquare, t: '근거 · 면접 질문 확인' }
            ].map((s) => (
              <li key={s.n} className="flex items-center gap-2 text-fg-muted">
                <span className="w-5 h-5 rounded-full bg-subtle border border-line text-[11px] font-semibold text-fg flex items-center justify-center shrink-0">
                  {s.n}
                </span>
                {s.t}
              </li>
            ))}
          </ol>
        </div>

        {/* Preview */}
        <div className="relative bg-subtle border-t lg:border-t-0 lg:border-l border-line p-5 sm:p-8 flex items-center">
          <div className="w-full max-w-[520px] mx-auto">
            <div className="flex items-center justify-between mb-2 text-[11px] text-fg-subtle">
              <span>예시 화면</span>
              <span className="flex items-center gap-3">
                <Legend tone="ok" label="긍정 근거" />
                <Legend tone="warn" label="면접 확인" />
                <Legend tone="bad" label="리스크" />
              </span>
            </div>

            <div className="bg-surface border border-line rounded-xl shadow-card p-4 sm:p-5">
              <p className="text-[11px] font-semibold text-fg-subtle mb-2">자기소개서 원문</p>
              <p className="text-[14px] leading-[1.9] text-fg break-keep">
                결제 시스템의 응답 속도가 3.2초로 느려 이탈이 많았습니다.{' '}
                <span className="hl hl-ok">Redis 캐싱을 도입해 응답 속도를 0.42초로 86.8% 줄였습니다.</span>{' '}
                트래픽이 몰린 행사 기간에는{' '}
                <span className="hl hl-warn">서킷 브레이커와 분산 락을 직접 구현했습니다.</span>{' '}
                <span className="hl hl-bad">열정과 끈기로 최고의 시너지를 내겠습니다.</span>
              </p>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <PreviewCard tone="ok" badge="+15점" title="수치로 증명한 성능 개선" />
              <PreviewCard tone="warn" badge="면접 확인" title="본인이 맡은 범위 질문" />
              <PreviewCard tone="bad" badge="근거 부족" title="추상적인 다짐 표현" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const TONE = {
  ok: { dot: 'bg-[rgb(var(--hl-ok))]', chip: 'chip-ok' },
  warn: { dot: 'bg-[rgb(var(--hl-warn))]', chip: 'chip-warn' },
  bad: { dot: 'bg-[rgb(var(--hl-bad))]', chip: 'chip-bad' }
};

function Legend({ tone, label }) {
  return (
    <span className="hidden sm:inline-flex items-center gap-1">
      <span className={`w-2.5 h-2.5 rounded-sm ${TONE[tone].dot}`} />
      {label}
    </span>
  );
}

function PreviewCard({ tone, badge, title }) {
  return (
    <div className="bg-surface border border-line rounded-lg px-3 py-2.5">
      <span className={`chip ${TONE[tone].chip}`}>{badge}</span>
      <p className="mt-1.5 text-[12px] leading-snug text-fg-muted break-keep">{title}</p>
    </div>
  );
}
