import React, { useEffect, useState } from 'react';
import { X, Mail, Loader2, Check, AlertCircle } from 'lucide-react';
import { MAIL_TEMPLATES, fillTemplate, getEmailStatus, sendApplicantEmail } from '../services/notificationService';

/**
 * 지원자에게 결과 메일 보내기 (Resend).
 * 받는 사람은 자소서에서 뽑아 둔 이메일(applicant.contactEmail)로 채우고, 담당자가 고칠 수 있습니다.
 */
export default function MailModal({ isOpen, onClose, applicant, companyName, initialTemplateId, onSent }) {
  if (!isOpen || !applicant) return null;
  return (
    <MailModalContent
      key={applicant.id}
      onClose={onClose}
      applicant={applicant}
      companyName={companyName}
      initialTemplateId={initialTemplateId}
      onSent={onSent}
    />
  );
}

function MailModalContent({ onClose, applicant, companyName, initialTemplateId, onSent }) {
  const fillFor = (id) => fillTemplate(id, { name: applicant.name, company: companyName, job: applicant.applyJobTitle });

  const startId = initialTemplateId || 'pass';
  const [templateId, setTemplateId] = useState(startId);
  const [to, setTo] = useState(applicant.contactEmail || '');
  const [subject, setSubject] = useState(() => fillFor(startId).subject);
  const [text, setText] = useState(() => fillFor(startId).text);
  const [status, setStatus] = useState({ state: 'idle', message: '' }); // idle | sending | sent | error
  const [emailEnabled, setEmailEnabled] = useState(null);

  useEffect(() => {
    let active = true;
    getEmailStatus().then((s) => active && setEmailEnabled(Boolean(s.emailEnabled)));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && status.state !== 'sending' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, status.state]);

  const pickTemplate = (id) => {
    setTemplateId(id);
    const filled = fillFor(id);
    setSubject(filled.subject);
    setText(filled.text);
    setStatus({ state: 'idle', message: '' });
  };

  const handleSend = async () => {
    setStatus({ state: 'sending', message: '' });
    try {
      await sendApplicantEmail({ to: to.trim(), subject, text });
      setStatus({ state: 'sent', message: `${to.trim()} 으로 보냈습니다.` });
      onSent?.({ applicantId: applicant.id, templateId, to: to.trim(), sentAt: new Date().toISOString() });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  };

  const sending = status.state === 'sending';
  const canSend = emailEnabled && to.trim() && subject.trim() && text.trim() && !sending && status.state !== 'sent';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
      onClick={() => !sending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mail-title"
        className="relative w-full max-w-xl max-h-[92vh] bg-surface border border-line rounded-2xl shadow-pop overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line bg-subtle">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-fg-muted" />
            <h2 id="mail-title" className="text-sm font-semibold text-fg">
              결과 메일 · {applicant.name}
            </h2>
          </div>
          <button type="button" onClick={onClose} disabled={sending} className="btn btn-ghost p-1.5" aria-label="닫기">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3.5 overflow-y-auto">
          {emailEnabled === false && (
            <p className="flex items-start gap-2 px-3 py-2 rounded-md border border-warn-line bg-warn-soft text-[13px] text-warn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              메일 발송 기능이 꺼져 있어 보낼 수 없습니다. 아래 내용을 복사해 직접 보내 주세요.
            </p>
          )}

          <div className="flex gap-1.5" role="radiogroup" aria-label="템플릿">
            {MAIL_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={templateId === t.id}
                onClick={() => pickTemplate(t.id)}
                disabled={sending || status.state === 'sent'}
                className={`px-3 h-8 rounded-md border text-[13px] transition-colors ${
                  templateId === t.id ? 'bg-fg text-canvas border-fg' : 'bg-surface text-fg-muted border-line hover:text-fg'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mail-to" className="label">받는 사람</label>
            <input
              id="mail-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="applicant@example.com"
              className="field"
              disabled={sending || status.state === 'sent'}
            />
            {!applicant.contactEmail && (
              <p className="text-xs text-fg-subtle">자기소개서에서 이메일을 찾지 못했습니다. 직접 입력하세요.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mail-subject" className="label">제목</label>
            <input
              id="mail-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value.replace(/[\r\n]/g, ' '))}
              maxLength={150}
              className="field"
              disabled={sending || status.state === 'sent'}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mail-text" className="label">본문</label>
            <textarea
              id="mail-text"
              rows={11}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={5000}
              className="field leading-relaxed resize-y"
              disabled={sending || status.state === 'sent'}
            />
          </div>

          {status.state === 'error' && (
            <p role="alert" className="flex items-start gap-2 text-[13px] text-bad">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {status.message}
            </p>
          )}
          {status.state === 'sent' && (
            <p role="status" className="flex items-center gap-2 text-[13px] text-ok">
              <Check className="w-4 h-4" /> {status.message}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-line">
          <button type="button" onClick={onClose} disabled={sending} className="btn btn-secondary btn-md">
            {status.state === 'sent' ? '닫기' : '취소'}
          </button>
          {status.state !== 'sent' && (
            <button type="button" onClick={handleSend} disabled={!canSend} className="btn btn-primary btn-md">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {sending ? '보내는 중…' : '보내기'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
