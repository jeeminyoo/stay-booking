# 테스트 하네스

## 실행 방법

```bash
npm test              # 전체 1회 실행
npm run test:watch    # 파일 저장 시 자동 재실행 (개발 중 사용)
npm run test:ui       # 브라우저 UI로 결과 확인
```

---

## 폴더 구조

```
harness/
  setup.ts              ← 전역 mock (supabase 클라이언트 대체)
  unit/                 ← 순수 함수 테스트 (DB/네트워크 없음)
  api/                  ← API 라우트 테스트 (supabaseAdmin mock)
```

---

## 파일별 테스트 항목

### `unit/calcAutoDeadline.test.ts`
자동취소 마감 시각 계산 로직 (`lib/data.ts > calcAutoDeadline`)

| 케이스 | 설명 |
|--------|------|
| minutes=0 | 자동취소 비활성화 → 100년 후 반환 |
| unavailableStart===unavailableEnd | 응답불가시간 없음 → now + minutes |
| 가용 시간대(08~21시 KST) 요청 | now + minutes 그대로 |
| 비가용 시간대(21~08시 KST) 요청 | 다음 가용 시작 시각(08:00) + minutes |

> 이 함수에서 과거에 "32분 남음" 버그가 발생한 적 있음 — 시간대 경계 케이스를 꼭 커버할 것

---

### `unit/validation.test.ts`
입력값 검증 함수 (`lib/validation.ts`)

| 함수 | 테스트 항목 |
|------|------------|
| `validate.bookingId` | BK+8자리만 통과, 구 포맷(13자리) 실패 |
| `validate.phone` | 010-xxxx-xxxx 형식만 통과 |
| `validate.bankAccount` | 숫자+하이픈 4자 이상만 통과 |
| `filter.bookingId` | 소문자→대문자 변환, 특수문자 제거 |
| `formatPhone` | 숫자 → 010-1234-5678 자동 포맷 |

---

### `api/expire.test.ts`
자동취소 크론 엔드포인트 (`app/api/cron/expire/route.ts`)

| 케이스 | 설명 |
|--------|------|
| Authorization 헤더 없음 | 401 반환 |
| 잘못된 시크릿 | 401 반환 |
| 올바른 시크릿 | 200 반환, `{ ok: true }` |
| supabase update 호출 검증 | `waiting_for_deposit` + 만료 deadline 조건 확인 |
| Supabase 오류 | 500 반환 |

---

### `api/booking-create.test.ts`
예약 생성 엔드포인트 (`app/api/guest/booking/create/route.ts`)

| 케이스 | 설명 |
|--------|------|
| 정상 요청 | 201 반환 |
| bookingData 누락 | 400 반환 |
| booking.id 형식 | BK+8자리 숫자 형식 확인 |
| Supabase insert 오류 | 500 반환 |

---

## 새 테스트 추가 방법

### 1. 순수 함수 테스트
`harness/unit/` 아래에 `[함수명].test.ts` 파일 생성

```ts
import { describe, it, expect } from "vitest";
import { 함수명 } from "@/lib/파일명";

describe("함수명", () => {
  it("케이스 설명", () => {
    expect(함수명(입력)).toBe(기댓값);
  });
});
```

### 2. API 라우트 테스트
`harness/api/` 아래에 `[라우트명].test.ts` 파일 생성

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// supabaseAdmin mock
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: { from: () => ({ /* 필요한 메서드 */ }) },
}));

async function callRoute(body: object) {
  const { POST } = await import("@/app/api/.../route");
  const req = new Request("http://localhost/...", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
  return POST(req);
}

describe("POST /api/...", () => {
  it("정상 요청 시 200", async () => {
    const res = await callRoute({ /* body */ });
    expect(res.status).toBe(200);
  });
});
```

### 3. mock이 복잡할 때
`harness/setup.ts`에 전역 mock을 추가하면 모든 테스트에서 자동 적용됩니다.
