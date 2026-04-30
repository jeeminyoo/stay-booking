"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { fetchAllPropertiesAdmin, fetchAllBookingsAdmin, fetchAllHostSettingsAdmin, fetchAllSubscriptions, upsertSubscription, fetchAllBankAccountLogs } from "@/lib/db";
import { SavedProperty, Booking, KakaoUser, HostSettings, Subscription, SubscriptionStatus, BankAccountLog } from "@/lib/types";

const ADMIN_ID = "4855799810";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  waiting_for_deposit: { label: "입금대기",     className: "bg-yellow-100 text-yellow-700" },
  deposit_requested:   { label: "입금확인요청", className: "bg-blue-100 text-blue-700" },
  confirmed:           { label: "확정",         className: "bg-green-100 text-green-700" },
  auto_cancelled:      { label: "자동취소",     className: "bg-red-100 text-red-400" },
  cancelled:           { label: "취소",         className: "bg-gray-100 text-gray-500" },
};

function fmt(d: string) {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${y}.${m}.${parseInt(day)}`;
}

function fmtDt(d: string) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<KakaoUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [properties, setProperties] = useState<SavedProperty[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hostSettings, setHostSettings] = useState<HostSettings[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [bankLogs, setBankLogs] = useState<BankAccountLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "bookings" | "properties" | "subscriptions" | "banklogs">("overview");
  const [search, setSearch] = useState("");
  const [subSaving, setSubSaving] = useState<string | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u || u.id !== ADMIN_ID) {
      router.replace("/login");
      return;
    }
    setUser(u);
    setChecked(true);
  }, [router]);

  useEffect(() => {
    if (!checked) return;
    Promise.all([fetchAllPropertiesAdmin(), fetchAllBookingsAdmin(), fetchAllHostSettingsAdmin(), fetchAllSubscriptions(), fetchAllBankAccountLogs()])
      .then(([props, bks, hs, subs, logs]) => {
        setProperties(props);
        setBookings(bks);
        setHostSettings(hs);
        setSubscriptions(subs);
        setBankLogs(logs);
      })
      .finally(() => setLoading(false));
  }, [checked]);

  if (!checked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── 통계 계산 ───────────────────────────────────────────────────────────────
  const totalProperties = properties.length;
  const activeProperties = properties.filter(p => p.is_active && !p.is_draft).length;
  const draftProperties = properties.filter(p => p.is_draft).length;
  const uniqueHosts = new Set(properties.map(p => p.host_id)).size;

  const totalBookings = bookings.length;
  const bookingsByStatus = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});
  const confirmedRevenue = bookings
    .filter(b => b.status === "confirmed")
    .reduce((sum, b) => sum + b.total_price, 0);

  // 최근 30일 예약
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const recentBookings = bookings.filter(b => new Date(b.created_at) >= cutoff).length;

  // 숙소별 예약 수
  const bookingsByProperty = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.property_id] = (acc[b.property_id] ?? 0) + 1;
    return acc;
  }, {});

  // 검색 필터 (예약)
  const q = search.trim().toLowerCase();
  const filteredBookings = q
    ? bookings.filter(b =>
        b.id.toLowerCase().includes(q) ||
        b.guest_name.toLowerCase().includes(q) ||
        b.guest_phone.includes(q) ||
        b.property_name.toLowerCase().includes(q) ||
        b.room_name.toLowerCase().includes(q)
      )
    : bookings;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <p className="font-bold text-gray-900 text-base">관리자 대시보드</p>
          <p className="text-xs text-gray-400">{user?.nickname}</p>
        </div>
        {/* 탭 */}
        <div className="max-w-5xl mx-auto px-4 flex gap-0 border-t border-gray-100">
          {(["overview", "bookings", "properties", "subscriptions", "banklogs"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t === "overview" ? "개요" : t === "bookings" ? "예약" : t === "properties" ? "숙소" : t === "subscriptions" ? "구독" : (
                <span className="flex items-center gap-1">
                  계좌이력
                  {bankLogs.length > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{bankLogs.length}</span>}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

        {/* ─── 개요 탭 ─────────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <>
            {/* 핵심 지표 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "전체 호스트", value: uniqueHosts, sub: "명" },
                { label: "전체 숙소", value: totalProperties, sub: `게시중 ${activeProperties}` },
                { label: "전체 예약", value: totalBookings, sub: `최근 30일 ${recentBookings}건` },
                { label: "확정 매출 합계", value: confirmedRevenue.toLocaleString(), sub: "원 (확정건 기준)" },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
                  <p className="text-xs text-gray-400">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* 예약 상태별 */}
            <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
              <p className="text-sm font-semibold text-gray-900 mb-3">예약 상태별 현황</p>
              <div className="space-y-2">
                {Object.entries(STATUS_LABEL).map(([key, { label, className }]) => {
                  const cnt = bookingsByStatus[key] ?? 0;
                  const pct = totalBookings > 0 ? Math.round(cnt / totalBookings * 100) : 0;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-24 text-center shrink-0 ${className}`}>{label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-indigo-400 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm text-gray-700 font-medium w-10 text-right">{cnt}건</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 숙소별 예약 수 TOP */}
            <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
              <p className="text-sm font-semibold text-gray-900 mb-3">숙소별 예약 현황</p>
              <div className="space-y-2">
                {properties
                  .sort((a, b) => (bookingsByProperty[b.id] ?? 0) - (bookingsByProperty[a.id] ?? 0))
                  .map(p => (
                    <div key={p.id} className="flex items-center gap-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${p.is_active && !p.is_draft ? "bg-green-400" : "bg-gray-300"}`} />
                        <span className="text-gray-800 font-medium">{p.name}</span>
                        <span className="text-gray-400 text-xs ml-2">{p.slug}</span>
                      </div>
                      <span className="text-gray-500 shrink-0">{bookingsByProperty[p.id] ?? 0}건</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* 호스트 목록 */}
            <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
              <p className="text-sm font-semibold text-gray-900 mb-3">호스트 가입 현황 ({uniqueHosts}명)</p>
              <div className="space-y-2">
                {Array.from(new Set(properties.map(p => p.host_id))).map(hostId => {
                  const hostProps = properties.filter(p => p.host_id === hostId);
                  const firstProp = hostProps[0];
                  const hs = hostSettings.find(s => s.host_id === hostId);
                  return (
                    <div key={hostId} className="flex items-center gap-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 font-medium truncate">{hs?.host_name ?? "-"}</p>
                        <p className="text-xs text-gray-400 mt-0.5">카카오 ID: {hostId}</p>
                      </div>
                      <span className="text-gray-400 text-xs shrink-0">숙소 {hostProps.length}개</span>
                      <span className="text-gray-400 text-xs shrink-0">{fmt(firstProp?.created_at?.slice(0,10) ?? "")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ─── 예약 탭 ─────────────────────────────────────────────────────── */}
        {tab === "bookings" && (
          <>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="예약ID, 게스트명, 연락처, 숙소명 검색"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs text-gray-400">{filteredBookings.length}건</p>
            <div className="space-y-2">
              {filteredBookings.map(b => {
                const sl = STATUS_LABEL[b.status];
                return (
                  <div key={b.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{b.guest_name} · {b.guest_phone.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3")}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{b.property_name} · {b.room_name}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${sl?.className ?? "bg-gray-100 text-gray-500"}`}>{sl?.label ?? b.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>{fmt(b.check_in)} ~ {fmt(b.check_out)}</span>
                      <span>성인 {b.adults} · 어린이 {b.children} · 유아 {b.infants}</span>
                      <span className="font-medium text-gray-700">{b.total_price.toLocaleString()}원</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span>{b.id}</span>
                      <span>접수 {fmtDt(b.created_at)}</span>
                    </div>
                    {b.guest_message && (
                      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">"{b.guest_message}"</p>
                    )}
                  </div>
                );
              })}
              {filteredBookings.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-10">검색 결과가 없습니다.</p>
              )}
            </div>
          </>
        )}

        {/* ─── 숙소 탭 ─────────────────────────────────────────────────────── */}
        {tab === "properties" && (
          <div className="space-y-2">
            {properties.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">호스트 {p.host_id}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {p.is_draft && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">임시저장</span>}
                    {!p.is_draft && !p.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-500">비활성</span>}
                    {!p.is_draft && p.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">게시중</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                  <span>/{p.slug}</span>
                  <span>예약 {bookingsByProperty[p.id] ?? 0}건</span>
                  <span>등록 {fmt(p.created_at?.slice(0,10) ?? "")}</span>
                </div>
                {p.address && <p className="text-xs text-gray-400">{p.address}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ─── 구독 탭 ─────────────────────────────────────────────────────── */}
        {tab === "subscriptions" && (() => {
          const today = new Date().toISOString().slice(0, 10);
          const hostIds = Array.from(new Set(properties.map(p => p.host_id)));

          const SUB_LABEL: Record<SubscriptionStatus, { label: string; className: string }> = {
            trial:   { label: "무료체험", className: "bg-blue-100 text-blue-600" },
            active:  { label: "구독중",   className: "bg-green-100 text-green-600" },
            expired: { label: "만료",     className: "bg-red-100 text-red-500" },
          };

          async function handleSave(sub: Subscription) {
            setSubSaving(sub.host_id);
            try {
              await upsertSubscription(sub);
              setSubscriptions(prev => {
                const idx = prev.findIndex(s => s.host_id === sub.host_id);
                if (idx >= 0) { const next = [...prev]; next[idx] = sub; return next; }
                return [...prev, sub];
              });
            } finally {
              setSubSaving(null);
            }
          }

          return (
            <div className="space-y-3">
              {hostIds.map(hostId => {
                const hs = hostSettings.find(s => s.host_id === hostId);
                const sub = subscriptions.find(s => s.host_id === hostId);
                const hostName = hs?.host_name || hostId;
                const trialRemaining = sub ? Math.ceil((new Date(sub.trial_end).getTime() - new Date(today).getTime()) / 86400000) : null;

                return (
                  <div key={hostId} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{hostName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{hostId}</p>
                      </div>
                      {sub ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${SUB_LABEL[sub.status].className}`}>
                          {SUB_LABEL[sub.status].label}
                          {sub.status === "trial" && trialRemaining !== null && (
                            <span className="ml-1">· {trialRemaining > 0 ? `${trialRemaining}일 남음` : "기간 만료"}</span>
                          )}
                          {sub.status === "active" && sub.paid_until && (
                            <span className="ml-1">· {fmt(sub.paid_until)}까지</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">미등록</span>
                      )}
                    </div>

                    {sub ? (
                      <div className="space-y-2">
                        <div className="flex gap-2 flex-wrap">
                          {(["trial", "active", "expired"] as SubscriptionStatus[]).map(s => (
                            <button key={s} onClick={() => handleSave({ ...sub, status: s })}
                              disabled={sub.status === s || subSaving === hostId}
                              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 ${
                                sub.status === s ? `${SUB_LABEL[s].className} cursor-default` : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}>
                              {SUB_LABEL[s].label}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 items-center text-xs text-gray-500">
                          <span>무료체험</span>
                          <input type="date" value={sub.trial_start}
                            onChange={e => setSubscriptions(prev => prev.map(s => s.host_id === hostId ? { ...s, trial_start: e.target.value } : s))}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                          <span>~</span>
                          <input type="date" value={sub.trial_end}
                            onChange={e => setSubscriptions(prev => prev.map(s => s.host_id === hostId ? { ...s, trial_end: e.target.value } : s))}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                        </div>
                        <div className="flex gap-2 items-center text-xs text-gray-500">
                          <span>유료구독 만료일</span>
                          <input type="date" value={sub.paid_until ?? ""}
                            onChange={e => setSubscriptions(prev => prev.map(s => s.host_id === hostId ? { ...s, paid_until: e.target.value } : s))}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                        </div>
                        <input type="text" value={sub.memo ?? ""} placeholder="메모"
                          onChange={e => setSubscriptions(prev => prev.map(s => s.host_id === hostId ? { ...s, memo: e.target.value } : s))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                        <button onClick={() => handleSave(sub)} disabled={subSaving === hostId}
                          className="w-full py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                          {subSaving === hostId ? "저장 중..." : "저장"}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleSave({
                        host_id: hostId, status: "trial",
                        trial_start: today, trial_end: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().slice(0,10),
                        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
                      })} className="w-full py-2 rounded-xl text-xs font-semibold border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors">
                        무료체험으로 등록 (3개월)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ─── 계좌이력 탭 ──────────────────────────────────────────────────── */}
        {tab === "banklogs" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">계좌 변경 이력 ({bankLogs.length}건)</p>
              {bankLogs.length === 0 && <p className="text-xs text-gray-400">변경 이력 없음</p>}
            </div>
            {bankLogs.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {bankLogs.map(log => {
                  const hs = hostSettings.find(h => h.host_id === log.host_id);
                  const hostName = hs?.host_name ?? log.host_id;
                  return (
                    <div key={log.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{hostName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{log.host_id}</p>
                        </div>
                        <p className="text-xs text-gray-400 whitespace-nowrap shrink-0">{fmtDt(log.changed_at)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-red-50 rounded-xl px-3 py-2.5 text-xs space-y-1">
                          <p className="text-red-400 font-semibold mb-1">변경 전</p>
                          <p className="text-gray-600">{log.old_bank_name ?? "-"}</p>
                          <p className="text-gray-800 font-mono font-semibold">{log.old_bank_account ?? "-"}</p>
                          <p className="text-gray-500">{log.old_bank_holder ?? "-"}</p>
                        </div>
                        <div className="bg-green-50 rounded-xl px-3 py-2.5 text-xs space-y-1">
                          <p className="text-green-500 font-semibold mb-1">변경 후</p>
                          <p className="text-gray-600">{log.new_bank_name ?? "-"}</p>
                          <p className="text-gray-800 font-mono font-semibold">{log.new_bank_account ?? "-"}</p>
                          <p className="text-gray-500">{log.new_bank_holder ?? "-"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
