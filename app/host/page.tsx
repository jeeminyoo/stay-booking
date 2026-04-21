"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { useRouter, useSearchParams } from "next/navigation";
import { SavedProperty, KakaoUser, Booking, HostSettings } from "@/lib/types";
import { getUser, clearUser } from "@/lib/auth";
import { fetchHostProperties, fetchHostBookings, deletePropertyById, patchBooking, fetchHostSettings, upsertHostSettings } from "@/lib/db";
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
  const searchParams = useSearchParams();
  const [user, setUser] = useState<KakaoUser | null>(null);
  const [properties, setProperties] = useState<SavedProperty[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [checked, setChecked] = useState(false);
  const initialTab = (searchParams.get("tab") as "bookings" | "availability" | "properties" | "settings") ?? "bookings";
  const [tab, setTab] = useState<"bookings" | "availability" | "properties" | "settings">(initialTab);
  const [settings, setSettings] = useState<HostSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  useEffect(() => {
    const u = getUser();
    setUser(u);
    setChecked(true);
    if (!u) return;
    setHasDraft(!!localStorage.getItem("host_property_draft"));
    expireOverdueBookings().catch(console.error);
    fetchHostProperties(u.id).then((props) => {
      setProperties(props);
      return fetchHostBookings(props.map(p => p.id));
    }).then(setBookings).catch(console.error);
    fetchHostSettings(u.id).then((s) => {
      setSettings(s ?? { host_id: u.id, updated_at: "", ...DEFAULT_SETTINGS });
    });
  }, []);

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
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">로그아웃</button>
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
          <button onClick={() => setTab("bookings")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2
              ${tab === "bookings" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            예약 알림
            {actionNeededCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{actionNeededCount}</span>
            )}
          </button>
          <button onClick={() => setTab("availability")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors
              ${tab === "availability" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            예약 현황
          </button>
          <button onClick={() => setTab("properties")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors
              ${tab === "properties" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            내 숙소
          </button>
          <button onClick={() => setTab("settings")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors
              ${tab === "settings" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            설정
          </button>
        </div>

        {/* ─── 예약 현황 탭 ─── */}
        {tab === "availability" && user && (
          <AvailabilityTab user={user} properties={properties} bookings={bookings} onConfirmBooking={confirmBooking} />
        )}

        {/* ─── 예약 알림 탭 ─── */}
        {tab === "bookings" && (
          <div>
            {bookings.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-base font-semibold text-gray-700 mb-1">아직 예약 내역이 없습니다</p>
                <p className="text-sm text-gray-400">게스트가 예약하면 여기에 표시됩니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => {
                  const s = STATUS_LABEL[b.status] ?? STATUS_LABEL.cancelled;
                  const canAct = b.status === "waiting_for_deposit" || b.status === "deposit_requested";
                  return (
                    <div key={b.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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

                        {/* 예약 전 메시지 */}
                        {b.guest_message && (
                          <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 border-l-2 border-indigo-200 mb-2">
                            <span className="text-gray-400 mr-1 font-medium">예약 메시지</span>{b.guest_message}
                          </div>
                        )}

                        {/* 입금확인요청 메시지 */}
                        {b.payment_note && (
                          <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 border-l-2 border-blue-300 mb-2">
                            <span className="text-blue-400 mr-1 font-medium">입금 메시지</span>{b.payment_note}
                          </div>
                        )}
                      </div>

                      {/* 호스트 액션 */}
                      {canAct && (
                        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex gap-2">
                          <button
                            onClick={() => confirmBooking(b.id)}
                            className="flex-1 bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
                            예약 확정
                          </button>
                          <button
                            onClick={() => cancelBooking(b.id)}
                            className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-100 transition-colors">
                            예약 취소
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                      <span className={`absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-full ${p.is_draft ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"}`}>
                        {p.is_draft ? "임시저장" : "게시 중"}
                      </span>
                    </div>
                    <div className="p-4">
                      <h2 className="font-bold text-gray-900 mb-0.5">{p.name}</h2>
                      <p className="text-sm text-gray-500 mb-3">{p.address}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                        <span>객실 {p.rooms.length}개</span>
                        <span>·</span>
                        <span className="font-mono">/s/{p.slug}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            localStorage.setItem("host_property_draft", JSON.stringify({
                              id: p.id,
                              name: p.name,
                              description: p.description,
                              address: p.address,
                              lat: p.lat,
                              lng: p.lng,
                              image_url: p.image_url,
                              slug: p.slug,
                              bank_name: p.bank_name,
                              bank_account: p.bank_account,
                              bank_holder: p.bank_holder,
                              rooms: (p.rooms || []).map(r => ({
                                name: r.name,
                                max_guests: r.max_guests,
                                base_guests: r.base_guests,
                                max_infants: r.max_infants,
                                bedrooms: r.bedrooms,
                                beds: r.beds,
                                bathrooms: r.bathrooms,
                                image_url: r.image_url,
                                weekday_price: r.weekday_price || 0,
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
    </div>
  );
}
