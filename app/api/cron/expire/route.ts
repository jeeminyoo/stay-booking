import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update({ status: "auto_cancelled" })
    .in("status", ["waiting_for_deposit"])
    .lt("payment_deadline", now)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, cancelled: data?.length ?? 0, ids: data?.map(r => r.id) });
}
