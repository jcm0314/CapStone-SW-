import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const ROLES = {
  ADMIN: {
    key: 'ADMIN',
    label: '최고 관리자 (Admin)',
    badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    description: '전사 AI 크레딧 통제, 부서별 쿼터 설정, API Key 관리 및 전 계정 열람 권한'
  },
  RECRUITER: {
    key: 'RECRUITER',
    label: '채용 담당자 (Recruiter)',
    badgeColor: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    description: '서류 일괄 업로드, PII 마스킹 검증, AI 4대 에이전트 평가 가동, HITL 결과 보정'
  },
  INTERVIEWER: {
    key: 'INTERVIEWER',
    label: '면접관 (Interviewer)',
    badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    description: '배정된 지원자 평가서 열람, 1:1 형광펜 원문 확인, 실시간 면접 질문 및 코멘트 작성'
  },
  CANDIDATE: {
    key: 'CANDIDATE',
    label: '구직자 셀프 진단 (Candidate B2C)',
    badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    description: '청년 구직자 자소서 셀프 팩트체크, 약점 문장 보완 코칭 및 예상 압박 면접 연습 모드'
  }
};

const DEFAULT_USERS = {
  ADMIN: {
    id: 'usr_admin_01',
    name: '최민준 총괄',
    email: 'minjun.choi@company.io',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    role: 'ADMIN',
    roleTitle: '인사총괄 / CPO',
    provider: 'Google Workspace'
  },
  RECRUITER: {
    id: 'usr_recruiter_02',
    name: '김서아 수석',
    email: 'seoa.kim@company.io',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    role: 'RECRUITER',
    roleTitle: '인재영입팀 리드',
    provider: 'Google Workspace'
  },
  INTERVIEWER: {
    id: 'usr_interviewer_03',
    name: '박도현 팀장',
    email: 'dohyun.park@company.io',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    role: 'INTERVIEWER',
    roleTitle: '결제코어플랫폼 테크 리드',
    provider: 'Slack Enterprise Grid'
  },
  CANDIDATE: {
    id: 'usr_candidate_04',
    name: '이준호 (취업준비생)',
    email: 'junho.lee@dankook.ac.kr',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    role: 'CANDIDATE',
    roleTitle: '청년 구직자 셀프 진단 모드',
    provider: 'University Career Center'
  }
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('checkmate_auth_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return DEFAULT_USERS.RECRUITER;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(true);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('checkmate_auth_user', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  // Quick switch role (for evaluation demos and RBAC testing)
  const switchRole = (roleKey) => {
    if (DEFAULT_USERS[roleKey]) {
      const template = DEFAULT_USERS[roleKey];
      setCurrentUser(prev => ({
        ...template,
        email: prev?.email?.includes('@') 
          ? `${template.name.toLowerCase().replace(/ /g, '')}@${prev.email.split('@')[1]}`
          : template.email
      }));
    }
  };

  // Simulated SSO Login
  const loginWithSSO = (provider = 'Google Workspace', targetRole = 'RECRUITER') => {
    const user = { ...DEFAULT_USERS[targetRole], provider };
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  // RBAC Permission Check Helper
  const hasPermission = (action) => {
    if (!isAuthenticated) return false;
    const role = currentUser?.role;

    switch (action) {
      case 'MANAGE_CREDITS':
      case 'MANAGE_API_KEYS':
      case 'MANAGE_TENANT_SETTINGS':
        return role === 'ADMIN';

      case 'UPLOAD_RESUME':
      case 'RUN_EVALUATION':
      case 'EXPORT_REPORT':
        return role === 'ADMIN' || role === 'RECRUITER' || role === 'CANDIDATE';

      case 'CALIBRATE_SCORE': // HITL
        return role === 'ADMIN' || role === 'RECRUITER';

      case 'VIEW_APPLICANTS':
      case 'VIEW_EVIDENCE':
      case 'VIEW_QUESTIONS':
      case 'WRITE_INTERVIEW_NOTE':
      case 'SHARE_RESULTS':
        return true; // All roles can view and write notes

      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        switchRole,
        loginWithSSO,
        logout,
        hasPermission,
        roles: ROLES
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
