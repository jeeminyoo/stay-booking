import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendGuestCheckinReminder } from "@/lib/alimtalk";

export async function GET(req: NextRequest) {
  // Vercel cron 인증
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  const { data: bookings, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("check_in", today)
    .eq("status", "confirmed");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!bookings?.length) return NextResponse.json({ sent: 0 });

  const propertyIds = [...new Set(bookings.map((b) => b.property_id))];
  const { data: props } = await supabaseAdmin
    .from("properties")
    .select("id, slug")
    .in("id", propertyIds);

  const slugMap = Object.fromEntries((props ?? []).map((p) => [p.id, p.slug]));

  let sent = 0;
  await Promise.allSettled(
    bookings.map(async (booking) => {
      const slug = slugMap[booking.property_id];
      if (!slug) return;
      await sendGuestCheckinReminder(booking, slug);
      sent++;
    }),
  );

  return NextResponse.json({ sent });
}
