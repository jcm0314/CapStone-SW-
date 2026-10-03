import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, Trash2, FileCheck, FileCode } from 'lucide-react';
import { parseCandidateFilesBatch } from '../utils/fileParser';

export default function FileUploadZone({ onFileSelected }) {
  const [isDragging, setIsDragging] = useState(false);
  const [parsedFiles, setParsedFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
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
    try {
      const results = await parseCandidateFilesBatch(files);
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
        accept=".txt,.pdf,.docx,.doc"
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
            ? 'border-blue-400 bg-blue-500/10 scale-[1.01]'
            : 'border-gray-800 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-900/80'
        }`}
      >
        <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <UploadCloud className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-white">
            {isLoading ? '서류 텍스트 추출 중...' : '지원서 파일 Drag & Drop 또는 클릭하여 업로드'}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            지원 가능 확장자: <span className="text-blue-300 font-mono font-semibold">.PDF, .TXT, .DOCX</span> (다중 일괄 선택 가능)
          </p>
        </div>
      </div>

      {/* Uploaded File List Preview */}
      {parsedFiles.length > 0 && (
        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
          <div className="flex justify-between items-center text-[11px] font-bold text-gray-400 px-1">
            <span>업로드된 서류 목록 ({parsedFiles.length}건)</span>
            <span>선택된 서류가 평가 본문으로 자동 설정됩니다</span>
          </div>

          {parsedFiles.map((file, idx) => {
            const isSelected = activeFileIndex === idx;
            return (
              <div
                key={`${file.filename}_${idx}`}
                onClick={() => handleSelectParsedFile(idx)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/15 ring-1 ring-blue-500/40 text-white font-semibold'
                    : 'border-gray-800 bg-gray-900/70 text-gray-300 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {file.filetype === 'PDF' ? (
                    <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : file.filetype === 'TXT' ? (
                    <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <FileCheck className="w-4 h-4 text-blue-400 shrink-0" />
                  )}
                  <div className="truncate">
                    <p className="truncate font-mono text-[11px]">{file.filename}</p>
                    <p className="text-[10px] text-gray-400 font-normal">
                      {(file.filesize / 1024).toFixed(1)} KB • {file.filetype}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3 h-3 text-blue-400" /> 선택됨
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveFile(idx, e)}
                    className="p-1 rounded text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
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
