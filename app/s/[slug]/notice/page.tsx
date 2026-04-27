"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchPropertyBySlug } from "@/lib/db";
import { SavedProperty } from "@/lib/types";
import Logo from "@/components/Logo";

export default function NoticePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<SavedProperty | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [roomName, setRoomName] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRoomName(params.get("room"));
    fetchPropertyBySlug(slug).then((p) => {
      if (!p) setNotFound(true);
      else setProperty(p);
    });
  }, [slug]);

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="text-lg font-bold text-gray-800 mb-2">숙소를 찾을 수 없습니다</p>
      <button onClick={() => router.push("/")} className="mt-4 text-sm text-indigo-600">홈으로</button>
    </div>
  );

  if (!property) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // 객실별 개별 모드일 때 해당 객실만 필터링
  const targetRoom = property.notice_per_room && roomName
    ? property.rooms.find(r => r.name === roomName) ?? null
    : null;

  const hasNotice = property.notice_per_room
    ? (targetRoom ? !!targetRoom.notice?.trim() : property.rooms.some(r => r.notice?.trim()))
    : !!property.notice?.trim();

  // 잘못된 접근: 객실별 모드인데 room 파라미터가 없거나 매칭 안 됨
  if (property.notice_per_room && !targetRoom) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="text-lg font-bold text-gray-800 mb-2">잘못된 접근입니다</p>
      <button onClick={() => router.push(`/s/${slug}`)} className="mt-4 text-sm text-indigo-600">숙소 페이지로</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <button onClick={() => router.push(`/s/${slug}`)} className="cursor-pointer">
            <Logo />
          </button>
          <span className="text-xs text-gray-400">{property.name}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 mb-1">이용 유의사항</h1>
          <p className="text-sm text-gray-400">
            {property.name}{targetRoom ? ` · ${targetRoom.name}` : ""}
          </p>
        </div>

        {!hasNotice ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">등록된 유의사항이 없습니다.</p>
          </div>
        ) : targetRoom ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{targetRoom.notice}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{property.notice}</p>
          </div>
        )}

      </main>
    </div>
  );
}
