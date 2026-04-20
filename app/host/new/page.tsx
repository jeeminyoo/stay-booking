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

  if (!checked) return null;
  if (!user) return <KakaoLogin />;
  return <PropertyStepper user={user} />;
}
