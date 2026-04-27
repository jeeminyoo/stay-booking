import { Booking, SavedProperty } from "./types";

const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? "https://staypick.info";

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${y}.${m}.${parseInt(day)}`;
}

function formatGuests(b: Booking) {
  const parts = [`성인 ${b.adults}명`];
  if (b.children > 0) parts.push(`어린이 ${b.children}명`);
  if (b.infants > 0) parts.push(`유아 ${b.infants}명`);
  return parts.join(", ");
}

// 버튼 URL: 프로토콜+도메인은 템플릿에 고정 입력하므로 경로만 반환
// 솔라피 버튼 URL 필드: https://staypick.info/s/#{유의사항경로}
function noticeUrlPath(property: SavedProperty, roomName: string) {
  const path = `s/${property.slug}/notice`;
  if (!property.notice_per_room) return path;
  return `${path}?room=${encodeURIComponent(roomName)}`;
}

// ─── 예약 확정 알림톡 변수 ────────────────────────────────────────────────────

export interface ConfirmAlimtalkVars {
  게스트명: string;
  숙소명: string;
  객실명: string;
  체크인: string;
  체크아웃: string;
  인원: string;
  금액: string;
  유의사항경로: string;  // 버튼 URL용 — 프로토콜+도메인은 템플릿에 고정
}

export function buildConfirmVars(
  booking: Booking,
  property: SavedProperty,
): ConfirmAlimtalkVars {
  return {
    게스트명:    booking.guest_name,
    숙소명:      booking.property_name,
    객실명:      booking.room_name,
    체크인:      formatDate(booking.check_in),
    체크아웃:    formatDate(booking.check_out),
    인원:        formatGuests(booking),
    금액:        booking.total_price.toLocaleString(),
    유의사항경로: noticeUrlPath(property, booking.room_name),
  };
}

// ─── 템플릿 미리보기 (디버깅·확인용) ─────────────────────────────────────────

export function renderConfirmTemplate(vars: ConfirmAlimtalkVars): string {
  return `[예약 확정 안내]

${vars.게스트명}님, 예약이 확정되었습니다!

━━━━━━━━━━━━━━
🏡 ${vars.숙소명}
🛏 ${vars.객실명}
📅 체크인  ${vars.체크인}
📅 체크아웃 ${vars.체크아웃}
👥 ${vars.인원}
💳 ${vars.금액}원
━━━━━━━━━━━━━━

체크인 전 이용 유의사항을 꼭 확인해주세요.`;
}
