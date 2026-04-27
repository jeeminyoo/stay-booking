"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { getUser } from "@/lib/auth";
import { fetchHostProperties, patchPropertyNotice } from "@/lib/db";
import { SavedProperty, RoomDraft } from "@/lib/types";

export default function NoticeEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [property, setProperty] = useState<SavedProperty | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [noticePerRoom, setNoticePerRoom] = useState(false);
  const [noticeShared, setNoticeShared] = useState("");
  const [noticeRooms, setNoticeRooms] = useState<{ name: string; notice: string }[]>([]);
  const [activeRoomIdx, setActiveRoomIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user) { router.replace("/login"); return; }
    fetchHostProperties(user.id).then((props) => {
      const p = props.find(prop => prop.id === id);
      if (!p) { setNotFound(true); return; }
      setProperty(p);
      setNoticePerRoom(p.notice_per_room ?? false);
      setNoticeShared(p.notice ?? "");
      setNoticeRooms(p.rooms.map(r => ({ name: r.name, notice: r.notice ?? "" })));
    });
  }, [id, router]);

  async function handleSave() {
    if (!property) return;
    setSaving(true);
    try {
      if (noticePerRoom) {
        const updatedRooms: RoomDraft[] = property.rooms.map((r, i) => ({
          ...r,
          notice: noticeRooms[i]?.notice ?? "",
        }));
        await patchPropertyNotice(property.id, "", true, updatedRooms);
      } else {
        const updatedRooms: RoomDraft[] = property.rooms.map(r => ({ ...r, notice: "" }));
        await patchPropertyNotice(property.id, noticeShared, false, updatedRooms);
      }
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

        {/* 안내 문구 */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
          <span className="shrink-0">💬</span>
          <p>예약 확정 알림톡 발송 시 게스트에게 함께 전달됩니다. 체크인 방법, 주차, 시설 이용 규칙 등을 입력해주세요.</p>
        </div>

        {/* 모드 선택 — 객실 2개 이상일 때만 선택지 표시 */}
        {property.rooms.length > 1 && (
          <div className="space-y-2">
            <label className={`flex items-start gap-3 p-4 bg-white border-2 rounded-xl cursor-pointer transition-colors ${!noticePerRoom ? "border-indigo-500 bg-indigo-50/30" : "border-gray-200 hover:border-gray-300"}`}>
              <input type="radio" name="notice-mode" checked={!noticePerRoom}
                onChange={() => { setNoticePerRoom(false); setNoticeRooms(prev => prev.map(r => ({ ...r, notice: "" }))); }}
                className="mt-0.5 accent-indigo-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">전체 공통</p>
                <p className="text-xs text-gray-400 mt-0.5">모든 객실에 동일한 유의사항을 적용합니다.</p>
              </div>
            </label>
            <label className={`flex items-start gap-3 p-4 bg-white border-2 rounded-xl cursor-pointer transition-colors ${noticePerRoom ? "border-indigo-500 bg-indigo-50/30" : "border-gray-200 hover:border-gray-300"}`}>
              <input type="radio" name="notice-mode" checked={noticePerRoom}
                onChange={() => { setNoticePerRoom(true); setNoticeShared(""); }}
                className="mt-0.5 accent-indigo-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">객실별 개별</p>
                <p className="text-xs text-gray-400 mt-0.5">객실마다 다른 유의사항을 입력합니다.</p>
              </div>
            </label>
          </div>
        )}

        {/* 공통 입력 */}
        {!noticePerRoom && (
          <textarea
            value={noticeShared}
            onChange={e => setNoticeShared(e.target.value)}
            placeholder="체크인 방법, 주차 안내, 시설 이용 규칙 등 게스트에게 전달할 내용을 입력해주세요."
            rows={20}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none bg-white"
          />
        )}

        {/* 객실별 입력 — 탭 */}
        {noticePerRoom && noticeRooms.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* 탭 헤더 */}
            <div className="flex border-b border-gray-100 overflow-x-auto">
              {noticeRooms.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setActiveRoomIdx(i)}
                  className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px
                    ${activeRoomIdx === i
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                  {r.name}
                  {r.notice.trim() && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block align-middle" />}
                </button>
              ))}
            </div>
            {/* 탭 콘텐츠 */}
            <div className="p-4">
              <textarea
                key={activeRoomIdx}
                value={noticeRooms[activeRoomIdx]?.notice ?? ""}
                onChange={e => setNoticeRooms(prev => prev.map((nr, ni) => ni === activeRoomIdx ? { ...nr, notice: e.target.value } : nr))}
                placeholder={`${noticeRooms[activeRoomIdx]?.name} 이용 유의사항`}
                rows={20}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
            </div>
          </div>
        )}

        {/* 알림톡 URL */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-xs text-indigo-700 space-y-2">
          <div className="flex items-center gap-2">
            <span>🔗</span>
            <p className="font-semibold">알림톡 링크용 URL</p>
          </div>
          {noticePerRoom ? (
            <div className="space-y-1.5">
              {noticeRooms.map((r, i) => {
                const origin = typeof window !== "undefined" ? window.location.origin : "https://staypick.info";
                return (
                  <div key={i}>
                    <p className="text-indigo-400 mb-0.5">{r.name}</p>
                    <p className="font-mono break-all select-all">{origin}/s/{property.slug}/notice?room={encodeURIComponent(r.name)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="font-mono break-all select-all">
              {typeof window !== "undefined" ? window.location.origin : "https://staypick.info"}/s/{property.slug}/notice
            </p>
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
