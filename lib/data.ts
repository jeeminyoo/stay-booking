import { Booking } from "./types";
import { supabase } from "./supabase";

export async function getBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getBookingsByPhone(phone: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("guest_phone", phone)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getBlockedDates(propertyId: string, roomId: string): Promise<string[]> {
  await expireOverdueBookings();

  const { data, error } = await supabase
    .from("bookings")
    .select("check_in, check_out")
    .eq("property_id", propertyId)
    .eq("room_id", roomId)
    .in("status", ["waiting_for_deposit", "deposit_requested", "confirmed"]);

  if (error) throw error;

  const blocked: string[] = [];
  for (const b of data ?? []) {
    const cur = new Date(b.check_in);
    const end = new Date(b.check_out);
    while (cur < end) {
      blocked.push(cur.toISOString().split("T")[0]);
      cur.setDate(cur.getDate() + 1);
    }
  }
  return blocked;
}

export async function createBooking(
  data: Omit<Booking, "id" | "created_at" | "payment_deadline">,
  autoCancelMinutes = 60
): Promise<Booking> {
  const now = new Date();
  const deadline = calcAutoDeadline(now, autoCancelMinutes);

  const row = {
    ...data,
    id: `BK-${Date.now()}`,
    created_at: now.toISOString(),
    payment_deadline: deadline.toISOString(),
  };

  const { data: result, error } = await supabase
    .from("bookings")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function updateBooking(id: string, updates: Partial<Booking>): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function expireOverdueBookings(): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({ status: "auto_cancelled" })
    .in("status", ["waiting_for_deposit", "deposit_requested"])
    .lt("payment_deadline", new Date().toISOString());
  if (error) throw error;
}

// 자동취소 deadline 계산 — 비가용 시간대(기본 21:00-08:00)에는 타이머 정지
export function calcAutoDeadline(
  now: Date,
  minutes: number,
  unavailableStart = "21:00",
  unavailableEnd = "08:00",
): Date {
  const startH = parseInt(unavailableStart.split(":")[0]);
  const endH   = parseInt(unavailableEnd.split(":")[0]);
  const hour   = now.getHours();
  const inUnavailable = hour >= startH || hour < endH;
  if (inUnavailable) {
    const start = new Date(now);
    if (hour >= startH) start.setDate(start.getDate() + 1);
    start.setHours(endH, 0, 0, 0);
    return new Date(start.getTime() + minutes * 60 * 1000);
  }
  return new Date(now.getTime() + minutes * 60 * 1000);
}
