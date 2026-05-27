import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { calcAutoDeadline } from "@/lib/data";
import { sendGuestDepositRequest } from "@/lib/alimtalk";

async function generateBookingId(): Promise<string> {
  while (true) {
    const digits = String(Math.floor(Math.random() * 1_000_000_00)).padStart(8, "0");
    const id = `BK${digits}`;
    const { data } = await supabaseAdmin.from("bookings").select("id").eq("id", id).maybeSingle();
    if (!data) return id;
  }
}

export async function POST(req: NextRequest) {
  const { bookingData, autoCancelMinutes = 60, unavailableStart, unavailableEnd } = await req.json();
  if (!bookingData) return NextResponse.json({ error: "missing bookingData" }, { status: 400 });

  const now = new Date();
  const deadline = calcAutoDeadline(now, autoCancelMinutes, unavailableStart, unavailableEnd);

  const row = {
    ...bookingData,
    id: await generateBookingId(),
    created_at: now.toISOString(),
    payment_deadline: deadline.toISOString(),
  };

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .insert(row)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 게스트에게 입금 안내 알림톡 발송
  await sendGuestDepositRequest(booking).catch((e) =>
    console.error("[alimtalk] sendGuestDepositRequest failed:", e),
  );

  return NextResponse.json({ booking });
}
