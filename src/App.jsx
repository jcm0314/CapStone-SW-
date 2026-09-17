import React, { useState } from 'react';
import Header from './components/Header';
import EvaluationCriteria from './components/EvaluationCriteria';
import ApplicantInput from './components/ApplicantInput';
import DashboardSummary from './components/DashboardSummary';
import EvidenceViewer from './components/EvidenceViewer';
import InterviewQuestions from './components/InterviewQuestions';
import ApplicantComparison from './components/ApplicantComparison';
import ReportExporter from './components/ReportExporter';

import { JOB_TEMPLATES } from './data/jobTemplates';
import { SAMPLE_APPLICANTS } from './data/sampleApplicants';
import { analyzeApplicant } from './services/enterpriseVertexService';
import confetti from 'canvas-confetti';

export default function App() {
  const [activeTab, setActiveTab] = useState('evaluator');
  const [currentJob, setCurrentJob] = useState(JOB_TEMPLATES[0]);
  const [applicantList, setApplicantList] = useState(SAMPLE_APPLICANTS);
  const [selectedApplicant, setSelectedApplicant] = useState(SAMPLE_APPLICANTS[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const handleAnalyze = async ({ name, rawText }) => {
    setIsAnalyzing(true);
    try {
      const newResult = await analyzeApplicant({
        name,
        applyJobId: currentJob.id,
        rawText
      });

      // Add to list and select
      setApplicantList(prev => [newResult, ...prev.filter(a => a.id !== newResult.id)]);
      setSelectedApplicant(newResult);

      // Trigger confetti if high score
      if (newResult.analysis.summary.totalScore >= 88) {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error("Enterprise Analysis failed:", err);
      alert(err.message || "대기업 Vertex AI 프록시 게이트웨이 분석 도중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white pb-12">
      {/* Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        applicantCount={applicantList.length}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 w-full flex-1 space-y-6">
        {activeTab === 'evaluator' ? (
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
                <ApplicantInput
                  onAnalyze={handleAnalyze}
                  isAnalyzing={isAnalyzing}
                  currentJobId={currentJob.id}
                />
              </div>
            </div>

            {/* Middle Row: Executive Dashboard Summary & Radar Chart */}
            {selectedApplicant && (
              <DashboardSummary
                result={selectedApplicant}
                currentJob={currentJob}
              />
            )}

            {/* Bottom Row: Interactive Sentence Evidence Viewer & Interview Questions */}
            {selectedApplicant && (
              <div className="space-y-6">
                <EvidenceViewer result={selectedApplicant} />
                <InterviewQuestions result={selectedApplicant} />
              </div>
            )}
          </div>
        ) : (
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
    </div>
  );
}
