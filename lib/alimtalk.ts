import { sendAlimtalk, TEMPLATE } from "./solapi";
import type { Booking } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://staypick.info";

function fmt(date: string) {
  return date.replace(/-/g, ".");
}

function fmtDeadline(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtPrice(n: number) {
  return n.toLocaleString("ko-KR");
}

function fmtGuests(b: Booking) {
  const parts = [`성인 ${b.adults}명`];
  if (b.children > 0) parts.push(`어린이 ${b.children}명`);
  if (b.infants > 0) parts.push(`유아 ${b.infants}명`);
  return parts.join(" ");
}

// 1. 게스트 입금 요청 (예약 생성 직후)
export async function sendGuestDepositRequest(booking: Booking): Promise<void> {
  await sendAlimtalk(
    booking.guest_phone,
    TEMPLATE.GUEST_DEPOSIT_REQUEST,
    {
      "#{게스트명}":  booking.guest_name,
      "#{숙소명}":    booking.property_name,
      "#{객실명}":    booking.room_name,
      "#{금액}":      fmtPrice(booking.total_price),
      "#{은행명}":    booking.bank_name,
      "#{예금주}":    booking.bank_holder,
      "#{계좌번호}":  booking.bank_account,
      "#{입금기한}":  fmtDeadline(booking.payment_deadline),
      "#{예약ID}":    booking.id,
    },
    [{ buttonType: "WL", buttonName: "입금확인 요청하기", linkMo: `${BASE_URL}/booking/${booking.id}`, linkPc: `${BASE_URL}/booking/${booking.id}` }],
  );
}

// 2. 호스트 입금확인요청 알림 (게스트가 입금확인 요청 시)
export async function sendHostDepositRequested(booking: Booking, hostPhone: string): Promise<void> {
  await sendAlimtalk(
    hostPhone,
    TEMPLATE.HOST_DEPOSIT_REQUESTED,
    {
      "#{숙소명}":      booking.property_name,
      "#{객실명}":      booking.room_name,
      "#{체크인일자}":  fmt(booking.check_in),
      "#{체크아웃일자}": fmt(booking.check_out),
      "#{입금자명}":    booking.guest_name,
      "#{휴대폰번호}":  booking.guest_phone,
      "#{입금액}":      fmtPrice(booking.total_price),
      "#{메시지}":      booking.payment_note || "없음",
    },
  );
}

// 3. 게스트 예약 확정 안내 (호스트가 예약 확정 시)
export async function sendGuestBookingConfirmed(booking: Booking, slug: string): Promise<void> {
  const confirmUrl = `${BASE_URL}/s/${slug}/notice-confirm`;
  await sendAlimtalk(
    booking.guest_phone,
    TEMPLATE.GUEST_BOOKING_CONFIRMED,
    {
      "#{게스트명}":  booking.guest_name,
      "#{숙소명}":    booking.property_name,
      "#{객실명}":    booking.room_name,
      "#{예약번호}":  booking.id,
      "#{입금자명}":  booking.guest_name,
      "#{체크인}":    fmt(booking.check_in),
      "#{체크아웃}":  fmt(booking.check_out),
      "#{인원}":      fmtGuests(booking),
      "#{금액}":      fmtPrice(booking.total_price),
    },
    [{ buttonType: "WL", buttonName: "유의사항 확인하기", linkMo: confirmUrl, linkPc: confirmUrl }],
  );
}

// 4. 게스트 체크인 당일 안내 (크론 발송)
export async function sendGuestCheckinReminder(booking: Booking, slug: string): Promise<void> {
  const checkinUrl = `${BASE_URL}/s/${slug}/notice-checkin`;
  await sendAlimtalk(
    booking.guest_phone,
    TEMPLATE.GUEST_CHECKIN_REMINDER,
    {
      "#{게스트명}":  booking.guest_name,
      "#{숙소명}":    booking.property_name,
      "#{객실명}":    booking.room_name,
      "#{체크인}":    fmt(booking.check_in),
      "#{체크아웃}":  fmt(booking.check_out),
    },
    [{ buttonType: "WL", buttonName: "체크인 유의사항 확인", linkMo: checkinUrl, linkPc: checkinUrl }],
  );
}
