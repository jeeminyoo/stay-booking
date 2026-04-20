"use client";

import { useEffect, useState, useMemo } from "react";
import {
  fetchManualBlocks, createManualBlock, deleteManualBlock,
  fetchWeeklyBlocks, upsertWeeklyBlock, deleteWeeklyBlock,
  fetchWeeklyBlockExceptions, createWeeklyBlockException, deleteWeeklyBlockException,
} from "@/lib/db";
import {
  SavedProperty, KakaoUser, Booking, ManualBlock,
  WeeklyBlock, WeeklyBlockException, RoomDraft,
} from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DOW_KR     = ["일", "월", "화", "수", "목", "금", "토"];
const DOW_HEADER = ["월", "화", "수", "목", "금", "토", "일"];

const CIRCLE_BG: Record<string, string> = {
  confirmed:           "bg-emerald-500 text-white",
  deposit_requested:   "bg-blue-500 text-white",
  waiting_for_deposit: "bg-amber-400 text-white",
  manual_block:        "bg-slate-500 text-white",
  weekly_block:        "bg-gray-200 text-gray-400",
};
const STRIP_BG: Record<string, string> = {
  confirmed:           "bg-emerald-100",
  deposit_requested:   "bg-blue-100",
  waiting_for_deposit: "bg-amber-100",
};
const STATUS_DOT: Record<string, string> = {
  confirmed:           "bg-emerald-500",
  deposit_requested:   "bg-blue-500",
  waiting_for_deposit: "bg-amber-400",
  manual_block:        "bg-slate-500",
  weekly_block:        "bg-gray-300",
};
const STATUS_LABEL: Record<string, string> = {
  confirmed:           "예약확정",
  deposit_requested:   "입금확인요청",
  waiting_for_deposit: "입금대기",
  manual_block:        "수동 블락",
  weekly_block:        "정기 블락",
};
const BOOKING_BADGE: Record<string, { label: string; cls: string }> = {
  waiting_for_deposit: { label: "입금 대기",    cls: "bg-amber-100 text-amber-700" },
  deposit_requested:   { label: "입금확인요청", cls: "bg-blue-100 text-blue-700" },
  confirmed:           { label: "예약확정",     cls: "bg-emerald-100 text-emerald-700" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCalendarWeeks(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateTime(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  user: KakaoUser;
  properties: SavedProperty[];
  bookings: Booking[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AvailabilityTab({ user: _user, properties, bookings }: Props) {
  const [propIdx, setPropIdx]   = useState(0);
  const [roomIdx, setRoomIdx]   = useState(0);
  const [manualBlocks, setManualBlocks]         = useState<ManualBlock[]>([]);
  const [weeklyBlocks, setWeeklyBlocks]         = useState<WeeklyBlock[]>([]);
  const [weeklyExceptions, setWeeklyExceptions] = useState<WeeklyBlockException[]>([]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewYear, setViewYear]   = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  const [blockMode, setBlockMode]         = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [blockNote, setBlockNote]         = useState("");
  const [addingBlock, setAddingBlock]     = useState(false);
  const [weeklyModal, setWeeklyModal]     = useState(false);

  const property = properties[propIdx] ?? null;
  const rooms: RoomDraft[] = property?.rooms ?? [];
  const room = rooms[roomIdx] ?? null;

  // ─── Load blocks when property/room changes ─────────────────────────────────
  useEffect(() => {
    if (!property || !room) return;
    fetchManualBlocks(property.id, room.name).then(setManualBlocks).catch(console.error);
    fetchWeeklyBlocks(property.id, room.name).then(setWeeklyBlocks).catch(console.error);
    fetchWeeklyBlockExceptions(property.id, room.name).then(setWeeklyExceptions).catch(console.error);
  }, [property?.id, room?.name]);

  // ─── Derived data ───────────────────────────────────────────────────────────
  const roomBookings = useMemo(() => {
    if (!property || !room) return [];
    return bookings.filter(b =>
      b.property_id === property.id &&
      b.room_name === room.name &&
      ["waiting_for_deposit", "deposit_requested", "confirmed"].includes(b.status)
    );
  }, [bookings, property?.id, room?.name]);

  const dateBookingMap = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of roomBookings) {
      const cur = new Date(b.check_in + "T00:00:00");
      const end = new Date(b.check_out + "T00:00:00");
      while (cur < end) {
        const key = toDateStr(cur);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(b);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [roomBookings]);

  const manualBlockSet = useMemo(() => new Set(manualBlocks.map(b => b.date)), [manualBlocks]);
  const weeklyBlockSet = useMemo(() => new Set(weeklyBlocks.map(b => b.day_of_week)), [weeklyBlocks]);
  const exceptionSet   = useMemo(() => new Set(weeklyExceptions.map(e => e.date)), [weeklyExceptions]);

  function getDayStatus(d: Date): string | null {
    const ds  = toDateStr(d);
    const bks = dateBookingMap.get(ds);
    if (bks && bks.length > 0) {
      if (bks.some(b => b.status === "confirmed"))         return "confirmed";
      if (bks.some(b => b.status === "deposit_requested")) return "deposit_requested";
      return "waiting_for_deposit";
    }
    if (manualBlockSet.has(ds)) return "manual_block";
    if (weeklyBlockSet.has(d.getDay()) && !exceptionSet.has(ds)) return "weekly_block";
    return null;
  }

  function getRangeInfo(d: Date): { status: string | null; stripLeft: boolean; stripRight: boolean } {
    const ds     = toDateStr(d);
    const status = getDayStatus(d);
    if (!status || !["confirmed", "deposit_requested", "waiting_for_deposit"].includes(status)) {
      return { status, stripLeft: false, stripRight: false };
    }
    const bks = dateBookingMap.get(ds)!;
    const dow = d.getDay();
    const prev = toDateStr(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
    const next = toDateStr(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
    const stripLeft  = dow !== 1 && !!dateBookingMap.get(prev)?.some(pb => bks.some(b => b.id === pb.id));
    const stripRight = dow !== 0 && !!dateBookingMap.get(next)?.some(nb => bks.some(b => b.id === nb.id));
    return { status, stripLeft, stripRight };
  }

  const today = toDateStr(new Date());
  const weeks = buildCalendarWeeks(viewYear, viewMonth);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  function prevMonth() {
    setSelectedDate(null);
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    setSelectedDate(null);
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function handleDayClick(ds: string, day: Date) {
    const status = getDayStatus(day);
    if (blockMode) {
      if (ds < today) return;
      if (["confirmed", "deposit_requested", "waiting_for_deposit", "manual_block"].includes(status ?? "")) return;
      setSelectedDates(prev => {
        const next = new Set(prev);
        if (next.has(ds)) next.delete(ds); else next.add(ds);
        return next;
      });
    } else {
      setSelectedDate(ds === selectedDate ? null : ds);
    }
  }

  function enterBlockMode() { setSelectedDate(null); setSelectedDates(new Set()); setBlockNote(""); setBlockMode(true); }
  function exitBlockMode()  { setBlockMode(false); setSelectedDates(new Set()); setBlockNote(""); }

  async function handleAddBlocks() {
    if (!property || !room || selectedDates.size === 0) return;
    setAddingBlock(true);
    try {
      const newBlocks = await Promise.all(
        Array.from(selectedDates).map(date =>
          createManualBlock({ property_id: property.id, room_id: room.name, date, note: blockNote || undefined })
        )
      );
      setManualBlocks(prev => [...prev, ...newBlocks]);
      exitBlockMode();
    } catch (e) {
      alert("블락 추가 실패: " + (e instanceof Error ? e.message : JSON.stringify(e)));
    } finally {
      setAddingBlock(false);
    }
  }

  async function handleDeleteManualBlock(id: string) {
    await deleteManualBlock(id);
    setManualBlocks(prev => prev.filter(b => b.id !== id));
  }

  async function handleToggleWeeklyBlock(dow: number) {
    if (!property || !room) return;
    const existing = weeklyBlocks.find(b => b.day_of_week === dow);
    if (existing) {
      await deleteWeeklyBlock(existing.id);
      setWeeklyBlocks(prev => prev.filter(b => b.id !== existing.id));
    } else {
      await upsertWeeklyBlock({ property_id: property.id, room_id: room.name, day_of_week: dow });
      setWeeklyBlocks(await fetchWeeklyBlocks(property.id, room.name));
    }
  }

  async function handleAddException(date: string) {
    if (!property || !room) return;
    try {
      const exc = await createWeeklyBlockException({ property_id: property.id, room_id: room.name, date });
      setWeeklyExceptions(prev => [...prev, exc]);
    } catch (e) {
      alert("예외 처리 실패: " + (e instanceof Error ? e.message : JSON.stringify(e)));
    }
  }

  async function handleRemoveException(date: string) {
    const exc = weeklyExceptions.find(e => e.date === date);
    if (!exc) return;
    await deleteWeeklyBlockException(exc.id);
    setWeeklyExceptions(prev => prev.filter(e => e.id !== exc.id));
  }

  // ─── Selected date info ─────────────────────────────────────────────────────
  const selectedInfo = useMemo(() => {
    if (!selectedDate || blockMode) return null;
    const bks         = dateBookingMap.get(selectedDate) ?? [];
    const manualBlock = manualBlocks.find(b => b.date === selectedDate) ?? null;
    const dow         = new Date(selectedDate + "T00:00:00").getDay();
    const isWeeklyBlockDay = weeklyBlockSet.has(dow);
    const hasException     = exceptionSet.has(selectedDate);
    const isWeeklyBlocked  = isWeeklyBlockDay && !hasException && bks.length === 0 && !manualBlock;
    return { bks, manualBlock, isWeeklyBlocked, isWeeklyBlockDay, hasException };
  }, [selectedDate, blockMode, dateBookingMap, manualBlocks, weeklyBlockSet, exceptionSet]);

  const weeklyBlockSummary = useMemo(() =>
    weeklyBlockSet.size === 0
      ? "설정 없음"
      : Array.from(weeklyBlockSet).sort((a, b) => a - b).map(i => DOW_KR[i]).join(", ") + "요일",
  [weeklyBlockSet]);

  // ─── Empty state ─────────────────────────────────────────────────────────────
  if (properties.length === 0) return (
    <div className="text-center py-24 bg-white rounded-3xl border border-gray-100">
      <p className="text-5xl mb-4">🏡</p>
      <p className="text-base font-semibold text-gray-700 mb-2">아직 등록된 숙소가 없습니다</p>
      <p className="text-sm text-gray-400 mb-6">숙소를 등록하면 예약 현황을 확인할 수 있어요</p>
      <a href="/host/new"
        className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-indigo-700 transition-colors">
        숙소 등록하기
      </a>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3 relative" style={{ paddingBottom: blockMode ? "140px" : "0" }}>

      {/* Property selector (multiple properties only) */}
      {properties.length > 1 && (
        <div className="flex items-center gap-2">
          <select value={propIdx}
            onChange={e => { setPropIdx(Number(e.target.value)); setRoomIdx(0); setSelectedDate(null); exitBlockMode(); }}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
            {properties.map((p, i) => <option key={p.id} value={i}>{p.name}</option>)}
          </select>
        </div>
      )}

      {/* ── Calendar card ── */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">

        {/* Room tabs + block mode button */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <div className="flex gap-1.5 flex-1 overflow-x-auto">
            {rooms.map((r, i) => (
              <button key={i}
                onClick={() => { setRoomIdx(i); setSelectedDate(null); exitBlockMode(); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all
                  ${roomIdx === i ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                {r.name}
              </button>
            ))}
          </div>
          {!blockMode && (
            <button onClick={enterBlockMode}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/>
              </svg>
              날짜 블락
            </button>
          )}
        </div>

        {/* Block mode banner */}
        {blockMode && (
          <div className="mx-3 mb-1 bg-gray-900 text-white rounded-2xl px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-medium">블락할 날짜를 탭하세요</span>
            <button onClick={exitBlockMode} className="text-xs text-gray-400 hover:text-white">취소</button>
          </div>
        )}

        {/* Month navigation */}
        <div className="flex items-center justify-between px-5 py-2">
          <button onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <span className="text-base font-bold text-gray-900 tracking-tight">
            {viewYear}년 {viewMonth + 1}월
          </span>
          <button onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 px-2">
          {DOW_HEADER.map((d, i) => (
            <div key={d} className={`text-center text-[11px] font-semibold py-1.5 tracking-wide
              ${i === 5 ? "text-blue-400" : i === 6 ? "text-red-400" : "text-gray-400"}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="px-2 pb-3">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((day, di) => {
                if (!day) return <div key={di} className="h-11" />;

                const ds     = toDateStr(day);
                const ri     = getRangeInfo(day);
                const status = ri.status;
                const isToday        = ds === today;
                const isPast         = ds < today;
                const isViewSelected = !blockMode && ds === selectedDate;
                const isBlockSelected = blockMode && selectedDates.has(ds);
                const isBlockable    = blockMode && !isPast &&
                  !["confirmed", "deposit_requested", "waiting_for_deposit", "manual_block"].includes(status ?? "");

                let circleClass = "";
                if (isBlockSelected) {
                  circleClass = "bg-gray-900 text-white";
                } else if (status) {
                  circleClass = CIRCLE_BG[status];
                } else if (isPast) {
                  circleClass = "text-gray-300";
                } else if (isBlockable) {
                  circleClass = "text-gray-700 hover:bg-gray-100";
                } else {
                  circleClass = "text-gray-800 hover:bg-gray-100";
                }

                return (
                  <div key={di} className="relative flex justify-center h-11 items-center">
                    {ri.stripLeft && ri.stripRight && status && (
                      <div className={`absolute inset-y-1.5 inset-x-0 ${STRIP_BG[status]} z-0`} />
                    )}
                    {ri.stripLeft && !ri.stripRight && status && (
                      <div className={`absolute inset-y-1.5 left-0 right-1/2 ${STRIP_BG[status]} z-0`} />
                    )}
                    {!ri.stripLeft && ri.stripRight && status && (
                      <div className={`absolute inset-y-1.5 left-1/2 right-0 ${STRIP_BG[status]} z-0`} />
                    )}
                    <button
                      onClick={() => handleDayClick(ds, day)}
                      disabled={blockMode && !isBlockable && !isBlockSelected}
                      className={[
                        "relative z-10 w-9 h-9 rounded-full flex items-center justify-center",
                        "text-sm font-medium transition-all duration-150 select-none",
                        isViewSelected ? "ring-2 ring-offset-1 ring-gray-900" : "",
                        isToday && !status && !isViewSelected
                          ? "font-bold text-indigo-600 ring-1 ring-inset ring-indigo-200"
                          : "",
                        circleClass,
                        "disabled:cursor-default",
                      ].join(" ")}>
                      {day.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="px-4 pt-1 pb-4 border-t border-gray-50">
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-3">
            {Object.entries(STATUS_LABEL).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[key]}`} />
                <span className="text-[11px] text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Selected date detail ── */}
      {!blockMode && selectedDate && selectedInfo && (
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-gray-900 text-sm">{selectedDate.replace(/-/g, ".")}</p>
              {room && <p className="text-xs text-gray-400 mt-0.5">{room.name}</p>}
            </div>
            <button onClick={() => setSelectedDate(null)}
              className="mt-0.5 p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-400 flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="border-t border-gray-50">
            {selectedInfo.bks.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {selectedInfo.bks.map(b => {
                  const badge = BOOKING_BADGE[b.status] ?? { label: b.status, cls: "bg-gray-100 text-gray-500" };
                  return (
                    <div key={b.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold text-gray-900">{b.guest_name}</p>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div className="text-gray-500"><span className="text-gray-400">연락처</span> {b.guest_phone}</div>
                        <div className="text-gray-500">
                          <span className="text-gray-400">인원</span>{" "}
                          성인 {b.adults}{b.children > 0 ? ` · 어린이 ${b.children}` : ""}{b.infants > 0 ? ` · 유아 ${b.infants}` : ""}
                        </div>
                        <div className="text-gray-500"><span className="text-gray-400">체크인</span> {b.check_in.replace(/-/g, ".")}</div>
                        <div className="text-gray-500"><span className="text-gray-400">체크아웃</span> {b.check_out.replace(/-/g, ".")}</div>
                        <div className="col-span-2 font-semibold text-gray-800">
                          <span className="text-gray-400 font-normal">결제금액</span> {b.total_price.toLocaleString()}원
                        </div>
                        <div className="col-span-2 text-gray-400">
                          예약요청 {formatDateTime(b.created_at)}
                        </div>
                      </div>
                      {b.guest_message && (
                        <div className="mt-3 bg-indigo-50 rounded-2xl px-3.5 py-2.5 text-xs text-indigo-700">
                          <span className="text-indigo-400 font-semibold mr-1">예약 메시지</span>{b.guest_message}
                        </div>
                      )}
                      {b.payment_note && (
                        <div className="mt-1.5 bg-blue-50 rounded-2xl px-3.5 py-2.5 text-xs text-blue-700">
                          <span className="text-blue-400 font-semibold mr-1">입금 메시지</span>{b.payment_note}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : selectedInfo.manualBlock ? (
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">수동 블락</p>
                  {selectedInfo.manualBlock.note && (
                    <p className="text-xs text-gray-400 mt-0.5">{selectedInfo.manualBlock.note}</p>
                  )}
                </div>
                <button onClick={() => handleDeleteManualBlock(selectedInfo.manualBlock!.id)}
                  className="text-xs font-semibold text-red-500 border border-red-100 bg-red-50 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors">
                  블락 해제
                </button>
              </div>
            ) : selectedInfo.isWeeklyBlocked ? (
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">정기 블락 요일</p>
                  <p className="text-xs text-gray-400 mt-0.5">매주 {DOW_KR[new Date(selectedDate + "T00:00:00").getDay()]}요일</p>
                </div>
                <button onClick={() => handleAddException(selectedDate)}
                  className="text-xs font-semibold text-slate-600 border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors">
                  이 날만 제외
                </button>
              </div>
            ) : selectedInfo.isWeeklyBlockDay && selectedInfo.hasException ? (
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">정기 블락 제외 날짜</p>
                  <p className="text-xs text-gray-400 mt-0.5">이 날짜는 정기 블락에서 제외되어 있습니다</p>
                </div>
                <button onClick={() => handleRemoveException(selectedDate)}
                  className="text-xs font-semibold text-amber-600 border border-amber-200 bg-amber-50 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-colors">
                  제외 취소
                </button>
              </div>
            ) : (
              <div className="px-5 py-4">
                <p className="text-sm text-gray-400">예약이 없는 날짜입니다.</p>
                {selectedDate < today && (
                  <p className="text-xs text-gray-300 mt-1">지난 날짜는 블락할 수 없습니다.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Weekly block trigger ── */}
      <button onClick={() => setWeeklyModal(true)}
        className="w-full bg-white rounded-3xl shadow-sm px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center text-base flex-shrink-0">🗓️</div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">정기 블락 요일</p>
            <p className="text-xs text-gray-400 mt-0.5">{weeklyBlockSummary}</p>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-300 flex-shrink-0">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      {/* ── Block mode sticky bottom bar ── */}
      {blockMode && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 px-4 pt-3 pb-8 z-20 shadow-2xl">
          <div className="max-w-4xl mx-auto space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">
                {selectedDates.size > 0 ? `${selectedDates.size}일 선택됨` : "날짜를 선택하세요"}
              </span>
              <button onClick={exitBlockMode} className="text-sm text-gray-400 hover:text-gray-700">취소</button>
            </div>
            <input type="text" placeholder="메모 (선택사항, 예: 외부 채널 예약)"
              value={blockNote} onChange={e => setBlockNote(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50" />
            <button onClick={handleAddBlocks} disabled={selectedDates.size === 0 || addingBlock}
              className="w-full bg-gray-900 text-white text-sm font-bold py-3.5 rounded-2xl hover:bg-gray-800 transition-colors disabled:opacity-30">
              {addingBlock ? "처리 중..." : selectedDates.size > 0 ? `${selectedDates.size}일 블락하기` : "날짜를 선택하세요"}
            </button>
          </div>
        </div>
      )}

      {/* ── Weekly block modal ── */}
      {weeklyModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setWeeklyModal(false); }}>
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 flex items-start justify-between">
              <div>
                <p className="font-bold text-gray-900">정기 블락 요일</p>
                <p className="text-xs text-gray-400 mt-1">매주 해당 요일을 자동으로 블락합니다.</p>
              </div>
              <button onClick={() => setWeeklyModal(false)}
                className="p-1.5 -mt-0.5 -mr-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="px-5 pb-2">
              <div className="flex gap-1.5 justify-between">
                {DOW_KR.map((d, i) => (
                  <button key={i} onClick={() => handleToggleWeeklyBlock(i)}
                    className={`flex-1 h-12 rounded-2xl text-sm font-bold transition-all
                      ${weeklyBlockSet.has(i)
                        ? "bg-gray-900 text-white shadow-sm"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-5 pb-6 pt-4">
              <button onClick={() => setWeeklyModal(false)}
                className="w-full bg-gray-900 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-gray-800 transition-colors">
                완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
