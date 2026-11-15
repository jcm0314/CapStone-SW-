import React, { useState, useEffect } from 'react';
import { RotateCcw, Tags, Plus, X } from 'lucide-react';
import { JOB_TEMPLATES } from '../data/jobTemplates';
import {
  PRIORITY_TIERS,
  DEFAULT_FOCUS_TAG_SUGGESTIONS,
  normalizeWeightsFromTags
} from '../utils/tagWeightUtils';

export default function EvaluationCriteria({ currentJob, setCurrentJob, onCriteriaChange }) {
  const [competencies, setCompetencies] = useState(currentJob.competencies);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    setCompetencies(currentJob.competencies);
  }, [currentJob.id]);

  const emitJobUpdate = (updatedJob) => {
    setCurrentJob(updatedJob);
    if (onCriteriaChange) onCriteriaChange(updatedJob);
  };

  const handleTitleChange = (e) => {
    emitJobUpdate({ ...currentJob, title: e.target.value });
  };

  const handleTemplateChange = (e) => {
    const selected = JOB_TEMPLATES.find((j) => j.id === e.target.value) || JOB_TEMPLATES[0];
    setCompetencies(selected.competencies);
    emitJobUpdate({ ...selected, focusTags: currentJob.focusTags || [] });
  };

  const handleWeightChange = (id, newWeight) => {
    const updated = competencies.map((c) =>
      c.id === id ? { ...c, weight: parseInt(newWeight, 10) || 0 } : c
    );
    setCompetencies(updated);
    emitJobUpdate({ ...currentJob, competencies: updated });
  };

  const handlePriorityTagClick = (id, tierId) => {
    const tagged = competencies.map((c) =>
      c.id === id ? { ...c, priority: tierId } : c
    );
    const normalized = normalizeWeightsFromTags(tagged);
    setCompetencies(normalized);
    emitJobUpdate({ ...currentJob, competencies: normalized });
  };

  const focusTags = Array.isArray(currentJob.focusTags) ? currentJob.focusTags : [];

  const addFocusTag = (raw) => {
    const cleaned = raw.replace(/^#/, '').trim();
    if (!cleaned || focusTags.includes(cleaned)) return;
    emitJobUpdate({ ...currentJob, focusTags: [...focusTags, cleaned] });
    setTagInput('');
  };

  const removeFocusTag = (tag) => {
    emitJobUpdate({ ...currentJob, focusTags: focusTags.filter((t) => t !== tag) });
  };

  const totalWeight = competencies.reduce((sum, c) => sum + c.weight, 0);

  const resetWeights = () => {
    const baseTemplate = JOB_TEMPLATES.find((j) => j.id === currentJob.id) || currentJob;
    setCompetencies(baseTemplate.competencies);
    emitJobUpdate({ ...currentJob, competencies: baseTemplate.competencies, focusTags: [] });
  };

  return (
    <div id="section-tag-weights" className="card card-pad space-y-4 bg-subtle/50 scroll-mt-16">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">평가 기준</h2>
        <button type="button" onClick={resetWeights} className="btn btn-ghost btn-sm shrink-0">
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
            {JOB_TEMPLATES.map((job) => (
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

      {/* Competency Weight Sliders + Tag Priority Pills */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="label flex items-center gap-1.5">
            <Tags className="w-3.5 h-3.5 text-fg-muted" />
            태그형 역량 가중치
          </span>
          <span className={`chip ${totalWeight === 100 ? 'chip-ok' : 'chip-warn'}`}>
            합계 {totalWeight}%{totalWeight === 100 ? '' : ', 100%로 맞추기'}
          </span>
        </div>

        <div className="space-y-3">
          {competencies.map((c) => {
            const activeTier = c.priority || 'standard';
            return (
              <div key={c.id} className="space-y-1.5">
                <div className="flex justify-between items-center gap-2 text-[13px]">
                  <label htmlFor={`weight-${c.id}`} className="text-fg flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="truncate">{c.name}</span>
                  </label>
                  <div className="flex items-center gap-1 shrink-0">
                    {PRIORITY_TIERS.map((tier) => {
                      const selected = activeTier === tier.id;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => handlePriorityTagClick(c.id, tier.id)}
                          aria-pressed={selected}
                          className={`px-1.5 py-0.5 rounded text-[11px] border transition-colors ${
                            selected
                              ? 'bg-fg text-canvas border-fg font-medium'
                              : 'bg-surface text-fg-muted border-line hover:text-fg'
                          }`}
                        >
                          {tier.label}
                        </button>
                      );
                    })}
                    <span className="text-fg-muted font-semibold tabular-nums w-9 text-right">
                      {c.weight}%
                    </span>
                  </div>
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
            );
          })}
        </div>
      </div>

      {/* Custom Focus Tags */}
      <div className="pt-2 border-t border-line space-y-2">
        <div className="text-[12px] font-medium text-fg">핵심 평가 키워드 태그</div>
        <div className="flex gap-1.5">
          <input
            type="text"
            aria-label="핵심 키워드 태그 입력"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addFocusTag(tagInput);
              }
            }}
            placeholder="예: 대용량트래픽, MSA"
            className="field h-8 text-[12.5px]"
          />
          <button
            type="button"
            onClick={() => addFocusTag(tagInput)}
            className="btn btn-secondary btn-sm shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> 추가
          </button>
        </div>
        {focusTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {focusTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] bg-brand-soft text-brand-fg border border-brand-line"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeFocusTag(tag)}
                  aria-label={`${tag} 태그 삭제`}
                  className="hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1 pt-0.5">
          {DEFAULT_FOCUS_TAG_SUGGESTIONS.filter((s) => !focusTags.includes(s)).map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => addFocusTag(sug)}
              className="px-2 py-0.5 rounded-full text-[11px] bg-surface border border-line text-fg-subtle hover:text-fg"
            >
              + #{sug}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
