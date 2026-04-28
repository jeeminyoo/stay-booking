"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Logo from "@/components/Logo";
import { fetchBookingById, fetchReviewByBookingId, insertReview, updateReview } from "@/lib/db";
import { Booking, Review } from "@/lib/types";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const STAR_LABELS = ["", "별로였어요", "아쉬웠어요", "괜찮았어요", "좋았어요", "최고였어요"];

type PageState = "loading" | "not_found" | "too_early" | "form" | "done";

export default function ReviewPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const b = await fetchBookingById(bookingId);
      if (!b || b.status === "cancelled" || b.status === "auto_cancelled") {
        setPageState("not_found"); return;
      }

      const today = new Date().toISOString().split("T")[0];
      if (b.check_in > today) { setBooking(b); setPageState("too_early"); return; }

      const existing = await fetchReviewByBookingId(bookingId);
      setBooking(b);
      if (existing) {
        setExistingReview(existing);
        setRating(existing.rating);
        setContent(existing.content);
      }
      setPageState("form");
    }
    load();
  }, [bookingId]);

  async function handleSubmit() {
    if (!booking || rating === 0 || !content.trim()) return;
    setSubmitting(true);
    try {
      if (existingReview) {
        await updateReview(existingReview.id, { rating, content: content.trim() });
        setExistingReview(prev => prev ? { ...prev, rating, content: content.trim() } : prev);
      } else {
        await insertReview({
          booking_id: booking.id,
          property_id: booking.property_id,
          property_name: booking.property_name,
          room_name: booking.room_name,
          guest_name: booking.guest_name,
          check_in: booking.check_in,
          check_out: booking.check_out,
          rating,
          content: content.trim(),
        });
      }
      setPageState("done");
    } finally {
      setSubmitting(false);
    }
  }

  if (pageState === "loading") return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (pageState === "not_found") return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="text-lg font-bold text-gray-800 mb-2">리뷰를 작성할 수 없는 예약입니다</p>
    </div>
  );

  if (pageState === "too_early") return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-2"><Logo /></div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-12 text-center space-y-3">
        <p className="text-3xl">⏳</p>
        <p className="font-bold text-gray-900">아직 체크인 전이에요</p>
        <p className="text-sm text-gray-400">체크인 당일부터 리뷰를 작성할 수 있습니다.</p>
        {booking && (
          <p className="text-sm font-semibold text-gray-600">체크인: {formatDate(booking.check_in)}</p>
        )}
      </main>
    </div>
  );

  if (pageState === "done") return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-2"><Logo /></div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-12 text-center space-y-3">
        <p className="text-4xl">🙏</p>
        <p className="font-bold text-gray-900 text-lg">
          {existingReview ? "리뷰가 수정되었습니다" : "리뷰가 등록되었습니다"}
        </p>
        <p className="text-sm text-gray-400 leading-relaxed">
          소중한 후기를 남겨주셔서 감사합니다.<br />더 나은 서비스로 보답하겠습니다.
        </p>
      </main>
    </div>
  );

  if (!booking) return null;

  const displayRating = hoverRating || rating;
  const isEditing = !!existingReview;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-between">
          <Logo />
          <span className="text-xs text-gray-400">{booking.property_name}</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-4">

        <div>
          <h1 className="text-2xl font-black text-gray-900 mb-1">
            {isEditing ? "후기 수정" : "투숙 후기"}
          </h1>
          <p className="text-sm text-gray-400">호스트에게만 전달되는 솔직한 후기를 남겨주세요</p>
        </div>

        {/* 예약 정보 */}
        <div className="bg-white rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-lg">🏡</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{booking.property_name}</p>
            <p className="text-xs text-gray-400">{booking.room_name} · {formatDate(booking.check_in)} ~ {formatDate(booking.check_out)}</p>
          </div>
        </div>

        {/* 별점 */}
        <div className="bg-white rounded-2xl p-5 space-y-3">
          <p className="text-sm font-bold text-gray-800">이번 숙박은 어떠셨나요?</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="text-4xl transition-transform hover:scale-110 active:scale-95">
                {star <= displayRating ? "⭐" : "☆"}
              </button>
            ))}
          </div>
          {displayRating > 0 && (
            <p className="text-center text-sm font-semibold text-indigo-600">{STAR_LABELS[displayRating]}</p>
          )}
        </div>

        {/* 후기 내용 */}
        <div className="bg-white rounded-2xl p-5 space-y-2">
          <p className="text-sm font-bold text-gray-800">후기를 남겨주세요</p>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="숙박하면서 느낀 점을 자유롭게 작성해주세요."
            rows={6}
            maxLength={500}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none bg-gray-50/50 placeholder:text-gray-300"
          />
          <p className="text-xs text-gray-300 text-right">{content.length}/500</p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || rating === 0 || !content.trim()}
          className="w-full py-4 rounded-2xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-40">
          {submitting ? "저장 중..." : isEditing ? "후기 수정" : "후기 등록"}
        </button>

      </main>
    </div>
  );
}
