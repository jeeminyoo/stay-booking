"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setUser } from "@/lib/auth";

function KakaoCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      router.replace("/host");
      return;
    }

    fetch(`/api/auth/kakao?code=${code}`)
      .then((res) => res.json())
      .then((user) => {
        if (user.id) {
          setUser(user);
          router.replace("/host");
        } else {
          console.error("Kakao auth failed", user);
          router.replace("/host");
        }
      })
      .catch(() => router.replace("/host"));
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">카카오 로그인 처리 중...</p>
    </div>
  );
}

export default function KakaoCallbackPage() {
  return (
    <Suspense>
      <KakaoCallbackInner />
    </Suspense>
  );
}
