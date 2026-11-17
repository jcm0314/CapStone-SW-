import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Users, 
  ShieldAlert, 
  TrendingDown, 
  Sliders, 
  Search, 
  Filter, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Zap, 
  Building2, 
  CheckCircle2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

const DEFAULT_DEPARTMENTS = [
  { id: 'dept-eng', code: 'PLATFORM-DEV', name: '백엔드·플랫폼 개발본부', leadManager: '김서아 테크리크루터', allocatedUsd: 1200, usedUsd: 486.5, userCount: 18, autoLockEnabled: true },
  { id: 'dept-mkt', code: 'GROWTH-MKT', name: '그로스·브랜드 마케팅팀', leadManager: '이도현 채용매니저', allocatedUsd: 800, usedUsd: 312.0, userCount: 12, autoLockEnabled: true },
  { id: 'dept-biz', code: 'ENT-SALES', name: 'B2B 엔터프라이즈 사업본부', leadManager: '박지훈 세일즈리드', allocatedUsd: 600, usedUsd: 478.2, userCount: 9, autoLockEnabled: true }
];

const DEFAULT_USERS = [
  { id: 'u-1', name: '김서아', email: 'seoa.kim@company.io', studentId: 'HR-101', deptId: 'dept-eng', deptName: '백엔드·플랫폼 개발본부', evalCount: 142, tokensUsed: 284000, spentUsd: 184.2, isLocked: false },
  { id: 'u-2', name: '이도현', email: 'dohyun.lee@company.io', studentId: 'HR-104', deptId: 'dept-mkt', deptName: '그로스·브랜드 마케팅팀', evalCount: 96, tokensUsed: 192000, spentUsd: 128.5, isLocked: false },
  { id: 'u-3', name: '박지훈', email: 'jihoon.park@company.io', studentId: 'BM-201', deptId: 'dept-biz', deptName: 'B2B 엔터프라이즈 사업본부', evalCount: 84, tokensUsed: 168000, spentUsd: 112.4, isLocked: false },
  { id: 'u-4', name: '최유진', email: 'yujin.choi@company.io', studentId: 'DEV-302', deptId: 'dept-eng', deptName: '백엔드·플랫폼 개발본부', evalCount: 68, tokensUsed: 136000, spentUsd: 89.6, isLocked: false }
];

export default function DepartmentCreditDashboard() {
  // Department quotas state
  const [departments, setDepartments] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('dku_departments_quota') : null;
    const parsed = saved ? JSON.parse(saved) : null;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_DEPARTMENTS;
  });

  // Users state
  const [users, setUsers] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('dku_users_list') : null;
    const parsed = saved ? JSON.parse(saved) : null;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS;
  });

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Editing department budget modal
  const [editingDept, setEditingDept] = useState(null);
  const [editBudgetVal, setEditBudgetVal] = useState('');

  // Persist helper
  const saveDepts = (newDepts) => {
    setDepartments(newDepts);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dku_departments_quota', JSON.stringify(newDepts));
    }
  };

  const saveUsersList = (newUsers) => {
    setUsers(newUsers);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dku_users_list', JSON.stringify(newUsers));
    }
  };

  // Toggle Department Auto-Lock
  const handleToggleDeptLock = (deptId) => {
    const updated = departments.map(d => 
      d.id === deptId ? { ...d, autoLockEnabled: !d.autoLockEnabled } : d
    );
    saveDepts(updated);
  };

  // Open Edit Department Budget
  const handleOpenEditBudget = (dept) => {
    setEditingDept(dept);
    setEditBudgetVal(dept.allocatedUsd.toString());
  };

  // Save Department Budget
  const handleSaveBudget = (e) => {
    e.preventDefault();
    if (!editingDept) return;
    const val = parseFloat(editBudgetVal);
    if (isNaN(val) || val <= 0) {
      alert('올바른 예산 금액을 입력해주세요.');
      return;
    }
    const updated = departments.map(d => 
      d.id === editingDept.id ? { ...d, allocatedUsd: val } : d
    );
    saveDepts(updated);
    setEditingDept(null);
  };

  // Toggle individual user lock
  const handleToggleUserLock = (userId) => {
    const updated = users.map(u => 
      u.id === userId ? { ...u, isLocked: !u.isLocked } : u
    );
    saveUsersList(updated);
  };

  // Reset user usage
  const handleResetUserUsage = (userId) => {
    if (!confirm('해당 사용자의 토큰 사용량을 초기화하시겠습니까?')) return;
    const updated = users.map(u => 
      u.id === userId ? { ...u, evalCount: 0, tokensUsed: 0, spentUsd: 0, isLocked: false } : u
    );
    saveUsersList(updated);
  };

  // KPI Calculations
  const totalAllocated = useMemo(() => departments.reduce((acc, d) => acc + d.allocatedUsd, 0), [departments]);
  const totalUsed = useMemo(() => departments.reduce((acc, d) => acc + d.usedUsd, 0), [departments]);
  const totalSavingsUsd = useMemo(() => +(totalUsed * 8.8).toFixed(2), [totalUsed]); // GPT-4o baseline is ~9.8x higher
  const lockedUsersCount = useMemo(() => users.filter(u => u.isLocked).length, [users]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.studentId.includes(searchQuery);

      const matchDept = selectedDeptFilter === 'ALL' || u.deptId === selectedDeptFilter;
      const matchStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'LOCKED' && u.isLocked) ||
        (statusFilter === 'ACTIVE' && !u.isLocked);

      return matchSearch && matchDept && matchStatus;
    });
  }, [users, searchQuery, selectedDeptFilter, statusFilter]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl p-8 border border-brand-line shadow-pop">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-96 h-96 bg-brand-soft rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-3 py-1 text-xs font-bold bg-brand-soft text-brand-fg border border-brand-line rounded-full flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-brand-fg" />
                엔터프라이즈 멀티테넌트 거버넌스
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-ok-soft text-ok border border-ok-line rounded-full">
                FNV-1a 하이브리드 캐시 작동 중 (시뮬레이션 예시)
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-semibold text-fg tracking-tight">
              부서별 AI 크레딧 쿼터 & 토큰 비용 관리 대시보드
            </h2>
            <p className="text-sm text-fg-muted mt-1 max-w-2xl">
              무분별한 API 비용 폭증을 사전에 차단하고, 채용 본부/부서별로 차등 배분된 AI 크레딧 예산과 채용담당자·면접관의 실시간 토큰 소진율을 통합 관제합니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-subtle backdrop-blur px-4 py-3 rounded-2xl border border-line-strong text-right">
              <div className="text-[11px] text-fg-muted font-medium">메인 추론 엔진</div>
              <div className="text-sm font-bold text-brand-fg flex items-center justify-end gap-1.5 mt-0.5">
                <Zap className="w-4 h-4 text-warn fill-warn" />
                Claude Haiku · 4-Agent
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Allocated Budget */}
        <div className="bg-subtle p-5 rounded-2xl border border-line shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-fg-muted font-semibold uppercase tracking-wider">전사 할당 총예산</span>
            <div className="p-2 rounded-xl bg-brand-soft text-brand-fg border border-brand-line">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-semibold text-fg">
              ${totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-fg-muted mt-1">
              약 {(totalAllocated * 1380).toLocaleString()}원 (월간 쿼터)
            </div>
          </div>
        </div>

        {/* 2. Total Used Budget */}
        <div className="bg-subtle p-5 rounded-2xl border border-line shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-fg-muted font-semibold uppercase tracking-wider">현재 누적 소진액</span>
            <div className="p-2 rounded-xl bg-brand-soft text-brand-fg border border-brand-line">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-semibold text-brand-fg">
              ${totalUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-fg-muted mt-1 flex items-center gap-1.5">
              <span>진척률:</span>
              <span className="text-warn font-bold">{(totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0).toFixed(1)}% 소진</span>
            </div>
          </div>
        </div>

        {/* 3. Cost Savings by Gemini Flash-Lite */}
        <div className="bg-ok-soft bg-subtle p-5 rounded-2xl border border-ok-line shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ok font-semibold uppercase tracking-wider">FNV-1a 캐시 예상 절감액</span>
            <div className="p-2 rounded-xl bg-ok-soft text-ok border border-ok-line">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-semibold text-ok">
              +${totalSavingsUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-ok mt-1 font-medium">
              반복 평가·조회 토큰 비용 68% 절감 (예시)
            </div>
          </div>
        </div>

        {/* 4. Active Users & Locked */}
        <div className="bg-subtle p-5 rounded-2xl border border-line shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-fg-muted font-semibold uppercase tracking-wider">매핑 이용자 현황</span>
            <div className="p-2 rounded-xl bg-brand-soft text-brand-fg border border-brand-line">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-semibold text-fg">
              {users.length.toLocaleString()}명
            </div>
            <div className="text-xs text-fg-muted mt-1 flex items-center gap-2">
              <span className="text-ok">정상: {(users.length - lockedUsersCount).toLocaleString()}명</span>
              {lockedUsersCount > 0 && (
                <span className="text-bad font-semibold">• 쿼터 락: {lockedUsersCount}명</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section: Department Quota Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-fg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-fg" />
              부서별(팀별) 맞춤 크레딧 할당 현황
            </h3>
            <p className="text-xs text-fg-muted">
              조직 특성에 맞게 예산 쿼터를 차등 할당하고, 예산 100% 초과 시 자동 호출 차단(Lock) 여부를 설정합니다.
            </p>
          </div>
          <div className="text-xs text-fg-muted bg-subtle px-3 py-1.5 rounded-lg border border-line-strong self-start sm:self-auto">
            * 멘토 권장: 팀별 커스텀 쿼터 정책 적용됨
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((dept) => {
            const usagePercent = Math.min(100, (dept.usedUsd / dept.allocatedUsd) * 100);
            const isWarning = usagePercent >= 75 && usagePercent < 90;
            const isDanger = usagePercent >= 90;

            return (
              <div 
                key={dept.id} 
                className="bg-subtle rounded-2xl p-5 border border-line shadow-sm hover:border-line-strong transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-fg-muted bg-muted px-2 py-0.5 rounded-md border border-line-strong">
                        {dept.code}
                      </span>
                      <h4 className="text-sm font-bold text-fg mt-1.5">{dept.name}</h4>
                      <p className="text-[11px] text-fg-muted mt-0.5">책임자: {dept.leadManager}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEditBudget(dept)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-muted hover:bg-muted text-fg-muted rounded-lg border border-line-strong transition-all flex items-center gap-1"
                    >
                      <Sliders className="w-3 h-3" />
                      예산 수정
                    </button>
                  </div>

                  {/* Budget Numbers */}
                  <div className="flex items-baseline justify-between mt-4">
                    <div>
                      <span className="text-xs text-fg-muted">사용액 / 한도:</span>
                      <div className="text-base font-semibold text-fg mt-0.5">
                        ${dept.usedUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="text-xs font-normal text-fg-muted ml-1">
                          / ${dept.allocatedUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${
                        isDanger ? 'text-bad' : isWarning ? 'text-warn' : 'text-ok'
                      }`}>
                        {usagePercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-muted rounded-full mt-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDanger 
                          ? 'bg-bad-solid' 
                          : isWarning 
                          ? 'bg-warn-solid' 
                          : 'bg-brand'
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-5 pt-3 border-t border-line flex items-center justify-between text-xs">
                  <div className="text-fg-muted flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-fg-subtle" />
                    <span>배정 인원: <strong>{dept.userCount}명</strong></span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleDeptLock(dept.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                      dept.autoLockEnabled
                        ? 'bg-ok-soft text-ok border-ok-line hover:bg-ok-soft'
                        : 'bg-muted text-fg-muted border-line-strong hover:bg-muted'
                    }`}
                  >
                    {dept.autoLockEnabled ? (
                      <>
                        <Lock className="w-3 h-3 text-ok" />
                        초과 시 자동 락 ON
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3 text-fg-muted" />
                        자동 락 OFF
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section: 2,000 Users Usage Directory & Table */}
      <div className="bg-subtle rounded-3xl border border-line p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-fg flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-fg" />
              이용자별 토큰 및 크레딧 소진 현황 (시뮬레이션)
            </h3>
            <p className="text-xs text-fg-muted mt-0.5">
              사내 인사담당자·면접관 계정 기준으로 집계된 API 사용량과 예산 초과 잠금 상태를 개별 제어합니다.
            </p>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="이름, 이메일, 사번 검색..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 bg-subtle border border-line-strong rounded-xl text-xs text-fg placeholder:text-fg-subtle focus:outline-none focus:border-brand w-52"
              />
            </div>

            {/* Department Filter */}
            <select
              value={selectedDeptFilter}
              onChange={(e) => {
                setSelectedDeptFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-subtle border border-line-strong rounded-xl text-xs text-fg-muted focus:outline-none focus:border-brand"
            >
              <option value="ALL">전체 부서·팀</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-subtle border border-line-strong rounded-xl text-xs text-fg-muted focus:outline-none focus:border-brand"
            >
              <option value="ALL">상태 전체</option>
              <option value="ACTIVE">정상 이용 중</option>
              <option value="LOCKED">쿼터 락(차단됨)</option>
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-xs">
            <thead className="bg-subtle text-fg-muted font-semibold border-b border-line">
              <tr>
                <th className="py-3 px-4">사용자 (성명/학번)</th>
                <th className="py-3 px-4">단국대 이메일 계정</th>
                <th className="py-3 px-4">소속 부서 / 학과</th>
                <th className="py-3 px-4 text-center">평가 건수</th>
                <th className="py-3 px-4 text-right">소진 토큰수</th>
                <th className="py-3 px-4 text-right">누적 비용 ($/원)</th>
                <th className="py-3 px-4 text-center">상태</th>
                <th className="py-3 px-4 text-center">관리 액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-fg">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-fg-subtle">
                    검색 조건과 일치하는 이용자가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-subtle transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-fg">{u.name}</div>
                      <div className="text-[10px] text-fg-muted">{u.studentId}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-fg-muted">
                      {u.email}
                    </td>
                    <td className="py-3 px-4 text-fg-muted">
                      {u.deptName}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-brand-fg">
                      {u.evalCount}건
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-fg-muted">
                      {u.tokensUsed.toLocaleString()} tok
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span className="font-bold text-ok">${u.spentUsd.toFixed(3)}</span>
                      <div className="text-[10px] text-fg-muted">
                        약 {(u.spentUsd * 1380).toFixed(0)}원
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {u.isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-bad-soft text-bad border border-bad-line">
                          <Lock className="w-2.5 h-2.5" /> 락 잠김
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-ok-soft text-ok border border-ok-line">
                          <CheckCircle2 className="w-2.5 h-2.5" /> 정상
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleUserLock(u.id)}
                          title={u.isLocked ? '이용 정지 해제' : '토큰 쿼터 강제 락'}
                          className={`p-1.5 rounded-lg border text-xs transition-all ${
                            u.isLocked
                              ? 'bg-bad-soft hover:bg-bad-soft text-bad border-bad-line'
                              : 'bg-muted hover:bg-muted text-fg-muted border-line-strong'
                          }`}
                        >
                          {u.isLocked ? <Unlock className="w-3.5 h-3.5 text-bad" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetUserUsage(u.id)}
                          title="토큰 사용량 초기화"
                          className="p-1.5 rounded-lg bg-muted hover:bg-muted text-fg-muted border border-line-strong text-xs transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-fg-muted pt-2">
          <div>
            전체 <strong>{filteredUsers.length.toLocaleString()}명</strong> 중{' '}
            <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> ~{' '}
            <strong>{Math.min(filteredUsers.length, currentPage * itemsPerPage)}</strong> 표시 중
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-muted border border-line-strong text-fg-muted disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-fg bg-muted rounded-lg border border-line-strong">
              {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg bg-muted border border-line-strong text-fg-muted disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Budget Modal */}
      {editingDept && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-2xl max-w-md w-full p-6 shadow-pop animate-scale-up">
            <h4 className="text-base font-bold text-fg flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-fg" />
              부서 월간 예산 쿼터 수정
            </h4>
            <p className="text-xs text-fg-muted mt-1">
              <strong>{editingDept.name}</strong> ({editingDept.code})의 월간 AI 호출 허용 상한액을 변경합니다.
            </p>

            <form onSubmit={handleSaveBudget} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-fg-muted mb-1">
                  할당 예산 (USD $)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle font-bold">$</span>
                  <input
                    type="number"
                    step="50"
                    min="100"
                    max="50000"
                    value={editBudgetVal}
                    onChange={(e) => setEditBudgetVal(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-muted border border-line-strong rounded-xl text-sm font-bold text-fg focus:outline-none focus:border-brand"
                    required
                  />
                </div>
                <p className="text-[11px] text-fg-muted mt-1">
                  약 {(parseFloat(editBudgetVal || '0') * 1380).toLocaleString()}원 상당 (현재 소진: ${editingDept.usedUsd.toFixed(2)})
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted text-fg-muted"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand hover:bg-brand-strong text-on-brand shadow-sm"
                >
                  변경사항 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
