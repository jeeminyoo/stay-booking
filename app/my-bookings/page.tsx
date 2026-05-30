"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { Booking } from "@/lib/types";
import { fetchBookingById } from "@/lib/db";
import { expireOverdueBookings } from "@/lib/data";
import { filter } from "@/lib/validation";
import PaymentTimer from "@/components/PaymentTimer";

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  waiting_for_deposit: { label: "입금 대기",      class: "bg-orange-100 text-orange-700" },
  deposit_requested:   { label: "입금확인 요청",   class: "bg-blue-100 text-blue-700" },
  confirmed:           { label: "예약 확정",       class: "bg-green-100 text-green-700" },
  auto_cancelled:      { label: "자동 취소",       class: "bg-red-100 text-red-400" },
  cancelled:           { label: "취소됨",          class: "bg-gray-100 text-gray-500" },
};

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${y}.${m}.${day}`;
}

function nights(checkIn: string, checkOut: string) {
  return Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

export default function MyBookingsPage() {
  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState<Booking | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const id = bookingId.trim().toUpperCase();
    if (!id) return;
    setLoading(true);
    setSearched(false);
    try {
      await expireOverdueBookings().catch(() => {});
      const data = await fetchBookingById(id);
      setBooking(data);
    } catch {
      setBooking(null);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <Link href="/"><Logo /></Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-5">예약 확인</h1>

        <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 space-y-3">
          <p className="text-sm text-gray-600 font-medium">예약번호를 입력하세요</p>
          <p className="text-xs text-gray-400">예약 완료 후 안내받은 예약번호를 입력해주세요<br />(예: BK12345678)</p>
          <input
            type="text"
            value={bookingId}
            onChange={(e) => setBookingId(filter.bookingId(e.target.value))}
            placeholder="BK12345678"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono placeholder:font-sans placeholder:text-gray-300"
          />
          <button type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
            조회
          </button>
        </form>

        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-2xl mb-2 animate-pulse">⏳</p>
            <p className="text-sm">불러오는 중...</p>
          </div>
        ) : searched && !booking ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-500">해당 예약번호로 조회된 내역이 없습니다.</p>
            <Link
              href="/"
              className="inline-block mt-4 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
            >
              숙소 둘러보기
            </Link>
          </div>
        ) : booking ? (
          <div className="space-y-4">
            {(() => {
              const b = booking;
              const status = STATUS_LABELS[b.status];
              const nightCount = nights(b.check_in, b.check_out);
              return (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h2 className="font-bold text-gray-900">{b.property_name}</h2>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{b.id}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.class}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 mb-3">
                      <span className="font-medium text-gray-800">{b.room_name}</span>
                    </div>

                    <div className="grid grid-cols-3 text-sm mb-3">
                      <div>
                        <p className="text-gray-400 text-xs mb-0.5">체크인</p>
                        <p className="font-medium text-gray-800">{formatDate(b.check_in)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-0.5">체크아웃</p>
                        <p className="font-medium text-gray-800">{formatDate(b.check_out)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-0.5">인원</p>
                        <p className="font-medium text-gray-800">{b.adults + b.children}인 · {nightCount}박</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-gray-500 text-sm">결제금액</span>
                      <span className="font-bold text-gray-900 text-lg">
                        {b.total_price.toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  {b.status === "waiting_for_deposit" && (
                    <div className="border-t border-orange-100 bg-orange-50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-orange-800">입금 대기 중</p>
                        <PaymentTimer deadline={b.payment_deadline} onExpire={async () => {
                          const refreshed = await fetchBookingById(b.id);
                          setBooking(refreshed ?? { ...b, status: "auto_cancelled" });
                        }} />
                      </div>
                      <div className="bg-white rounded-xl p-3 border border-orange-100">
                        <p className="text-xs text-gray-400 mb-1">입금 계좌</p>
                        <p className="font-bold text-gray-900 tracking-wide">{b.bank_account}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {b.bank_name} · {b.bank_holder}
                        </p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-400">입금액</span>
                          <span className="font-bold text-indigo-600">{b.total_price.toLocaleString()}원</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {b.status === "deposit_requested" && (
                    <div className="border-t border-blue-100 bg-blue-50 px-4 py-3">
                      <p className="text-sm text-blue-700 font-medium">
                        입금확인 요청 완료 — 호스트 확인 후 예약이 확정됩니다
                      </p>
                    </div>
                  )}

                  {b.status === "confirmed" && (
                    <div className="border-t border-green-100 bg-green-50 px-4 py-3">
                      <p className="text-sm text-green-700 font-medium">
                        ✓ 예약이 확정되었습니다
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : null}
      </main>
    </div>
  );
}
