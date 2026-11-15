import React, { useState } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Search,
  CheckCircle2,
  Users,
  ArrowRight,
  Play,
  FileText,
  Lock,
  Cpu,
  Database,
  AlertTriangle,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';

const SAMPLE_PREVIEWS = [
  {
    id: 'backend',
    chip: '백엔드 성능 개선 사례',
    role: '백엔드 엔지니어',
    snippet: 'Redis 캐싱 도입으로 주문 API 응답 속도를 3.2초에서 0.42초로 86.8% 단축했습니다.',
    score: 92,
    decision: '통과 추천',
    risk: '12% (낮음)',
    evidences: [
      { label: '수치 기반 검증', text: '응답 속도 3.2s → 0.42s (86.8% 단축) 정량 지표 명확' },
      { label: 'PII 비식별화', text: '성명·학교·연락처 7종 로컬 마스킹 완료' }
    ],
    question: 'Redis 장애 시 캐시 스탬피드(Cache Stampede)를 어떤 전략으로 방어하셨나요?'
  },
  {
    id: 'exaggerated',
    chip: '과장된 AI 프로젝트 사례',
    role: 'AI / ML 엔지니어',
    snippet: '최신 LLM 모델을 단독으로 100% 바닥부터 학습시켜 정확도 99.9%를 달성했습니다.',
    score: 64,
    decision: '보류 (검증 필요)',
    risk: '78% (과장 의심)',
    evidences: [
      { label: 'Critic 반박 지적', text: '학부 프로젝트 규모에서 LLM 단독 사전학습 및 99.9% 정확도 과장 의심' },
      { label: '모순 탐지', text: '학습 데이터셋 규모·GPU 자원 근거 누락' }
    ],
    question: '모델을 스크래치부터 학습하셨다면 사용한 파라미터 수와 GPU 클러스터 사양을 설명해주세요.'
  },
  {
    id: 'frontend',
    chip: '실무 트러블슈팅 사례',
    role: '프론트엔드 엔지니어',
    snippet: '10,000건 지원자 리스트 렌더링 지연을 react-window 가상 스크롤로 16ms 이내로 해결했습니다.',
    score: 89,
    decision: '면접 추천',
    risk: '18% (낮음)',
    evidences: [
      { label: '성능 근거 매칭', text: 'DOM 노드 수 감소 및 60fps(16ms) 유지 근거 일치' },
      { label: '직무 적합도', text: '대용량 B2B 대시보드 최적화 경험 검증됨' }
    ],
    question: '가변 높이 행(Row)이 포함된 목록에서 스크롤 점프 현상은 어떻게 처리하셨나요?'
  }
];

const SHOWCASE_CARDS = [
  {
    tag: '4-Agent 팩트체크',
    title: '수치 기반 성과 자동 발췌',
    subtitle: '백엔드 엔지니어 · 종합 92점',
    metric: '과장 위험도 12% · 통과 추천',
    quote: '"주문 API 응답 3.2초 → 0.42초(86.8% 단축)"',
    accent: 'from-blue-600 to-indigo-600'
  },
  {
    tag: 'Critic 적대적 감사',
    title: '부풀려진 기여도·모순 적발',
    subtitle: 'AI 엔지니어 · 종합 64점',
    metric: '과장 의심 2건 탐지 · 압박 질문 생성',
    quote: '"100% 단독 개발 주장 — 팀 기여도 검증 필요"',
    accent: 'from-rose-500 to-orange-500'
  },
  {
    tag: '7종 PII 로컬 마스킹',
    title: '학벌·신상 100% 블라인드',
    subtitle: '프론트엔드 · 비식별화 완료',
    metric: '이메일·연락처·학교명 로컬 자동 치환',
    quote: '"[학교명 익명화] 컴퓨터공학과 졸업"',
    accent: 'from-emerald-500 to-teal-600'
  },
  {
    tag: 'HITL & 실시간 공유',
    title: '면접관 1-Click 링크 협업',
    subtitle: '프로덕트 매니저 · 합의 완료',
    metric: '점수 보정 + 실시간 코멘트 동기화',
    quote: '"면접관 3인 최종 점수 88점 합의 완료"',
    accent: 'from-violet-600 to-purple-600'
  }
];

const TECH_MARQUEE = [
  'React 18',
  'Spring Boot 3',
  'Claude AI',
  'Supabase RLS',
  'Cloudflare Zero-Trust',
  'Express BFF',
  'Web Worker Fuzzy Match',
  'Tailwind CSS'
];

export default function LandingPage({ onEnterWorkspace, onSelectApplicant }) {
  const [selectedSampleId, setSelectedSampleId] = useState('backend');
  const [customInput, setCustomInput] = useState(SAMPLE_PREVIEWS[0].snippet);
  const [isSimulating, setIsSimulating] = useState(false);

  const activePreview =
    SAMPLE_PREVIEWS.find((item) => item.id === selectedSampleId) || SAMPLE_PREVIEWS[0];

  const handleSelectSample = (sample) => {
    setSelectedSampleId(sample.id);
    setCustomInput(sample.snippet);
  };

  const handleRunMiniDemo = (e) => {
    e.preventDefault();
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 650);
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* =====================================================================
          1. 상단 고정 GNB (sigmine.ai 스타일)
         ===================================================================== */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 rounded-lg bg-[#4F6EF7] flex items-center justify-center text-white font-black text-base shadow-sm">
              C
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">
              CHECK-MATE
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[15px] font-semibold text-slate-600">
            <button onClick={() => scrollToSection('showcase')} className="hover:text-slate-900 transition-colors">
              검증 리포트
            </button>
            <button onClick={() => scrollToSection('interactive-demo')} className="hover:text-slate-900 transition-colors">
              직접 체험하기
            </button>
            <button onClick={() => scrollToSection('pain-points')} className="hover:text-slate-900 transition-colors">
              도입 효과
            </button>
            <button onClick={() => onEnterWorkspace('evaluator')} className="hover:text-slate-900 transition-colors">
              체크메이트 사용하기
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onEnterWorkspace('evaluator')}
              className="px-5 py-2.5 rounded-xl bg-[#4F6EF7] hover:bg-[#3B5BDB] text-white text-sm font-bold shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              무료로 시작하기
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. HERO SECTION (파스텔 블루-라벤더 그라데이션 + 플로팅 대시보드)
         ===================================================================== */}
      <section
        className="relative overflow-hidden pt-20 pb-24 px-6"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, #FFFFFF 0%, #EEF2FF 45%, #C7D2FE 85%, #A5B4FC 100%)'
        }}
      >
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* 2줄 대형 헤드카피 */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.18] text-slate-900">
            <span className="block bg-gradient-to-r from-[#4F6EF7] to-[#6366F1] bg-clip-text text-transparent">
              그냥 밤새 읽을까,
            </span>
            <span className="block mt-1">고민할 시간에 검증하세요.</span>
          </h1>

          {/* 노란 형광펜 서브 카피 */}
          <div className="mt-6 flex justify-center">
            <p className="inline-block text-xl sm:text-2xl font-extrabold text-slate-900 bg-[#FDE047] px-3 py-0.5 rounded-sm shadow-xs">
              서류 1건 검토, 1.5분이면 끝납니다.
            </p>
          </div>

          {/* CTA 버튼 2종 */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onEnterWorkspace('evaluator')}
              className="px-7 py-3.5 rounded-2xl bg-[#4F6EF7] hover:bg-[#3B5BDB] text-white font-bold text-base shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              워크스페이스 시작하기
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollToSection('interactive-demo')}
              className="px-7 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-[#4F6EF7] font-bold text-base border border-blue-100 shadow-md transition-all cursor-pointer"
            >
              당장 한 건 검증해보기
            </button>
          </div>

          <p className="mt-4 text-sm font-medium text-slate-600">
            접수 · 7종 PII 마스킹 · 4-Agent 교차검증 · 실시간 면접 채점까지 한 번에.
          </p>

          {/* 6개 핵심 기능 Pill 배지 */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 max-w-3xl mx-auto">
            {[
              { label: '7종 PII 마스킹', dot: 'bg-rose-500' },
              { label: '4-Agent 교차검증', dot: 'bg-emerald-500' },
              { label: 'Fuzzy 원문매칭', dot: 'bg-slate-900' },
              { label: 'HITL 점수보정', dot: 'bg-blue-600' },
              { label: '실시간 면접협업', dot: 'bg-red-500' },
              { label: 'PostgreSQL RLS', dot: 'bg-indigo-600' }
            ].map((pill) => (
              <span
                key={pill.label}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 border border-slate-200/80 text-xs sm:text-sm font-bold text-slate-700 shadow-xs"
              >
                <span className={`w-2 h-2 rounded-full ${pill.dot}`} />
                {pill.label}
              </span>
            ))}
          </div>
        </div>

        {/* 플로팅 Check-Mate 대시보드 미리보기 창 */}
        <div className="max-w-5xl mx-auto mt-12 relative z-10">
          <div
            onClick={() => onEnterWorkspace('evaluator')}
            className="group cursor-pointer rounded-2xl bg-white border border-slate-200/90 shadow-2xl shadow-indigo-950/15 overflow-hidden transition-transform duration-300 hover:-translate-y-1"
          >
            {/* 브라우저 상단 바 */}
            <div className="h-10 bg-slate-50 border-b border-slate-200 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs font-semibold text-slate-400">
                  checkmate.workspace / 백엔드 엔지니어 평가 리포트
                </span>
              </div>
              <span className="text-xs font-bold text-[#4F6EF7] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                실제 대시보드 열기 <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* 실제 워크스페이스 미니어처 레이아웃 */}
            <div className="grid grid-cols-12 bg-white min-h-[340px]">
              {/* 좌측 사이드바 미니어처 */}
              <div className="col-span-3 border-r border-slate-100 bg-slate-50/70 p-4 hidden sm:flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 px-2">워크스페이스</div>
                  <div className="px-3 py-2 rounded-lg bg-[#4F6EF7] text-white text-xs font-bold flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" /> AI 서류 팩트체크
                  </div>
                  <div className="px-3 py-2 rounded-lg text-slate-600 text-xs font-semibold flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> 지원자 대시보드 (4)
                  </div>
                  <div className="px-3 py-2 rounded-lg text-slate-600 text-xs font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5" /> 7종 PII 블라인드
                  </div>
                  <div className="px-3 py-2 rounded-lg text-slate-600 text-xs font-semibold flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" /> 역량 비교 분석
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-500">
                  <div className="font-bold text-slate-700">PostgreSQL RLS 격리</div>
                  <div>테넌트 보안 활성화됨</div>
                </div>
              </div>

              {/* 중앙 원문 + 우측 AI 분석 미니어처 */}
              <div className="col-span-12 sm:col-span-9 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">자기소개서 원문 (블라인드 적용)</span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      7종 PII 보호됨
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    안녕하세요. <span className="bg-slate-200 text-slate-700 px-1 rounded font-mono">[성명 익명화]</span>입니다.
                    지난 3년간 E-커머스 결제 시스템을 담당했습니다. 초기 <span className="bg-amber-200/80 text-slate-900 px-1 rounded font-semibold">주문 API 평균 응답 속도가 3.2초로 느려 고객 이탈이 발생</span>했으나,{' '}
                    <span className="bg-emerald-200/70 text-slate-900 px-1 rounded font-semibold">Redis 인메모리 캐싱을 도입해 0.42초로 86.8% 단축</span>했습니다.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-500">4-Agent 교차 검증 결과</div>
                      <div className="text-2xl font-black text-slate-900">92 <span className="text-xs font-semibold text-slate-400">/ 100점</span></div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                      통과 추천
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-slate-700">
                    <div className="font-bold text-blue-800 mb-0.5">Fuzzy 오프셋 매칭 완료</div>
                    정량 성과(3.2s → 0.42s) 원문 좌표 바인딩됨
                  </div>
                  <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-200 text-xs text-slate-700">
                    <div className="font-bold text-purple-800 mb-0.5">추천 압박 면접 질문</div>
                    &quot;Redis 캐시 만료 시 DB 부하 급증(Cache Stampede)은 어떻게 방어했나요?&quot;
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. 기술 스택 & 아키텍처 마키 바
         ===================================================================== */}
      <div className="border-y border-slate-200 bg-white py-5 overflow-hidden">
        <div className="flex w-max animate-marquee gap-12 items-center">
          {[...TECH_MARQUEE, ...TECH_MARQUEE].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-slate-400 font-extrabold text-base tracking-tight whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-blue-400/70" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* =====================================================================
          4. 결과 쇼케이스 섹션 ("하나만 올리면, 이런 리포트가 나옵니다.")
         ===================================================================== */}
      <section id="showcase" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
              서류 하나만 올리면,
              <br />
              이런 리포트가 나옵니다.
            </h2>
            <p className="mt-3 text-base text-slate-500 font-medium">
              실제 Check-Mate 멀티에이전트가 도출하는 핵심 검증 결과입니다. 클릭해서 워크스페이스를 확인해 보세요.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SHOWCASE_CARDS.map((card, i) => (
              <div
                key={i}
                onClick={() => {
                  if (onSelectApplicant) onSelectApplicant(i);
                  onEnterWorkspace('evaluator');
                }}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between"
              >
                <div className={`h-44 bg-gradient-to-br ${card.accent} p-5 text-white flex flex-col justify-between relative`}>
                  <span className="inline-block w-fit px-2.5 py-1 rounded-md bg-black/25 backdrop-blur-xs text-[11px] font-bold">
                    {card.tag}
                  </span>
                  <div>
                    <div className="text-lg font-black leading-snug">{card.title}</div>
                    <div className="mt-2 text-xs font-medium text-white/90 bg-white/15 rounded-lg p-2 backdrop-blur-xs">
                      {card.quote}
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-white">
                  <div className="text-sm font-extrabold text-slate-900">{card.subtitle}</div>
                  <div className="text-xs text-slate-500 mt-1">{card.metric}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. 인터랙티브 즉시 체험 섹션 ("고민되시나요? 당장 한 건만 검증해보세요.")
         ===================================================================== */}
      <section id="interactive-demo" className="py-24 px-6 bg-[#F8FAFC] border-y border-slate-200/70">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* 좌측 입력 & 샘플 선택 */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-sm font-bold text-[#4F6EF7]">직접 확인해보세요</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
                고민되시나요?
                <br />
                <span className="text-[#4F6EF7]">당장 한 건만 검증해보세요.</span>
              </h2>
              <p className="mt-3 text-slate-600 text-base leading-relaxed">
                자소서 문장을 선택하거나 입력하면 Check-Mate가 즉시 PII 비식별화, 과장 위험도 분석, 압박 면접 질문을 도출합니다.
              </p>
            </div>

            <form onSubmit={handleRunMiniDemo} className="space-y-3">
              <textarea
                rows={3}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                placeholder="검증할 자기소개서 성과 문장을 입력해보세요..."
              />
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-[#4F6EF7] hover:bg-[#3B5BDB] text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  {isSimulating ? '분석 중...' : 'AI 팩트체크 미리보기'}
                </button>
                <button
                  type="button"
                  onClick={() => onEnterWorkspace('evaluator')}
                  className="px-5 py-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all cursor-pointer"
                >
                  실제 서비스에서 분석하기
                </button>
              </div>
            </form>

            {/* 샘플 선택 칩 */}
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PREVIEWS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    selectedSampleId === sample.id
                      ? 'bg-[#4F6EF7] text-white border-[#4F6EF7]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {sample.chip}
                </button>
              ))}
            </div>
          </div>

          {/* 우측 다크 리포트 프리뷰 카드 (sigmine.ai 다크 폰 프레임 감성) */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md rounded-3xl bg-[#0F172A] text-white p-6 shadow-2xl border border-slate-800 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                    Live Verification Preview
                  </span>
                  <div className="text-lg font-extrabold mt-0.5">{activePreview.role}</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-white">{activePreview.score}점</div>
                  <div className="text-xs font-bold text-emerald-400">{activePreview.decision}</div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-400">4-Agent 검증 포인트</div>
                {activePreview.evidences.map((ev, idx) => (
                  <div key={idx} className="rounded-xl bg-slate-800/80 border border-slate-700 p-3">
                    <div className="text-xs font-bold text-blue-300">{ev.label}</div>
                    <div className="text-xs text-slate-200 mt-1 leading-relaxed">{ev.text}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-indigo-950/70 border border-indigo-500/40 p-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-300 mb-1">
                  <span>자동 생성 압박 면접 질문</span>
                  <span className="text-amber-300">위험도 {activePreview.risk}</span>
                </div>
                <p className="text-xs text-white font-medium leading-relaxed">
                  &quot;{activePreview.question}&quot;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. Pain-Point 섹션 ("혹시 이런 상황, 익숙하지 않으신가요?")
         ===================================================================== */}
      <section id="pain-points" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
              혹시 이런 상황,
              <br />
              <span className="text-[#4F6EF7]">익숙하지 않으신가요?</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-500">
              괜찮습니다. 채용 검토가 오래 걸리는 건 담당자 잘못이 아닙니다.
              <br />
              파편화된 도구의 구조가 잘못됐을 뿐입니다.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                &quot;ChatGPT 복붙 자소서 300장, 언제 다 읽고 검증하죠?&quot;
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                건당 15~20분씩 밤늦게 정독하다 보면 정작 중요한 핵심 역량과 수치 검증을 놓치기 쉽습니다.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                &quot;100% 개발했다더니 면접에서 물어보니 아무것도 모르네요&quot;
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                부풀려진 기여도와 논리 모순을 서류 단계에서 걸러내지 못하면 면접 리소스가 그대로 낭비됩니다.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                &quot;이메일·노션·엑셀에 흩어진 면접 평가 취합이 너무 버겁습니다&quot;
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                서류 마스킹부터 AI 팩트체크, 면접관 실시간 채점 공유까지 이제 하나의 플랫폼에서 끝내세요.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center space-y-4">
            <p className="text-base font-bold text-slate-700">
              이 중 하나라도 해당된다면,{' '}
              <span className="text-[#4F6EF7]">Check-Mate는 팀을 위해 만들어졌습니다.</span>
            </p>
            <button
              onClick={() => onEnterWorkspace('evaluator')}
              className="px-8 py-4 rounded-2xl bg-[#4F6EF7] hover:bg-[#3B5BDB] text-white font-bold text-base shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
            >
              Check-Mate 워크스페이스 시작하기
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          7. 푸터
         ===================================================================== */}
      <footer className="bg-slate-950 text-slate-400 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2.5 text-white font-black">
            <div className="w-6 h-6 rounded bg-[#4F6EF7] flex items-center justify-center text-xs">C</div>
            <span>CHECK-MATE</span>
            <span className="text-slate-500 font-medium text-xs ml-2">올인원 HR AX 채용 코파일럿</span>
          </div>
          <div className="text-xs text-slate-500">
            Contact: 장천명 (jcm03141@gmail.com)
          </div>
        </div>
      </footer>
    </div>
  );
}
