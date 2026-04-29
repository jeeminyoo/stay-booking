import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function ownsProperty(userId: string, propertyId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("properties").select("host_id").eq("id", propertyId).single();
  return !!data && data.host_id === userId;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = verifySession(cookieStore.get("session")?.value);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === "createManualBlock") {
    if (!(await ownsProperty(userId, body.block.property_id))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const row = { ...body.block, id: `MB-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, created_at: new Date().toISOString() };
    const { data, error } = await supabaseAdmin.from("manual_blocks").insert(row).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (action === "deleteManualBlock") {
    const { data: block } = await supabaseAdmin.from("manual_blocks").select("property_id").eq("id", body.id).single();
    if (!block || !(await ownsProperty(userId, block.property_id))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { error } = await supabaseAdmin.from("manual_blocks").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "upsertWeeklyBlock") {
    if (!(await ownsProperty(userId, body.block.property_id))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const row = { ...body.block, id: `WB-${Date.now()}`, created_at: new Date().toISOString() };
    const { error } = await supabaseAdmin.from("weekly_blocks").upsert(row, { onConflict: "property_id,room_id,day_of_week" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "deleteWeeklyBlock") {
    const { data: block } = await supabaseAdmin.from("weekly_blocks").select("property_id").eq("id", body.id).single();
    if (!block || !(await ownsProperty(userId, block.property_id))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { error } = await supabaseAdmin.from("weekly_blocks").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "createWeeklyBlockException") {
    if (!(await ownsProperty(userId, body.exc.property_id))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const row = { ...body.exc, id: `WBE-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, created_at: new Date().toISOString() };
    const { data, error } = await supabaseAdmin.from("weekly_block_exceptions").insert(row).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (action === "deleteWeeklyBlockException") {
    const { data: exc } = await supabaseAdmin.from("weekly_block_exceptions").select("property_id").eq("id", body.id).single();
    if (!exc || !(await ownsProperty(userId, exc.property_id))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { error } = await supabaseAdmin.from("weekly_block_exceptions").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
