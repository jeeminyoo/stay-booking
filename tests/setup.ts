import { vi } from "vitest";

// supabase 클라이언트가 모듈 로드 시 env를 요구하므로 mock으로 대체
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
      update: () => ({ in: () => ({ lt: async () => ({ error: null }) }) }),
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
    }),
  },
}));
