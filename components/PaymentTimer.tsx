"use client";

import { useEffect, useState } from "react";

interface Props {
  deadline: string;
  onExpire: () => void;
}

export default function PaymentTimer({ deadline, onExpire }: Props) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const diff0 = new Date(deadline).getTime() - Date.now();
    if (diff0 <= 0) { setRemaining(0); onExpire(); return; }
    setRemaining(diff0);
    const interval = setInterval(() => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining(0);
        clearInterval(interval);
        onExpire();
        return;
      }
      setRemaining(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  const totalSeconds = Math.floor(remaining / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const isOver1h  = remaining >= 60 * 60 * 1000;
  const isUrgent  = remaining < 5 * 60 * 1000;

  const display = isOver1h
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${
      isUrgent ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
    }`}>
      <span className="text-sm font-sans font-normal">입금 마감까지</span>
      <span>{display}</span>
    </div>
  );
}
