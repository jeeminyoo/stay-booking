// 입력값 필터 — onChange에서 사용, 허용하지 않는 문자를 실시간으로 제거
export const filter = {
  // 이름/예금주: 한글(완성형+자모)·영문·공백만 — 자모 포함은 모바일 IME 조합 중 필터링 방지용
  name: (v: string) => v.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z\s]/g, ""),

  // 전화번호: 숫자만 (자동 포맷은 호출 측에서 처리)
  digits: (v: string) => v.replace(/\D/g, ""),

  // 계좌번호: 숫자·하이픈만
  bankAccount: (v: string) => v.replace(/[^0-9-]/g, ""),

  // 예약번호: 영대문자·숫자만, 자동 대문자
  bookingId: (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, ""),

  // 금액: 숫자만
  number: (v: string) => v.replace(/\D/g, ""),
};

// 제출 시 최종 검사 — 통과하면 true
export const validate = {
  name: (v: string) => v.trim().length >= 1,

  phone: (v: string) => /^01[0-9]-\d{3,4}-\d{4}$/.test(v),

  bankAccount: (v: string) => /^\d[\d-]{3,}$/.test(v),

  bookingId: (v: string) => /^BK\d{8}$/.test(v),
};

// 전화번호 자동 포맷 (숫자 string → 010-1234-5678)
export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length > 7) return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
  if (d.length > 3) return d.slice(0, 3) + "-" + d.slice(3);
  return d;
}
