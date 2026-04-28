// ─── Auth ────────────────────────────────────────────────────────────────────

export interface KakaoUser {
  id: string;
  nickname: string;
  profile_image: string;
}

// ─── Booking ────────────────────────────────────────────────────────────────

export type BookingStatus =
  | "waiting_for_deposit"   // 입금대기
  | "deposit_requested"     // 입금확인요청
  | "confirmed"             // 예약확정
  | "auto_cancelled"        // 자동취소
  | "cancelled";            // 예약취소

export interface HostSettings {
  host_id: string;
  auto_cancel_minutes: number;  // 두 상태 공통 자동취소 시간 (기본 60분)
  unavailable_start: string;    // "HH:MM"
  unavailable_end: string;      // "HH:MM"
  updated_at: string;
}

export interface Booking {
  id: string;
  property_id: string;
  room_id: string;
  property_name: string;
  room_name: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  infants: number;
  total_price: number;
  status: BookingStatus;
  created_at: string;
  payment_deadline: string;
  guest_name: string;
  guest_phone: string;
  payment_notified: boolean;
  payment_note?: string;       // 입금확인요청 시 게스트 메시지
  bank_name: string;
  bank_account: string;
  bank_holder: string;
  guest_message?: string;
  host_memo?: string;
}

// ─── Property (숙소) ─────────────────────────────────────────────────────────

export interface Property {
  id: string;
  host_id: string;
  name: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  image_url: string;
  slug: string;
  is_draft: boolean;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
  created_at: string;
  updated_at: string;
  rooms?: Room[];
}

// ─── Room (객실) ─────────────────────────────────────────────────────────────

export interface Room {
  id: string;
  property_id: string;
  name: string;
  order_index: number;
  max_guests: number;
  base_guests: number;
  max_infants?: number;  // 0 = unlimited
  bedrooms: number;
  beds: number;
  bathrooms: number;
  image_url: string;
  is_active: boolean;
  created_at: string;
  pricing?: Pricing;
  special_prices?: SpecialPrice[];
}

// ─── Pricing (객실별 1:1) ─────────────────────────────────────────────────────

export interface Pricing {
  id: string;
  room_id: string;
  weekday_price: number;   // 월-목
  friday_price: number;    // 금
  weekend_price: number;   // 토
  sunday_price: number;    // 일
  extra_adult_price: number;
  extra_child_price: number;
  updated_at: string;
}

// ─── SpecialPrice (시즌 요금) ─────────────────────────────────────────────────
// extra_amount: 해당 기간 요일별 기본요금에 추가되는 금액

export interface SpecialPrice {
  id: string;
  room_id: string;
  start_date: string;
  end_date: string;
  weekday_price: number;
  friday_price: number;
  saturday_price: number;
  sunday_price: number;
}

// ─── Image ───────────────────────────────────────────────────────────────────

export interface ImageEntry {
  id: string;
  thumb_url: string;  // 600px webp — 리스트/카드용
  main_url: string;   // 1600px webp — 상세/라이트박스용
}

// ─── Form Draft ──────────────────────────────────────────────────────────────

export interface SpecialPriceDraft {
  start_date: string;
  end_date: string;
  weekday_price: number;   // 월-목
  friday_price: number;    // 금
  saturday_price: number;  // 토
  sunday_price: number;    // 일
}

export interface RoomDraft {
  name: string;
  max_guests: number;
  base_guests: number;
  max_infants?: number;  // 0 = unlimited
  bedrooms: number;
  beds: number;
  bathrooms: number;
  image_url: string;
  images?: ImageEntry[];
  weekday_price: number;   // 월-목
  friday_price: number;    // 금
  weekend_price: number;   // 토
  sunday_price: number;    // 일
  extra_adult_price: number;
  extra_child_price: number;
  special_prices: SpecialPriceDraft[];
  notice?: string;          // 예약 진행 시
  notice_confirm?: string;  // 예약 확정 알림톡
  notice_checkin?: string;  // 체크인 당일 알림톡
}

export interface PropertyDraft {
  id?: string;         // present when editing an existing property
  name: string;
  description: string;
  address: string;
  address_detail?: string;
  lat: number;
  lng: number;
  image_url: string;
  images?: ImageEntry[];
  slug: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
  rooms: RoomDraft[];
  notice?: string;                  // 예약 진행 시
  notice_confirm?: string;          // 예약 확정 알림톡
  notice_checkin?: string;          // 체크인 당일 알림톡
  notice_per_room?: boolean;
  notice_confirm_per_room?: boolean;
  notice_checkin_per_room?: boolean;
  is_active?: boolean;
}

// ─── ManualBlock (수동 블락) ───────────────────────────────────────────────────

export interface ManualBlock {
  id: string;
  property_id: string;
  room_id: string;   // stores room name
  date: string;      // YYYY-MM-DD
  note?: string;
  created_at: string;
}

// ─── WeeklyBlock (정기 요일 블락) ─────────────────────────────────────────────

export interface WeeklyBlock {
  id: string;
  property_id: string;
  room_id: string;   // stores room name
  day_of_week: number; // 0=Sun … 6=Sat
  created_at: string;
}

// ─── WeeklyBlockException (특정 날짜 정기블락 제외) ───────────────────────────

export interface WeeklyBlockException {
  id: string;
  property_id: string;
  room_id: string;
  date: string; // YYYY-MM-DD
  created_at: string;
}

// ─── Review ──────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  booking_id: string;
  property_id: string;
  property_name: string;
  room_name: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  rating: number;
  content: string;
  created_at: string;
}

// ─── Saved Property (localStorage) ───────────────────────────────────────────

export type SavedProperty = PropertyDraft & {
  id: string;
  host_id: string;
  is_draft: boolean;
  is_active: boolean;
  created_at: string;
};
