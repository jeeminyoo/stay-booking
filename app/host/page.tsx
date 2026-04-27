"use client";

import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { useRouter, useSearchParams } from "next/navigation";
import { SavedProperty, KakaoUser, Booking, HostSettings } from "@/lib/types";
import { getUser, clearUser } from "@/lib/auth";
import { fetchHostProperties, deletePropertyById, patchBooking, fetchHostSettings, upsertHostSettings, patchPropertyActive, fetchHostBookingsPaged } from "@/lib/db";
import { expireOverdueBookings } from "@/lib/data";
import AvailabilityTab from "@/components/host/AvailabilityTab";

function SuccessBanner() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      setShow(true);
      setTimeout(() => setShow(false), 4000);
    }
  }, [searchParams]);
  if (!show) return null;
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-6 flex items-center gap-3">
      <span className="text-2xl">🎉</span>
      <div>
        <p className="font-semibold text-green-800">숙소가 등록되었습니다!</p>
        <p className="text-sm text-green-600">게스트에게 단축 링크를 공유해보세요.</p>
      </div>
    </div>
  );
}


function formatDate(d: string) {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${y}.${m}.${parseInt(day)}`;
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  waiting_for_deposit: { label: "입금 대기",    className: "bg-yellow-100 text-yellow-700" },
  deposit_requested:   { label: "입금확인요청", className: "bg-blue-100 text-blue-700" },
  confirmed:           { label: "확정",         className: "bg-green-100 text-green-700" },
  auto_cancelled:      { label: "자동취소",     className: "bg-red-100 text-red-400" },
  cancelled:           { label: "취소",         className: "bg-gray-100 text-gray-500" },
};

const AUTO_CANCEL_OPTIONS = [
  { value: 30,   label: "30분" },
  { value: 60,   label: "1시간" },
  { value: 180,  label: "3시간" },
  { value: 360,  label: "6시간" },
  { value: 1440, label: "24시간" },
];

const DEFAULT_SETTINGS: Omit<HostSettings, "host_id" | "updated_at"> = {
  auto_cancel_minutes: 60,
  unavailable_start: "21:00",
  unavailable_end: "08:00",
};

export default function HostDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<KakaoUser | null>(null);
  const [properties, setProperties] = useState<SavedProperty[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingFilter, setBookingFilter] = useState<string | null>(null);
  const [bookingPage, setBookingPage] = useState(0);
  const [hasMoreBookings, setHasMoreBookings] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [checked, setChecked] = useState(false);
  const [tab, setTab] = useState<"bookings" | "availability" | "properties" | "settings">("bookings");
  const [settings, setSettings] = useState<HostSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [toast, setToast] = useState("");
  const [highlightBookingId, setHighlightBookingId] = useState<string | null>(null);
  const [noticeSheetProperty, setNoticeSheetProperty] = useState<SavedProperty | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab") as "bookings" | "availability" | "properties" | "settings" | null;
    const bookingId = params.get("booking");
    const registeredId = params.get("registered") === "1" ? params.get("id") : null;
    if (t) setTab(t);
    if (bookingId) { setTab("bookings"); setHighlightBookingId(bookingId); }

    const u = getUser();
    setUser(u);
    setChecked(true);
    if (!u) return;
    setHasDraft(!!localStorage.getItem("host_property_draft"));
    expireOverdueBookings().catch(console.error);
    fetchHostProperties(u.id).then((props) => {
      setProperties(props);
      const ids = props.map(p => p.id);
      setPropertyIds(ids);
      if (registeredId) {
        const target = props.find(p => p.id === registeredId);
        if (target && !target.notice?.trim() && !target.rooms.some(r => r.notice?.trim())) {
          setNoticeSheetProperty(target);
        }
      }
      return ids;
    }).then((ids) => loadBookings(ids, null, 0, true)).catch(console.error);
    fetchHostSettings(u.id).then((s) => {
      setSettings(s ?? { host_id: u.id, updated_at: "", ...DEFAULT_SETTINGS });
    });
  }, []);

  const getCutoff = useCallback(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split("T")[0];
  }, []);

  const loadBookings = useCallback(async (ids: string[], filter: string | null, page: number, reset: boolean) => {
    if (ids.length === 0) return;
    setBookingLoading(true);
    try {
      const { bookings: next, hasMore } = await fetchHostBookingsPaged(ids, filter, getCutoff(), page);
      setBookings(prev => reset ? next : [...prev, ...next]);
      setHasMoreBookings(hasMore);
      setBookingPage(page);
    } finally {
      setBookingLoading(false);
    }
  }, [getCutoff]);

  // 필터 변경 시 리셋
  const handleFilterChange = useCallback((filter: string | null) => {
    setBookingFilter(filter);
    loadBookings(propertyIds, filter, 0, true);
  }, [propertyIds, loadBookings]);

  // 무한 스크롤 sentinel 감지
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreBookings && !bookingLoading) {
        loadBookings(propertyIds, bookingFilter, bookingPage + 1, false);
      }
    }, { threshold: 0.1 });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMoreBookings, bookingLoading, bookingPage, bookingFilter, propertyIds, loadBookings]);

  // 예약 카드로 자동 스크롤
  useEffect(() => {
    if (!highlightBookingId || bookings.length === 0) return;
    const el = document.getElementById(`booking-${highlightBookingId}`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }
  }, [highlightBookingId, bookings]);

  function handleLogout() {
    clearUser();
    setUser(null);
    router.refresh();
  }

  async function deleteProperty(id: string) {
    if (!confirm("이 숙소를 삭제하시겠습니까?")) return;
    await deletePropertyById(id);
    setProperties(prev => prev.filter(p => p.id !== id));
    setBookings(prev => prev.filter(b => b.property_id !== id));
  }

  async function confirmBooking(id: string) {
    await patchBooking(id, { status: "confirmed" });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "confirmed" } : b));
  }

  async function toggleActive(p: SavedProperty) {
    const currentActive = p.is_active !== false; // null/undefined → true로 취급
    const nextActive = !currentActive;
    if (nextActive) {
      const hasNotice = p.notice?.trim() || p.rooms.some(r => r.notice?.trim());
      if (!hasNotice) {
        alert("이용 유의사항을 먼저 등록해주세요.\n게시중으로 전환하려면 유의사항이 필요합니다.");
        router.push(`/host/notice/${p.id}`);
        return;
      }
    }
    try {
      await patchPropertyActive(p.id, nextActive);
      setProperties(prev => prev.map(prop => prop.id === p.id ? { ...prop, is_active: nextActive } : prop));
      showToast(nextActive ? "게시중으로 전환되었습니다" : "비노출로 전환되었습니다");
    } catch (e) {
      const msg = e instanceof Error ? e.message
        : (e as { message?: string })?.message
        ?? JSON.stringify(e);
      if (msg.includes("is_active") || msg.includes("schema cache")) {
        alert("Supabase 마이그레이션이 필요합니다.\nSQL Editor에서 아래를 실행해주세요:\n\nalter table properties add column if not exists is_active boolean not null default true;");
      } else {
        alert("오류: " + msg);
      }
    }
  }

  async function cancelBooking(id: string) {
    if (!confirm("이 예약을 취소하시겠습니까?")) return;
    await patchBooking(id, { status: "cancelled" });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
  }

  async function saveSettings() {
    if (!settings || !user) return;
    setSettingsSaving(true);
    try {
      await upsertHostSettings({ ...settings, host_id: user.id, updated_at: new Date().toISOString() });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } finally {
      setSettingsSaving(false);
    }
  }

  if (!checked) return null;
  if (!user) { router.replace("/login"); return null; }

  const actionNeededCount = bookings.filter(b =>
    b.status === "waiting_for_deposit" || b.status === "deposit_requested"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 유의사항 미등록 바텀시트 */}
      {noticeSheetProperty && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setNoticeSheetProperty(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-t-3xl px-6 pt-6 pb-10 shadow-xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
            <div className="flex items-start gap-4 mb-6">
              <span className="text-3xl">📋</span>
              <div>
                <p className="font-bold text-gray-900 text-base mb-1">유의사항을 등록해주세요</p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  게스트가 예약 완료 후 확인하는 중요한 안내입니다.<br />
                  입실·퇴실 규칙, 주의사항 등을 등록해두면<br />
                  불필요한 문의를 줄일 수 있어요.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setNoticeSheetProperty(null)}
                className="flex-1 border border-gray-200 text-gray-500 py-3.5 rounded-2xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                나중에
              </button>
              <button
                onClick={() => { setNoticeSheetProperty(null); router.push(`/host/notice/${noticeSheetProperty.id}`); }}
                className="flex-1 bg-indigo-600 text-white py-3.5 rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-colors">
                지금 등록하기
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/"><Logo /></Link>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600 text-sm">호스트</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/host/help" className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors text-sm font-semibold">?</Link>
            <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">로그아웃</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Suspense><SuccessBanner /></Suspense>

        {hasDraft && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 mb-6 flex items-center justify-between">
            <p className="text-sm text-orange-700 font-medium">임시저장된 숙소 등록이 있습니다.</p>
            <Link href="/host/new" className="text-sm text-orange-700 font-semibold underline">이어서 등록</Link>
          </div>
        )}

        {/* 탭 */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
          {[
            { key: "bookings",     label: "예약\n알림" },
            { key: "availability", label: "예약\n현황" },
            { key: "properties",   label: "내\n숙소" },
            { key: "settings",     label: "설정" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key as typeof tab)}
              className={`relative px-3 py-2 rounded-lg text-sm font-semibold transition-colors text-center whitespace-pre-line leading-tight
                ${tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {label}
              {key === "bookings" && actionNeededCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">{actionNeededCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* ─── 예약 현황 탭 ─── */}
        {tab === "availability" && user && (
          <AvailabilityTab user={user} properties={properties} bookings={bookings} onConfirmBooking={confirmBooking} />
        )}

        {/* ─── 예약 알림 탭 ─── */}
        {tab === "bookings" && (
          <div>
            {/* 상태 필터 */}
            <div className="mb-4 relative inline-block">
              <select
                value={bookingFilter ?? ""}
                onChange={e => handleFilterChange(e.target.value || null)}
                className="appearance-none border border-gray-200 rounded-xl pl-3 pr-10 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent">
                <option value="">전체</option>
                <option value="waiting_for_deposit">입금 대기</option>
                <option value="deposit_requested">입금확인요청</option>
                <option value="confirmed">확정</option>
                <option value="auto_cancelled">자동취소</option>
                <option value="cancelled">취소</option>
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {bookings.length === 0 && !bookingLoading ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-base font-semibold text-gray-700 mb-1">예약 내역이 없습니다</p>
                <p className="text-sm text-gray-400">최근 6개월 기준으로 표시됩니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => {
                  const s = STATUS_LABEL[b.status] ?? STATUS_LABEL.cancelled;
                  const canAct = b.status === "waiting_for_deposit" || b.status === "deposit_requested";
                  const isHighlighted = highlightBookingId === b.id;
                  return (
                    <div key={b.id} id={`booking-${b.id}`}
                      className={`bg-white rounded-2xl border overflow-hidden transition-all duration-500
                        ${isHighlighted ? "border-indigo-400 ring-2 ring-indigo-200 shadow-md" : "border-gray-100"}`}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{b.property_name}</p>
                            <p className="text-xs text-gray-400">{b.room_name}</p>
                          </div>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${s.className}`}>{s.label}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                          <div><span className="text-gray-400">체크인</span> {formatDate(b.check_in)}</div>
                          <div><span className="text-gray-400">체크아웃</span> {formatDate(b.check_out)}</div>
                          <div><span className="text-gray-400">예약자</span> {b.guest_name}</div>
                          <div><span className="text-gray-400">연락처</span> {b.guest_phone}</div>
                          <div><span className="text-gray-400">인원</span> 성인 {b.adults}{b.children > 0 ? ` · 어린이 ${b.children}` : ""}{b.infants > 0 ? ` · 유아 ${b.infants}` : ""}</div>
                          <div className="font-semibold text-gray-800"><span className="text-gray-400 font-normal">금액</span> {b.total_price.toLocaleString()}원</div>
                        </div>
                        {b.guest_message && (
                          <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 border-l-2 border-indigo-200 mb-2">
                            <span className="text-gray-400 mr-1 font-medium">예약 메시지</span>{b.guest_message}
                          </div>
                        )}
                        {b.payment_note && (
                          <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 border-l-2 border-blue-300 mb-2">
                            <span className="text-blue-400 mr-1 font-medium">입금 메시지</span>{b.payment_note}
                          </div>
                        )}
                      </div>
                      {canAct && (
                        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex gap-2">
                          <button onClick={() => confirmBooking(b.id)}
                            className="flex-1 bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
                            예약 확정
                          </button>
                          <button onClick={() => cancelBooking(b.id)}
                            className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-100 transition-colors">
                            예약 취소
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 무한 스크롤 sentinel */}
                <div ref={sentinelRef} className="h-4" />
                {bookingLoading && (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!hasMoreBookings && bookings.length > 0 && (
                  <p className="text-center text-xs text-gray-300 py-2">최근 6개월 예약 전체 표시됨</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── 내 숙소 탭 ─── */}
        {tab === "properties" && (
          <div>
            {properties.length > 0 && (
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm text-gray-400">{properties.length}개</span>
                <button onClick={() => { localStorage.removeItem("host_property_draft"); router.push("/host/new"); }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                  + 새 숙소 등록
                </button>
              </div>
            )}
            {properties.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
                <p className="text-5xl mb-4">🏡</p>
                <p className="text-base font-semibold text-gray-700 mb-2">아직 등록된 숙소가 없습니다</p>
                <p className="text-sm text-gray-400 mb-6">숙소를 등록하면 수수료 없이 예약을 받을 수 있어요</p>
                <button onClick={() => { localStorage.removeItem("host_property_draft"); router.push("/host/new"); }}
                  className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-indigo-700 transition-colors">
                  숙소 등록하기
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {properties.map((p) => (
                  <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="h-44 bg-gray-200 relative">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                        : <div className="w-full h-full flex items-center justify-center"><span className="text-5xl">🏡</span></div>}
                      {p.is_draft && (
                        <span className="absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-full bg-orange-100 text-orange-600">
                          임시저장
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h2 className="font-bold text-gray-900 mb-0.5">{p.name}</h2>
                      <p className="text-sm text-gray-500 mb-3">{p.address}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                        <span>객실 {p.rooms.length}개</span>
                        <span>·</span>
                        <span className="font-mono">/s/{p.slug}</span>
                      </div>
                      {!p.is_draft && (
                        <button
                          type="button"
                          onClick={() => toggleActive(p)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors mb-3">
                          <span className="text-xs font-medium text-gray-600">게시 상태</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${p.is_active !== false ? "text-green-600" : "text-gray-400"}`}>
                              {p.is_active !== false ? "게시중" : "비노출"}
                            </span>
                            <div className={`w-10 rounded-full flex items-center px-0.5 transition-colors ${p.is_active !== false ? "bg-green-500" : "bg-gray-300"}`}
                              style={{ height: "22px" }}>
                              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${p.is_active !== false ? "translate-x-[18px]" : "translate-x-0"}`} />
                            </div>
                          </div>
                        </button>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            localStorage.setItem("host_property_draft", JSON.stringify({
                              id: p.id,
                              name: p.name,
                              description: p.description,
                              address: p.address,
                              address_detail: p.address_detail ?? "",
                              lat: p.lat,
                              lng: p.lng,
                              image_url: p.image_url,
                              images: p.images?.length ? p.images : (p.image_url ? [{ id: "cover-0", thumb_url: p.image_url, main_url: p.image_url }] : []),
                              slug: p.slug,
                              bank_name: p.bank_name,
                              bank_account: p.bank_account,
                              bank_holder: p.bank_holder,
                              rooms: (p.rooms || []).map((r, i) => ({
                                name: r.name,
                                max_guests: r.max_guests,
                                base_guests: r.base_guests,
                                max_infants: r.max_infants,
                                bedrooms: r.bedrooms,
                                beds: r.beds,
                                bathrooms: r.bathrooms,
                                image_url: r.image_url,
                                images: r.images?.length ? r.images : (r.image_url ? [{ id: `room-${i}-0`, thumb_url: r.image_url, main_url: r.image_url }] : []),
                                weekday_price: r.weekday_price || 0,
                                friday_price: r.friday_price || 0,
                                weekend_price: r.weekend_price || 0,
                                sunday_price: r.sunday_price || 0,
                                extra_adult_price: r.extra_adult_price || 0,
                                extra_child_price: r.extra_child_price || 0,
                                special_prices: r.special_prices || [],
                              })),
                            }));
                            router.push("/host/new");
                          }}
                          className="flex-1 text-center text-sm border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                          수정
                        </button>
                        <button
                          onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/s/${p.slug}`); showToast("링크가 복사되었습니다"); }}
                          className="flex-1 text-sm border border-indigo-200 text-indigo-600 bg-indigo-50 py-2 rounded-lg hover:bg-indigo-100 transition-colors">
                          링크 복사
                        </button>
                        <button onClick={() => deleteProperty(p.id)} className="text-sm text-red-400 border border-red-100 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">삭제</button>
                      </div>
                      {/* 유의사항 미등록 경고 */}
                      {!(p.notice?.trim() || p.rooms.some(r => r.notice?.trim())) && (
                        <div className="mt-2 flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base">⚠️</span>
                            <div>
                              <p className="text-xs font-semibold text-orange-800">유의사항 미등록</p>
                              <p className="text-xs text-orange-600">게스트 예약 후 안내 불가</p>
                            </div>
                          </div>
                          <button
                            onClick={() => router.push(`/host/notice/${p.id}`)}
                            className="text-xs font-bold text-orange-700 bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-200 transition-colors shrink-0">
                            등록하기 →
                          </button>
                        </div>
                      )}
                      {/* 유의사항 버튼 */}
                      <button
                        onClick={() => router.push(`/host/notice/${p.id}`)}
                        className="w-full mt-2 text-sm border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
                        <span>📋</span>
                        <span>이용 유의사항 {(p.notice?.trim() || p.rooms.some(r => r.notice?.trim())) ? "수정" : "등록"}</span>
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── 설정 탭 ─── */}
        {tab === "settings" && settings && (
          <div className="max-w-xl space-y-4">

            {/* 자동취소 시간 */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="font-semibold text-gray-900 text-sm">자동취소 시간</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  예약요청·입금확인요청 두 상태 모두, 이 시간 내 호스트가 확정하지 않으면 자동취소됩니다.
                </p>
              </div>
              <div className="px-5 py-4">
                <div className="flex gap-2 flex-wrap">
                  {AUTO_CANCEL_OPTIONS.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setSettings(s => s ? { ...s, auto_cancel_minutes: opt.value } : s)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors
                        ${settings.auto_cancel_minutes === opt.value
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 응답 불가 시간 */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="font-semibold text-gray-900 text-sm">응답 불가 시간</p>
                <p className="text-xs text-gray-400 mt-0.5">이 시간대에는 자동취소 타이머가 멈춥니다. (기본: 오후 9시 ~ 오전 8시)</p>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <input type="time" value={settings.unavailable_start}
                    onChange={e => setSettings(s => s ? { ...s, unavailable_start: e.target.value } : s)}
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent" />
                  <span className="text-gray-400 text-sm font-medium">~</span>
                  <input type="time" value={settings.unavailable_end}
                    onChange={e => setSettings(s => s ? { ...s, unavailable_end: e.target.value } : s)}
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent" />
                </div>
              </div>
            </div>

            <button onClick={saveSettings} disabled={settingsSaving}
              className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-colors
                ${settingsSaved
                  ? "bg-green-600 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"}`}>
              {settingsSaving ? "저장 중..." : settingsSaved ? "저장됨 ✓" : "설정 저장"}
            </button>
          </div>
        )}
      </main>

      {/* 카카오 채널 채팅 플로팅 버튼 */}
      <a
        href="http://pf.kakao.com/_xbxbMjX/chat"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-4 z-50 flex items-center justify-center w-12 h-12 bg-[#FEE500] text-[#3A1D1D] rounded-full shadow-lg hover:brightness-95 transition-all active:scale-95">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3C6.477 3 2 6.925 2 11.75c0 3.017 1.77 5.666 4.455 7.258L5.5 22l3.326-1.746C9.839 20.734 10.905 21 12 21c5.523 0 10-3.925 10-8.75S17.523 3 12 3z"/>
        </svg>
      </a>
    </div>
  );
}
