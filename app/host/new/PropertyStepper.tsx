"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PropertyDraft, KakaoUser } from "@/lib/types";
import { generateSlug, normalizeSlug } from "@/lib/pricing";
import { isSlugTaken } from "@/lib/db";
import { apiUpsertProperty } from "@/lib/api";
import { uploadImageEntry, isDataUrl } from "@/lib/storage";
import KakaoAddressInput from "@/components/host/KakaoAddressInput";
import MultiImageUpload from "@/components/host/MultiImageUpload";
import StepRooms from "@/components/host/steps/StepRooms";
import StepPricing from "@/components/host/steps/StepPricing";
import Logo from "@/components/Logo";

const DRAFT_KEY = "host_property_draft";

const DEFAULT_DRAFT: PropertyDraft = {
  name: "",
  description: "",
  address: "",
  lat: 0,
  lng: 0,
  image_url: "",
  images: [],
  slug: "",
  rooms: [{
    name: "",
    max_guests: 1,
    base_guests: 1,
    max_infants: 0,
    bedrooms: 0,
    beds: 1,
    bathrooms: 1,
    image_url: "",
    images: [],
    weekday_price: 0,
    friday_price: 0,
    weekend_price: 0,
    sunday_price: 0,
    extra_adult_price: 0,
    extra_child_price: 0,
    special_prices: [],
  }],
};

function loadDraft(): PropertyDraft {
  if (typeof window === "undefined") return DEFAULT_DRAFT;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return DEFAULT_DRAFT;
    const parsed: PropertyDraft = JSON.parse(raw);
    // data URL이 strip된 빈 이미지 항목 제거
    const validImgs = (imgs: typeof parsed.images) =>
      (imgs ?? []).filter(img => img.thumb_url || img.main_url);
    return {
      ...parsed,
      images: validImgs(parsed.images),
      rooms: (parsed.rooms ?? []).map(r => ({ ...r, images: validImgs(r.images) })),
    };
  } catch { return DEFAULT_DRAFT; }
}

// ─── 각 스텝 정의 ─────────────────────────────────────────────────────────────

interface StepConfig {
  title: string;
  subtitle?: string;
  validate: (d: PropertyDraft) => string | null;
}

const STEPS: StepConfig[] = [
  { title: "숙소 이름을\n알려주세요", subtitle: "게스트가 처음 보게 될 이름입니다.", validate: (d) => d.name.trim() ? null : "숙소 이름을 입력해주세요." },
  { title: "숙소를\n소개해주세요", subtitle: "어떤 숙소인지 자유롭게 작성해주세요.", validate: () => null },
  { title: "위치를\n알려주세요", subtitle: "게스트가 찾아갈 수 있도록 정확한 주소를 입력해주세요.", validate: (d) => d.address.trim() ? null : "주소를 입력해주세요." },
  { title: "대표 사진을\n등록해주세요", subtitle: "숙소의 매력을 잘 보여주는 사진을 등록해주세요.", validate: (d) => (d.images ?? []).some(img => img.thumb_url || img.main_url) ? null : "대표 사진을 1장 이상 등록해주세요." },
  { title: "객실을\n설정해주세요", subtitle: "최대 5개의 객실을 등록할 수 있습니다.", validate: (d) => {
    if (!d.rooms.every(r => r.name.trim())) return "모든 객실 이름을 입력해주세요.";
    if (!d.rooms.every(r => (r.images ?? []).some(img => img.thumb_url || img.main_url) || r.image_url)) return "모든 객실 사진을 등록해주세요.";
    return null;
  }},
  { title: "요금을\n설정해주세요", subtitle: "요일별로 다른 요금을 설정할 수 있습니다.", validate: (d) => {
    // 1순위: 시즌 기간 누락
    for (const r of d.rooms) {
      for (const sp of r.special_prices) {
        if (!sp.start_date || !sp.end_date) return "시즌 요금 적용 기간을 설정해주세요.";
      }
    }
    // 2순위: 금액 누락
    const emptyRooms = d.rooms.filter((r) =>
      !r.weekday_price || !r.friday_price || !r.weekend_price || !r.sunday_price ||
      r.special_prices.some(sp => !sp.weekday_price || !sp.friday_price || !sp.saturday_price || !sp.sunday_price)
    );
    if (emptyRooms.length === 0) return null;
    const names = emptyRooms.map((r) => r.name.trim() || `객실 ${d.rooms.indexOf(r) + 1}`).join(", ");
    return `${names} 금액이 입력되지 않은 항목이 있습니다.`;
  }},
  { title: "나만의 링크를\n만들어주세요", subtitle: "게스트에게 공유할 단축 링크입니다.", validate: (d) => (d.slug.length >= 3) ? null : "링크 주소를 입력해주세요 (3자 이상)." },
];

const TOTAL = STEPS.length;
const DOMAIN = "staypick.com";

// ─── 입력 컴포넌트 헬퍼 ──────────────────────────────────────────────────────

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-300";

export default function PropertyStepper({ user }: { user: KakaoUser }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<PropertyDraft>(loadDraft);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slugSuggested, setSlugSuggested] = useState(false);
  const [toast, setToast] = useState("");
  const [slugRaw, setSlugRaw] = useState(draft.slug);
  const [slugTaken, setSlugTaken] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const slugComposing = useRef(false);

  useEffect(() => {
    const slug = draft.slug;
    if (slug.length < 3) { setSlugTaken(false); return; }
    setSlugChecking(true);
    const timer = setTimeout(async () => {
      const taken = await isSlugTaken(slug, draft.id);
      setSlugTaken(taken);
      setSlugChecking(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [draft.slug, draft.id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  const updateDraft = useCallback((updates: Partial<PropertyDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...updates };
      // Strip data URLs before localStorage to avoid quota issues
      try {
        const strip = (url: string) => isDataUrl(url) ? "" : url;
        const toStore = {
          ...next,
          image_url: strip(next.image_url),
          images: (next.images ?? []).map(img => ({ ...img, thumb_url: strip(img.thumb_url), main_url: strip(img.main_url) })),
          rooms: (next.rooms ?? []).map(r => ({
            ...r,
            image_url: strip(r.image_url),
            images: (r.images ?? []).map(img => ({ ...img, thumb_url: strip(img.thumb_url), main_url: strip(img.main_url) })),
          })),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(toStore));
      } catch {}
      return next;
    });
    setError(null);
  }, []);

  function goNext() {
    const err = STEPS[step].validate(draft);
    if (err) { alert(err); return; }
    if (step === TOTAL - 1 || STEPS[step].title.includes("링크")) {
      if (slugChecking) { setError("링크 사용 가능 여부를 확인 중입니다."); return; }
      if (slugTaken) { setError("이미 사용 중인 링크입니다. 다른 링크를 입력해주세요."); return; }
    }
    setError(null);
    // 링크 스텝 진입 시 슬러그 자동생성
    if (step === STEPS.length - 2 && !slugSuggested) {
      if (!draft.slug) {
        const generated = generateSlug(draft.name);
        updateDraft({ slug: generated });
        setSlugRaw(generated);
      }
      setSlugSuggested(true);
    }
    setStep((s) => Math.min(TOTAL - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goPrev() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    const err = STEPS[step].validate(draft);
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      const propertyId = draft.id || `prop-${Date.now()}`;

      // 커버 이미지 2종 업로드
      const uploadedCoverImages = await Promise.all(
        (draft.images ?? []).map(img =>
          uploadImageEntry(img, `stays/${propertyId}/cover`)
        )
      );

      // 객실 이미지 2종 업로드
      const rooms = await Promise.all(
        draft.rooms.map(async (room, i) => {
          const roomId = `room-${i}`;
          const uploadedRoomImages = await Promise.all(
            (room.images ?? []).map(img =>
              uploadImageEntry(img, `stays/${propertyId}/rooms/${roomId}`)
            )
          );
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { images: _ri, ...roomForDb } = room;
          return {
            ...roomForDb,
            image_url: uploadedRoomImages[0]?.thumb_url ?? room.image_url,
            images: uploadedRoomImages,
          };
        })
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { images: _imgs, ...draftForDb } = draft;
      const hasNotice = !!draft.notice?.trim() || draft.rooms.some(r => !!r.notice?.trim());
      const saved = {
        ...draftForDb,
        image_url: uploadedCoverImages[0]?.thumb_url ?? "",
        images: uploadedCoverImages,
        rooms,
        id: propertyId,
        host_id: user.id,
        is_draft: false,
        is_active: (draft.is_active === true) && hasNotice,
        created_at: new Date().toISOString(),
      };
      await apiUpsertProperty(saved);
      localStorage.removeItem(DRAFT_KEY);
      router.push(`/host?registered=1&id=${propertyId}`);
    } catch (e) {
      setLoading(false);
      const msg = e instanceof Error ? e.message
        : (e as { message?: string })?.message ?? JSON.stringify(e);
      setError(msg.includes("quota") || msg.includes("QuotaExceeded")
        ? "저장 공간이 부족합니다. 이미지 크기를 줄여주세요."
        : `저장 중 오류: ${msg}`);
    }
  }

  const { title, subtitle } = STEPS[step];
  const progress = ((step + 1) / TOTAL) * 100;
  const isLast = step === TOTAL - 1;

  // ─── 스텝별 콘텐츠 ─────────────────────────────────────────────────────────

  function renderContent() {
    switch (step) {
      // 1. 이름
      case 0:
        return (
          <input type="text" value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })}
            placeholder="예: 제주 바다뷰 독채 펜션" className={inputClass} autoFocus maxLength={50} />
        );

      // 2. 소개
      case 1:
        return (
          <textarea value={draft.description} onChange={(e) => updateDraft({ description: e.target.value })}
            placeholder="숙소의 특징, 분위기, 주변 관광지 등을 자유롭게 소개해주세요." rows={6}
            className={`${inputClass} resize-none`} />
        );

      // 3. 위치
      case 2:
        return (
          <div className="space-y-3 w-full">
            <KakaoAddressInput
              value={draft.address}
              detail={draft.address_detail ?? ""}
              lat={draft.lat}
              lng={draft.lng}
              onSelect={(address, lat, lng, detail) => updateDraft({ address, lat, lng, address_detail: detail })}
            />
          </div>
        );

      // 4. 대표 사진
      case 3:
        return (
          <MultiImageUpload
            images={draft.images ?? []}
            maxCount={5}
            onChange={(images) => updateDraft({ images, image_url: images[0]?.thumb_url ?? "" })}
          />
        );

      // 5. 객실
      case 4:
        return <StepRooms draft={draft} onChange={updateDraft} errors={{}} />;

      // 6. 요금
      case 5:
        return <StepPricing draft={draft} onChange={updateDraft} errors={{}} />;

      // 7. 링크
      case 6: {
        const isValid = /^[a-z0-9][a-z0-9-]{1,}[a-z0-9]$/.test(draft.slug);
        const slugStatus = slugChecking ? "checking" : slugTaken ? "taken" : isValid ? "ok" : "invalid";
        return (
          <div className="space-y-5 w-full">
            <div>
              <input
                type="text"
                value={slugRaw}
                onChange={(e) => {
                  const raw = e.target.value;
                  setSlugRaw(raw);
                  if (!slugComposing.current) updateDraft({ slug: normalizeSlug(raw) });
                }}
                onCompositionStart={() => { slugComposing.current = true; }}
                onCompositionEnd={(e) => {
                  slugComposing.current = false;
                  const normalized = normalizeSlug(e.currentTarget.value);
                  setSlugRaw(normalized);
                  updateDraft({ slug: normalized });
                }}
                placeholder="my-stay-seoul"
                className={inputClass}
                spellCheck={false}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1.5">영문 소문자, 숫자, 하이픈(-) · 3자 이상</p>
            </div>

            {draft.slug.length > 0 && (
              <div className={`p-4 rounded-xl border ${
                slugStatus === "ok" ? "bg-green-50 border-green-100" :
                slugStatus === "checking" ? "bg-gray-50 border-gray-200" :
                "bg-red-50 border-red-100"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500">게스트 공유 링크</p>
                  {slugStatus === "checking" && <p className="text-xs text-gray-400">확인 중...</p>}
                  {slugStatus === "taken" && <p className="text-xs text-red-500 font-medium">이미 사용 중인 링크</p>}
                  {slugStatus === "ok" && <p className="text-xs text-green-600 font-medium">사용 가능</p>}
                </div>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-mono font-bold flex-1 break-all ${
                    slugStatus === "ok" ? "text-gray-900" :
                    slugStatus === "checking" ? "text-gray-400" :
                    "text-red-400"
                  }`}>
                    {DOMAIN}/s/{draft.slug}
                  </p>
                  {slugStatus === "ok" && (
                    <button type="button"
                      onClick={() => { navigator.clipboard.writeText(`${DOMAIN}/s/${draft.slug}`); showToast("링크가 복사되었습니다"); }}
                      className="shrink-0 text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                      복사
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      }

      default: return null;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white">
        <div className="relative flex items-center justify-center px-4 py-2 max-w-lg mx-auto">
          <button onClick={() => router.push("/")} className="absolute left-4">
            <Logo />
          </button>
          <span className="text-xs text-gray-400 font-medium">{step + 1} / {TOTAL}</span>
          <button onClick={() => { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); router.push("/host"); }}
            className="absolute right-4 text-xs text-gray-400 hover:text-gray-700 transition-colors">
            임시저장
          </button>
        </div>
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-10 max-w-lg mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 whitespace-pre-line leading-tight">
          {title}
        </h1>
        {subtitle && <p className="text-gray-500 text-sm mb-8">{subtitle}</p>}

        {renderContent()}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </main>

      {/* Sticky Bottom Nav */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 safe-area-inset-bottom">
        <div className="max-w-lg mx-auto flex gap-3">
          <button onClick={() => step === 0 ? router.push("/host") : goPrev()}
            className="w-24 shrink-0 border border-gray-200 text-gray-600 py-4 rounded-2xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            이전
          </button>
          {isLast ? (
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl text-base font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "등록 중..." : "숙소 등록 완료"}
            </button>
          ) : (
            <button onClick={goNext}
              className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl text-base font-bold hover:bg-indigo-700 transition-colors">
              다음
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
