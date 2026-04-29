import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = verifySession(cookieStore.get("session")?.value);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { settings } = await req.json();
  if (settings.host_id !== userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabaseAdmin
    .from("host_settings")
    .upsert({ ...settings, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
