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

  useEffect(() => {
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

  const hasNotice = property.notice_per_room
    ? property.rooms.some(r => r.notice?.trim())
    : !!property.notice?.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <button onClick={() => router.push(`/s/${slug}`)} className="cursor-pointer">
            <Logo />
          </button>
          <span className="text-xs text-gray-400">{property.name}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 mb-1">이용 유의사항</h1>
          <p className="text-sm text-gray-400">{property.name}</p>
        </div>

        {!hasNotice ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">등록된 유의사항이 없습니다.</p>
          </div>
        ) : property.notice_per_room ? (
          <div className="space-y-4">
            {property.rooms.filter(r => r.notice?.trim()).map((room, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="text-sm font-bold text-indigo-600 mb-3">{room.name}</h2>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{room.notice}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{property.notice}</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push(`/s/${slug}`)}
            className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-semibold text-sm hover:bg-indigo-700 transition-colors">
            예약 페이지로 돌아가기
          </button>
        </div>
      </main>
    </div>
  );
}
