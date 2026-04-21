"use client";

import Link from "next/link";
import { getKakaoAuthUrl } from "@/lib/auth";
import Logo from "@/components/Logo";

export default function LoginPage() {
  function handleKakaoLogin() {
    window.location.href = getKakaoAuthUrl();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-5 py-4">
        <Link href="/"><Logo /></Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col justify-center items-center px-5 py-10">
        <div className="w-full max-w-sm space-y-3">

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-black text-gray-900 leading-tight mb-1.5">시작하기</h1>
            <p className="text-gray-400 text-sm">호스트 로그인 또는 예약을 확인하세요</p>
          </div>

          {/* Host card */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-base font-bold text-gray-900 mb-0.5">호스트</p>
              <p className="text-xs text-gray-400">숙소 등록 및 예약 관리</p>
            </div>
            <div className="px-5 py-4">
              <button
                onClick={handleKakaoLogin}
                className="w-full flex items-center justify-center gap-3 bg-[#FEE500] text-[#3C1E1E] font-bold py-3.5 rounded-xl hover:bg-[#f0d800] active:scale-[0.98] transition-all text-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.578 1.594 4.84 4 6.203V21l4.5-2.5c.487.07.988.107 1.5.107 5.523 0 10-3.477 10-7.607S17.523 3 12 3z"/>
                </svg>
                카카오로 로그인
              </button>
            </div>
          </div>

          {/* Guest card */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-base font-bold text-gray-900 mb-0.5">게스트</p>
              <p className="text-xs text-gray-400">예약 시 입력한 전화번호로 확인합니다</p>
            </div>
            <div className="px-5 py-4">
              <Link href="/my-bookings"
                className="block w-full text-center bg-gray-100 text-gray-700 font-semibold py-3.5 rounded-xl text-sm hover:bg-gray-200 active:scale-[0.98] transition-all">
                예약 확인하기
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom note */}
      <footer className="pb-8 text-center">
        <p className="text-[11px] text-gray-400">
          로그인 시{" "}
          <span className="underline underline-offset-2 cursor-pointer">이용약관</span>
          {" "}및{" "}
          <span className="underline underline-offset-2 cursor-pointer">개인정보처리방침</span>
          에 동의합니다
        </p>
      </footer>
    </div>
  );
}
