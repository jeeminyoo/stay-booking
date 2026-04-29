import { SavedProperty, HostSettings, Booking } from "./types";
import type { ManualBlock, WeeklyBlock, WeeklyBlockException } from "./types";

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "요청 실패");
  return data;
}

// ─── Property ────────────────────────────────────────────────────────────────

export async function apiUpsertProperty(property: SavedProperty): Promise<void> {
  await post("/api/host/property", { action: "upsert", property });
}

export async function apiDeleteProperty(id: string): Promise<void> {
  await post("/api/host/property", { action: "delete", id });
}

export async function apiPatchPropertyNotice(id: string, data: object): Promise<void> {
  await post("/api/host/property", { action: "notice", id, data });
}

export async function apiPatchPropertyActive(id: string, is_active: boolean): Promise<void> {
  await post("/api/host/property", { action: "active", id, is_active });
}

// ─── Host Settings ────────────────────────────────────────────────────────────

export async function apiUpsertHostSettings(settings: HostSettings): Promise<void> {
  await post("/api/host/settings", { settings });
}

// ─── Host Booking ─────────────────────────────────────────────────────────────

export async function apiPatchBookingHost(id: string, updates: Partial<Booking>): Promise<void> {
  await post("/api/host/booking", { id, updates });
}

// ─── Guest Booking ────────────────────────────────────────────────────────────

export async function apiRequestDeposit(id: string, payment_note?: string): Promise<void> {
  await post("/api/guest/booking", { id, payment_note });
}

// ─── Blocks ───────────────────────────────────────────────────────────────────

export async function apiCreateManualBlock(block: Omit<ManualBlock, "id" | "created_at">): Promise<ManualBlock> {
  const { data } = await post("/api/host/blocks", { action: "createManualBlock", block });
  return data;
}

export async function apiDeleteManualBlock(id: string): Promise<void> {
  await post("/api/host/blocks", { action: "deleteManualBlock", id });
}

export async function apiUpsertWeeklyBlock(block: Omit<WeeklyBlock, "id" | "created_at">): Promise<void> {
  await post("/api/host/blocks", { action: "upsertWeeklyBlock", block });
}

export async function apiDeleteWeeklyBlock(id: string): Promise<void> {
  await post("/api/host/blocks", { action: "deleteWeeklyBlock", id });
}

export async function apiCreateWeeklyBlockException(exc: Omit<WeeklyBlockException, "id" | "created_at">): Promise<WeeklyBlockException> {
  const { data } = await post("/api/host/blocks", { action: "createWeeklyBlockException", exc });
  return data;
}

export async function apiDeleteWeeklyBlockException(id: string): Promise<void> {
  await post("/api/host/blocks", { action: "deleteWeeklyBlockException", id });
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function apiLogout(): Promise<void> {
  await post("/api/auth/logout", {});
}
