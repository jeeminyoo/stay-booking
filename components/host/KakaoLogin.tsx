"use client";

import { getKakaoAuthUrl } from "@/lib/auth";

export default function KakaoLogin() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-indigo-600 mb-2">스테이픽</h1>
        <p className="text-gray-500">호스트 전용 숙소 등록</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm text-center space-y-6">
        <div>
          <p className="text-lg font-bold text-gray-900 mb-1">로그인이 필요합니다</p>
          <p className="text-sm text-gray-500">숙소 등록은 로그인 후 이용 가능합니다.</p>
        </div>

        <button
          onClick={() => { window.location.href = getKakaoAuthUrl(); }}
          className="w-full flex items-center justify-center gap-3 bg-[#FEE500] text-[#3C1E1E] font-bold py-3.5 rounded-xl hover:bg-[#F0D800] transition-colors text-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.578 1.594 4.84 4 6.203V21l4.5-2.5c.487.07.988.107 1.5.107 5.523 0 10-3.477 10-7.607S17.523 3 12 3z" />
          </svg>
          카카오로 로그인
        </button>

        <p className="text-xs text-gray-400">
          로그인 시 서비스 이용약관 및 개인정보처리방침에 동의합니다.
        </p>
      </div>
    </div>
  );
}
