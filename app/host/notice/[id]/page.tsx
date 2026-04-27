"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { getUser } from "@/lib/auth";
import { fetchHostProperties, patchPropertyNotice } from "@/lib/db";
import { SavedProperty, RoomDraft } from "@/lib/types";

type NoticeKey = "notice" | "notice_confirm" | "notice_checkin";

type SharedNotices = Record<NoticeKey, string>;
type RoomNotices = { name: string } & Record<NoticeKey, string>;
type PerRoom = Record<NoticeKey, boolean>;

const SECTIONS: {
  key: NoticeKey;
  icon: string;
  title: string;
  badge: string;
  badgeColor: string;
  desc: string;
  placeholder: string;
}[] = [
  {
    key: "notice",
    icon: "📅",
    title: "예약 진행 안내",
    badge: "날짜 선택 단계",
    badgeColor: "bg-blue-100 text-blue-700",
    desc: "게스트가 날짜를 선택하는 단계에서 노출됩니다. 예약 전 반드시 확인해야 할 내용을 입력해주세요.",
    placeholder: "예) 반려동물 동반 불가, 단체 입실 시 사전 문의 필요 등",
  },
  {
    key: "notice_confirm",
    icon: "✅",
    title: "예약 확정 안내",
    badge: "예약 확정 알림톡",
    badgeColor: "bg-green-100 text-green-700",
    desc: "호스트가 예약을 확정하면 알림톡과 함께 게스트에게 전달됩니다. 체크인 방법, 주차, 시설 이용 규칙 등을 입력해주세요.",
    placeholder: "예) 체크인 방법: 현관 비밀번호 안내, 주차 가능 여부, 와이파이 정보 등",
  },
  {
    key: "notice_checkin",
    icon: "🌅",
    title: "체크인 당일 안내",
    badge: "체크인 당일 오전",
    badgeColor: "bg-orange-100 text-orange-700",
    desc: "체크인 당일 오전에 게스트에게 자동으로 발송됩니다. 당일 필요한 안내를 입력해주세요.",
    placeholder: "예) 체크인 시간, 키 수령 방법, 주변 편의시설 안내 등",
  },
];

export default function NoticeEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [property, setProperty] = useState<SavedProperty | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [perRoom, setPerRoom] = useState<PerRoom>({ notice: false, notice_confirm: false, notice_checkin: false });
  const [shared, setShared] = useState<SharedNotices>({ notice: "", notice_confirm: "", notice_checkin: "" });
  const [rooms, setRooms] = useState<RoomNotices[]>([]);
  const [activeRoomIdx, setActiveRoomIdx] = useState<Record<NoticeKey, number>>({ notice: 0, notice_confirm: 0, notice_checkin: 0 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user) { router.replace("/login"); return; }
    fetchHostProperties(user.id).then((props) => {
      const p = props.find(prop => prop.id === id);
      if (!p) { setNotFound(true); return; }
      setProperty(p);
      setPerRoom({
        notice: p.notice_per_room ?? false,
        notice_confirm: p.notice_confirm_per_room ?? false,
        notice_checkin: p.notice_checkin_per_room ?? false,
      });
      setShared({
        notice: p.notice ?? "",
        notice_confirm: p.notice_confirm ?? "",
        notice_checkin: p.notice_checkin ?? "",
      });
      setRooms(p.rooms.map(r => ({
        name: r.name,
        notice: r.notice ?? "",
        notice_confirm: r.notice_confirm ?? "",
        notice_checkin: r.notice_checkin ?? "",
      })));
    });
  }, [id, router]);

  function updateShared(key: NoticeKey, value: string) {
    setShared(prev => ({ ...prev, [key]: value }));
  }

  function updateRoom(key: NoticeKey, roomIdx: number, value: string) {
    setRooms(prev => prev.map((r, i) => i === roomIdx ? { ...r, [key]: value } : r));
  }

  function setActiveRoom(key: NoticeKey, idx: number) {
    setActiveRoomIdx(prev => ({ ...prev, [key]: idx }));
  }

  function hasContent(key: NoticeKey): boolean {
    if (perRoom[key]) return rooms.some(r => r[key].trim());
    return shared[key].trim().length > 0;
  }

  async function handleSave() {
    if (!property) return;
    setSaving(true);
    try {
      const updatedRooms: RoomDraft[] = property.rooms.map((r, i) => ({
        ...r,
        notice: perRoom.notice ? (rooms[i]?.notice ?? "") : "",
        notice_confirm: perRoom.notice_confirm ? (rooms[i]?.notice_confirm ?? "") : "",
        notice_checkin: perRoom.notice_checkin ? (rooms[i]?.notice_checkin ?? "") : "",
      }));
      await patchPropertyNotice(property.id, {
        notice: perRoom.notice ? "" : shared.notice,
        notice_confirm: perRoom.notice_confirm ? "" : shared.notice_confirm,
        notice_checkin: perRoom.notice_checkin ? "" : shared.notice_checkin,
        notice_per_room: perRoom.notice,
        notice_confirm_per_room: perRoom.notice_confirm,
        notice_checkin_per_room: perRoom.notice_checkin,
        rooms: updatedRooms,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="text-lg font-bold text-gray-800 mb-2">숙소를 찾을 수 없습니다</p>
      <button onClick={() => router.push("/host?tab=properties")} className="mt-4 text-sm text-indigo-600">돌아가기</button>
    </div>
  );

  if (!property) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const origin = typeof window !== "undefined" ? window.location.origin : "https://staypick.info";
  const multiRoom = property.rooms.length > 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <button onClick={() => router.push("/host?tab=properties")} className="cursor-pointer">
            <Logo />
          </button>
          <span className="text-xs text-gray-400">{property.name}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 mb-1">이용 유의사항</h1>
          <p className="text-sm text-gray-400">{property.name}</p>
        </div>

        {SECTIONS.map((s) => {
          const isPerRoom = perRoom[s.key];
          const roomIdx = activeRoomIdx[s.key];

          return (
            <div key={s.key} className="bg-white rounded-2xl overflow-hidden">
              {/* 섹션 헤더 */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{s.icon}</span>
                  <p className="font-bold text-gray-900 text-sm">{s.title}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.badgeColor}`}>{s.badge}</span>
                  {hasContent(s.key) && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
              </div>

              {/* 공통/객실별 모드 선택 (객실 2개 이상일 때만) */}
              {multiRoom && (
                <div className="px-4 pb-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPerRoom(prev => ({ ...prev, [s.key]: false }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-colors
                      ${!isPerRoom ? "border-indigo-500 text-indigo-600 bg-indigo-50/50" : "border-gray-200 text-gray-500 bg-white"}`}>
                    전체 공통
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerRoom(prev => ({ ...prev, [s.key]: true }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-colors
                      ${isPerRoom ? "border-indigo-500 text-indigo-600 bg-indigo-50/50" : "border-gray-200 text-gray-500 bg-white"}`}>
                    객실별 개별
                  </button>
                </div>
              )}

              {/* 객실별 모드일 때 탭 */}
              {isPerRoom && (
                <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto">
                  {rooms.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveRoom(s.key, i)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0
                        ${roomIdx === i ? "bg-gray-900 text-white" : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"}`}>
                      {r.name}
                    </button>
                  ))}
                </div>
              )}

              {/* 입력 영역 */}
              <div className="px-4 pb-4">
                {!isPerRoom ? (
                  <textarea
                    value={shared[s.key]}
                    onChange={e => updateShared(s.key, e.target.value)}
                    placeholder={s.placeholder}
                    rows={6}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none bg-gray-50/50 placeholder:text-gray-300"
                  />
                ) : (
                  <textarea
                    key={`${s.key}-${roomIdx}`}
                    value={rooms[roomIdx]?.[s.key] ?? ""}
                    onChange={e => updateRoom(s.key, roomIdx, e.target.value)}
                    placeholder={`${rooms[roomIdx]?.name} · ${s.placeholder}`}
                    rows={6}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none bg-gray-50/50 placeholder:text-gray-300"
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* 알림톡 URL - 예약확정안내 */}
        <div className="bg-indigo-50 rounded-xl px-4 py-3 text-xs text-indigo-700 space-y-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span>🔗</span>
            <p className="font-semibold">알림톡 링크용 URL · 예약 확정 안내</p>
          </div>
          {perRoom.notice_confirm ? (
            rooms.map((r, i) => (
              <div key={i}>
                <p className="text-indigo-400 mb-0.5">{r.name}</p>
                <p className="font-mono break-all select-all">{origin}/s/{property.slug}/notice-confirm?room={encodeURIComponent(r.name)}</p>
              </div>
            ))
          ) : (
            <p className="font-mono break-all select-all">{origin}/s/{property.slug}/notice-confirm</p>
          )}
        </div>

        {/* 알림톡 URL - 체크인당일안내 */}
        <div className="bg-indigo-50 rounded-xl px-4 py-3 text-xs text-indigo-700 space-y-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span>🔗</span>
            <p className="font-semibold">알림톡 링크용 URL · 체크인 당일 안내</p>
          </div>
          {perRoom.notice_checkin ? (
            rooms.map((r, i) => (
              <div key={i}>
                <p className="text-indigo-400 mb-0.5">{r.name}</p>
                <p className="font-mono break-all select-all">{origin}/s/{property.slug}/notice-checkin?room={encodeURIComponent(r.name)}</p>
              </div>
            ))
          ) : (
            <p className="font-mono break-all select-all">{origin}/s/{property.slug}/notice-checkin</p>
          )}
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-4 rounded-2xl text-sm font-bold transition-colors
            ${saved ? "bg-green-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"}`}>
          {saving ? "저장 중..." : saved ? "저장됨 ✓" : "저장"}
        </button>

        <button
          onClick={() => router.push("/host?tab=properties")}
          className="w-full py-4 rounded-2xl text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
          마이페이지로 이동
        </button>
      </main>
    </div>
  );
}
