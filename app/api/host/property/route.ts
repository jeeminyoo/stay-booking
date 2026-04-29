import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = verifySession(cookieStore.get("session")?.value);
  if (!userId) return unauthorized();

  const body = await req.json();
  const { action } = body;

  if (action === "upsert") {
    const { property } = body;
    if (property.host_id !== userId) return unauthorized();
    const { error } = await supabaseAdmin.from("properties").upsert(property);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    const { id } = body;
    const { data } = await supabaseAdmin.from("properties").select("host_id").eq("id", id).single();
    if (!data || data.host_id !== userId) return unauthorized();
    const { error } = await supabaseAdmin.from("properties").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "notice") {
    const { id, data } = body;
    const { data: prop } = await supabaseAdmin.from("properties").select("host_id").eq("id", id).single();
    if (!prop || prop.host_id !== userId) return unauthorized();
    const { error } = await supabaseAdmin.from("properties").update(data).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "active") {
    const { id, is_active } = body;
    const { data: prop } = await supabaseAdmin.from("properties").select("host_id").eq("id", id).single();
    if (!prop || prop.host_id !== userId) return unauthorized();
    const { error } = await supabaseAdmin.from("properties").update({ is_active }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
