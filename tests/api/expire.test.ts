import { describe, it, expect, vi, beforeEach } from "vitest";

// supabaseAdmin mock
const mockUpdate = vi.fn().mockReturnThis();
const mockIn     = vi.fn().mockReturnThis();
const mockLt     = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: () => ({ update: mockUpdate }),
  },
}));

beforeEach(() => {
  mockUpdate.mockReturnValue({ in: mockIn });
  mockIn.mockReturnValue({ lt: mockLt });
  mockLt.mockResolvedValue({ error: null });
  vi.stubEnv("CRON_SECRET", "test-secret");
});

// route handler를 직접 import (mock 등록 후)
async function callExpire(authHeader?: string) {
  const { GET } = await import("@/app/api/cron/expire/route");
  const req = new Request("http://localhost/api/cron/expire", {
    headers: authHeader ? { authorization: authHeader } : {},
  }) as any;
  return GET(req);
}

describe("POST /api/cron/expire", () => {
  it("Authorization 헤더 없으면 401", async () => {
    const res = await callExpire();
    expect(res.status).toBe(401);
  });

  it("잘못된 시크릿이면 401", async () => {
    const res = await callExpire("Bearer wrong-secret");
    expect(res.status).toBe(401);
  });

  it("올바른 시크릿이면 200 반환", async () => {
    const res = await callExpire("Bearer test-secret");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("waiting_for_deposit 상태 + 만료된 deadline 조건으로 update 호출", async () => {
    await callExpire("Bearer test-secret");
    expect(mockUpdate).toHaveBeenCalledWith({ status: "auto_cancelled" });
    expect(mockIn).toHaveBeenCalledWith("status", ["waiting_for_deposit"]);
    expect(mockLt).toHaveBeenCalledWith("payment_deadline", expect.any(String));
  });

  it("Supabase 오류 시 500 반환", async () => {
    mockLt.mockResolvedValueOnce({ error: { message: "DB error" } });
    const res = await callExpire("Bearer test-secret");
    expect(res.status).toBe(500);
  });
});
