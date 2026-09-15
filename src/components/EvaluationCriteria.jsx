import React, { useState } from 'react';
import { Sliders, CheckCircle2, RotateCcw, ShieldAlert } from 'lucide-react';
import { JOB_TEMPLATES } from '../data/jobTemplates';

export default function EvaluationCriteria({ currentJob, setCurrentJob, onCriteriaChange }) {
  const [competencies, setCompetencies] = useState(currentJob.competencies);

  const handleTemplateChange = (e) => {
    const selected = JOB_TEMPLATES.find(j => j.id === e.target.value) || JOB_TEMPLATES[0];
    setCurrentJob(selected);
    setCompetencies(selected.competencies);
    onCriteriaChange(selected);
  };

  const handleWeightChange = (id, newWeight) => {
    const updated = competencies.map(c => c.id === id ? { ...c, weight: parseInt(newWeight) || 0 } : c);
    setCompetencies(updated);
    const updatedJob = { ...currentJob, competencies: updated };
    setCurrentJob(updatedJob);
    onCriteriaChange(updatedJob);
  };

  const totalWeight = competencies.reduce((sum, c) => sum + c.weight, 0);

  const resetWeights = () => {
    setCompetencies(currentJob.competencies);
    onCriteriaChange(currentJob);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-gray-800 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white">직무 및 역량 가중치 설정</h2>
        </div>
        <button
          onClick={resetWeights}
          className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> 초기화
        </button>
      </div>

      {/* Select Job Template */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-300">채용 직무 선택</label>
        <select
          value={currentJob.id}
          onChange={handleTemplateChange}
          className="w-full bg-gray-900/90 border border-gray-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
        >
          {JOB_TEMPLATES.map(job => (
            <option key={job.id} value={job.id}>
              [{job.category}] {job.title}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-gray-400 leading-tight">{currentJob.description}</p>
      </div>

      {/* Competency Weight Sliders */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-gray-300">5대 핵심 역량 가중치 (%)</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] ${
            totalWeight === 100 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          }`}>
            합계: {totalWeight}% {totalWeight === 100 ? '✓' : '(100% 필요)'}
          </span>
        </div>

        <div className="space-y-2.5 bg-gray-900/50 p-3 rounded-xl border border-gray-800">
          {competencies.map(c => (
            <div key={c.id} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </span>
                <span className="font-mono text-gray-400 font-semibold">{c.weight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={c.weight}
                onChange={(e) => handleWeightChange(c.id, e.target.value)}
                className="w-full accent-blue-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
