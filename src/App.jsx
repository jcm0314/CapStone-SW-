import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import EvaluationCriteria from './components/EvaluationCriteria';
import ApplicantInput from './components/ApplicantInput';
import DashboardSummary from './components/DashboardSummary';
import EvidenceViewer from './components/EvidenceViewer';
import InterviewQuestions from './components/InterviewQuestions';
import ApplicantComparison from './components/ApplicantComparison';
import ReportExporter from './components/ReportExporter';
import PromptStudioModal from './components/PromptStudioModal';
import ApiKeyModal from './components/ApiKeyModal';
import HITLEditorModal from './components/HITLEditorModal';
import DepartmentCreditDashboard from './components/DepartmentCreditDashboard';
import ShareModal from './components/ShareModal';
import InterviewerCollaborationPanel from './components/InterviewerCollaborationPanel';
import CandidateFeedbackModal from './components/CandidateFeedbackModal';
import SampleBadge from './components/SampleBadge';
import { isSampleResult } from './utils/sampleResult';

import { JOB_TEMPLATES } from './data/jobTemplates';
import { analyzeApplicant } from './services/aiEvaluator';
import { saveAnalysisToCache } from './services/cacheService';
import { getSharedEvaluation } from './services/shareService';
import { useTenant } from './contexts/TenantContext';
import { useAuth } from './contexts/AuthContext';
import confetti from 'canvas-confetti';
import { Lock, Link2, Printer, Info } from 'lucide-react';
import Hero from './components/Hero';
import Sidebar from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import { FEATURES, PLANNED_MESSAGE } from './data/featureCatalog';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { currentTenant, getTenantApplicants, saveTenantApplicants, switchTenant } = useTenant();
  const { currentUser, hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState('evaluator');
  const [currentJob, setCurrentJob] = useState(JOB_TEMPLATES[0]);
  const [applicantList, setApplicantList] = useState(() => getTenantApplicants());
  const [selectedApplicant, setSelectedApplicant] = useState(() => getTenantApplicants()[0] || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressState, setProgressState] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPromptStudio, setShowPromptStudio] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showHITLEditor, setShowHITLEditor] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCandidateFeedback, setShowCandidateFeedback] = useState(false);
  const [activeShareId, setActiveShareId] = useState(null);
  const [sharedBannerInfo, setSharedBannerInfo] = useState(null);

  // Restore shared evaluation from URL query parameter (?share=eval_xxxx)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const shareParam = urlParams.get('share');
    if (shareParam) {
      setActiveShareId(shareParam);
      getSharedEvaluation(shareParam)
        .then((payload) => {
          if (payload && payload.applicantSnapshot) {
            setSelectedApplicant(payload.applicantSnapshot);
            if (payload.tenantId && payload.tenantId !== currentTenant.id) {
              switchTenant(payload.tenantId);
            }
            setSharedBannerInfo({
              shareId: shareParam,
              createdBy: payload.createdBy?.name || '채용담당자',
              tenantId: payload.tenantId
            });
            setActiveTab('evaluator');
          }
        })
        .catch((err) => {
          console.warn('Failed to load shared eval:', err);
        });
    }
  }, []);

  // Sync state when Tenant switches (Multi-Tenancy Isolation)
  useEffect(() => {
    const tenantApps = getTenantApplicants();
    setApplicantList(tenantApps);
    if (!activeShareId) {
      setSelectedApplicant(tenantApps[0] || null);
    }
  }, [currentTenant.id]);

  // Analysis via Google Gemini API Only (No Local Fallbacks)
  const handleAnalyze = async ({ name, rawText }) => {
    if (!hasPermission('RUN_EVALUATION')) {
      alert(`[권한 제한] 현재 계정(${currentUser.roleTitle})은 면접관(Interviewer) 권한으로, 서류 업로드 및 AI 평가 가동 권한이 없습니다. 상단 프로필에서 Recruiter 또는 Admin으로 전환해주세요.`);
      return;
    }

    const currentApiKey = (
      (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : '') ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      ''
    ).trim();

    // B2B 일괄 결제 모드: 커스텀 키(BYOK)가 없으면 백엔드 게이트웨이가 기업 공용 토큰으로 일괄 결제/평가
    const isB2BManagedMode = !currentApiKey || currentApiKey.length < 5;
    const effectiveApiKey = isB2BManagedMode ? '' : currentApiKey;

    setIsAnalyzing(true);
    setProgressState({ percent: 10, status: 'Google Gemini AI 분석 파이프라인 가동 중...' });

    try {
      const newResult = await analyzeApplicant({
        name,
        applyJobId: currentJob.id,
        rawText,
        apiKey: effectiveApiKey,
        onProgress: (p) => setProgressState(p)
      });

      // Attach tenant ID for RLS
      const tenantBoundResult = {
        ...newResult,
        orgId: currentTenant.id
      };

      // Add to list and select as current
      const updatedList = [tenantBoundResult, ...applicantList.filter(a => a.id !== tenantBoundResult.id)];
      setApplicantList(updatedList);
      setSelectedApplicant(tenantBoundResult);
      saveTenantApplicants(updatedList);

      // Trigger celebration confetti if high score
      if (tenantBoundResult.analysis?.summary?.totalScore >= 88) {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error("Gemini AI Analysis failed:", err);
      alert(`[Gemini 평가 실패] ${err.message || '서류 분석 도중 오류가 발생했습니다.'}`);
      if (err.message && (err.message.includes('API 키') || err.message.includes('API_KEY'))) {
        setShowApiKeyModal(true);
      }
    } finally {
      setIsAnalyzing(false);
      setProgressState(null);
    }
  };

  // Batch evaluation handler for multiple uploaded files
  const handleBatchAnalyze = async (candidates) => {
    if (!hasPermission('RUN_EVALUATION')) {
      alert(`[권한 제한] 현재 계정(${currentUser.roleTitle})은 서류 업로드 및 AI 평가 가동 권한이 없습니다.`);
      return;
    }

    const currentApiKey = (
      (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : '') ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      ''
    ).trim();

    const isB2BManagedMode = !currentApiKey || currentApiKey.length < 5;
    const effectiveApiKey = isB2BManagedMode ? '' : currentApiKey;

    setIsAnalyzing(true);
    const newEvaluatedApplicants = [];

    try {
      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        setProgressState({
          percent: Math.round(((i + 0.3) / candidates.length) * 100),
          status: `[대량 일괄 심사 ${i + 1}/${candidates.length}] ${c.name} 지원서 4대 에이전트 평가 중...`
        });

        const result = await analyzeApplicant({
          name: c.name,
          applyJobId: currentJob.id,
          rawText: c.rawText,
          apiKey: effectiveApiKey
        });

        const tenantBound = {
          ...result,
          orgId: currentTenant.id
        };
        newEvaluatedApplicants.push(tenantBound);
      }

      // Merge and sort by total score descending (Top Ranking)
      const updatedList = [
        ...newEvaluatedApplicants,
        ...applicantList.filter(a => !newEvaluatedApplicants.some(na => na.id === a.id))
      ].sort((a, b) => (b.analysis?.summary?.totalScore || 0) - (a.analysis?.summary?.totalScore || 0));

      setApplicantList(updatedList);
      if (newEvaluatedApplicants.length > 0) {
        setSelectedApplicant(newEvaluatedApplicants[0]);
      }
      saveTenantApplicants(updatedList);

      // Auto switch to comparison tab for ranking review
      setActiveTab('comparison');

      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error("Batch Analysis failed:", err);
      alert(`[일괄 평가 실패] ${err.message || '대량 서류 분석 도중 오류가 발생했습니다.'}`);
    } finally {
      setIsAnalyzing(false);
      setProgressState(null);
    }
  };

  // Human-in-the-Loop (HITL) Score & Evidence Calibration Save Handler
  const handleSaveHITL = async ({ updatedAnalysis, reviewerNote }) => {
    if (!selectedApplicant) return;

    const originalDraft = selectedApplicant.originalAnalysis || selectedApplicant.analysis;

    const calibratedApplicant = {
      ...selectedApplicant,
      orgId: currentTenant.id,
      originalAnalysis: originalDraft, // Preserve AI original draft for rollback
      analysis: updatedAnalysis,
      isHumanVerified: true,
      lastEditedAt: new Date().toISOString(),
      reviewerNote: reviewerNote || selectedApplicant.reviewerNote || `${currentUser.name} (${currentUser.roleTitle}) 보정 완료`
    };

    // Update in memory state
    setSelectedApplicant(calibratedApplicant);
    const updatedList = applicantList.map(app => (app.id === calibratedApplicant.id ? calibratedApplicant : app));
    setApplicantList(updatedList);
    saveTenantApplicants(updatedList);

    // Persist calibrated data to IndexedDB cache
    try {
      await saveAnalysisToCache(calibratedApplicant.rawText, calibratedApplicant.applyJobId, calibratedApplicant);
    } catch (cacheErr) {
      console.warn("Failed to persist HITL changes to cache:", cacheErr);
    }
  };

  // Rollback to original AI draft
  const handleRevertHITL = async () => {
    if (!selectedApplicant || !selectedApplicant.originalAnalysis) return;

    // Drop HITL-only metadata so the record is identical to the original AI draft
    const { originalAnalysis, lastEditedAt, ...rest } = selectedApplicant;
    const revertedApplicant = {
      ...rest,
      orgId: currentTenant.id,
      analysis: originalAnalysis,
      isHumanVerified: false,
      reviewerNote: ''
    };

    setSelectedApplicant(revertedApplicant);
    const updatedList = applicantList.map(app => (app.id === revertedApplicant.id ? revertedApplicant : app));
    setApplicantList(updatedList);
    // Persist to tenant storage (same path as handleSaveHITL) so the rollback survives reload
    saveTenantApplicants(updatedList);

    try {
      await saveAnalysisToCache(revertedApplicant.rawText, revertedApplicant.applyJobId, revertedApplicant);
    } catch (cacheErr) {
      console.warn("Failed to revert cache:", cacheErr);
    }
  };

  // ───────────────────────── 화면 이동 · 기능 메뉴 · ⌘K 검색 (UI 전용 상태) ─────────────────────────
  const { theme, toggleTheme } = useTheme();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSSOModal, setShowSSOModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [inputTabRequest, setInputTabRequest] = useState(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsMenuOpen(false);
        setIsPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const id = window.setTimeout(() => setToastMessage(''), 2600);
    return () => window.clearTimeout(id);
  }, [toastMessage]);

  const scrollToSection = (sectionId, tab = 'evaluator') => {
    const run = () => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (activeTab !== tab) {
      setActiveTab(tab);
      window.setTimeout(run, 60);
    } else {
      run();
    }
  };

  const navigateTab = (tab) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const requireApplicant = (fn) => {
    if (!selectedApplicant) {
      setToastMessage('먼저 지원자를 선택하거나 평가를 실행해 주세요.');
      return;
    }
    fn();
  };

  const handleSelectFeature = (item) => {
    setIsPaletteOpen(false);
    setIsMenuOpen(false);
    if (item.status === 'planned') {
      setToastMessage(`‘${item.title}’ — ${PLANNED_MESSAGE}`);
      return;
    }
    const action = item.action || {};
    switch (action.type) {
      case 'tab':
        navigateTab(action.tab);
        break;
      case 'scroll':
        requireApplicant(() => scrollToSection(action.target, action.tab));
        break;
      case 'upload':
        setInputTabRequest({ tab: 'FILE', at: Date.now() });
        scrollToSection('section-input');
        break;
      case 'modal':
        if (action.modal === 'profile') setShowSSOModal(true);
        if (action.modal === 'hitl') requireApplicant(() => setShowHITLEditor(true));
        if (action.modal === 'share') requireApplicant(() => setShowShareModal(true));
        if (action.modal === 'report') requireApplicant(() => setShowExportModal(true));
        if (action.modal === 'feedback') requireApplicant(() => setShowCandidateFeedback(true));
        break;
      case 'theme':
        toggleTheme();
        break;
      case 'prompt':
        setShowPromptStudio(true);
        break;
      default:
        break;
    }
  };

  const canSeeCredits = hasPermission('MANAGE_CREDITS');
  const paletteItems = [
    { id: 'nav-evaluator', group: '화면', icon: 'FileText', title: '서류 평가', desc: '자소서 입력 · 평가 결과', keywords: '홈 메인 평가', action: { type: 'tab', tab: 'evaluator' } },
    { id: 'nav-comparison', group: '화면', icon: 'Users', title: '지원자 비교', desc: `지원자 ${applicantList.length}명`, keywords: '비교 순위', action: { type: 'tab', tab: 'comparison' } },
    ...(canSeeCredits
      ? [{ id: 'nav-credits', group: '화면', icon: 'Gauge', title: '크레딧 관리', desc: '부서별 AI 사용량 · 한도', keywords: '크레딧 비용 사용량 쿼터', action: { type: 'tab', tab: 'credits' } }]
      : []),
    ...FEATURES.filter((f) => f.status === 'ready').map((f) => ({ ...f, group: '기능' })),
    ...FEATURES.filter((f) => f.status === 'planned').map((f) => ({ ...f, group: '준비 중' })),
    { id: 'set-theme', group: '설정', icon: theme === 'dark' ? 'Sun' : 'Moon', title: theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환', desc: '화면 테마', keywords: '테마 다크 라이트 dark light 모드', action: { type: 'theme' } },
    ...(hasPermission('MANAGE_API_KEYS')
      ? [{ id: 'set-prompt', group: '설정', icon: 'SlidersHorizontal', title: '평가 프롬프트 설정', desc: '회사별 평가 기준 문구 편집', keywords: '프롬프트 스튜디오 prompt studio', action: { type: 'prompt' } }]
      : [])
  ];

  const sidebarProps = {
    activeTab,
    onNavigate: navigateTab,
    applicantCount: applicantList.length,
    canSeeCredits,
    onSelectFeature: handleSelectFeature,
    onOpenPalette: () => {
      setIsMenuOpen(false);
      setIsPaletteOpen(true);
    },
    theme,
    onToggleTheme: toggleTheme
  };

  const TABS = [
    { id: 'evaluator', label: '서류 평가' },
    { id: 'comparison', label: `지원자 비교 ${applicantList.length}` },
    ...(canSeeCredits ? [{ id: 'credits', label: '크레딧' }] : [])
  ];

  return (
    <div className="min-h-screen bg-canvas text-fg font-sans">
      <Header
        onOpenPromptStudio={() => setShowPromptStudio(true)}
        onOpenApiKeyModal={() => setShowApiKeyModal(true)}
        onOpenPalette={() => setIsPaletteOpen(true)}
        onOpenMenu={() => setIsMenuOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        showSSOModal={showSSOModal}
        setShowSSOModal={setShowSSOModal}
      />

      <div className="flex">
        <Sidebar {...sidebarProps} />

        <main className="flex-1 min-w-0">
          <div className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-28 space-y-6">
            {/* 모바일/태블릿 화면 전환 */}
            <div className="lg:hidden flex p-1 rounded-xl bg-muted/70 border border-line text-[13px] font-semibold" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t.id}
                  onClick={() => navigateTab(t.id)}
                  className={`flex-1 py-2 rounded-lg transition-colors ${
                    activeTab === t.id ? 'bg-surface text-fg shadow-card' : 'text-fg-muted'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* 공유 링크(?share=...)로 들어온 경우 */}
            {sharedBannerInfo && (
              <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-brand-line bg-brand-soft">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-surface border border-brand-line text-brand-fg flex items-center justify-center shrink-0">
                    <Link2 className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg flex flex-wrap items-center gap-2">
                      공유받은 평가서를 보고 있습니다
                      <span className="chip chip-neutral font-mono">{sharedBannerInfo.shareId}</span>
                    </p>
                    <p className="text-[13px] text-fg-muted mt-0.5">
                      보낸 사람 <strong className="text-fg font-semibold">{sharedBannerInfo.createdBy}</strong> · 형광펜 원문과 면접 질문, 메모가 함께 공유됩니다.
                    </p>
                    {isSampleResult(selectedApplicant) && (
                      <div className="mt-1.5 flex items-center gap-2 text-[12px] text-fg-muted">
                        <SampleBadge />
                        <span>공유된 평가서는 AI를 실행하지 않은 예시 결과입니다.</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSharedBannerInfo(null);
                    setActiveShareId(null);
                    window.history.replaceState({}, '', window.location.pathname);
                  }}
                  className="btn btn-secondary btn-md shrink-0"
                >
                  내 목록으로 돌아가기
                </button>
              </div>
            )}

            {activeTab === 'evaluator' && (
              <div className="space-y-6">
                {!sharedBannerInfo && (
                  <Hero
                    onStart={() => scrollToSection('section-input')}
                    onSeeEvidence={() => requireApplicant(() => scrollToSection('section-evidence'))}
                  />
                )}

                {/* 1. 평가 설정 */}
                <section id="section-input" className="scroll-mt-20 space-y-3">
                  <SectionHeading
                    step="1"
                    title="평가하기"
                    desc="직무와 역량 가중치를 고르고, 자기소개서를 넣은 뒤 평가를 실행하세요."
                  />
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-start">
                    <div className="xl:col-span-5 order-2 xl:order-1">
                      <EvaluationCriteria
                        currentJob={currentJob}
                        setCurrentJob={setCurrentJob}
                        onCriteriaChange={(job) => setCurrentJob(job)}
                      />
                    </div>
                    <div className="xl:col-span-7 order-1 xl:order-2 space-y-3">
                      {currentUser.role === 'INTERVIEWER' && (
                        <div className="card p-3.5 flex items-start sm:items-center justify-between gap-3 text-[13px]">
                          <div className="flex items-start gap-2.5">
                            <Lock className="w-4 h-4 text-fg-subtle mt-0.5 shrink-0" />
                            <div>
                              <p className="font-semibold text-fg">면접관 계정은 조회 전용입니다</p>
                              <p className="text-fg-muted mt-0.5">
                                서류 업로드와 AI 평가 실행은 채용 담당자·관리자만 할 수 있습니다. 형광펜 원문과 면접 질문은 그대로 볼 수 있어요.
                              </p>
                            </div>
                          </div>
                          <span className="chip chip-neutral shrink-0">조회 전용</span>
                        </div>
                      )}
                      <ApplicantInput
                        onAnalyze={handleAnalyze}
                        onBatchAnalyze={handleBatchAnalyze}
                        isAnalyzing={isAnalyzing}
                        progressState={progressState}
                        currentJobId={currentJob.id}
                        tabRequest={inputTabRequest}
                      />
                    </div>
                  </div>
                </section>

                {/* 2. 평가 결과 */}
                {selectedApplicant && (
                  <section className="space-y-3">
                    <SectionHeading
                      step="2"
                      title="평가 결과"
                      desc="형광펜이 칠해진 문장을 누르면 그 문장이 왜 점수에 반영됐는지 근거 카드에서 바로 확인할 수 있습니다."
                    />
                    <div id="section-summary" className="scroll-mt-20">
                      <DashboardSummary
                        result={selectedApplicant}
                        currentJob={currentJob}
                        onOpenHITLEditor={() => setShowHITLEditor(true)}
                        onOpenShareModal={() => setShowShareModal(true)}
                        onOpenCandidateFeedback={() => setShowCandidateFeedback(true)}
                      />
                    </div>
                    <div id="section-evidence" className="scroll-mt-20">
                      <EvidenceViewer result={selectedApplicant} />
                    </div>
                    <div id="section-questions" className="scroll-mt-20">
                      <InterviewQuestions result={selectedApplicant} />
                    </div>
                    <div id="section-collab" className="scroll-mt-20">
                      <InterviewerCollaborationPanel applicant={selectedApplicant} shareId={activeShareId} />
                    </div>
                  </section>
                )}
              </div>
            )}

            {activeTab === 'comparison' && (
              <ApplicantComparison
                applicants={applicantList}
                onSelectApplicant={(app) => {
                  setSelectedApplicant(app);
                  setActiveTab('evaluator');
                }}
                onOpenExport={(app) => {
                  setSelectedApplicant(app);
                  setShowExportModal(true);
                }}
              />
            )}

            {activeTab === 'credits' && <DepartmentCreditDashboard />}
          </div>
        </main>
      </div>

      {/* 평가 보고서 출력 (평가 화면) */}
      {selectedApplicant && activeTab === 'evaluator' && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 no-print">
          <button
            onClick={() => setShowExportModal(true)}
            className="btn btn-primary px-4 py-3 rounded-full shadow-pop"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">평가 보고서 출력</span>
            <span className="sm:hidden">보고서</span>
          </button>
        </div>
      )}

      {/* 안내 토스트 (준비 중 기능 등) */}
      {toastMessage && (
        <div
          role="status"
          className="toast-in fixed left-1/2 -translate-x-1/2 bottom-20 sm:bottom-8 z-[70] max-w-[92vw] px-4 py-2.5 rounded-xl bg-fg text-canvas text-[13px] font-medium shadow-pop flex items-center gap-2"
        >
          <Info className="w-4 h-4 shrink-0" />
          {toastMessage}
        </div>
      )}

      {isMenuOpen && <Sidebar variant="drawer" {...sidebarProps} onClose={() => setIsMenuOpen(false)} />}

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        items={paletteItems}
        onSelect={handleSelectFeature}
      />

      {/* Report Exporter Modal */}
      {showExportModal && selectedApplicant && (
        <ReportExporter
          result={selectedApplicant}
          currentJob={currentJob}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Custom HR Prompt Studio Modal */}
      {showPromptStudio && (
        <PromptStudioModal
          onClose={() => setShowPromptStudio(false)}
          onSaved={() => setShowPromptStudio(false)}
        />
      )}

      {/* Google Gemini API Key Setup Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
      />

      {/* Human-in-the-Loop (HITL) Calibration Modal */}
      {showHITLEditor && selectedApplicant && (
        <HITLEditorModal
          isOpen={showHITLEditor}
          onClose={() => setShowHITLEditor(false)}
          result={selectedApplicant}
          currentJob={currentJob}
          onSave={handleSaveHITL}
          onRevert={handleRevertHITL}
        />
      )}

      {/* Multi-Interviewer Real-time Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        applicant={selectedApplicant}
        onShareCreated={(newShareId) => setActiveShareId(newShareId)}
      />

      {/* Candidate Growth Feedback Modal (ESG / B2B2C) */}
      <CandidateFeedbackModal
        isOpen={showCandidateFeedback}
        onClose={() => setShowCandidateFeedback(false)}
        result={selectedApplicant}
        currentJob={currentJob}
        tenantName={currentTenant?.name}
      />
    </div>
  );
}

function SectionHeading({ step, title, desc }) {
  return (
    <div className="flex items-start gap-3 px-1">
      <span className="mt-0.5 w-6 h-6 rounded-full bg-fg text-canvas text-[12px] font-bold flex items-center justify-center shrink-0">
        {step}
      </span>
      <div>
        <h2 className="text-[17px] font-bold tracking-[-0.02em] text-fg">{title}</h2>
        <p className="text-[13px] text-fg-muted mt-0.5 break-keep">{desc}</p>
      </div>
    </div>
  );
}
