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
import { INITIAL_DEPARTMENTS, generate2000Users } from '../data/mockCreditData';

export default function DepartmentCreditDashboard() {
  // Department quotas state
  const [departments, setDepartments] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('dku_departments_quota') : null;
    return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
  });

  // 2,000 users state
  const [users, setUsers] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('dku_users_list') : null;
    return saved ? JSON.parse(saved) : generate2000Users();
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 p-8 border border-indigo-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-3 py-1 text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                단국대학교 전사 거버넌스
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                2,048명 매핑 정상 작동
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              부서별 AI 크레딧 쿼터 & 토큰 비용 관리 대시보드
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              무분별한 API 비용 폭증을 사전에 차단하고, 5개 단과대/센터별로 차등 배분된 크레딧 예산과 2,000명 이용자의 실시간 토큰 소진율을 통합 관제합니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 backdrop-blur px-4 py-3 rounded-2xl border border-slate-700/80 text-right">
              <div className="text-[11px] text-slate-400 font-medium">메인 추론 엔진</div>
              <div className="text-sm font-bold text-blue-300 flex items-center justify-end gap-1.5 mt-0.5">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                Gemini 2.5 Flash-Lite
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Allocated Budget */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">전사 할당 총예산</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              ${totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              약 {(totalAllocated * 1380).toLocaleString()}원 (월간 쿼터)
            </div>
          </div>
        </div>

        {/* 2. Total Used Budget */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">현재 누적 소진액</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-indigo-300">
              ${totalUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span>진척률:</span>
              <span className="text-amber-400 font-bold">{((totalUsed / totalAllocated) * 100).toFixed(1)}% 소진</span>
            </div>
          </div>
        </div>

        {/* 3. Cost Savings by Gemini Flash-Lite */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-emerald-500/30 shadow-lg relative overflow-hidden bg-gradient-to-b from-emerald-950/20 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Flash-Lite 누적 절감액</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-300">
              +${totalSavingsUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-emerald-400/80 mt-1 font-medium">
              GPT-4o 대비 88% 예산 절감 효과
            </div>
          </div>
        </div>

        {/* 4. Active Users & Locked */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">매핑 이용자 현황</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              {users.length.toLocaleString()}명
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <span className="text-emerald-400">정상: {(users.length - lockedUsersCount).toLocaleString()}명</span>
              {lockedUsersCount > 0 && (
                <span className="text-rose-400 font-semibold">• 쿼터 락: {lockedUsersCount}명</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section: Department Quota Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              부서별(팀별) 맞춤 크레딧 할당 현황
            </h3>
            <p className="text-xs text-slate-400">
              조직 특성에 맞게 예산 쿼터를 차등 할당하고, 예산 100% 초과 시 자동 호출 차단(Lock) 여부를 설정합니다.
            </p>
          </div>
          <div className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 self-start sm:self-auto">
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
                className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800/80 shadow-md hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                        {dept.code}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1.5">{dept.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">책임자: {dept.leadManager}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEditBudget(dept)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all flex items-center gap-1"
                    >
                      <Sliders className="w-3 h-3" />
                      예산 수정
                    </button>
                  </div>

                  {/* Budget Numbers */}
                  <div className="flex items-baseline justify-between mt-4">
                    <div>
                      <span className="text-xs text-slate-400">사용액 / 한도:</span>
                      <div className="text-base font-extrabold text-white mt-0.5">
                        ${dept.usedUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="text-xs font-normal text-slate-400 ml-1">
                          / ${dept.allocatedUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-black ${
                        isDanger ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {usagePercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-800 rounded-full mt-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDanger 
                          ? 'bg-gradient-to-r from-rose-600 to-red-500' 
                          : isWarning 
                          ? 'bg-gradient-to-r from-amber-600 to-yellow-500' 
                          : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>배정 인원: <strong>{dept.userCount}명</strong></span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleDeptLock(dept.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                      dept.autoLockEnabled
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {dept.autoLockEnabled ? (
                      <>
                        <Lock className="w-3 h-3 text-emerald-400" />
                        초과 시 자동 락 ON
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3 text-slate-400" />
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
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              2,000명 이용자별 토큰 및 크레딧 소진 현황
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              단국대 이메일 및 학번 기준으로 실시간 집계된 API 사용량과 예산 초과 잠금 상태를 개별 제어합니다.
            </p>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="이름, 이메일, 학번 검색..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-52"
              />
            </div>

            {/* Department Filter */}
            <select
              value={selectedDeptFilter}
              onChange={(e) => {
                setSelectedDeptFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">전체 부서/학과</option>
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
              className="px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">상태 전체</option>
              <option value="ACTIVE">정상 이용 중</option>
              <option value="LOCKED">쿼터 락(차단됨)</option>
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
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
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    검색 조건과 일치하는 이용자가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{u.name}</div>
                      <div className="text-[10px] text-slate-400">{u.studentId}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      {u.email}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {u.deptName}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-blue-400">
                      {u.evalCount}건
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                      {u.tokensUsed.toLocaleString()} tok
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span className="font-bold text-emerald-400">${u.spentUsd.toFixed(3)}</span>
                      <div className="text-[10px] text-slate-400">
                        약 {(u.spentUsd * 1380).toFixed(0)}원
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {u.isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <Lock className="w-2.5 h-2.5" /> 락 잠김
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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
                              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                          }`}
                        >
                          {u.isLocked ? <Unlock className="w-3.5 h-3.5 text-rose-400" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetUserUsage(u.id)}
                          title="토큰 사용량 초기화"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 text-xs transition-all"
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 pt-2">
          <div>
            전체 <strong>{filteredUsers.length.toLocaleString()}명</strong> 중{' '}
            <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> ~{' '}
            <strong>{Math.min(filteredUsers.length, currentPage * itemsPerPage)}</strong> 표시 중
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-white bg-slate-800 rounded-lg border border-slate-700">
              {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Budget Modal */}
      {editingDept && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-up">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              부서 월간 예산 쿼터 수정
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              <strong>{editingDept.name}</strong> ({editingDept.code})의 월간 AI 호출 허용 상한액을 변경합니다.
            </p>

            <form onSubmit={handleSaveBudget} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  할당 예산 (USD $)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                  <input
                    type="number"
                    step="50"
                    min="100"
                    max="50000"
                    value={editBudgetVal}
                    onChange={(e) => setEditBudgetVal(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  약 {(parseFloat(editBudgetVal || '0') * 1380).toLocaleString()}원 상당 (현재 소진: ${editingDept.usedUsd.toFixed(2)})
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30"
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
