import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

/**
 * 하단 정보: 서비스·팀 정보, 개인정보 처리방침, 이용약관, 오픈소스 라이선스.
 * 문서 내용은 실제 데이터 흐름(브라우저 저장, 마스킹 후 AI 전송, 공유 링크, 결과 메일)에 맞춘 시연용 초안입니다.
 * 정식 서비스 전에는 법률 검토를 받아야 합니다.
 */
const DOCS = {
  privacy: {
    title: '개인정보 처리방침',
    sections: [
      ['처리하는 정보', [
        '지원자 자기소개서 본문과 이름 (채용 담당자가 업로드하거나 붙여 넣은 내용)',
        '자기소개서에 적힌 이메일 주소 (결과 메일 발송용)',
        '채용 담당자·면접관이 남긴 점수 보정 내역과 메모'
      ]],
      ['이용 목적', [
        '서류 평가 보조: 점수 산출과 근거 문장 표시',
        '면접 질문 생성',
        '채용 담당자가 직접 보내는 서류 결과·면접 안내 메일'
      ]],
      ['처리 방식', [
        '이름, 이메일, 전화번호, 주민번호, 생년월일, 출신 학교, 거주 지역은 AI로 보내기 전에 브라우저에서 가립니다.',
        '가려진 본문만 AI 평가 서버를 거쳐 Anthropic(Claude API, 미국)에서 처리됩니다.',
        '평가 결과와 연락처는 채용 담당자의 브라우저 저장소에 보관되며, 담당자가 지우면 삭제됩니다.',
        '면접관 공유 링크를 만들면 평가 결과가 서버에 저장되고, 정한 기간(기본 72시간)이 지나면 열람할 수 없게 되어 삭제됩니다.',
        '결과 메일을 보내면 받는 사람 주소와 제목·본문이 메일 발송 서비스 Resend(미국)로 전달됩니다.'
      ]],
      ['처리 위탁 및 국외 이전', [
        'Anthropic PBC (미국): AI 평가 처리',
        'Resend (미국): 결과 메일 발송',
        'Cloudflare (전 세계): 접속 보호와 전송 구간 암호화'
      ]],
      ['정보주체의 권리', [
        '지원자는 지원한 회사(채용 담당자)에 자신의 정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.',
        '채용 담당자는 지원자 정보를 넣기 전에 수집·이용 동의를 받아야 합니다.'
      ]]
    ]
  },
  terms: {
    title: '이용약관',
    sections: [
      ['서비스 성격', [
        'Check-Mate는 단국대학교 소프트웨어 캡스톤 디자인 프로젝트로 만든 시연용 서비스입니다.',
        'AI 평가는 서류 검토를 돕는 참고 자료이며, 합격·불합격 판단은 반드시 사람이 내려야 합니다.'
      ]],
      ['이용자의 책임', [
        '지원자 정보를 넣기 전에 해당 지원자의 개인정보 수집·이용 동의를 받아야 합니다.',
        '결과 메일은 채용 목적으로만 보내야 하며, 광고나 무관한 내용을 보내면 안 됩니다.'
      ]],
      ['책임의 한계', [
        'AI는 문장을 잘못 해석할 수 있습니다. 근거 문장과 원문을 확인한 뒤 사용하세요.',
        '시연용 서비스이므로 데이터 보존과 서비스 지속을 보장하지 않습니다.'
      ]]
    ]
  },
  license: {
    title: '오픈소스 라이선스',
    sections: [
      ['Check-Mate', ['MIT License · Copyright (c) 2026 Check-Mate 팀 (jcm0314)']],
      ['사용한 오픈소스', [
        'React · MIT',
        'Vite · MIT',
        'Tailwind CSS · MIT',
        'Express · MIT',
        'Recharts · MIT',
        'react-window · MIT',
        'Lucide · ISC',
        'PDF.js (pdfjs-dist) · Apache-2.0',
        'canvas-confetti · ISC'
      ]]
    ]
  }
};

function LegalModal({ docId, onClose }) {
  const doc = DOCS[docId];

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-title"
        className="w-full max-w-lg max-h-[85vh] bg-surface border border-line rounded-2xl shadow-pop overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line bg-subtle">
          <h2 id="legal-title" className="text-sm font-semibold text-fg">{doc.title}</h2>
          <button type="button" onClick={onClose} className="btn btn-ghost p-1.5" aria-label="닫기">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto space-y-4 text-[13px] leading-relaxed">
          {doc.sections.map(([heading, items]) => (
            <section key={heading}>
              <h3 className="font-semibold text-fg">{heading}</h3>
              <ul className="mt-1 list-disc pl-5 space-y-0.5 text-fg-muted marker:text-fg-subtle">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
          {docId !== 'license' && <p className="text-xs text-fg-subtle">시연용 초안입니다. 정식 서비스 전 법률 검토가 필요합니다.</p>}
        </div>
      </div>
    </div>
  );
}

export default function Footer() {
  const [openDoc, setOpenDoc] = useState(null);
  const link = 'hover:text-fg underline-offset-2 hover:underline';

  return (
    <footer className="border-t border-line mt-8">
      <div className="max-w-[1180px] mx-auto px-3 sm:px-5 lg:px-6 py-5 text-xs text-fg-subtle space-y-2">
        <nav aria-label="약관 및 정책" className="flex flex-wrap gap-x-4 gap-y-1">
          <button type="button" onClick={() => setOpenDoc('privacy')} className={`font-medium text-fg-muted ${link}`}>개인정보 처리방침</button>
          <button type="button" onClick={() => setOpenDoc('terms')} className={link}>이용약관</button>
          <button type="button" onClick={() => setOpenDoc('license')} className={link}>오픈소스 라이선스</button>
        </nav>
        <p>Check-Mate · 단국대학교 컴퓨터공학과 소프트웨어 캡스톤 디자인 · Check-Mate 팀</p>
        <p>AI 평가는 참고 자료이며, 최종 판단은 채용 담당자가 합니다. © 2026 Check-Mate 팀</p>
      </div>
      {openDoc && <LegalModal docId={openDoc} onClose={() => setOpenDoc(null)} />}
    </footer>
  );
}
