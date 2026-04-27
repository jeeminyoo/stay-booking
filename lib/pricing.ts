import { Pricing, SpecialPrice } from "./types";
import { isHoliday } from "./holidays";

// ─── 요금 계산 ────────────────────────────────────────────────────────────────

export interface CalcParams {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  // infants: 인원 & 요금 계산에서 완전 제외
  pricing: Pricing;
  specialPrices: SpecialPrice[];
  baseGuests: number;
}

export interface CalcResult {
  nights: number;
  breakdown: DayBreakdown[];
  extraPersonTotal: number;
  total: number;
}

interface DayBreakdown {
  date: string;
  basePrice: number;
  extraPersonCharge: number;
  isSpecial: boolean;
}

export function calculateTotalPrice(params: CalcParams): CalcResult {
  const { checkIn, checkOut, adults, children, pricing, specialPrices, baseGuests } = params;

  const breakdown: DayBreakdown[] = [];
  const cur = new Date(checkIn + "T00:00:00");
  const end = new Date(checkOut + "T00:00:00");

  while (cur < end) {
    const dateStr = cur.toISOString().split("T")[0];

    // 시즌 요금이 일반 요금보다 우선
    const special = specialPrices.find(
      (sp) => dateStr >= sp.start_date && dateStr <= sp.end_date
    );

    let basePrice: number;
    let isSpecial = false;

    const dow = cur.getDay(); // 0=일 1=월 … 5=금 6=토
    const holiday = isHoliday(dateStr);

    if (special) {
      // 시즌 기간: 요일별 시즌 요금으로 override
      if (dow === 0) basePrice = special.sunday_price;
      else if (dow === 5) basePrice = special.friday_price;
      else if (dow === 6 || holiday) basePrice = special.saturday_price;
      else basePrice = special.weekday_price;
      isSpecial = true;
    } else {
      if (dow === 0) basePrice = pricing.sunday_price;
      else if (dow === 5) basePrice = pricing.friday_price;
      else if (dow === 6 || holiday) basePrice = pricing.weekend_price;  // 토, 공휴일
      else basePrice = pricing.weekday_price;
    }

    // 추가 인원 요금: 성인 → 어린이 순으로 기준 인원 소진
    const extraPersonCharge = calcExtraPersonCharge(
      adults,
      children,
      baseGuests,
      pricing.extra_adult_price,
      pricing.extra_child_price
    );

    breakdown.push({ date: dateStr, basePrice, extraPersonCharge, isSpecial });
    cur.setDate(cur.getDate() + 1);
  }

  const nights = breakdown.length;
  const extraPersonTotal = nights > 0 ? breakdown[0].extraPersonCharge * nights : 0;
  const total = breakdown.reduce((sum, d) => sum + d.basePrice + d.extraPersonCharge, 0);

  return { nights, breakdown, extraPersonTotal, total };
}

function calcExtraPersonCharge(
  adults: number,
  children: number,
  baseGuests: number,
  extraAdultPrice: number,
  extraChildPrice: number
): number {
  // 성인부터 기준 인원을 먼저 소진, 나머지를 어린이로 채움
  const extraAdults = Math.max(0, adults - baseGuests);
  const remainingBase = Math.max(0, baseGuests - adults);
  const extraChildren = Math.max(0, children - remainingBase);

  return extraAdults * extraAdultPrice + extraChildren * extraChildPrice;
}

// ─── 인원 유효성 검사 ─────────────────────────────────────────────────────────

export function validateCapacity(params: {
  adults: number;
  children: number;
  infants: number;
  maxGuests: number;
  maxInfants: number;
}): { valid: boolean; reason?: string } {
  const { adults, children, infants, maxGuests, maxInfants } = params;

  if (adults + children > maxGuests) {
    return {
      valid: false,
      reason: `최대 인원 ${maxGuests}명을 초과했습니다 (성인+어린이 기준, 유아 제외).`,
    };
  }
  if (infants > maxInfants) {
    return {
      valid: false,
      reason: `유아는 최대 ${maxInfants}명까지 가능합니다.`,
    };
  }
  return { valid: true };
}

// ─── 슬러그 유틸 ─────────────────────────────────────────────────────────────

export function generateSlug(propertyName: string): string {
  const suffix = Math.random().toString(36).substring(2, 6);
  // 영문/숫자만 남기고 나머지는 하이픈으로 (한글 등 비ASCII는 제거)
  const base =
    propertyName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .substring(0, 20) || "stay";
  return `${base}-${suffix}`;
}

export function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── 날짜 유틸 ────────────────────────────────────────────────────────────────

export function getNights(checkIn: string, checkOut: string): number {
  return Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

export function getDayLabel(dateStr: string): string {
  const dow = new Date(dateStr + "T00:00:00").getDay();
  return ["일", "월", "화", "수", "목", "금", "토"][dow];
}
