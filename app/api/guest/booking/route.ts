import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// 게스트가 할 수 있는 작업만 허용: deposit_requested 상태 변경 + payment_note
export async function POST(req: NextRequest) {
  const { id, payment_note } = await req.json();
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const { data: booking } = await supabaseAdmin
    .from("bookings").select("status").eq("id", id).single();
  if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });

  // 입금대기 상태에서만 입금확인요청으로 변경 가능
  if (booking.status !== "waiting_for_deposit") {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("bookings").update({
    status: "deposit_requested",
    payment_note: payment_note || null,
  }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
