import { supabase } from "./supabase";
import { SavedProperty, Booking, HostSettings, ManualBlock, WeeklyBlock, WeeklyBlockException, Review } from "./types";

// ─── Properties ──────────────────────────────────────────────────────────────

export async function fetchProperties(): Promise<SavedProperty[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("is_draft", false)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedProperty[];
}

export async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  let query = supabase.from("properties").select("id").eq("slug", slug);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query.limit(1);
  return (data?.length ?? 0) > 0;
}

export async function fetchPropertyBySlug(slug: string): Promise<SavedProperty | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("slug", slug)
    .eq("is_draft", false)
    .eq("is_active", true)
    .single();
  if (error) return null;
  return data as SavedProperty;
}

export async function fetchPropertyBySlugAny(slug: string): Promise<SavedProperty | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) return null;
  return data as SavedProperty;
}

export async function fetchHostProperties(hostId: string): Promise<SavedProperty[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedProperty[];
}

export async function upsertProperty(property: SavedProperty): Promise<void> {
  const { error } = await supabase
    .from("properties")
    .upsert(property);
  if (error) throw error;
}

export async function patchPropertyNotice(
  id: string,
  data: {
    notice: string;
    notice_confirm: string;
    notice_checkin: string;
    notice_per_room: boolean;
    notice_confirm_per_room: boolean;
    notice_checkin_per_room: boolean;
    rooms: import("./types").RoomDraft[];
  },
): Promise<void> {
  const { error } = await supabase
    .from("properties")
    .update(data)
    .eq("id", id);
  if (error) throw error;
}

export async function patchPropertyActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase.from("properties").update({ is_active }).eq("id", id);
  if (error) throw error;
}

export async function deletePropertyById(id: string): Promise<void> {
  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function fetchHostBookings(propertyIds: string[]): Promise<Booking[]> {
  if (propertyIds.length === 0) return [];
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .in("property_id", propertyIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Booking[];
}

const PAGE_SIZE = 10;

export async function fetchHostBookingsPaged(
  propertyIds: string[],
  status: string | null,
  cutoffDate: string,
  page: number,
): Promise<{ bookings: Booking[]; hasMore: boolean }> {
  if (propertyIds.length === 0) return { bookings: [], hasMore: false };
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("bookings")
    .select("*", { count: "exact" })
    .in("property_id", propertyIds)
    .gte("check_in", cutoffDate)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    bookings: (data ?? []) as Booking[],
    hasMore: (count ?? 0) > to + 1,
  };
}

export async function fetchBlockedDates(propertyId: string, roomName: string): Promise<string[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("bookings")
    .select("check_in, check_out, status, payment_deadline")
    .eq("property_id", propertyId)
    .eq("room_name", roomName)
    .not("status", "in", '("cancelled","expired")');
  if (error) return [];

  const blocked: string[] = [];
  for (const b of data ?? []) {
    if (b.status === "pending" && b.payment_deadline < now) continue;
    const cur = new Date(b.check_in);
    const end = new Date(b.check_out);
    while (cur < end) {
      blocked.push(cur.toISOString().split("T")[0]);
      cur.setDate(cur.getDate() + 1);
    }
  }
  return blocked;
}

export async function fetchBookingById(id: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Booking;
}

export async function insertBooking(booking: Booking): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .insert(booking);
  if (error) throw error;
}

export async function patchBooking(id: string, updates: Partial<Booking>): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

// ─── Host Settings ────────────────────────────────────────────────────────────

export async function fetchHostSettings(hostId: string): Promise<HostSettings | null> {
  const { data, error } = await supabase
    .from("host_settings")
    .select("*")
    .eq("host_id", hostId)
    .single();
  if (error) return null;
  return data as HostSettings;
}

export async function upsertHostSettings(settings: HostSettings): Promise<void> {
  const { error } = await supabase
    .from("host_settings")
    .upsert({ ...settings, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ─── Manual Blocks ────────────────────────────────────────────────────────────

export async function fetchManualBlocks(propertyId: string, roomId: string): Promise<ManualBlock[]> {
  const { data, error } = await supabase
    .from("manual_blocks")
    .select("*")
    .eq("property_id", propertyId)
    .eq("room_id", roomId);
  if (error) throw error;
  return (data ?? []) as ManualBlock[];
}

export async function createManualBlock(
  block: Omit<ManualBlock, "id" | "created_at">
): Promise<ManualBlock> {
  const row = { ...block, id: `MB-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, created_at: new Date().toISOString() };
  const { data, error } = await supabase.from("manual_blocks").insert(row).select().single();
  if (error) throw error;
  return data as ManualBlock;
}

export async function deleteManualBlock(id: string): Promise<void> {
  const { error } = await supabase.from("manual_blocks").delete().eq("id", id);
  if (error) throw error;
}

// ─── Weekly Blocks ────────────────────────────────────────────────────────────

export async function fetchWeeklyBlocks(propertyId: string, roomId: string): Promise<WeeklyBlock[]> {
  const { data, error } = await supabase
    .from("weekly_blocks")
    .select("*")
    .eq("property_id", propertyId)
    .eq("room_id", roomId);
  if (error) throw error;
  return (data ?? []) as WeeklyBlock[];
}

export async function upsertWeeklyBlock(
  block: Omit<WeeklyBlock, "id" | "created_at">
): Promise<void> {
  const row = { ...block, id: `WB-${Date.now()}`, created_at: new Date().toISOString() };
  const { error } = await supabase.from("weekly_blocks").upsert(row, { onConflict: "property_id,room_id,day_of_week" });
  if (error) throw error;
}

export async function deleteWeeklyBlock(id: string): Promise<void> {
  const { error } = await supabase.from("weekly_blocks").delete().eq("id", id);
  if (error) throw error;
}

// ─── Weekly Block Exceptions (특정 날짜 정기블락 제외) ────────────────────────

export async function fetchWeeklyBlockExceptions(propertyId: string, roomId: string): Promise<WeeklyBlockException[]> {
  const { data, error } = await supabase
    .from("weekly_block_exceptions")
    .select("*")
    .eq("property_id", propertyId)
    .eq("room_id", roomId);
  if (error) throw error;
  return (data ?? []) as WeeklyBlockException[];
}

export async function createWeeklyBlockException(
  exc: Omit<WeeklyBlockException, "id" | "created_at">
): Promise<WeeklyBlockException> {
  const row = { ...exc, id: `WBE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, created_at: new Date().toISOString() };
  const { data, error } = await supabase.from("weekly_block_exceptions").insert(row).select().single();
  if (error) throw error;
  return data as WeeklyBlockException;
}

export async function deleteWeeklyBlockException(id: string): Promise<void> {
  const { error } = await supabase.from("weekly_block_exceptions").delete().eq("id", id);
  if (error) throw error;
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export async function fetchReviewByBookingId(bookingId: string): Promise<Review | null> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("booking_id", bookingId)
    .single();
  if (error) return null;
  return data as Review;
}

export async function fetchHostReviews(propertyIds: string[]): Promise<Review[]> {
  if (propertyIds.length === 0) return [];
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .in("property_id", propertyIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Review[];
}

export async function insertReview(review: Omit<Review, "id" | "created_at">): Promise<void> {
  const row = { ...review, id: `RV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, created_at: new Date().toISOString() };
  const { error } = await supabase.from("reviews").insert(row);
  if (error) throw error;
}

export async function updateReview(id: string, updates: { rating: number; content: string }): Promise<void> {
  const { error } = await supabase.from("reviews").update(updates).eq("id", id);
  if (error) throw error;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function fetchAllPropertiesAdmin(): Promise<SavedProperty[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedProperty[];
}

export async function fetchAllBookingsAdmin(): Promise<import("./types").Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as import("./types").Booking[];
}

export async function fetchAllHostSettingsAdmin(): Promise<import("./types").HostSettings[]> {
  const { data, error } = await supabase
    .from("host_settings")
    .select("host_id, host_name, host_phone");
  if (error) return [];
  return (data ?? []) as import("./types").HostSettings[];
}
