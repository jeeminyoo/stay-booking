"use client";

import { useEffect, useState } from "react";
import { KakaoUser } from "@/lib/types";
import { getUser } from "@/lib/auth";
import KakaoLogin from "@/components/host/KakaoLogin";
import PropertyStepper from "./PropertyStepper";

export default function NewPropertyPage() {
  const [user, setUser] = useState<KakaoUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setChecked(true);
  }, []);

  if (!checked) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
    </div>
  );
  if (!user) return <KakaoLogin />;
  return <PropertyStepper user={user} />;
}
