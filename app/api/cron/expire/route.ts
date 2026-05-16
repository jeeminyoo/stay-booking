import { NextRequest, NextResponse } from "next/server";
import { expireOverdueBookings } from "@/lib/data";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await expireOverdueBookings();
  return NextResponse.json({ ok: true });
}
