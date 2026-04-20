"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PropertyDraft, KakaoUser } from "@/lib/types";
import { generateSlug, normalizeSlug } from "@/lib/pricing";
import { upsertProperty } from "@/lib/db";
import { uploadDataUrl, isDataUrl } from "@/lib/storage";
import KakaoAddressInput from "@/components/host/KakaoAddressInput";
import BankSelector from "@/components/host/BankSelector";
import ImageUpload from "@/components/host/ImageUpload";
import StepRooms from "@/components/host/steps/StepRooms";
import StepPricing from "@/components/host/steps/StepPricing";

const DRAFT_KEY = "host_property_draft";

const DEFAULT_DRAFT: PropertyDraft = {
  name: "",
  description: "",
  address: "",
  lat: 0,
  lng: 0,
  image_url: "",
  slug: "",
  bank_name: "",
  bank_account: "",
  bank_holder: "",
  rooms: [{
    name: "",
    max_guests: 1,
    base_guests: 1,
    max_infants: 0,
    bedrooms: 0,
    beds: 1,
    bathrooms: 1,
    image_url: "",
    weekday_price: 0,
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
    return raw ? JSON.parse(raw) : DEFAULT_DRAFT;
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
  { title: "대표 사진을\n등록해주세요", subtitle: "첫인상이 되는 사진입니다. 숙소를 잘 보여주는 사진을 선택해주세요.", validate: (d) => d.image_url ? null : "대표 사진을 등록해주세요." },
  { title: "입금 계좌를\n입력해주세요", subtitle: "게스트가 직접 이체할 계좌 정보입니다.", validate: (d) => (d.bank_name && d.bank_account && d.bank_holder) ? null : "계좌 정보를 모두 입력해주세요." },
  { title: "객실을\n설정해주세요", subtitle: "최대 5개의 객실을 등록할 수 있습니다.", validate: (d) => {
    if (!d.rooms.every(r => r.name.trim())) return "모든 객실 이름을 입력해주세요.";
    if (!d.rooms.every(r => r.image_url)) return "모든 객실 사진을 등록해주세요.";
    return null;
  }},
  { title: "요금을\n설정해주세요", subtitle: "요일별로 다른 요금을 설정할 수 있습니다.", validate: (d) => d.rooms.every(r => r.weekday_price > 0 || r.weekend_price > 0) ? null : "최소 1개 이상의 요금을 입력해주세요." },
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
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [slugRaw, setSlugRaw] = useState(draft.slug);
  const slugComposing = useRef(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  const updateDraft = useCallback((updates: Partial<PropertyDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...updates };
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    setError(null);
  }, []);

  function goNext() {
    const err = STEPS[step].validate(draft);
    if (err) { setError(err); return; }
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

      // base64 이미지를 Supabase Storage에 업로드하고 URL로 교체
      const imageUrl = isDataUrl(draft.image_url)
        ? await uploadDataUrl(draft.image_url, `${propertyId}/cover`)
        : draft.image_url;

      const rooms = await Promise.all(
        draft.rooms.map(async (room, i) => {
          if (!room.image_url || !isDataUrl(room.image_url)) return room;
          const url = await uploadDataUrl(room.image_url, `${propertyId}/room-${i}`);
          return { ...room, image_url: url };
        })
      );

      const saved = {
        ...draft,
        image_url: imageUrl,
        rooms,
        id: propertyId,
        host_id: user.id,
        is_draft: false,
        created_at: new Date().toISOString(),
      };
      await upsertProperty(saved);
      localStorage.removeItem(DRAFT_KEY);
      router.push("/host?registered=1");
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
              onSelect={(address: string, lat: number, lng: number) => updateDraft({ address, lat, lng })}
            />
          </div>
        );

      // 4. 대표 사진
      case 3:
        return (
          <ImageUpload
            value={draft.image_url}
            onChange={(url) => updateDraft({ image_url: url })}
            placeholder="앨범 또는 파일에서 사진 선택"
          />
        );

      // 5. 계좌 정보
      case 4:
        return (
          <div className="space-y-4 w-full">
            {/* 은행명 */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">은행명</p>
              <button type="button" onClick={() => setBankModalOpen(true)}
                className={`w-full border rounded-xl px-4 py-3.5 text-base text-left transition-colors
                  ${draft.bank_name
                    ? "border-gray-200 text-gray-900 bg-white"
                    : "border-gray-200 text-gray-300 bg-white hover:border-indigo-300"}`}>
                {draft.bank_name || "은행 선택"}
              </button>
            </div>
            {/* 계좌번호 */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">계좌번호</p>
              <input type="text" value={draft.bank_account} onChange={(e) => updateDraft({ bank_account: e.target.value })}
                placeholder="계좌번호를 입력해주세요" className={inputClass} inputMode="numeric" />
            </div>
            {/* 예금주 */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">예금주</p>
              <input type="text" value={draft.bank_holder} onChange={(e) => updateDraft({ bank_holder: e.target.value })}
                placeholder="예금주명을 입력해주세요" className={inputClass} />
            </div>
          </div>
        );

      // 6. 객실
      case 5:
        return <StepRooms draft={draft} onChange={updateDraft} errors={{}} />;

      // 7. 요금
      case 6:
        return <StepPricing draft={draft} onChange={updateDraft} errors={{}} />;

      // 8. 링크
      case 7: {
        const isValid = /^[a-z0-9][a-z0-9-]{1,}[a-z0-9]$/.test(draft.slug);
        return (
          <div className="space-y-5 w-full">
            <div>
              <input
                type="text"
                value={slugRaw}
                onChange={(e) => {
                  const raw = e.target.value;
                  setSlugRaw(raw);
                  if (!slugComposing.current) {
                    updateDraft({ slug: normalizeSlug(raw) });
                  }
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
              <div className={`p-4 rounded-xl border ${isValid ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
                <p className="text-xs text-gray-500 mb-1">게스트 공유 링크</p>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-mono font-bold flex-1 break-all ${isValid ? "text-gray-900" : "text-red-400"}`}>
                    {DOMAIN}/s/{draft.slug}
                  </p>
                  {isValid && (
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(`${DOMAIN}/s/${draft.slug}`); showToast("링크가 복사되었습니다"); }}
                      className="shrink-0 text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
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

      {/* 은행 선택 모달 */}
      {bankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBankModalOpen(false)} />
          <div className="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="font-bold text-gray-900">은행 선택</p>
              <button onClick={() => setBankModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              <BankSelector
                value={draft.bank_name}
                onChange={(name) => { updateDraft({ bank_name: name }); setBankModalOpen(false); }}
              />
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="relative flex items-center justify-center px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => router.push("/")}
            className="absolute left-4 text-base font-black text-indigo-600 tracking-tight">
            스테이픽
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
