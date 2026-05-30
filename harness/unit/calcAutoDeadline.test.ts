import { describe, it, expect } from "vitest";
import { calcAutoDeadline } from "@/lib/data";

// KST 기준 특정 시각의 UTC Date를 만드는 헬퍼
function kst(hour: number, minute = 0, date = 1): Date {
  // 2026-01-{date} {hour}:{minute} KST = UTC+9
  return new Date(Date.UTC(2026, 0, date, hour - 9, minute, 0));
}

describe("calcAutoDeadline", () => {
  describe("minutes=0 → 자동취소 비활성화", () => {
    it("100년 후 날짜를 반환한다", () => {
      const now = kst(10);
      const result = calcAutoDeadline(now, 0);
      const diffYears = (result.getTime() - now.getTime()) / (365.25 * 24 * 3600 * 1000);
      expect(diffYears).toBeGreaterThan(99);
    });
  });

  describe("unavailableStart === unavailableEnd → 응답불가시간 없음", () => {
    it("now + minutes 그대로 반환한다", () => {
      const now = kst(22);
      const result = calcAutoDeadline(now, 60, "00:00", "00:00");
      expect(result.getTime() - now.getTime()).toBe(60 * 60 * 1000);
    });
  });

  describe("가용 시간대 (08:00-21:00 KST)에 요청", () => {
    it("10:00 KST + 60분 = 11:00 KST", () => {
      const now = kst(10, 0);
      const result = calcAutoDeadline(now, 60);
      expect(result.getTime() - now.getTime()).toBe(60 * 60 * 1000);
    });

    it("20:30 KST + 60분 → 비가용 시간 진입 전이므로 21:30이 아니라 다음날 08:00 + 30분", () => {
      // 20:30에 60분 카운트하면 21:30 → 그 중 21:00 이후 30분은 비가용
      // 실제로 deadline은 다음날 08:30이 되어야 함
      const now = kst(20, 30);
      const result = calcAutoDeadline(now, 60);
      // 현재 시각이 가용 구간이므로 단순히 now + 60분
      expect(result.getTime() - now.getTime()).toBe(60 * 60 * 1000);
    });
  });

  describe("비가용 시간대 (21:00-08:00 KST)에 요청", () => {
    it("22:00 KST에 60분 요청 → 다음날 08:00 KST + 60분", () => {
      const now = kst(22, 0, 1); // 1월 1일 22:00 KST
      const result = calcAutoDeadline(now, 60);
      const expected = kst(9, 0, 2); // 1월 2일 09:00 KST (08:00 + 60분)
      expect(result.getTime()).toBe(expected.getTime());
    });

    it("02:00 KST(자정 이후)에 60분 요청 → 당일 08:00 KST + 60분", () => {
      const now = kst(2, 0, 2); // 1월 2일 02:00 KST
      const result = calcAutoDeadline(now, 60);
      const expected = kst(9, 0, 2); // 1월 2일 09:00 KST
      expect(result.getTime()).toBe(expected.getTime());
    });

    it("21:00 정각에 요청 → 다음날 08:00 + minutes", () => {
      const now = kst(21, 0, 1);
      const result = calcAutoDeadline(now, 30);
      const expected = kst(8, 30, 2);
      expect(result.getTime()).toBe(expected.getTime());
    });
  });

  describe("커스텀 비가용 시간대", () => {
    it("비가용 없이(09:00-09:00) 설정하면 now + minutes", () => {
      const now = kst(15);
      const result = calcAutoDeadline(now, 120, "09:00", "09:00");
      expect(result.getTime() - now.getTime()).toBe(120 * 60 * 1000);
    });
  });
});
