import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "no code" }, { status: 400 });

  const clientId = process.env.KAKAO_CLIENT_ID ?? process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID ?? "";
  const clientSecret = process.env.KAKAO_CLIENT_SECRET ?? "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3333";
  const redirectUri = `${baseUrl}/auth/kakao/callback`;

  // 1. 인가코드 → 토큰 교환
  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      ...(clientSecret && { client_secret: clientSecret }),
      redirect_uri: redirectUri,
      code,
    }).toString(),
  });

  const token = await tokenRes.json();
  if (!token.access_token) {
    return NextResponse.json({ error: "token_failed", detail: token }, { status: 400 });
  }

  // 2. 사용자 정보 조회
  const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const kakaoUser = await userRes.json();

  const user = {
    id: String(kakaoUser.id),
    nickname: kakaoUser.kakao_account?.profile?.nickname ?? "호스트",
    profile_image: kakaoUser.kakao_account?.profile?.profile_image_url ?? "",
  };

  return NextResponse.json(user);
}
