import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = verifySession(cookieStore.get("session")?.value);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, updates } = await req.json();

  // 해당 예약이 이 호스트 소유 숙소의 예약인지 확인
  const { data: booking } = await supabaseAdmin
    .from("bookings").select("property_id").eq("id", id).single();
  if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: prop } = await supabaseAdmin
    .from("properties").select("host_id").eq("id", booking.property_id).single();
  if (!prop || prop.host_id !== userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabaseAdmin.from("bookings").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
