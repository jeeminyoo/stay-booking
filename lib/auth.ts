import { KakaoUser } from "./types";

const AUTH_KEY = "host_user";

export function getUser(): KakaoUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user: KakaoUser): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function getKakaoAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3333";
  const redirectUri = encodeURIComponent(`${baseUrl}/auth/kakao/callback`);
  return `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
}
