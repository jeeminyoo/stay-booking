"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortAddress(addr: string): string {
  if (!addr) return "";
  const parts = addr.trim().split(/\s+/);
  // 도 + 시 + 구 구조 (경기도 성남시 분당구 …) → 3단계 표시
  if (parts.length >= 3 && parts[1].endsWith("시") && !parts[0].endsWith("시")) {
    return parts.slice(0, 3).join(" ");
  }
  return parts.slice(0, 2).join(" ");
}

// ─── Card component ───────────────────────────────────────────────────────────

function PropertyCard({ p }: { p: SavedProperty }) {
  const minPrice = getMinPrice(p);
  const maxG = getMaxGuests(p);
  return (
    <Link href={`/s/${p.slug}`} className="group block">
      <div className="overflow-hidden rounded-xl bg-gray-100 aspect-[4/3] mb-3">
        {(p.images?.[0]?.thumb_url || p.image_url) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.images?.[0]?.thumb_url || p.image_url} alt={p.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-4xl">🏡</div>
        )}
      </div>
      <div className="space-y-0.5">
        <p className="font-bold text-gray-900 text-base leading-snug line-clamp-1">{p.name}</p>
        <p className="text-gray-400 text-sm">{shortAddress(p.address)}</p>
        <div className="flex items-baseline gap-2 pt-0.5">
          {minPrice > 0 && (
            <span className="text-gray-900 text-sm font-bold">
              {minPrice.toLocaleString()}원~
              <span className="text-xs font-normal text-gray-400 ml-1">/ 1박</span>
            </span>
          )}
          {maxG > 0 && <span className="text-xs text-gray-400">· 최대 {maxG}인</span>}
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
  return (
    <section className="mb-12">
      <div className="flex items-baseline gap-2 mb-5">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {sub && <span className="text-sm text-gray-400">{sub}</span>}
      </div>
      <div
        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" } as React.CSSProperties}
      >
        {properties.map(p => (
          <div key={p.id} className="shrink-0 w-[70vw] max-w-[260px] snap-start">
            <PropertyCard p={p} />
          </div>
        ))}
        <div className="shrink-0 w-2" />
      </div>
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
    <div className="min-h-screen bg-white">

      {/* ── Header ── */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
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

      {/* ── Hero ── */}
      <section className="relative overflow-hidden h-[52vh] min-h-[320px] max-h-[560px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/main-2.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/75" />

        <div className="relative h-full flex flex-col justify-end max-w-5xl mx-auto px-6 pb-10 md:pb-14">
          <p className="text-[10px] tracking-[0.3em] text-white/60 uppercase mb-3">No commission · Direct booking</p>
          <h1 className="text-3xl md:text-5xl font-black leading-[1.15] tracking-tight text-white mb-5 max-w-lg drop-shadow-sm">
            수수료 없이<br/>예약을 편하게
          </h1>
          <button onClick={() => router.push(user ? "/host?tab=properties" : "/login")}
            className="self-start text-sm text-white/70 hover:text-white border-b border-white/40 hover:border-white pb-0.5 transition-colors">
            숙소 등록하기 →
          </button>
        </div>
      </section>

      {/* ── Properties ── */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          </div>
        ) : allProperties.length === 0 ? (
          <div className="text-center py-24 border border-gray-100 rounded-2xl">
            <p className="text-4xl mb-4">🏡</p>
            <p className="text-base font-semibold text-gray-700 mb-2">아직 등록된 숙소가 없습니다</p>
            <p className="text-sm text-gray-400 mb-6">숙소 운영자라면 지금 바로 등록해보세요.</p>
            <button onClick={handleHostClick}
              className="bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-700 transition-colors">
              숙소 등록하기
            </button>
          </div>
        ) : (
          <>
            {recentProperties.length > 0 && (
              <PropertySection title="최근 본 숙소" properties={recentProperties} />
            )}
            <PropertySection
              title={recentProperties.length > 0 ? "추천 숙소" : "숙소"}
              sub={recentProperties.length > 0 ? "최근 관심사 기반 추천" : undefined}
              properties={recommended}
            />
          </>
        )}
      </main>

      {/* ── Host CTA ── */}
      <section className="border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-14 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-gray-400 uppercase mb-2">호스트 전용</p>
            <h3 className="text-xl font-bold text-gray-900 leading-snug">
              수수료 없이 직접 예약 받으세요
            </h3>
            <p className="text-sm text-gray-400 mt-1">지금 신청하면 4개월 무료 체험</p>
          </div>
          <button onClick={handleHostClick}
            className="shrink-0 bg-gray-900 text-white font-semibold text-sm px-7 py-3.5 rounded-xl hover:bg-gray-700 transition-colors">
            무료 체험하기
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <Link href="/"><Logo /></Link>
              <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                수수료 없는 숙소 예약 플랫폼<br />
                호스트와 게스트를 직접 연결합니다
              </p>
            </div>
            <div className="flex gap-8 text-sm text-gray-500">
              <div className="space-y-2">
                <p className="font-semibold text-gray-700 text-xs tracking-wide uppercase mb-3">서비스</p>
                <button onClick={handleHostClick} className="block text-xs text-gray-500 hover:text-gray-900 transition-colors">숙소 등록</button>
                <Link href="/my-bookings" className="block text-xs text-gray-500 hover:text-gray-900 transition-colors">예약 확인</Link>
                <Link href="/login" className="block text-xs text-gray-500 hover:text-gray-900 transition-colors">호스트 로그인</Link>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-gray-700 text-xs tracking-wide uppercase mb-3">약관</p>
                <span className="block text-xs text-gray-500 cursor-pointer hover:text-gray-900 transition-colors">이용약관</span>
                <span className="block text-xs text-gray-500 cursor-pointer hover:text-gray-900 transition-colors">개인정보처리방침</span>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-6 space-y-1">
            <p className="text-[11px] text-gray-400">© 2025 Staypick. All rights reserved.</p>
            <p className="text-[11px] text-gray-400">뉴세컨드 · 대표이사 조분식 · 사업자등록번호 584-17-02178</p>
            <p className="text-[11px] text-gray-400">대구광역시 북구 동북로 163, 109동 1607호</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
