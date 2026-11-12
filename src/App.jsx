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
import { Lock, ShieldAlert, Share2, Link2 } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white pb-12">
      {/* Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        applicantCount={applicantList.length}
        onOpenPromptStudio={() => setShowPromptStudio(true)}
        onOpenApiKeyModal={() => setShowApiKeyModal(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 w-full flex-1 space-y-6">
        {/* Shared Evaluation Alert Banner (if accessed via ?share=...) */}
        {sharedBannerInfo && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-slate-900 border border-purple-500/40 flex items-center justify-between text-xs text-purple-200 shadow-lg shadow-purple-950/30">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🔗</span>
              <div>
                <p className="font-bold text-white flex items-center gap-2">
                  <span>실시간 동기화된 면접관 평가서 열람 중</span>
                  <span className="px-2 py-0.2 bg-purple-500/20 text-purple-300 rounded font-mono text-[10px]">
                    {sharedBannerInfo.shareId}
                  </span>
                </p>
                <p className="text-[11px] text-purple-300/80 mt-0.5">
                  생성자: <strong>{sharedBannerInfo.createdBy}</strong> • 1:1 형광펜 원문 및 맞춤 면접 질문이 실시간 동기화되었습니다.
                </p>
                {isSampleResult(selectedApplicant) && (
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-amber-200">
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
              className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800 text-purple-200 border border-purple-500/30 rounded-xl text-xs font-semibold transition-colors shrink-0"
            >
              일반 목록으로 돌아가기
            </button>
          </div>
        )}

        {activeTab === 'evaluator' && (
          <div className="space-y-6">
            {/* Top Row: Criteria Setup & Applicant Input Form */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5">
                <EvaluationCriteria
                  currentJob={currentJob}
                  setCurrentJob={setCurrentJob}
                  onCriteriaChange={(job) => setCurrentJob(job)}
                />
              </div>
              <div className="lg:col-span-7">
                {currentUser.role === 'INTERVIEWER' && (
                  <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">🎯</span>
                      <div>
                        <p className="font-bold text-white">면접관(Interviewer) 전용 집중 모드 활성화</p>
                        <p className="text-[11px] text-emerald-400/80">
                          서류 업로드 및 AI 평가 가동 권한은 제한되며, 지원자 1:1 형광펜 원문 검토 및 압박 면접 질문 확인 전용으로 동작합니다.
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-semibold shrink-0">
                      조회 전용
                    </span>
                  </div>
                )}
                <ApplicantInput
                  onAnalyze={handleAnalyze}
                  onBatchAnalyze={handleBatchAnalyze}
                  isAnalyzing={isAnalyzing}
                  progressState={progressState}
                  currentJobId={currentJob.id}
                />
              </div>
            </div>

            {/* Middle Row: Executive Dashboard Summary & Radar Chart */}
            {selectedApplicant && (
              <DashboardSummary
                result={selectedApplicant}
                currentJob={currentJob}
                onOpenHITLEditor={() => setShowHITLEditor(true)}
                onOpenShareModal={() => setShowShareModal(true)}
                onOpenCandidateFeedback={() => setShowCandidateFeedback(true)}
              />
            )}

            {/* Bottom Row: Interactive Sentence Evidence Viewer, Interview Questions & Collaboration Panel */}
            {selectedApplicant && (
              <div className="space-y-6">
                <EvidenceViewer result={selectedApplicant} />
                <InterviewQuestions result={selectedApplicant} />
                <InterviewerCollaborationPanel
                  applicant={selectedApplicant}
                  shareId={activeShareId}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'comparison' && (
          /* Comparison Matrix View */
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

        {activeTab === 'credits' && (
          /* Enterprise 2,000 Users & Department Credit Quota Dashboard */
          <DepartmentCreditDashboard />
        )}
      </main>

      {/* Floating Export Button for Evaluator Tab */}
      {selectedApplicant && activeTab === 'evaluator' && (
        <div className="fixed bottom-6 right-6 z-30">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-blue-600/40 border border-blue-400/30 flex items-center gap-2 transition-all hover:scale-105"
          >
            <span>📑 HR 서류 평가 보고서 출력</span>
          </button>
        </div>
      )}

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
