import React, { useState, useEffect } from 'react';
import { X, Plug, Send, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  ATS_PROVIDERS,
  getAtsConfig,
  saveAtsConfig,
  getAtsSyncLogs,
  buildAtsPayload,
  syncApplicantToAts
} from '../services/atsService';

export default function AtsIntegrationModal({ isOpen, onClose, tenant, applicants = [], selectedApplicant }) {
  const tenantId = tenant?.id || 'default';
  const [config, setConfig] = useState(() => getAtsConfig(tenantId));
  const [targetId, setTargetId] = useState(selectedApplicant?.id || applicants[0]?.id || '');
  const [logs, setLogs] = useState(() => getAtsSyncLogs(tenantId));
  const [statusMsg, setStatusMsg] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setConfig(getAtsConfig(tenantId));
    setLogs(getAtsSyncLogs(tenantId));
    setTargetId(selectedApplicant?.id || applicants[0]?.id || '');
    setStatusMsg(null);
  }, [isOpen, tenantId, selectedApplicant?.id]);

  if (!isOpen) return null;

  const targetApplicant = applicants.find((a) => a.id === targetId) || selectedApplicant || applicants[0];
  const previewPayload = targetApplicant ? buildAtsPayload(targetApplicant, config.provider, tenant) : null;

  const handleSaveConfig = (e) => {
    e.preventDefault();
    const saved = saveAtsConfig(tenantId, config);
    setConfig(saved);
    setStatusMsg({ type: 'ok', text: 'ATS 연동 설정이 저장되었습니다.' });
  };

  const handleSyncNow = async () => {
    if (!targetApplicant) {
      setStatusMsg({ type: 'err', text: '동기화할 지원자가 없습니다.' });
      return;
    }
    setIsSyncing(true);
    setStatusMsg(null);
    try {
      const res = await syncApplicantToAts({ applicant: targetApplicant, config, tenant });
      setLogs(getAtsSyncLogs(tenantId));
      setStatusMsg({
        type: 'ok',
        text:
          res.mode === 'PREVIEW'
            ? `${targetApplicant.name} 페이로드 시뮬레이션 전송 완료 (Webhook URL 미입력 상태)`
            : `${targetApplicant.name} 평가 결과를 ATS로 전송했습니다.`
      });
    } catch (err) {
      setLogs(getAtsSyncLogs(tenantId));
      setStatusMsg({ type: 'err', text: err.message || 'ATS 전송에 실패했습니다.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadBatch = () => {
    const batch = applicants.map((a) => buildAtsPayload(a, config.provider, tenant));
    const blob = new Blob([JSON.stringify(batch, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkmate-ats-${config.provider}-${tenantId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="ats-modal-title">
      <div className="card w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden bg-surface">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plug className="w-4 h-4 text-fg-muted" />
            <h2 id="ats-modal-title" className="text-[15px] font-semibold text-fg">
              ATS 채용 관리 시스템 연동
            </h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost p-1" aria-label="닫기">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          <form onSubmit={handleSaveConfig} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-[12px] font-medium text-fg">연동 플랫폼</span>
                <select
                  aria-label="연동 플랫폼"
                  value={config.provider}
                  onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                  className="field h-9 text-[13px]"
                >
                  {ATS_PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-[12px] font-medium text-fg">API Key / Bearer Token (선택)</span>
                <input
                  type="password"
                  aria-label="ATS API Key"
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="X-ATS-Api-Key 헤더로 전송"
                  className="field h-9 text-[13px]"
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-fg">Webhook Endpoint URL</span>
              <input
                type="url"
                aria-label="Webhook URL"
                value={config.webhookUrl}
                onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                placeholder="https://api.your-ats.com/webhooks/checkmate (미입력 시 시뮬레이션 모드)"
                className="field h-9 text-[13px]"
              />
            </label>

            <div className="flex items-center justify-between gap-2 pt-1">
              <label className="inline-flex items-center gap-2 text-[12.5px] text-fg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoSync}
                  onChange={(e) => setConfig({ ...config, autoSync: e.target.checked })}
                />
                새 지원자 평가 완료 시 자동 동기화
              </label>
              <button type="submit" className="btn btn-secondary btn-sm">
                설정 저장
              </button>
            </div>
          </form>

          <div className="pt-3 border-t border-line space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <select
                  aria-label="전송할 지원자"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="field h-8 text-[12.5px] max-w-[220px]"
                >
                  {applicants.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.analysis?.summary?.totalScore ?? '-'}점)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing || !targetApplicant}
                  className="btn btn-primary btn-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSyncing ? '전송 중...' : '지금 동기화'}
                </button>
              </div>
              <button
                type="button"
                onClick={handleDownloadBatch}
                disabled={applicants.length === 0}
                className="btn btn-ghost btn-sm"
              >
                <Download className="w-3.5 h-3.5" /> 전체 JSON 내보내기
              </button>
            </div>

            {statusMsg && (
              <div
                className={`px-3 py-2 rounded text-[12.5px] flex items-center gap-2 border ${
                  statusMsg.type === 'ok'
                    ? 'bg-ok-soft text-ok border-ok-line'
                    : 'bg-bad-soft text-bad border-bad-line'
                }`}
              >
                {statusMsg.type === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {previewPayload && (
              <details className="rounded border border-line bg-subtle/60 p-2.5">
                <summary className="text-[12px] font-medium text-fg-muted cursor-pointer">
                  전송 JSON 페이로드 미리보기
                </summary>
                <pre className="mt-2 text-[11px] text-fg-muted overflow-x-auto leading-relaxed">
                  {JSON.stringify(previewPayload, null, 2)}
                </pre>
              </details>
            )}
          </div>

          {logs.length > 0 && (
            <div className="pt-3 border-t border-line space-y-1.5">
              <div className="text-[12px] font-semibold text-fg">최근 동기화 기록</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {logs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between text-[11.5px] px-2.5 py-1.5 rounded bg-subtle border border-line"
                  >
                    <span className="text-fg">
                      {log.applicantName} · {log.provider}
                    </span>
                    <span className="text-fg-muted tabular-nums">
                      {log.status} · {new Date(log.syncedAt).toLocaleTimeString('ko-KR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
