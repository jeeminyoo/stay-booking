"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Logo from "@/components/Logo";
import { fetchBookingById, patchBooking } from "@/lib/db";
import { Booking } from "@/lib/types";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatDeadline(isoStr: string) {
  const d = new Date(isoStr);
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${month}월 ${date}일 ${hours}:${minutes}까지`;
}

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function nightCount(checkIn: string, checkOut: string) {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

type PageState = "loading" | "not_found" | "waiting" | "requested" | "confirmed" | "cancelled";

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchBookingById(id).then((b) => {
      if (!b) { setPageState("not_found"); return; }
      setBooking(b);
      if (b.status === "waiting_for_deposit") setPageState("waiting");
      else if (b.status === "deposit_requested") setPageState("requested");
      else if (b.status === "confirmed") setPageState("confirmed");
      else setPageState("cancelled");
    });
  }, [id]);

  async function handleRequest() {
    if (!booking) return;
    setSubmitting(true);
    try {
      await patchBooking(booking.id, {
        status: "deposit_requested",
        payment_note: note.trim() || undefined,
      });
      setPageState("requested");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy() {
    if (!booking) return;
    navigator.clipboard.writeText(booking.bank_account).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (pageState === "loading") return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (pageState === "not_found") return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="text-lg font-bold text-gray-800 mb-2">예약 정보를 찾을 수 없습니다</p>
    </div>
  );

  if (!booking) return null;

  const nights = nightCount(booking.check_in, booking.check_out);
  const guestParts = [`성인 ${booking.adults}명`];
  if (booking.children > 0) guestParts.push(`아동 ${booking.children}명`);
  if (booking.infants > 0) guestParts.push(`유아 ${booking.infants}명`);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-2 flex items-center">
          <Logo />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-4">

        {/* 예약 요약 */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">예약번호</p>
            <p className="text-xs font-mono text-gray-500">{booking.id}</p>
          </div>

          <div className="h-px bg-gray-100" />

          <div>
            <p className="font-bold text-gray-900">{booking.property_name}</p>
            <p className="text-sm text-gray-500 mt-0.5">{booking.room_name}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">예약자</p>
              <p className="text-sm font-semibold text-gray-800">{booking.guest_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">인원</p>
              <p className="text-sm font-semibold text-gray-800">{guestParts.join(", ")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">체크인</p>
              <p className="text-sm font-semibold text-gray-800">{formatDate(booking.check_in)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">체크아웃</p>
              <p className="text-sm font-semibold text-gray-800">{formatDate(booking.check_out)}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-0.5">숙박</p>
            <p className="text-sm font-semibold text-gray-800">{nights}박</p>
          </div>

          <div className="h-px bg-gray-100" />

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">총 결제금액</p>
            <p className="text-lg font-black text-gray-900">{formatPrice(booking.total_price)}</p>
          </div>
        </div>

        {/* 계좌 정보 — 입금대기/입금확인요청 상태 */}
        {(pageState === "waiting" || pageState === "requested") && (
          <div className="bg-indigo-50 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🏦</span>
              <p className="font-bold text-indigo-900 text-sm">입금 계좌 정보</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-indigo-400 mb-0.5">은행</p>
                <p className="text-sm font-semibold text-indigo-900">{booking.bank_name}</p>
              </div>
              <div>
                <p className="text-xs text-indigo-400 mb-0.5">예금주</p>
                <p className="text-sm font-semibold text-indigo-900">{booking.bank_holder}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-indigo-400 mb-0.5">계좌번호</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-base font-bold text-indigo-900 tracking-wide flex-1">{booking.bank_account}</p>
                <button
                  onClick={handleCopy}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                    ${copied ? "bg-green-500 text-white" : "bg-indigo-200 text-indigo-800 hover:bg-indigo-300"}`}>
                  {copied ? "복사됨 ✓" : "복사"}
                </button>
              </div>
            </div>
            {pageState === "waiting" && (
              <div className="bg-indigo-100 rounded-xl px-3 py-2 flex items-center gap-2">
                <span className="text-xs">⏰</span>
                <p className="text-xs text-indigo-700 font-semibold">입금 마감: {formatDeadline(booking.payment_deadline)}</p>
              </div>
            )}
          </div>
        )}

        {/* 예약확정 — 계좌정보 대신 확정 메시지 */}
        {pageState === "confirmed" && (
          <div className="bg-green-50 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🎉</span>
              <p className="font-bold text-green-900 text-sm">예약이 확정되었습니다</p>
            </div>
            <p className="text-xs text-green-700 leading-relaxed">호스트가 입금을 확인하고 예약을 확정했습니다. 즐거운 여행 되세요!</p>
          </div>
        )}

        {/* 상태별 하단 영역 */}
        {pageState === "waiting" && (
          <div className="bg-white rounded-2xl p-5 space-y-3">
            <p className="text-sm font-bold text-gray-800">입금하셨나요?</p>
            <p className="text-xs text-gray-400 leading-relaxed">입금 완료 후 아래 버튼을 눌러 호스트에게 확인을 요청하세요.</p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="입금자명, 입금 시간 등 전달할 메시지를 남겨주세요 (선택)"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none bg-gray-50 placeholder:text-gray-300"
            />
            <button
              onClick={handleRequest}
              disabled={submitting}
              className="w-full py-4 rounded-2xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50">
              {submitting ? "요청 중..." : "입금 확인 요청"}
            </button>
          </div>
        )}

        {pageState === "requested" && (
          <div className="bg-white rounded-2xl p-5 text-center space-y-2">
            <p className="text-2xl">✅</p>
            <p className="font-bold text-gray-900">입금 확인 요청 완료</p>
            <p className="text-sm text-gray-400 leading-relaxed">호스트가 입금을 확인한 후 예약을 확정해드립니다.</p>
          </div>
        )}

        {pageState === "cancelled" && (
          <div className="bg-white rounded-2xl p-5 text-center space-y-2">
            <p className="text-2xl">❌</p>
            <p className="font-bold text-gray-900">취소된 예약입니다</p>
          </div>
        )}

      </main>
    </div>
  );
}
