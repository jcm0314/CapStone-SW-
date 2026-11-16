import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, Trash2, FileCheck, FileCode } from 'lucide-react';
import { parseCandidateFilesBatch } from '../utils/fileParser';
import { guessApplicantName } from '../utils/nameGuesser';

export default function FileUploadZone({ onFileSelected, onBatchAnalyze, isAnalyzing }) {
  const [isDragging, setIsDragging] = useState(false);
  const [parsedFiles, setParsedFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [failedFiles, setFailedFiles] = useState([]); // [{ filename, message }]
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
  };

  const processFiles = async (files) => {
    setIsLoading(true);
    setFailedFiles([]);
    try {
      const failures = [];
      const results = await parseCandidateFilesBatch(files, failures);
      setFailedFiles(failures);
      if (results.length > 0) {
        setParsedFiles(prev => [...results, ...prev]);
        // Auto select first file
        const first = results[0];
        setActiveFileIndex(0);
        if (onFileSelected) {
          onFileSelected(first.extractedText, first.filename);
        }
      }
    } catch (err) {
      console.error("파일 파싱 실패:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectParsedFile = (index) => {
    setActiveFileIndex(index);
    const target = parsedFiles[index];
    if (target && onFileSelected) {
      onFileSelected(target.extractedText, target.filename);
    }
  };

  const handleRemoveFile = (index, e) => {
    e.stopPropagation();
    const updated = parsedFiles.filter((_, idx) => idx !== index);
    setParsedFiles(updated);
    if (activeFileIndex === index) {
      if (updated.length > 0) {
        setActiveFileIndex(0);
        if (onFileSelected) onFileSelected(updated[0].extractedText, updated[0].filename);
      } else {
        setActiveFileIndex(null);
        if (onFileSelected) onFileSelected('', '');
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.pdf,.docx"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drag & Drop Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
          isDragging
            ? 'border-brand bg-brand-soft scale-[1.01]'
            : 'border-line bg-subtle hover:border-line-strong hover:bg-subtle'
        }`}
      >
        <div className="w-10 h-10 rounded-full bg-brand-soft border border-brand-line flex items-center justify-center text-brand-fg">
          <UploadCloud className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-fg">
            {isLoading ? '서류 텍스트 추출 중...' : '파일을 끌어다 놓거나 눌러서 선택하세요'}
          </p>
          <p className="text-[11px] text-fg-muted mt-0.5">
            <span className="text-brand-fg font-mono font-semibold">.PDF, .TXT, .DOCX</span> · 여러 개 한 번에 가능
          </p>
        </div>
      </div>

      {/* 읽지 못한 파일 */}
      {failedFiles.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-md border border-bad-line bg-bad-soft px-3 py-2 text-[12px]">
          {failedFiles.map((f) => (
            <li key={f.filename}>
              <span className="font-medium text-bad">{f.filename}</span>
              <span className="text-fg-muted"> · {f.message}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Uploaded File List Preview */}
      {parsedFiles.length > 0 && (
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 text-[11px] font-bold text-fg-muted px-1">
            <span>업로드된 서류 목록 ({parsedFiles.length}건)</span>
            {parsedFiles.length > 1 && onBatchAnalyze && (
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={() => {
                  const candidateBatch = parsedFiles.map((f, idx) => {
                    const cleanName = guessApplicantName(f.extractedText, f.filename) || `지원자 ${idx + 1}`;
                    return { name: cleanName, rawText: f.extractedText, filename: f.filename };
                  });
                  onBatchAnalyze(candidateBatch);
                }}
                className="bg-brand hover:bg-brand-strong px-2.5 py-1 text-on-brand rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <span>{parsedFiles.length}건 한 번에 평가</span>
              </button>
            )}
          </div>

          {parsedFiles.map((file, idx) => {
            const isSelected = activeFileIndex === idx;
            return (
              <div
                key={`${file.filename}_${idx}`}
                onClick={() => handleSelectParsedFile(idx)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs ${
                  isSelected
                    ? 'border-brand bg-brand-soft ring-1 ring-brand/30 text-fg font-semibold'
                    : 'border-line bg-subtle text-fg-muted hover:border-line-strong'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {file.filetype === 'PDF' ? (
                    <FileText className="w-4 h-4 text-bad shrink-0" />
                  ) : file.filetype === 'TXT' ? (
                    <FileCode className="w-4 h-4 text-ok shrink-0" />
                  ) : (
                    <FileCheck className="w-4 h-4 text-brand-fg shrink-0" />
                  )}
                  <div className="truncate">
                    <p className="truncate font-mono text-[11px]">{file.filename}</p>
                    <p className="text-[10px] text-fg-muted font-normal">
                      {(file.filesize / 1024).toFixed(1)} KB • {file.filetype}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-brand-soft text-brand-fg border border-brand-line flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3 h-3 text-brand-fg" /> 선택됨
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveFile(idx, e)}
                    className="p-1 rounded text-fg-subtle hover:text-bad hover:bg-bad-soft transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
