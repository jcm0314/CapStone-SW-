import React, { useState } from 'react';
import { Sliders, Check, X, RotateCcw, Building2, ShieldAlert, Sparkles, Award } from 'lucide-react';
import {
  getCompanyPromptSettings,
  saveCompanyPromptSettings,
  resetCompanyPromptSettings,
  PROMPT_PRESETS
} from '../services/promptStudioService';

export default function PromptStudioModal({ onClose, onSaved }) {
  const [settings, setSettings] = useState(getCompanyPromptSettings());
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  const handlePresetSelect = (preset) => {
    setSettings({
      companyName: preset.companyName,
      coreValues: preset.coreValues,
      tabooWords: preset.tabooWords,
      customInstruction: preset.customInstruction
    });
  };

  const handleSave = () => {
    saveCompanyPromptSettings(settings);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
    if (onSaved) onSaved(settings);
  };

  const handleReset = () => {
    const defaultSettings = resetCompanyPromptSettings();
    setSettings(defaultSettings);
    if (onSaved) onSaved(defaultSettings);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Enterprise Custom HR Prompt Studio</h3>
            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded text-[10px] font-bold">
              v2.0 커스텀 인재상 & 금기어
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-200">
          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" /> 사내 추천 프리셋 템플릿 선택
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PROMPT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className="p-2.5 rounded-xl border border-gray-800 bg-gray-900/60 hover:bg-gray-800 hover:border-purple-500/40 text-left transition-all space-y-1"
                >
                  <p className="font-bold text-white text-[11px] truncate">{preset.name}</p>
                  <p className="text-[10px] text-gray-400 line-clamp-1">{preset.customInstruction}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="font-semibold text-gray-300 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-400" /> 기업 / 조직명
            </label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
              placeholder="예: LG그룹 AX 본부"
            />
          </div>

          {/* Core Values */}
          <div className="space-y-1.5">
            <label className="font-semibold text-gray-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" /> 핵심 인재상 & 핵심 가치 (쉼표로 구분)
            </label>
            <input
              type="text"
              value={settings.coreValues.join(', ')}
              onChange={(e) => setSettings({
                ...settings,
                coreValues: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
              })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
              placeholder="예: 고객 가치 창조, 정정당당한 승부, 자율과 책임"
            />
          </div>

          {/* Taboo Words */}
          <div className="space-y-1.5">
            <label className="font-semibold text-gray-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> 서류 감점 금기어 / 어뷰징 키워드 (쉼표로 구분)
            </label>
            <input
              type="text"
              value={settings.tabooWords.join(', ')}
              onChange={(e) => setSettings({
                ...settings,
                tabooWords: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
              })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
              placeholder="예: 귀사, 타사명 언급, 퇴사사유 불분명, 천재적인"
            />
          </div>

          {/* Custom Instruction */}
          <div className="space-y-1.5">
            <label className="font-semibold text-gray-300">HR 커스텀 AI 지시 프롬프트 (System Instruction Addendum)</label>
            <textarea
              rows={3}
              value={settings.customInstruction}
              onChange={(e) => setSettings({ ...settings, customInstruction: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-purple-500 font-mono resize-none"
              placeholder="AI 평가 시 추가로 고려해야 할 사내 규칙이나 가이드라인을 적어주세요..."
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-900 border-t border-gray-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-gray-700 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 기본 설정 복원
          </button>

          <div className="flex items-center gap-2">
            {isSavedNotice && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> 설정이 저장되었습니다!
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> 프롬프트 저장 및 평가 적용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
