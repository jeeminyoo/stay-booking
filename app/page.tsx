"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SavedProperty, KakaoUser } from "@/lib/types";
import { fetchProperties, fetchHostProperties, fetchHostBookings } from "@/lib/db";
import { getUser } from "@/lib/auth";

// ─── localStorage helpers ──────────────────────────────────────────────────────

const SEEN_KEY = "staypick_seen_deposit_ids";
const RECENT_KEY = "staypick_recent_slugs";

function getSeenIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]")); }
  catch { return new Set(); }
}
function markAsSeen(ids: string[]) {
  const seen = getSeenIds();
  ids.forEach(id => seen.add(id));
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}
function getRecentSlugs(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); }
  catch { return []; }
}

// ─── Recommendation algorithm ─────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function getMinPrice(p: SavedProperty) {
  const v = p.rooms.map(r => r.weekday_price).filter(v => v > 0);
  return v.length ? Math.min(...v) : 0;
}
function getMaxGuests(p: SavedProperty) {
  return p.rooms.length ? Math.max(...p.rooms.map(r => r.max_guests)) : 0;
}
function scoreProperty(candidate: SavedProperty, refs: SavedProperty[]): number {
  if (!refs.length) return 0;
  const avgPrice  = refs.reduce((s, r) => s + getMinPrice(r), 0) / refs.length;
  const avgGuests = refs.reduce((s, r) => s + getMaxGuests(r), 0) / refs.length;
  const avgLat    = refs.reduce((s, r) => s + (r.lat ?? 0), 0) / refs.length;
  const avgLng    = refs.reduce((s, r) => s + (r.lng ?? 0), 0) / refs.length;
  const priceDiff  = avgPrice > 0 ? Math.abs(getMinPrice(candidate) - avgPrice) / avgPrice : 0;
  const guestDiff  = avgGuests > 0 ? Math.abs(getMaxGuests(candidate) - avgGuests) / avgGuests : 0;
  const priceScore = Math.max(0, 1 - priceDiff * 2);
  const guestScore = Math.max(0, 1 - guestDiff);
  let locationScore = 0;
  if (candidate.lat && candidate.lng && avgLat && avgLng) {
    const km = haversineKm(avgLat, avgLng, candidate.lat, candidate.lng);
    locationScore = Math.max(0, 1 - km / 30);
  }
  return priceScore * 0.4 + locationScore * 0.4 + guestScore * 0.2;
}

// ─── Card components ───────────────────────────────────────────────────────────

function SingleCard({ p }: { p: SavedProperty }) {
  const minPrice = getMinPrice(p);
  const maxG = getMaxGuests(p);
  return (
    <Link href={`/s/${p.slug}`} className="group block mx-4">
      <div className="relative rounded-3xl overflow-hidden bg-gray-200 shadow-md hover:shadow-xl transition-shadow">
        {/* Image */}
        <div className="relative h-64 w-full overflow-hidden">
          {p.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_url} alt={p.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-6xl">🏡</div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>

        {/* Text overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <p className="text-white font-black text-xl leading-tight mb-1 drop-shadow-sm">{p.name}</p>
          <p className="text-white/70 text-xs mb-3">{p.address}</p>
          <div className="flex items-center gap-2">
            {minPrice > 0 && (
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30">
                {minPrice.toLocaleString()}원~
              </span>
            )}
            {maxG > 0 && (
              <span className="bg-white/20 backdrop-blur-sm text-white/90 text-xs px-3 py-1.5 rounded-full border border-white/30">
                최대 {maxG}인
              </span>
            )}
            <span className="bg-white/20 backdrop-blur-sm text-white/90 text-xs px-3 py-1.5 rounded-full border border-white/30">
              객실 {p.rooms.length}개
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SwipeCard({ p }: { p: SavedProperty }) {
  const minPrice = getMinPrice(p);
  const maxG = getMaxGuests(p);
  return (
    <Link href={`/s/${p.slug}`} className="group shrink-0 w-[78vw] max-w-[300px] snap-start">
      <div className="relative rounded-2xl overflow-hidden bg-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="relative h-48 w-full overflow-hidden">
          {p.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_url} alt={p.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-5xl">🏡</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white font-bold text-base leading-snug mb-0.5 line-clamp-1">{p.name}</p>
          <p className="text-white/65 text-[11px] mb-2.5 line-clamp-1">{p.address}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {minPrice > 0 && (
              <span className="bg-white/20 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/30">
                {minPrice.toLocaleString()}원~
              </span>
            )}
            {maxG > 0 && (
              <span className="bg-white/20 backdrop-blur-sm text-white/80 text-[11px] px-2.5 py-1 rounded-full border border-white/25">
                최대 {maxG}인
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Section ───────────────────────────────────────────────────────────────────

function PropertySection({ title, sub, properties }: {
  title: string; sub?: string; properties: SavedProperty[];
}) {
  if (properties.length === 0) return null;
  const single = properties.length === 1;

  return (
    <section className="mb-8">
      <div className="px-4 mb-3 flex items-baseline gap-2">
        <h2 className="text-base font-black text-gray-900">{title}</h2>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>

      {single ? (
        <SingleCard p={properties[0]} />
      ) : (
        <div
          className="flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {properties.map(p => <SwipeCard key={p.id} p={p} />)}
          {/* trailing spacer so last card isn't flush right edge */}
          <div className="shrink-0 w-2" />
        </div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [allProperties, setAllProperties] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<KakaoUser | null>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [depositIds, setDepositIds] = useState<string[]>([]);
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);

  const loadNotifs = useCallback(async (u: KakaoUser) => {
    try {
      const props = await fetchHostProperties(u.id);
      if (!props.length) return;
      const bks = await fetchHostBookings(props.map(p => p.id));
      const depositBks = bks.filter(b => b.status === "deposit_requested");
      const unread = depositBks.filter(b => !getSeenIds().has(b.id));
      setDepositIds(depositBks.map(b => b.id));
      setNotifCount(unread.length);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (u) loadNotifs(u);
    setRecentSlugs(getRecentSlugs());
    fetchProperties()
      .then(setAllProperties)
      .catch(() => setAllProperties([]))
      .finally(() => setLoading(false));
  }, [loadNotifs]);

  function handleBellClick() {
    if (!user) { router.push("/login"); return; }
    markAsSeen(depositIds);
    setNotifCount(0);
    router.push("/host");
  }

  function handleHostClick() {
    router.push(user ? "/host" : "/login");
  }

  const recentProperties = recentSlugs
    .map(slug => allProperties.find(p => p.slug === slug))
    .filter(Boolean) as SavedProperty[];

  const recentSet = new Set(recentSlugs);
  const remaining = allProperties.filter(p => !recentSet.has(p.slug));
  const recommended = recentProperties.length > 0
    ? [...remaining]
        .map(p => ({ p, score: scoreProperty(p, recentProperties) }))
        .sort((a, b) => b.score - a.score)
        .map(({ p }) => p)
    : allProperties;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-black text-indigo-600 tracking-tight">스테이픽</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold hidden sm:inline">수수료 0%</span>
          </Link>
          <div className="flex items-center gap-1">
            <button onClick={handleBellClick}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {notifCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </button>
            <button onClick={handleHostClick}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero banner ── */}
      <section className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_60%)] pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 py-14 md:py-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-px bg-indigo-200/60" />
            <span className="text-[11px] font-semibold tracking-[0.22em] text-indigo-200 uppercase">Staypick</span>
          </div>
          <h1 className="text-[1.85rem] md:text-[2.4rem] font-black leading-[1.2] tracking-tight mb-4 max-w-lg">
            스테이픽이 처음이라면<br />
            <span className="text-yellow-300">무료체험</span>해보세요
          </h1>
          <p className="text-indigo-100 text-sm md:text-base leading-relaxed max-w-sm">
            불필요한 수수료없이<br />
            호스트 계좌번호로 예약 받으세요
          </p>
        </div>
      </section>

      {/* ── Sections ── */}
      <main className="max-w-5xl mx-auto pt-8 pb-4">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-7 h-7 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : allProperties.length === 0 ? (
          <div className="text-center py-24 mx-4 bg-white rounded-3xl border border-gray-100">
            <p className="text-5xl mb-4">🏡</p>
            <p className="text-base font-semibold text-gray-700 mb-2">아직 등록된 숙소가 없습니다</p>
            <p className="text-sm text-gray-400 mb-6">숙소 운영자라면 지금 바로 등록해보세요.</p>
            <button onClick={handleHostClick}
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-indigo-700 transition-colors">
              숙소 등록하기
            </button>
          </div>
        ) : (
          <>
            {recentProperties.length > 0 && (
              <PropertySection title="최근 본 숙소" properties={recentProperties} />
            )}
            <PropertySection
              title={recentProperties.length > 0 ? "당신을 위한 숙소" : "등록된 숙소"}
              sub={recentProperties.length > 0 ? "최근 관심사 기반 추천" : undefined}
              properties={recommended}
            />
          </>
        )}
      </main>

      {/* ── Bottom banner ── */}
      <div className="max-w-5xl mx-auto px-4 pb-16 pt-2">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-7 text-center text-white">
          <p className="text-xs font-semibold text-indigo-200 mb-2 tracking-wide uppercase">호스트 전용</p>
          <h3 className="text-lg font-black mb-1.5 leading-snug">
            월 구독으로 수수료 없이<br />예약 받으세요
          </h3>
          <p className="text-indigo-200 text-sm mb-5">지금 신청하면 4개월 무료체험</p>
          <button onClick={handleHostClick}
            className="inline-block bg-white text-indigo-600 font-bold text-sm px-7 py-3 rounded-2xl hover:bg-indigo-50 transition-colors shadow-sm">
            무료 체험하기
          </button>
        </div>
      </div>
    </div>
  );
}
