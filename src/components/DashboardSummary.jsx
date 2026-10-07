import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Award, AlertTriangle, ShieldCheck, CheckCircle, HelpCircle, XCircle, SlidersHorizontal, Sparkles, UserCheck } from 'lucide-react';

export default function DashboardSummary({ result, currentJob, onOpenHITLEditor }) {
  if (!result || !result.analysis) return null;

  const { summary, competencyScores } = result.analysis;
  const { totalScore, decision, decisionReason, aiTextProbability } = summary;

  // Radar chart dataset
  const radarData = currentJob.competencies.map(c => ({
    subject: c.name.split(' ')[0], // Short name
    score: competencyScores[c.id] || 70,
    benchmark: 75,
    fullMark: 100
  }));

  // Decision badge styling
  const getDecisionBadge = () => {
    switch (decision) {
      case 'STRONG_PASS':
        return {
          label: '서류 통과 (우수 추천)',
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          icon: <CheckCircle className="w-4 h-4 text-emerald-400" />
        };
      case 'INTERVIEW':
        return {
          label: '면접 진행 추천',
          bgColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          icon: <ShieldCheck className="w-4 h-4 text-blue-400" />
        };
      case 'HOLD':
        return {
          label: '추가 검증 보류',
          bgColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          icon: <HelpCircle className="w-4 h-4 text-amber-400" />
        };
      case 'REJECT':
      default:
        return {
          label: '서류 부적합 (탈락 권장)',
          bgColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          icon: <XCircle className="w-4 h-4 text-rose-400" />
        };
    }
  };

  const badge = getDecisionBadge();
  const isHumanVerified = Boolean(result.isHumanVerified);
  const originalScore = result.originalAnalysis?.summary?.totalScore;

  return (
    <div className="glass-panel rounded-2xl p-5 border border-gray-800 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-gray-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-white">{result.name} 지원자 서류 종합 평가</h2>
            <span className="text-xs text-gray-400 font-medium">[{result.applyJobTitle}]</span>

            {/* Engine Badge */}
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/30 rounded text-[10px] font-bold flex items-center gap-1">
              ⚡ Gemini API Engine
            </span>

            {/* HITL Verification Badge */}
            {isHumanVerified ? (
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm">
                <UserCheck className="w-3 h-3 text-amber-400" />
                Human-Verified (HITL 보정 완료)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-gray-800 text-gray-400 border border-gray-700 rounded-full text-[10px] font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-gray-400" />
                AI Generated (검토 대기)
              </span>
            )}

            {/* Score Calibration Differential Pill */}
            {isHumanVerified && originalScore !== undefined && originalScore !== totalScore && (
              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-mono font-semibold">
                AI 초안 {originalScore}점 ➔ HR 보정 {totalScore}점
              </span>
            )}
          </div>
          <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{decisionReason}</p>
        </div>

        {/* Right Action & Decision Badge */}
        <div className="flex items-center gap-2.5 self-end lg:self-center shrink-0">
          {/* HITL Calibration Button */}
          {onOpenHITLEditor && (
            <button
              type="button"
              onClick={onOpenHITLEditor}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-600/30 to-amber-500/20 hover:from-amber-600/40 hover:to-amber-500/30 text-amber-200 border border-amber-500/50 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-all hover:scale-105"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>🛠️ HITL 환각 교정 & 보정</span>
            </button>
          )}

          {/* HR Decision Badge */}
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-md ${badge.bgColor}`}>
            {badge.icon}
            {badge.label}
          </div>
        </div>
      </div>

      {/* Main Grid: Gauge & Radar Chart */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Left: Overall Score Card */}
        <div className="md:col-span-5 bg-gray-900/60 rounded-xl p-4 border border-gray-800 flex flex-col items-center justify-center space-y-3">
          <div className="relative flex items-center justify-center w-32 h-32">
            {/* SVG Score Gauge Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={totalScore >= 85 ? 'text-blue-500' : totalScore >= 70 ? 'text-amber-500' : 'text-rose-500'}
                strokeDasharray={`${totalScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-white font-mono">{totalScore}</span>
              <span className="text-[10px] text-gray-400 uppercase font-semibold">/ 100점</span>
            </div>
          </div>

          {/* AI Risk Meter */}
          <div className="w-full space-y-1 pt-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-gray-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" /> AI 생성/과장 확률
              </span>
              <span className={`font-mono font-bold ${aiTextProbability > 60 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {aiTextProbability}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  aiTextProbability > 60 ? 'bg-rose-500' : aiTextProbability > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${aiTextProbability}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Competency Radar Chart */}
        <div className="md:col-span-7 bg-gray-900/60 rounded-xl p-3 border border-gray-800 h-56 flex flex-col items-center justify-center">
          <span className="text-xs font-semibold text-gray-300 self-start px-2">5대 역량 항목별 시각화 (vs 벤치마크)</span>
          <div className="w-full h-44">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#4B5563" tick={false} />
                <Radar name="지원자 역량" dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} />
                <Radar name="직무 벤치마크" dataKey="benchmark" stroke="#6B7280" fill="#6B7280" fillOpacity={0.15} strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px', fontSize: '11px' }}
                  itemStyle={{ color: '#F3F4F6' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
