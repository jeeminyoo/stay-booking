import { describe, it, expect, vi, beforeEach } from "vitest";

// supabaseAdmin mock
const mockSelect  = vi.fn().mockReturnThis();
const mockEq      = vi.fn().mockReturnThis();
const mockMaybe   = vi.fn().mockResolvedValue({ data: null });
const mockInsert  = vi.fn().mockReturnThis();
const mockSingle  = vi.fn().mockResolvedValue({ data: { id: "BK12345678" }, error: null });

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "bookings") {
        return {
          select: mockSelect,
          insert: mockInsert,
        };
      }
      return { select: mockSelect };
    },
  },
}));

beforeEach(() => {
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ maybeSingle: mockMaybe });
  mockMaybe.mockResolvedValue({ data: null }); // ID 중복 없음
  mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) });
  mockSingle.mockResolvedValue({ data: { id: "BK12345678" }, error: null });
});

async function callCreate(body: object, contentType = "application/json") {
  const { POST } = await import("@/app/api/guest/booking/create/route");
  const req = new Request("http://localhost/api/guest/booking/create", {
    method: "POST",
    headers: { "content-type": contentType },
    body: JSON.stringify(body),
  }) as any;
  return POST(req);
}

const validBooking = {
  bookingData: {
    property_id: "prop-1",
    room_id: "prop-1-스탠다드",
    property_name: "테스트 숙소",
    room_name: "스탠다드",
    check_in: "2026-07-01",
    check_out: "2026-07-03",
    adults: 2,
    children: 0,
    infants: 0,
    total_price: 200000,
    status: "waiting_for_deposit",
    guest_name: "홍길동",
    guest_phone: "010-1234-5678",
    guest_message: null,
    payment_notified: false,
    bank_name: "국민은행",
    bank_account: "123-456-789012",
    bank_holder: "김호스트",
    payment_deadline: new Date(Date.now() + 3600000).toISOString(),
  },
};

describe("POST /api/guest/booking/create", () => {
  it("정상 요청 시 201 반환", async () => {
    const res = await callCreate(validBooking);
    expect(res.status).toBe(201);
  });

  it("bookingData 누락 시 400", async () => {
    const res = await callCreate({});
    expect(res.status).toBe(400);
  });

  it("생성된 booking.id는 BK + 8자리 숫자 형식", async () => {
    const res = await callCreate(validBooking);
    const body = await res.json();
    expect(body.booking.id).toMatch(/^BK\d{8}$/);
  });

  it("Supabase insert 오류 시 500 반환", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "DB error" } });
    const res = await callCreate(validBooking);
    expect(res.status).toBe(500);
  });
});
