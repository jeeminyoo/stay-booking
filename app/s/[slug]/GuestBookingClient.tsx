"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SavedProperty, RoomDraft, Booking, ImageEntry } from "@/lib/types";

function getImages(p: SavedProperty | RoomDraft): ImageEntry[] {
  if (p.images && p.images.length > 0) return p.images;
  if (p.image_url) return [{ id: "legacy", thumb_url: p.image_url, main_url: p.image_url }];
  return [];
}

function ImageGallery({ images, onClickImage, height = "h-56 md:h-72" }: {
  images: ImageEntry[];
  onClickImage?: (url: string) => void;
  height?: string;
}) {
  if (images.length === 0) return null;
  if (images.length === 1) {
    return (
      <div className={`${height} bg-gray-200 shrink-0`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[0].thumb_url} alt="" loading="lazy"
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => onClickImage?.(images[0].main_url)}
        />
      </div>
    );
  }
  return (
    <div className={`${height} bg-gray-200 shrink-0 relative`}>
      <div
        className="flex overflow-x-auto snap-x snap-mandatory h-full scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {images.map((img) => (
          <div key={img.id} className="shrink-0 w-full h-full snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.thumb_url} alt="" loading="lazy"
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => onClickImage?.(img.main_url)}
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
        {images.map((img) => (
          <span key={img.id} className="w-1.5 h-1.5 rounded-full bg-white/80" />
        ))}
      </div>
    </div>
  );
}
import { calculateTotalPrice } from "@/lib/pricing";
import BookingCalendar from "@/components/BookingCalendar";
import PaymentTimer from "@/components/PaymentTimer";
import { fetchPropertyBySlug } from "@/lib/db";
import { getBlockedDates, createBooking, updateBooking, calcAutoDeadline } from "@/lib/data";
import { fetchHostSettings } from "@/lib/db";
import Logo from "@/components/Logo";

type Step = "room" | "date" | "info" | "payment" | "done";

interface GuestCount { adults: number; children: number; infants: number; }

function formatDate(d: string) {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${y}년 ${parseInt(m)}월 ${parseInt(day)}일`;
}

function formatDateShort(d: string) {
  if (!d) return "-";
  const [, m, day] = d.split("-");
  return `${parseInt(m)}월 ${parseInt(day)}일`;
}

const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
function formatDateWithDay(d: string) {
  if (!d) return "-";
  const [, m, day] = d.split("-");
  const dow = DAY_KO[new Date(d).getDay()];
  return `${parseInt(m)}월 ${parseInt(day)}일 (${dow})`;
}

function isValidPhone(v: string) {
  return /^01[0-9]-?\d{3,4}-?\d{4}$/.test(v.replace(/\s/g, ""));
}

function CounterRow({ label, sub, value, onDec, onInc, min = 0, maxReached = false }: {
  label: string; sub?: string; value: number;
  onDec: () => void; onInc: () => void; min?: number; maxReached?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <div className="flex items-center gap-4">
        <button type="button" onClick={onDec} disabled={value <= min}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 disabled:opacity-30 hover:bg-gray-100 transition-colors text-lg">
          −
        </button>
        <span className="w-5 text-center text-sm font-semibold">{value}</span>
        <button type="button" onClick={onInc} disabled={maxReached}
          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 disabled:hover:bg-transparent transition-colors text-lg">
          +
        </button>
      </div>
    </div>
  );
}

const PRIVACY_TERMS = `■ 수집 항목: 예약자 이름, 휴대폰번호, 메시지(선택)
■ 수집 목적: 예약 확인 및 운영자 연락
■ 보유 기간: 체크아웃 후 30일 이내 파기

■ 개인정보 제3자 제공
  제공받는 자: 해당 숙소 운영자(호스트)
  제공 항목: 예약자 이름, 휴대폰번호, 예약 메시지
  제공 목적: 숙소 예약 확인 및 운영자 연락
  보유 기간: 체크아웃 후 30일 이내 파기`;

export default function GuestBookingClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [property, setProperty] = useState<SavedProperty | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState<Step>("room");
  const [selectedRoom, setSelectedRoom] = useState<RoomDraft | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState<GuestCount>({ adults: 1, children: 0, infants: 0 });
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [infoError, setInfoError] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    if (infoError || phoneError) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  }, [infoError, phoneError]);
  const [autoCancelMinutes, setAutoCancelMinutes] = useState(60);
  const [longStayDiscounts, setLongStayDiscounts] = useState<import("@/lib/types").LongStayDiscount[]>([]);
  const [descExpanded, setDescExpanded] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: property?.name ?? "숙소 공유", url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }

  useEffect(() => {
    async function load() {
      const found = await fetchPropertyBySlug(slug);
      if (!found) { setNotFound(true); return; }
      setProperty(found);
      try {
        const RECENT_KEY = "staypick_recent_slugs";
        const prev: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
        const next = [slug, ...prev.filter(s => s !== slug)].slice(0, 10);
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {}
      const hs = await fetchHostSettings(found.host_id);
      if (hs?.auto_cancel_minutes) setAutoCancelMinutes(hs.auto_cancel_minutes);
      if (hs?.long_stay_discounts?.length) setLongStayDiscounts(hs.long_stay_discounts);
      if (found.rooms.length === 1) {
        const room = found.rooms[0];
        setSelectedRoom(room);
        const roomId = `${found.id}-${room.name}`;
        const blocked = await getBlockedDates(found.id, roomId);
        setBlockedDates(blocked);
      }
    }
    load();
  }, [slug]);

  const handleSelectRoom = async (room: RoomDraft) => {
    setSelectedRoom(room);
    if (property) {
      const roomId = `${property.id}-${room.name}`;
      const blocked = await getBlockedDates(property.id, roomId);
      setBlockedDates(blocked);
    }
    setStep("date");
  };

  const priceCalc = useCallback(() => {
    if (!selectedRoom || !checkIn || !checkOut) return null;
    return calculateTotalPrice({
      checkIn,
      checkOut,
      adults: guests.adults,
      children: guests.children,
      pricing: {
        id: "", room_id: "", updated_at: "",
        weekday_price: selectedRoom.weekday_price,
        friday_price: selectedRoom.friday_price ?? selectedRoom.weekend_price,
        weekend_price: selectedRoom.weekend_price,
        sunday_price: selectedRoom.sunday_price,
        extra_adult_price: selectedRoom.extra_adult_price,
        extra_child_price: selectedRoom.extra_child_price,
      },
      specialPrices: selectedRoom.special_prices.map((sp, i) => ({
        id: String(i), room_id: "",
        start_date: sp.start_date,
        end_date: sp.end_date,
        weekday_price: sp.weekday_price ?? 0,
        friday_price: sp.friday_price ?? 0,
        saturday_price: sp.saturday_price ?? 0,
        sunday_price: sp.sunday_price ?? 0,
      })),
      baseGuests: selectedRoom.base_guests,
      longStayDiscounts,
    });
  }, [selectedRoom, checkIn, checkOut, guests, longStayDiscounts]);

  async function handleConfirmBooking() {
    if (!property || !selectedRoom) return;

    if (!guestName.trim()) { setInfoError("예약자 이름을 입력해주세요."); return; }
    if (!isValidPhone(guestPhone)) { setInfoError("올바른 휴대폰번호를 입력해주세요. (예: 010-1234-5678)"); return; }

    setLoading(true);
    setInfoError("");

    try {
      const roomId = `${property.id}-${selectedRoom.name}`;
      const freshBlocked = await getBlockedDates(property.id, roomId);
      const cur = new Date(checkIn);
      const end = new Date(checkOut);
      let conflict = false;
      while (cur < end) {
        if (freshBlocked.includes(cur.toISOString().split("T")[0])) { conflict = true; break; }
        cur.setDate(cur.getDate() + 1);
      }
      if (conflict) {
        setInfoError("선택하신 날짜가 방금 다른 예약으로 마감되었습니다. 날짜를 다시 선택해주세요.");
        setTimeout(() => {
          setStep("date");
          setCheckIn("");
          setCheckOut("");
          setInfoError("");
        }, 2000);
        setLoading(false);
        return;
      }

      const calc = priceCalc();
      try { localStorage.setItem("guest_phone", guestPhone); } catch {}
      const newBooking = await createBooking({
        property_id: property.id,
        room_id: roomId,
        property_name: property.name,
        room_name: selectedRoom.name,
        check_in: checkIn,
        check_out: checkOut,
        adults: guests.adults,
        children: guests.children,
        infants: guests.infants,
        total_price: calc?.total ?? 0,
        status: "waiting_for_deposit",
        guest_name: guestName,
        guest_phone: guestPhone,
        guest_message: guestMessage || undefined,
        payment_notified: false,
        bank_name: property.bank_name,
        bank_account: property.bank_account,
        bank_holder: property.bank_holder,
      }, autoCancelMinutes);
      setBooking(newBooking);
      setStep("payment");
    } catch {
      setInfoError("예약 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleNotifyPayment() {
    if (!booking || !paymentNote || !property) return;
    const settings = await fetchHostSettings(property.host_id);
    const deadline = calcAutoDeadline(
      new Date(),
      settings?.auto_cancel_minutes ?? 60,
      settings?.unavailable_start,
      settings?.unavailable_end,
    );
    await updateBooking(booking.id, {
      payment_notified: true,
      payment_note: paymentNote,
      status: "deposit_requested",
      payment_deadline: deadline.toISOString(),
    });
    setStep("done");
  }

  async function handleExpire() {
    if (booking) await updateBooking(booking.id, { status: "auto_cancelled" });
    setStep("date");
    setCheckIn("");
    setCheckOut("");
    setBooking(null);
    alert("입금 시간이 초과되어 예약이 취소되었습니다.");
  }

  const calc = priceCalc();
  const nights = calc?.nights ?? 0;
  const totalPersons = guests.adults + guests.children;
  const maxGuests = selectedRoom?.max_guests ?? 99;
  const maxInfants = selectedRoom?.max_infants; // undefined = unlimited, 0 = not allowed, N = max N
  const maxReached = totalPersons >= maxGuests;
  const infantNotAllowed = maxInfants === 0;
  const infantMaxReached = infantNotAllowed || (maxInfants !== undefined && maxInfants > 0 && guests.infants >= maxInfants);

  function BottomNav({
    onBack, backLabel = "이전",
    onNext, nextLabel = "다음", nextDisabled = false,
    nextDanger = false,
    priceSummary,
  }: {
    onBack?: () => void; backLabel?: string;
    onNext?: () => void; nextLabel?: string; nextDisabled?: boolean;
    nextDanger?: boolean;
    priceSummary?: { nights: number; total: number; subtotal: number; discountPercent: number; discountAmount: number; adults: number; children: number; infants: number } | null;
  }) {
    return (
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 pt-2.5 pb-3 z-10">
        {priceSummary && (
          <div className="max-w-2xl mx-auto flex items-center justify-between mb-2 px-0.5">
            <div>
              <p className="text-xs font-semibold text-gray-500">총액</p>
              {priceSummary.discountPercent > 0 && (
                <p className="text-[10px] text-indigo-500 font-semibold">{priceSummary.discountPercent}% 할인 적용 중</p>
              )}
              {priceSummary.infants > 0 && (
                <p className="text-[10px] text-gray-400">유아 {priceSummary.infants}명 요금 미포함</p>
              )}
            </div>
            <div className="text-right">
              {priceSummary.discountPercent > 0 && (
                <p className="text-xs text-gray-400 line-through">{priceSummary.subtotal.toLocaleString()}원</p>
              )}
              <p className="text-base font-bold text-gray-900">{priceSummary.total.toLocaleString()}원</p>
            </div>
          </div>
        )}
        <div className="max-w-2xl mx-auto flex gap-3">
          {onBack && (
            <button onClick={onBack}
              className="w-24 shrink-0 border border-gray-200 text-gray-600 py-3.5 rounded-2xl text-sm font-semibold hover:bg-gray-50 transition-colors">
              {backLabel}
            </button>
          )}
          {onNext && (
            <button onClick={onNext} disabled={nextDisabled}
              className={`flex-1 py-3.5 rounded-2xl text-base font-bold transition-colors disabled:opacity-40
                ${nextDanger ? "bg-green-600 hover:bg-green-700 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}>
              {nextLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="text-4xl mb-3">🔍</p>
      <p className="text-lg font-bold text-gray-800 mb-2">숙소를 찾을 수 없습니다</p>
      <p className="text-sm text-gray-500 mb-6">링크를 다시 확인해주세요.</p>
      <button onClick={() => router.push("/")} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold">홈으로</button>
    </div>
  );

  if (!property) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const DESC_LIMIT = 80;
  const descText = property.description ?? "";
  const descTooLong = descText.length > DESC_LIMIT;
  const infantSub = infantNotAllowed
    ? "유아 미허용"
    : "24개월 미만 · 요금 미포함";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <span className="cursor-default"><Logo /></span>
          <div className="flex items-center gap-2">
            <button onClick={handleShare}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
              title="공유하기">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              {shareCopied && (
                <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] bg-gray-900 text-white px-2 py-0.5 rounded whitespace-nowrap">
                  링크 복사됨
                </span>
              )}
            </button>
            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">수수료 0%</span>
          </div>
        </div>
      </header>

      {/* ── Hero image: step별 분기 ── */}
      {step === "room" && (
        <ImageGallery images={getImages(property)} onClickImage={setLightboxUrl} />
      )}
      {step === "date" && selectedRoom && (
        <ImageGallery images={getImages(selectedRoom)} height="h-56" />
      )}

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-2">

        {/* ── Step: room ── */}
        {step === "room" && (
          <div>
            {/* Property name + address + description */}
            <div className="pt-6 pb-6 border-b border-gray-100 mb-6">
              <h1 className="text-2xl font-black text-gray-900 leading-tight mb-2">{property.name}</h1>
              {property.address && (
                <div className="flex items-center gap-1.5 mb-4">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <p className="text-sm text-gray-400">{property.address}</p>
                </div>
              )}
              {descText && (
                <div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {descTooLong && !descExpanded ? `${descText.slice(0, DESC_LIMIT)}…` : descText}
                  </p>
                  {descTooLong && (
                    <button onClick={() => setDescExpanded(v => !v)}
                      className="text-xs text-indigo-500 mt-2 font-medium">
                      {descExpanded ? "접기" : "더 보기"}
                    </button>
                  )}
                </div>
              )}
            </div>

            <h2 className="text-base font-bold text-gray-800 mb-3">
              {property.rooms.length === 1 ? "객실 정보" : "객실을 선택해주세요"}
            </h2>
            <div className="space-y-3">
              {property.rooms.map((room, idx) => {
                const isSelected = selectedRoom?.name === room.name;
                return (
                  <button key={idx} type="button" onClick={() => void handleSelectRoom(room)}
                    className={`w-full bg-white rounded-2xl border text-left transition-all overflow-hidden
                      ${isSelected ? "border-indigo-500 ring-2 ring-indigo-200 shadow-sm" : "border-gray-200 hover:border-indigo-300"}`}>
                    <div className="relative">
                      {getImages(room).length > 0
                        ? <ImageGallery images={getImages(room)} height="h-44" />
                        : <div className="h-32 w-full bg-gray-100 flex items-center justify-center text-gray-300 text-4xl">🛏</div>
                      }
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center z-10">
                          <span className="text-white text-sm font-bold">✓</span>
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-3.5">
                      <p className="font-bold text-gray-900 text-base mb-1">{room.name}</p>
                      <p className="text-xs text-gray-500 mb-2">
                        기준 {room.base_guests}인(최대 {room.max_guests}인) · 침실 {room.bedrooms}개 · 침대 {room.beds}개 · 욕실 {room.bathrooms}개
                      </p>
                      {room.weekday_price > 0 && (
                        <p className="text-indigo-600 font-bold text-sm">
                          {room.weekday_price.toLocaleString()}원~
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step: date + guests ── */}
        {step === "date" && selectedRoom && (
          <div className="space-y-4">
            <div className="pt-5 pb-4 border-b border-gray-100">
              <p className="text-xs text-gray-400 mb-1">{property.name}</p>
              <h2 className="text-lg font-bold text-gray-900">{selectedRoom.name}</h2>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <BookingCalendar
                blockedDates={blockedDates}
                onRangeSelect={(ci, co) => { setCheckIn(ci); setCheckOut(co); }}
                selectedCheckIn={checkIn}
                selectedCheckOut={checkOut}
              />
              {(checkIn || checkOut) && (
                <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 mb-0.5">체크인</p>
                    <p className="text-sm font-semibold text-gray-800">{checkIn ? formatDateShort(checkIn) : "—"}</p>
                  </div>
                  <div className="text-gray-300 text-sm">→</div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 mb-0.5">체크아웃</p>
                    <p className="text-sm font-semibold text-gray-800">{checkOut ? formatDateShort(checkOut) : "—"}</p>
                  </div>
                  {nights > 0 && (
                    <>
                      <div className="text-gray-300 text-sm">·</div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 mb-0.5">기간</p>
                        <p className="text-sm font-semibold text-indigo-600">{nights}박</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 px-4">
              <CounterRow label="성인" sub="13세 이상" value={guests.adults}
                onDec={() => setGuests(g => ({ ...g, adults: Math.max(1, g.adults - 1) }))}
                onInc={() => setGuests(g => ({ ...g, adults: g.adults + 1 }))}
                min={1} maxReached={maxReached} />
              <CounterRow label="어린이" sub="2~12세" value={guests.children}
                onDec={() => setGuests(g => ({ ...g, children: Math.max(0, g.children - 1) }))}
                onInc={() => setGuests(g => ({ ...g, children: g.children + 1 }))}
                maxReached={maxReached} />
              <CounterRow label="유아" sub={infantSub} value={guests.infants}
                onDec={() => setGuests(g => ({ ...g, infants: Math.max(0, g.infants - 1) }))}
                onInc={() => setGuests(g => ({ ...g, infants: g.infants + 1 }))}
                maxReached={infantMaxReached} />
            </div>

            <p className="text-xs text-center text-gray-400">
              최대 {maxGuests}인 (성인+어린이 기준)
            </p>

            {checkIn && checkOut && calc && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">{nights}박 · 성인 {guests.adults}명{guests.children > 0 ? ` · 어린이 ${guests.children}명` : ""}{guests.infants > 0 ? ` · 유아 ${guests.infants}명` : ""}</p>
                <p className="text-lg font-bold text-indigo-600">{calc.total.toLocaleString()}원</p>
              </div>
            )}

            {(() => {
              const noticeText = property.notice_per_room
                ? (selectedRoom.notice ?? "")
                : (property.notice ?? "");
              return noticeText.trim() ? (
                <div className="bg-gray-100 rounded-2xl px-4 py-3.5">
                  <p className="text-xs font-semibold text-gray-400 mb-1.5">예약 전 확인사항</p>
                  <p className="text-sm text-gray-500 whitespace-pre-line leading-relaxed">{noticeText}</p>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* ── Step: info ── */}
        {step === "info" && calc && (
          <div className="space-y-4">
            <div className="pt-5 pb-4 border-b border-gray-100">
              <p className="text-xs text-gray-400 mb-1">{property.name}{selectedRoom ? ` · ${selectedRoom.name}` : ""}</p>
              <h2 className="text-lg font-bold text-gray-900">예약자 정보</h2>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 text-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">일정</span>
                <span className="font-medium text-gray-800">
                  {formatDateWithDay(checkIn)} → {formatDateWithDay(checkOut)}
                  <span className="text-gray-400 font-normal"> ({nights}박)</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">인원</span>
                <span className="font-medium text-gray-800">성인 {guests.adults}{guests.children > 0 ? ` · 어린이 ${guests.children}` : ""}{guests.infants > 0 ? ` · 유아 ${guests.infants}` : ""}</span>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3.5">
              <div className="flex items-start gap-2.5">
                <span className="text-lg shrink-0 mt-0.5">💳</span>
                <div>
                  <p className="text-xs font-semibold text-indigo-700 mb-0.5">직접 이체로, 더 낮은 가격</p>
                  <p className="text-xs text-indigo-600 leading-relaxed">
                    스테이픽은 호스트 계좌로 직접 이체하는 방식으로 예약이 진행됩니다.<br />
                    중간 수수료 없이, 더 좋은 가격을 경험해보세요.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <div>
                <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)}
                  placeholder="예약자 이름 (입금자명)" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <input type="tel" value={guestPhone}
                  onChange={(e) => { setGuestPhone(e.target.value); setPhoneError(""); }}
                  onBlur={() => { if (guestPhone && !isValidPhone(guestPhone)) setPhoneError("올바른 휴대폰번호 형식이 아닙니다. (예: 010-1234-5678)"); }}
                  placeholder="휴대폰번호 (예: 010-1234-5678)"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${phoneError ? "border-red-300" : "border-gray-200"}`} />
                {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
              </div>
              <div>
                <textarea value={guestMessage} onChange={(e) => setGuestMessage(e.target.value)}
                  placeholder="운영자에게 남길 메시지 (선택사항) — 예: 늦은 체크인 예정입니다."
                  maxLength={100}
                  rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                <p className="text-xs text-gray-400 text-right mt-1">{guestMessage.length}/100</p>
              </div>
            </div>

            {/* Implicit consent notice */}
            <div className="text-xs text-gray-400 leading-relaxed px-1">
              <p>
                예약 요청을 완료하면{" "}
                <button onClick={() => setTermsOpen(v => !v)}
                  className="underline underline-offset-2 text-gray-500 font-medium">
                  이용약관, 개인정보처리방침, 개인정보 제3자 제공
                </button>
                에 동의하는 것으로 간주됩니다.
              </p>

              {termsOpen && (
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 h-36 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-gray-400 text-[11px] leading-relaxed font-sans">
                    {PRIVACY_TERMS}
                  </pre>
                </div>
              )}
            </div>

            {infoError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600">{infoError}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Step: payment ── */}
        {step === "payment" && booking && property && (
          <div className="space-y-4">
            <div className="pt-5 pb-4 border-b border-gray-100">
              <p className="text-xs text-gray-400 mb-1">{property.name}{selectedRoom ? ` · ${selectedRoom.name}` : ""}</p>
              <h2 className="text-lg font-bold text-gray-900">계좌 이체 안내</h2>
            </div>

            <div className="flex flex-col items-center gap-2">
              <PaymentTimer deadline={booking.payment_deadline} onExpire={handleExpire} />
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <span className="text-sm">⏰</span>
                <p className="text-xs font-medium text-amber-700">남은 시간 안에 이체하시면 예약이 유지됩니다</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white">
              <p className="text-indigo-200 text-xs mb-1">입금 계좌</p>
              <p className="font-bold text-2xl tracking-widest mb-1">{property.bank_account}</p>
              <p className="text-indigo-200 text-sm">{property.bank_name} · {property.bank_holder}</p>
              <div className="border-t border-white/20 mt-4 pt-4 flex justify-between items-baseline">
                <span className="text-indigo-200 text-sm">입금액</span>
                <span className="text-white text-2xl font-bold">{booking.total_price.toLocaleString()}원</span>
              </div>
              <p className="text-indigo-200 text-xs mt-1">입금자명: <strong className="text-white">{booking.guest_name}</strong></p>
            </div>

            <button
              onClick={() => { navigator.clipboard.writeText(property.bank_account); alert("계좌번호가 복사되었습니다."); }}
              className="w-full border border-indigo-300 text-indigo-600 py-3 rounded-xl text-sm hover:bg-indigo-50 transition-colors">
              계좌번호 복사
            </button>

            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-xs text-gray-500 space-y-1.5">
              <div className="flex justify-between"><span>예약번호</span><span className="font-mono text-gray-800">{booking.id}</span></div>
              <div className="flex justify-between"><span>체크인</span><span>{formatDate(booking.check_in)}</span></div>
              <div className="flex justify-between"><span>체크아웃</span><span>{formatDate(booking.check_out)}</span></div>
            </div>

            <div>
              <textarea value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="입금 완료 후 메시지를 남겨주세요 (예: 방금 이체 완료했습니다!)"
                maxLength={100}
                rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
              <p className="text-xs text-gray-400 text-right mt-1">{paymentNote.length}/100</p>
            </div>
          </div>
        )}

        {/* ── Step: done ── */}
        {step === "done" && booking && (
          <div className="text-center space-y-5 py-8">
            <div className="text-6xl">🎉</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">예약 요청 완료!</h2>
              <p className="text-gray-500 text-sm">운영자가 입금을 확인한 후 최종 확정됩니다.</p>
            </div>
            <div className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-2.5">
              <span className="text-lg">💬</span>
              <p className="text-sm font-semibold text-yellow-800">예약 확정 시 카카오톡 알림톡으로 안내드립니다</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-2xl p-5 text-sm text-left space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">예약번호</span><span className="font-mono font-bold">{booking.id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">숙소</span><span className="font-medium">{booking.property_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">객실</span><span>{booking.room_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">체크인</span><span>{formatDate(booking.check_in)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">체크아웃</span><span>{formatDate(booking.check_out)}</span></div>
              <div className="flex justify-between pt-2 border-t border-green-200 font-bold">
                <span className="text-gray-700">결제금액</span>
                <span className="text-green-700 text-lg">{booking.total_price.toLocaleString()}원</span>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── Bottom nav ── */}
      {step === "room" && property.rooms.length === 1 && (
        <BottomNav
          onBack={() => router.push("/")} backLabel="홈"
          onNext={() => setStep("date")} nextLabel="날짜 선택"
        />
      )}
      {step === "date" && (
        <BottomNav
          onBack={() => setStep("room")} backLabel="이전"
          onNext={() => setStep("info")} nextLabel="다음"
          nextDisabled={!checkIn || !checkOut}
          priceSummary={calc ? { nights, total: calc.total, subtotal: calc.subtotal, discountPercent: calc.discountPercent, discountAmount: calc.discountAmount, adults: guests.adults, children: guests.children, infants: guests.infants } : null}
        />
      )}
      {step === "info" && (
        <BottomNav
          onBack={() => setStep("date")} backLabel="이전"
          onNext={handleConfirmBooking} nextLabel={loading ? "처리 중..." : "예약 요청"}
          nextDisabled={loading}
        />
      )}
      {step === "payment" && (
        <BottomNav
          onNext={handleNotifyPayment} nextLabel="입금 완료 알리기"
          nextDisabled={!paymentNote}
          nextDanger
        />
      )}
      {step === "done" && (
        <BottomNav
          onNext={() => router.push("/")} nextLabel="홈으로 돌아가기"
        />
      )}

      {/* ── Footer ── */}
      {(step === "room" || step === "done") && (
        <footer className="max-w-2xl mx-auto w-full px-4 py-6 text-center">
          <p className="text-[11px] text-gray-400">
            © 스테이픽 · 수수료 없는 숙소 예약 플랫폼
          </p>
        </footer>
      )}

      {/* ── Lightbox ── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl} alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
