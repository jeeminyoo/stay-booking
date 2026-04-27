"use client";

import { useEffect, useState } from "react";

interface Props {
  deadline: string;
  onExpire: () => void;
}

export default function PaymentTimer({ deadline, onExpire }: Props) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      setRemaining(Math.max(0, diff));
      if (diff <= 0) onExpire();
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  const totalSeconds = Math.floor(remaining / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const isOver24h = remaining >= 24 * 60 * 60 * 1000;
  const isUrgent  = remaining < 5 * 60 * 1000;

  const display = isOver24h
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
