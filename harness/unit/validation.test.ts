import { describe, it, expect } from "vitest";
import { validate, filter, formatPhone } from "@/lib/validation";

describe("validate.bookingId", () => {
  it("BK + 8자리 숫자는 통과", () => {
    expect(validate.bookingId("BK12345678")).toBe(true);
    expect(validate.bookingId("BK00000000")).toBe(true);
  });

  it("구 포맷(타임스탬프 기반) 은 실패", () => {
    expect(validate.bookingId("BK1780053903092")).toBe(false);
  });

  it("숫자가 7자리 이하면 실패", () => {
    expect(validate.bookingId("BK1234567")).toBe(false);
  });

  it("숫자가 9자리 이상이면 실패", () => {
    expect(validate.bookingId("BK123456789")).toBe(false);
  });

  it("소문자 포함 시 실패", () => {
    expect(validate.bookingId("bk12345678")).toBe(false);
  });

  it("빈 문자열은 실패", () => {
    expect(validate.bookingId("")).toBe(false);
  });
});

describe("validate.phone", () => {
  it("010-1234-5678 형식 통과", () => {
    expect(validate.phone("010-1234-5678")).toBe(true);
  });

  it("011-123-4567 형식 통과", () => {
    expect(validate.phone("011-123-4567")).toBe(true);
  });

  it("하이픈 없는 숫자만은 실패", () => {
    expect(validate.phone("01012345678")).toBe(false);
  });

  it("빈 문자열은 실패", () => {
    expect(validate.phone("")).toBe(false);
  });
});

describe("validate.bankAccount", () => {
  it("숫자와 하이픈 조합 통과", () => {
    expect(validate.bankAccount("110-123-456789")).toBe(true);
    expect(validate.bankAccount("1234567890")).toBe(true);
  });

  it("3자리 이하는 실패", () => {
    expect(validate.bankAccount("12")).toBe(false);
  });

  it("영문 포함 시 실패", () => {
    expect(validate.bankAccount("abc123")).toBe(false);
  });
});

describe("filter.bookingId", () => {
  it("소문자를 대문자로 변환", () => {
    expect(filter.bookingId("bk12345678")).toBe("BK12345678");
  });

  it("특수문자 제거", () => {
    expect(filter.bookingId("BK-1234-5678")).toBe("BK12345678");
  });
});

describe("formatPhone", () => {
  it("10자리 숫자를 010-1234-5678 형식으로", () => {
    expect(formatPhone("01012345678")).toBe("010-1234-5678");
  });

  it("입력 중(7자리)은 010-1234 형식으로", () => {
    expect(formatPhone("0101234")).toBe("010-1234");
  });

  it("입력 중(3자리)은 010 그대로", () => {
    expect(formatPhone("010")).toBe("010");
  });

  it("11자리 초과는 앞 11자리만", () => {
    expect(formatPhone("010123456789999")).toBe("010-1234-5678");
  });
});
