import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { calcAutoDeadline } from "@/lib/data";
import { sendHostDepositRequested } from "@/lib/alimtalk";

// 게스트가 할 수 있는 작업만 허용: deposit_requested 상태 변경 + payment_note + 만료 처리
export async function POST(req: NextRequest) {
  const { id, payment_note, autoCancelMinutes = 60, unavailableStart, unavailableEnd, _expire } = await req.json();
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  // 만료(타이머 초과) 처리 — 입금 대기 상태에서만 자동취소
  if (_expire) {
    await supabaseAdmin.from("bookings").update({ status: "auto_cancelled" })
      .eq("id", id).eq("status", "waiting_for_deposit");
    return NextResponse.json({ ok: true });
  }

  const { data: booking } = await supabaseAdmin
    .from("bookings").select("*").eq("id", id).single();
  if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });

  // 입금대기 상태에서만 입금확인요청으로 변경 가능
  if (booking.status !== "waiting_for_deposit") {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const deadline = calcAutoDeadline(
    new Date(),
    autoCancelMinutes,
    unavailableStart,
    unavailableEnd,
  );

  const { error } = await supabaseAdmin.from("bookings").update({
    status: "deposit_requested",
    payment_note: payment_note || null,
    payment_deadline: deadline.toISOString(),
    payment_notified: true,
  }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 호스트에게 입금확인요청 알림톡 발송
  const { data: prop } = await supabaseAdmin
    .from("properties").select("host_id").eq("id", booking.property_id).single();
  if (prop) {
    const { data: hs } = await supabaseAdmin
      .from("host_settings").select("host_phone").eq("host_id", prop.host_id).single();
    if (hs?.host_phone) {
      const updatedBooking = { ...booking, status: "deposit_requested", payment_note: payment_note || null };
      sendHostDepositRequested(updatedBooking, hs.host_phone).catch((e) =>
        console.error("[alimtalk] sendHostDepositRequested failed:", e),
      );
    }
  }

  return NextResponse.json({ ok: true });
}
