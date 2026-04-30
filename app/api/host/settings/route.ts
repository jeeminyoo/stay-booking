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

  // 계좌 변경 감지 → 이력 기록
  const { data: prev } = await supabaseAdmin
    .from("host_settings")
    .select("bank_name, bank_account, bank_holder")
    .eq("host_id", userId)
    .single();

  const bankChanged =
    prev && (
      prev.bank_name !== (settings.bank_name ?? null) ||
      prev.bank_account !== (settings.bank_account ?? null) ||
      prev.bank_holder !== (settings.bank_holder ?? null)
    );

  if (bankChanged) {
    await supabaseAdmin.from("bank_account_logs").insert({
      id: `BAL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      host_id: userId,
      old_bank_name: prev.bank_name,
      old_bank_account: prev.bank_account,
      old_bank_holder: prev.bank_holder,
      new_bank_name: settings.bank_name ?? null,
      new_bank_account: settings.bank_account ?? null,
      new_bank_holder: settings.bank_holder ?? null,
    });
  }

  const { error } = await supabaseAdmin
    .from("host_settings")
    .upsert({ ...settings, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
