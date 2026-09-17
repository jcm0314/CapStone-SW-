import React from 'react';
import { Cpu, ShieldCheck, Layers, FileText, Database } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, applicantCount }) {
  return (
    <header className="sticky top-0 z-40 bg-[#0B0F19]/90 backdrop-blur-md border-b border-gray-800/80 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-blue-300">
                HR AX Smart Evaluator
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full flex items-center gap-1">
                🏛️ Vertex AI Enterprise
              </span>
            </div>
            <p className="text-xs text-gray-400">대기업 환경 전용: Google Cloud Vertex AI & BigQuery Audit 기반 근거 검증 시스템</p>
          </div>
        </div>

        {/* Navigation Tabs & Enterprise Status */}
        <div className="flex items-center gap-3">
          <nav className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab('evaluator')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'evaluator'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> 서류 평가 & 근거 검증
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'comparison'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> 지원자 비교 매트릭스
              {applicantCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-400/20 text-blue-300 text-[10px] flex items-center justify-center font-bold">
                  {applicantCount}
                </span>
              )}
            </button>
          </nav>

          {/* Permanent Enterprise Status Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-medium flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            <span>BigQuery Audit 연동</span>
          </div>
        </div>
      </div>
    </header>
  );
}
