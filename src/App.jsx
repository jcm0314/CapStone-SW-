import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import EvaluationCriteria from './components/EvaluationCriteria';
import ApplicantInput from './components/ApplicantInput';
import DashboardSummary from './components/DashboardSummary';
import EvidenceViewer from './components/EvidenceViewer';
import InterviewQuestions from './components/InterviewQuestions';
import ApplicantComparison from './components/ApplicantComparison';
import ReportExporter from './components/ReportExporter';
import PromptStudioModal from './components/PromptStudioModal';
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
import { Lock, Link2, Info, ChevronLeft } from 'lucide-react';
import ApplicantList from './components/ApplicantList';
import Sidebar from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import { FEATURES, PLANNED_MESSAGE } from './data/featureCatalog';
import { useTheme } from './hooks/useTheme';
import LandingPage from './components/LandingPage';

export default function App() {
  const { currentTenant, getTenantApplicants, saveTenantApplicants, switchTenant, applicantsVersion } = useTenant();
  const { currentUser, hasPermission } = useAuth();

  const [showLanding, setShowLanding] = useState(() => {
    if (typeof window === 'undefined') return true;
    const params = new URLSearchParams(window.location.search);
    return !params.get('share');
  });
  const [activeTab, setActiveTab] = useState('evaluator');
  const [currentJob, setCurrentJob] = useState(JOB_TEMPLATES[0]);
  const [applicantList, setApplicantList] = useState(() => getTenantApplicants());
  const [selectedApplicant, setSelectedApplicant] = useState(() => getTenantApplicants()[0] || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressState, setProgressState] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPromptStudio, setShowPromptStudio] = useState(false);
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

  // Sync state when Tenant switches (Multi-Tenancy Isolation) or Spring 목록이 합쳐졌을 때
  useEffect(() => {
    const tenantApps = getTenantApplicants();
    setApplicantList(tenantApps);
    if (!activeShareId) {
      setSelectedApplicant(prev => tenantApps.find(a => a.id === prev?.id) || tenantApps[0] || null);
    }
  }, [currentTenant.id, applicantsVersion]);

  // Analysis via the API gateway (server-side Claude API; no API key in the browser, no local fallbacks)
  const handleAnalyze = async ({ name, rawText }) => {
    if (!hasPermission('RUN_EVALUATION')) {
      alert(`[권한 제한] 현재 계정(${currentUser.roleTitle})은 면접관(Interviewer) 권한으로, 서류 업로드 및 AI 평가 가동 권한이 없습니다. 상단 프로필에서 Recruiter 또는 Admin으로 전환해주세요.`);
      return;
    }

    setIsAnalyzing(true);
    setProgressState({ percent: 10, status: 'Claude AI 분석 파이프라인 가동 중...' });

    try {
      const newResult = await analyzeApplicant({
        name,
        applyJobId: currentJob.id,
        rawText,
        tenantId: currentTenant.id,
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
      console.error("AI Analysis failed:", err);
      alert(err.message || '[AI 평가 실패] 서류 분석 도중 오류가 발생했습니다.');
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
          tenantId: currentTenant.id
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

  // ───────────────────────── 화면 이동 · 메뉴 · ⌘K 검색 (UI 전용 상태) ─────────────────────────
  const { theme, toggleTheme } = useTheme();
  const [evalView, setEvalView] = useState('list'); // 'list' | 'result' | 'new' (activeTab === 'evaluator' 일 때)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSSOModal, setShowSSOModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [inputTabRequest, setInputTabRequest] = useState(null);
  const analyzeStartIdRef = useRef(null);

  const activeView = activeTab === 'evaluator' ? evalView : activeTab;

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

  // 공유 링크로 들어오면 바로 평가 결과 화면
  useEffect(() => {
    if (sharedBannerInfo) setEvalView('result');
  }, [sharedBannerInfo]);

  // 평가가 끝나 새 결과가 선택되면 결과 화면으로 이동
  useEffect(() => {
    if (isAnalyzing) {
      analyzeStartIdRef.current = selectedApplicant?.id ?? '__none__';
      return;
    }
    if (analyzeStartIdRef.current !== null) {
      if (activeTab === 'evaluator' && selectedApplicant && selectedApplicant.id !== analyzeStartIdRef.current) {
        setEvalView('result');
      }
      analyzeStartIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnalyzing]);

  const goView = (view) => {
    setIsMenuOpen(false);
    if (view === 'comparison' || view === 'credits') {
      setActiveTab(view);
    } else {
      setActiveTab('evaluator');
      setEvalView(view);
    }
    window.scrollTo({ top: 0 });
  };

  const openApplicant = (app) => {
    setSelectedApplicant(app);
    goView('result');
  };

  const scrollToSection = (sectionId) => {
    window.setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const requireApplicant = (fn) => {
    if (!selectedApplicant) {
      setToastMessage('지원자를 먼저 선택하세요.');
      return;
    }
    fn();
  };

  const handleSelectFeature = (item) => {
    setIsPaletteOpen(false);
    setIsMenuOpen(false);
    if (item.status === 'planned') {
      setToastMessage(`${item.title}: ${PLANNED_MESSAGE}`);
      return;
    }
    const action = item.action || {};
    switch (action.type) {
      case 'view':
        goView(action.view);
        break;
      case 'tab':
        goView(action.tab);
        break;
      case 'result':
        requireApplicant(() => {
          goView('result');
          scrollToSection(action.target);
        });
        break;
      case 'upload':
        setInputTabRequest({ tab: 'FILE', at: Date.now() });
        goView('new');
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
    { id: 'nav-list', group: '화면', icon: 'Users', title: '지원자', desc: `${applicantList.length}명`, keywords: '홈 목록 지원자 리스트', action: { type: 'view', view: 'list' } },
    { id: 'nav-new', group: '화면', icon: 'Plus', title: '새 평가', desc: '자기소개서 입력', keywords: '평가 실행 입력 새로', action: { type: 'view', view: 'new' } },
    { id: 'nav-comparison', group: '화면', icon: 'Columns3', title: '비교', desc: '순위, 표절 매트릭스', keywords: '비교 순위 지원자 비교', action: { type: 'tab', tab: 'comparison' } },
    ...(canSeeCredits
      ? [{ id: 'nav-credits', group: '화면', icon: 'Gauge', title: '크레딧', desc: '부서별 AI 사용량', keywords: '크레딧 비용 사용량 쿼터', action: { type: 'tab', tab: 'credits' } }]
      : []),
    ...FEATURES.filter((f) => f.status === 'ready').map((f) => ({ ...f, group: '기능' })),
    ...FEATURES.filter((f) => f.status === 'planned').map((f) => ({ ...f, group: '로드맵' })),
    { id: 'set-theme', group: '설정', icon: theme === 'dark' ? 'Sun' : 'Moon', title: theme === 'dark' ? '라이트 모드' : '다크 모드', desc: '', keywords: '테마 다크 라이트 dark light 모드', action: { type: 'theme' } },
    ...(hasPermission('MANAGE_API_KEYS')
      ? [{ id: 'set-prompt', group: '설정', icon: 'SlidersHorizontal', title: '평가 프롬프트', desc: '회사별 평가 기준 문구', keywords: '프롬프트 스튜디오 prompt studio 설정', action: { type: 'prompt' } }]
      : [])
  ];

  const sidebarProps = {
    activeView,
    onNavigate: goView,
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

  const MOBILE_TABS = [
    { id: 'list', label: '지원자' },
    { id: 'new', label: '새 평가' },
    { id: 'comparison', label: '비교' },
    ...(canSeeCredits ? [{ id: 'credits', label: '크레딧' }] : [])
  ];

  const showResult = activeTab === 'evaluator' && evalView === 'result' && selectedApplicant;

  if (showLanding && !sharedBannerInfo) {
    return (
      <LandingPage
        onEnterWorkspace={(tab = 'evaluator') => {
          setActiveTab(tab);
          setShowLanding(false);
          window.scrollTo({ top: 0 });
        }}
        onSelectApplicant={(index) => {
          const target = applicantList[index] || applicantList[0];
          if (target) {
            setSelectedApplicant(target);
            setEvalView('result');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-fg font-sans">
      <Header
        onOpenPromptStudio={() => setShowPromptStudio(true)}
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
          <div className="max-w-[1180px] mx-auto px-3 sm:px-5 lg:px-6 pt-3 sm:pt-5 pb-24 space-y-4">
            {/* 모바일/태블릿 화면 전환 */}
            <div className="lg:hidden flex border-b border-line -mx-3 sm:-mx-5 px-3 sm:px-5 text-[13px]" role="tablist">
              {MOBILE_TABS.map((t) => {
                const active = activeView === t.id || (t.id === 'list' && activeView === 'result');
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => goView(t.id)}
                    className={`relative px-3 h-9 ${active ? 'text-fg font-medium' : 'text-fg-muted'}`}
                  >
                    {t.label}
                    {active && <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-fg" />}
                  </button>
                );
              })}
            </div>

            {/* 공유 링크(?share=...)로 들어온 경우 */}
            {sharedBannerInfo && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2.5 rounded-md border border-line bg-surface text-[13px]">
                <div className="flex items-start gap-2 min-w-0">
                  <Link2 className="w-4 h-4 text-fg-subtle mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-fg">
                      공유받은 평가서 <span className="text-fg-subtle font-mono text-xs">{sharedBannerInfo.shareId}</span>
                    </p>
                    <p className="text-xs text-fg-muted">보낸 사람 {sharedBannerInfo.createdBy}</p>
                    {isSampleResult(selectedApplicant) && (
                      <div className="mt-1 flex items-center gap-2 text-xs text-fg-muted">
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
                    goView('list');
                  }}
                  className="btn btn-secondary btn-md shrink-0"
                >
                  내 목록으로
                </button>
              </div>
            )}

            {activeTab === 'evaluator' && evalView === 'list' && (
              <ApplicantList
                applicants={applicantList}
                selectedId={selectedApplicant?.id}
                onOpen={openApplicant}
                onNew={() => goView('new')}
                tenantName={currentTenant?.name}
              />
            )}

            {activeTab === 'evaluator' && evalView === 'new' && (
              <section id="section-input" className="space-y-3">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => goView('list')} className="btn btn-ghost btn-sm -ml-2">
                    <ChevronLeft className="w-4 h-4" /> 지원자
                  </button>
                  <h1 className="text-lg font-semibold text-fg">새 평가</h1>
                </div>
                {currentUser.role === 'INTERVIEWER' && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-md border border-line bg-surface text-[13px]">
                    <Lock className="w-4 h-4 text-fg-subtle mt-0.5 shrink-0" />
                    <p className="text-fg-muted">면접관 계정은 조회 전용입니다. 평가 실행은 채용 담당자와 관리자만 할 수 있습니다.</p>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
                  <ApplicantInput
                    onAnalyze={handleAnalyze}
                    onBatchAnalyze={handleBatchAnalyze}
                    isAnalyzing={isAnalyzing}
                    progressState={progressState}
                    currentJobId={currentJob.id}
                    tabRequest={inputTabRequest}
                  />
                  <EvaluationCriteria
                    currentJob={currentJob}
                    setCurrentJob={setCurrentJob}
                    onCriteriaChange={(job) => setCurrentJob(job)}
                  />
                </div>
              </section>
            )}

            {activeTab === 'evaluator' && evalView === 'result' && !selectedApplicant && (
              <div className="card px-6 py-10 text-center text-sm text-fg-muted">
                선택된 지원자가 없습니다.{' '}
                <button type="button" className="underline text-fg" onClick={() => goView('list')}>
                  지원자 목록
                </button>
              </div>
            )}

            {showResult && (
              <div className="space-y-4">
                {!sharedBannerInfo && (
                  <button type="button" onClick={() => goView('list')} className="btn btn-ghost btn-sm -ml-2">
                    <ChevronLeft className="w-4 h-4" /> 지원자
                  </button>
                )}
                <div id="section-summary" className="scroll-mt-16">
                  <DashboardSummary
                    result={selectedApplicant}
                    currentJob={currentJob}
                    onOpenHITLEditor={() => setShowHITLEditor(true)}
                    onOpenShareModal={() => setShowShareModal(true)}
                    onOpenCandidateFeedback={() => setShowCandidateFeedback(true)}
                    onOpenReport={() => setShowExportModal(true)}
                  />
                </div>
                <div id="section-evidence" className="scroll-mt-16">
                  <EvidenceViewer result={selectedApplicant} />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4 items-start">
                  <div id="section-questions" className="scroll-mt-16">
                    <InterviewQuestions result={selectedApplicant} />
                  </div>
                  <div id="section-collab" className="scroll-mt-16">
                    <InterviewerCollaborationPanel applicant={selectedApplicant} shareId={activeShareId} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'comparison' && (
              <ApplicantComparison
                applicants={applicantList}
                onSelectApplicant={(app) => openApplicant(app)}
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

      {/* 안내 토스트 (로드맵 기능 등) */}
      {toastMessage && (
        <div
          role="status"
          className="toast-in fixed left-1/2 -translate-x-1/2 bottom-6 z-[70] max-w-[92vw] px-3.5 py-2 rounded-md bg-fg text-canvas text-[13px] flex items-center gap-2"
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
