'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { FoodLabel } from '@/types/label';
import {
  LabelVersionAuditEntry,
  createAuditEntry,
} from '@/lib/label-compliance/engines/audit-diff-engine';
import {
  getActiveRegulatoryAlerts,
  RegulatoryAlertItem,
} from '@/lib/label-compliance/engines/regulatory-alert-engine';
import {
  assessRefusalRisk,
  RefusalRiskAssessment,
  RiskLevel,
} from '@/lib/label-compliance/engines/refusal-risk-engine';

interface AuditDashboardClientProps {
  initialLabels: FoodLabel[];
}

export default function AuditDashboardClient({ initialLabels }: AuditDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'risk' | 'alerts' | 'audit'>('risk');

  // Helper to extract product display name safely
  const getDisplayName = (l?: Partial<FoodLabel>): string => {
    if (!l) return '미등록 품목';
    return l.header?.productNameKo || l.productNameEn || l.productNameLocal || l.productId || 'K-Food';
  };

  // --- 1. Audit Trail State ---
  const [auditEntries, setAuditEntries] = useState<LabelVersionAuditEntry[]>(() => {
    const sampleProduct = initialLabels.find((l) => l.productId === 'prod-1') || initialLabels[0];
    if (!sampleProduct) return [];

    const prevVersion: Partial<FoodLabel> = {
      ...sampleProduct,
      version: 1,
      productNameEn: `${getDisplayName(sampleProduct)} (초기안)`,
      nutrition: sampleProduct.nutrition
        ? {
            ...sampleProduct.nutrition,
            sodiumMg: (sampleProduct.nutrition?.sodiumMg || 600) + 120,
            addedSugarsG: 8,
          }
        : undefined,
      status: 'warning',
    };

    const entry1 = createAuditEntry({
      id: 'audit-2026-001',
      productId: sampleProduct.productId,
      version: '1.1.0',
      country: sampleProduct.country,
      authorId: 'qa_kim_01',
      authorName: '김품질 차장',
      department: '품질보증팀 (QA)',
      reason: '미국 바이어 저나트륨 인증 요청 및 FDA Added Sugars 5g 이하 기준 준수를 위한 레시피 변경',
      prevLabel: prevVersion,
      currentLabel: sampleProduct,
      signOffStatus: 'approved',
      signedBy: '박신뢰 본부장 (RA/QA Head)',
      comments: '나트륨 120mg 감축 및 첨가당 기준 충족 확인 완료. 미국 수출용 최종 승인.',
    });

    const entry2 = createAuditEntry({
      id: 'audit-2026-002',
      productId: 'prod-kimchi',
      version: '2.0.0',
      country: 'CN',
      authorId: 'ra_lee_02',
      authorName: '이해관 과장',
      department: '대관인허가팀 (RA)',
      reason: '중국 GB 7718-2025 개정안 대비 "0添加" 마케팅 소구 전면 삭제 및 GACC CIFER 번호 갱신',
      prevLabel: {
        productNameEn: 'Traditional Mat Kimchi',
        claimsBadges: ['零添加', '전통발효'],
      } as Partial<FoodLabel>,
      currentLabel: {
        productNameEn: 'Traditional Mat Kimchi (Export Ver)',
        claimsBadges: ['전통발효'],
      } as Partial<FoodLabel>,
      signOffStatus: 'approved',
      signedBy: '박신뢰 본부장 (RA/QA Head)',
      comments: 'GB 7718-2025 개정 위반 리스크 소거 확인. 중국 라벨 인쇄 승인.',
    });

    return [entry1, entry2];
  });

  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialLabels[0]?.productId || 'prod-1'
  );
  const [isSimulating, setIsSimulating] = useState(false);

  // --- 2. Regulatory Alerts State ---
  const alerts: RegulatoryAlertItem[] = useMemo(() => {
    return getActiveRegulatoryAlerts(initialLabels);
  }, [initialLabels]);

  // --- 3. Refusal Risk State ---
  const riskAssessments: RefusalRiskAssessment[] = useMemo(() => {
    return initialLabels.map((l) => assessRefusalRisk(l));
  }, [initialLabels]);

  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'ALL'>('ALL');
  const filteredRisks = useMemo(() => {
    if (riskFilter === 'ALL') return riskAssessments;
    return riskAssessments.filter((r) => r.riskLevel === riskFilter);
  }, [riskAssessments, riskFilter]);

  // Handler to simulate new label revision
  const handleSimulateRevision = () => {
    const target = initialLabels.find((l) => l.productId === selectedProductId);
    if (!target) return;

    setIsSimulating(true);
    const newVersion = `1.${auditEntries.length + 1}.0`;
    const newSodium = Math.max(100, (target.nutrition?.sodiumMg || 500) - 50);

    const updatedLabel: FoodLabel = {
      ...target,
      version: Number(target.version || 1) + 1,
      nutrition: target.nutrition
        ? {
            ...target.nutrition,
            sodiumMg: newSodium,
          }
        : undefined,
      claimsBadges: [...(target.claimsBadges || []), 'Low-Sodium Reformulation'],
    };

    const newEntry = createAuditEntry({
      productId: target.productId,
      version: newVersion,
      country: target.country,
      authorId: 'qa_user_curr',
      authorName: '관리자 (QA Lead)',
      department: '글로벌 품질관리본부',
      reason: `글로벌 저염 트렌드 대응 나트륨 50mg 추가 감축 (기존 ${target.nutrition?.sodiumMg || 0}mg -> ${newSodium}mg)`,
      prevLabel: target,
      currentLabel: updatedLabel,
      signOffStatus: 'approved',
      signedBy: '박신뢰 본부장 (RA/QA Head)',
      comments: '영양성분표 나트륨 재산출 및 미 FDA Low-Sodium 기준 충족 검증 완료.',
    });

    setAuditEntries([newEntry, ...auditEntries]);
    setTimeout(() => setIsSimulating(false), 300);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/labels"
              className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              ← 라벨 관리 목록
            </Link>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
              ENTERPRISE QA/RA
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mt-2 text-white flex items-center gap-2">
            🛡️ QA/RA 감사 추적 & 통관 리스크 관제 센터
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            라벨 변경 이력(Audit Trail), 글로벌 법규 개정 D-Day 모니터링, 해외 세관 통관 보류(Refusal) 사전 예측
          </p>
        </div>

        {/* Global Action */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium rounded-lg flex items-center gap-2 transition-all shadow-sm"
          >
            🖨️ 리포트 인쇄 / PDF 저장
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto mb-6 flex border-b border-slate-800 gap-2 print:hidden">
        <button
          onClick={() => setActiveTab('risk')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'risk'
              ? 'border-rose-500 text-rose-400 bg-rose-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          🚨 세관 통관 보류 리스크 레이더
          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-900/60 text-rose-300 font-mono">
            {riskAssessments.filter((r) => r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH').length} 주의
          </span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'alerts'
              ? 'border-amber-500 text-amber-400 bg-amber-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📅 글로벌 규제 개정 캘린더 (D-Day)
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 font-mono">
            {alerts.length}개 법령
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📜 QA 감사 추적 (Audit Trail & Diff)
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 font-mono">
            {auditEntries.length}건 이력
          </span>
        </button>
      </div>

      {/* Tab 1: Customs Refusal Risk Radar */}
      {activeTab === 'risk' && (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs text-slate-400">총 분석 대상 라벨</div>
              <div className="text-2xl font-bold text-white mt-1">{riskAssessments.length}개 SKUs</div>
              <div className="text-xs text-slate-500 mt-1">5대 권역 (US, CN, JP, EU, UAE)</div>
            </div>

            <div className="bg-slate-900 border border-rose-900/50 p-4 rounded-xl">
              <div className="text-xs text-rose-400 font-semibold">🔴 통관 즉각 거부 고위험 (Critical)</div>
              <div className="text-2xl font-bold text-rose-400 mt-1">
                {riskAssessments.filter((r) => r.riskLevel === 'CRITICAL').length}개
              </div>
              <div className="text-xs text-rose-500 mt-1">육류 2% 초과, 하람 돈육, 금지 첨가물</div>
            </div>

            <div className="bg-slate-900 border border-amber-900/50 p-4 rounded-xl">
              <div className="text-xs text-amber-400 font-semibold">🟠 통관 보류 경고 (High)</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {riskAssessments.filter((r) => r.riskLevel === 'HIGH').length}개
              </div>
              <div className="text-xs text-amber-500 mt-1">GACC 번호 미기재, 알레르겐 박스 누락</div>
            </div>

            <div className="bg-slate-900 border border-emerald-900/50 p-4 rounded-xl">
              <div className="text-xs text-emerald-400 font-semibold">🟢 신속 통관 안전 (Low / Mod)</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {riskAssessments.filter((r) => r.riskLevel === 'LOW' || r.riskLevel === 'MODERATE').length}개
              </div>
              <div className="text-xs text-emerald-500 mt-1">예상 통관 성공률 90% 이상</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-800 print:hidden">
            <div className="text-xs font-semibold text-slate-300">위험도 등급 필터:</div>
            <div className="flex gap-2">
              {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setRiskFilter(lvl)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                    riskFilter === lvl
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Risk Cards Grid */}
          <div className="grid grid-cols-1 gap-4">
            {filteredRisks.map((item) => (
              <div
                key={`${item.productId}-${item.country}`}
                className={`bg-slate-900 border rounded-xl p-5 transition-all ${
                  item.riskLevel === 'CRITICAL'
                    ? 'border-rose-700/60 shadow-lg shadow-rose-950/20'
                    : item.riskLevel === 'HIGH'
                    ? 'border-amber-700/60'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {item.country}
                      </span>
                      <h3 className="text-base font-bold text-white">{item.productName}</h3>
                      <span className="text-xs text-slate-400 font-mono">({item.productId})</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{item.summary}</div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">통관 리스크 스코어</div>
                      <div
                        className={`text-xl font-black font-mono ${
                          item.riskLevel === 'CRITICAL'
                            ? 'text-rose-400'
                            : item.riskLevel === 'HIGH'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {item.totalRiskScore} / 100
                      </div>
                    </div>
                    <div className="text-right pl-4 border-l border-slate-800">
                      <div className="text-xs text-slate-400">예상 통관율</div>
                      <div className="text-lg font-bold text-indigo-400 font-mono">
                        {item.clearanceProbability}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Drivers List */}
                {item.riskDrivers.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      감지된 통관 보류 요인 ({item.riskDrivers.length}건)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {item.riskDrivers.map((driver) => (
                        <div
                          key={driver.code}
                          className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-rose-400 flex items-center gap-1">
                              ⚠️ {driver.title}
                            </span>
                            <span className="font-mono text-rose-300 bg-rose-950/60 px-1.5 py-0.5 rounded text-[10px]">
                              +{driver.scoreContribution} pt
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">{driver.description}</p>
                          {driver.precedentCase && (
                            <div className="text-[10px] text-amber-300/80 bg-amber-950/30 p-1.5 rounded border border-amber-900/30">
                              <span className="font-semibold">과거 세관 거부 판례:</span> {driver.precedentCase}
                            </div>
                          )}
                          <div className="text-[10px] text-emerald-400 bg-emerald-950/30 p-1.5 rounded border border-emerald-900/30">
                            <span className="font-semibold">권장 해결책:</span> {driver.mitigationAction}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1.5">
                    <span>✓</span> 세관 통관 보류 요인 없음. 현행 법규 기준 안전 통관 예상.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Regulatory Amendments Alerts (D-Day) */}
      {activeTab === 'alerts' && (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              📢 5대 수출 권역 주요 법규 개정 타임라인 & D-Day 알림
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              미국 FDA, 중국 SAMR/GACC, 일본 CAA, 유럽 EC, UAE MoIAT의 최신 법령 개정 사항 및 자사 라벨 영향 분석
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {alerts.map((item) => (
              <div
                key={item.amendment.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden"
              >
                {/* D-Day badge */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                        {item.amendment.country}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {item.amendment.authority} | {item.amendment.regulationName}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1.5">{item.amendment.title}</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">시행일: {item.amendment.effectiveDate}</div>
                      <div
                        className={`text-lg font-black font-mono ${
                          item.status === 'IN_FORCE'
                            ? 'text-rose-400'
                            : item.status === 'D_30'
                            ? 'text-amber-400'
                            : 'text-indigo-400'
                        }`}
                      >
                        {item.status === 'IN_FORCE'
                          ? '현재 시행 중 (In Force)'
                          : `D-${item.daysRemaining}일`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-300 leading-relaxed">
                  {item.amendment.summary}
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[11px] font-semibold text-amber-400">필수 조치 사항:</span>
                    <p className="text-xs text-slate-300 mt-1">{item.amendment.actionRequired}</p>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[11px] font-semibold text-indigo-400">
                      영향받는 자사 라벨 품목 ({item.affectedProductIds.length}건):
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {item.affectedProductIds.length > 0 ? (
                        item.affectedProductIds.map((pid) => (
                          <Link
                            key={pid}
                            href={`/admin/labels/${pid}`}
                            className="text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-700 transition-colors"
                          >
                            {pid} →
                          </Link>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-500">직접적인 해당 품목 없음 (안전)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: QA/RA Audit Trail & Version Diff */}
      {activeTab === 'audit' && (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Action Header */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                📜 라벨 버전 변경 감사 로그 (Audit Trail & Version Diff)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                원재료 배합비, 영양성분, 소구 문구의 전/후 변경점(Diff) 자동 추출 및 QA 책임자 전자 서명
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2"
              >
                {initialLabels.map((l) => (
                  <option key={l.productId} value={l.productId}>
                    [{l.country}] {getDisplayName(l)} ({l.productId})
                  </option>
                ))}
              </select>

              <button
                onClick={handleSimulateRevision}
                disabled={isSimulating}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
              >
                + 저염 변경 버전 생성 시뮬레이션
              </button>
            </div>
          </div>

          {/* Audit Entries Timeline */}
          <div className="space-y-4">
            {auditEntries.map((entry) => (
              <div
                key={entry.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm"
              >
                {/* Entry Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
                      Version {entry.version}
                    </span>
                    <span className="text-xs font-mono text-slate-400">[{entry.country}]</span>
                    <span className="text-sm font-semibold text-white">{entry.productId}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>작업자: <strong className="text-slate-200">{entry.authorName}</strong> ({entry.department})</span>
                    <span>•</span>
                    <span className="font-mono">{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                {/* Reason */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-xs">
                  <span className="font-semibold text-indigo-400">변경 사유:</span>
                  <p className="text-slate-300 mt-1">{entry.reason}</p>
                </div>

                {/* Field-level Diffs */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    필드 단위 변경 상세 (Diffs: {entry.diffs.length}건)
                  </div>
                  <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                          <th className="p-2.5 font-medium">필드 항목</th>
                          <th className="p-2.5 font-medium text-rose-400">이전 값 (Previous)</th>
                          <th className="p-2.5 font-medium text-emerald-400">변경 값 (Current)</th>
                          <th className="p-2.5 font-medium text-center">유형</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                        {entry.diffs.map((diff, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/40">
                            <td className="p-2.5 text-slate-300 font-sans font-medium">{diff.label}</td>
                            <td className="p-2.5 text-rose-300 line-through">
                              {diff.oldValue !== null ? String(diff.oldValue) : '(없음)'}
                            </td>
                            <td className="p-2.5 text-emerald-300 font-bold">
                              {diff.newValue !== null ? String(diff.newValue) : '(삭제)'}
                            </td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-sans uppercase ${
                                  diff.changeType === 'added'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : diff.changeType === 'removed'
                                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                                }`}
                              >
                                {diff.changeType}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* QA Sign-off Block */}
                <div className="bg-slate-950 p-3.5 rounded-lg border border-emerald-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-400">✓ QA 책임자 전자 승인 (Sign-off) 완료</span>
                      <span className="font-mono text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                        {entry.signOff.signatureHash}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      승인자: {entry.signOff.signedBy} ({entry.signOff.department}) • 승인의견: {entry.signOff.comments}
                    </div>
                  </div>

                  <div className="text-emerald-400 text-xs font-semibold bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-md text-center">
                    승인 상태: APPROVED
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
