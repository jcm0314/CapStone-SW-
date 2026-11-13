import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { JOB_TEMPLATES } from '../data/jobTemplates';

export default function EvaluationCriteria({ currentJob, setCurrentJob, onCriteriaChange }) {
  const [competencies, setCompetencies] = useState(currentJob.competencies);

  const handleTitleChange = (e) => {
    const updatedJob = { ...currentJob, title: e.target.value };
    setCurrentJob(updatedJob);
    onCriteriaChange(updatedJob);
  };

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
    <div className="card card-pad space-y-4 bg-subtle/50">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">평가 기준</h2>
        <button onClick={resetWeights} className="btn btn-ghost btn-sm shrink-0">
          <RotateCcw className="w-3.5 h-3.5" /> 초기화
        </button>
      </div>

      {/* Job Title & Preset Selection */}
      <div className="space-y-2">
        <label htmlFor="job-title" className="label">채용 직무</label>
        <input
          id="job-title"
          type="text"
          value={currentJob.title || ''}
          onChange={handleTitleChange}
          placeholder="채용 직무명 입력 (예: 소프트웨어 엔지니어, 마케터)"
          className="field"
        />
        <div className="flex items-center gap-2 pt-0.5">
          <label htmlFor="job-template-select" className="text-[11px] text-fg-subtle shrink-0">
            기준 프리셋:
          </label>
          <select
            id="job-template-select"
            value={currentJob.id}
            onChange={handleTemplateChange}
            className="field !py-0.5 text-xs h-7"
          >
            {JOB_TEMPLATES.map(job => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>
        {currentJob.description && (
          <p className="text-[12px] text-fg-subtle leading-snug">{currentJob.description}</p>
        )}
      </div>

      {/* Competency Weight Sliders */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="label">역량 비중</span>
          <span className={`chip ${totalWeight === 100 ? 'chip-ok' : 'chip-warn'}`}>
            합계 {totalWeight}%{totalWeight === 100 ? '' : ', 100%로 맞추기'}
          </span>
        </div>

        <div className="space-y-3">
          {competencies.map(c => (
            <div key={c.id} className="space-y-1.5">
              <div className="flex justify-between items-center text-[13px]">
                <label htmlFor={`weight-${c.id}`} className="text-fg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </label>
                <span className="text-fg-muted font-semibold tabular-nums">{c.weight}%</span>
              </div>
              <input
                id={`weight-${c.id}`}
                type="range"
                min="0"
                max="60"
                value={c.weight}
                onChange={(e) => handleWeightChange(c.id, e.target.value)}
                className="w-full h-1.5 cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
