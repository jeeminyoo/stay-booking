"use client";

import { useState } from "react";

interface Props {
  blockedDates: string[];
  onRangeSelect: (checkIn: string, checkOut: string) => void;
  selectedCheckIn: string;
  selectedCheckOut: string;
}

function toKSTDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function BookingCalendar({
  blockedDates,
  onRangeSelect,
  selectedCheckIn,
  selectedCheckOut,
}: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [hoverDate, setHoverDate] = useState<string>("");

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const blockedSet = new Set(blockedDates);

  function isBlocked(dateStr: string) {
    return blockedSet.has(dateStr);
  }

  function isPast(dateStr: string) {
    return dateStr < toKSTDateString(today);
  }

  function isInRange(dateStr: string) {
    const end = hoverDate || selectedCheckOut;
    if (!selectedCheckIn || !end) return false;
    const [s, e] = selectedCheckIn < end
      ? [selectedCheckIn, end]
      : [end, selectedCheckIn];
    return dateStr > s && dateStr < e;
  }

  function handleClick(dateStr: string) {
    if (isBlocked(dateStr) || isPast(dateStr)) return;

    if (!selectedCheckIn || (selectedCheckIn && selectedCheckOut)) {
      onRangeSelect(dateStr, "");
    } else {
      if (dateStr === selectedCheckIn) {
        onRangeSelect("", "");
        return;
      }
      const [checkIn, checkOut] =
        dateStr > selectedCheckIn
          ? [selectedCheckIn, dateStr]
          : [dateStr, selectedCheckIn];

      // block if any date in range is blocked
      const cur = new Date(checkIn);
      const end = new Date(checkOut);
      let hasBlocked = false;
      while (cur < end) {
        if (blockedSet.has(toKSTDateString(cur))) {
          hasBlocked = true;
          break;
        }
        cur.setDate(cur.getDate() + 1);
      }
      if (hasBlocked) {
        onRangeSelect(dateStr, "");
      } else {
        onRangeSelect(checkIn, checkOut);
      }
    }
  }

  const days: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="select-none">
      {/* Month Nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
          ‹
        </button>
        <span className="font-semibold text-gray-800">
          {year}년 {month + 1}월
        </span>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600">
          ›
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekdays.map((w, i) => (
          <div
            key={w}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((dateStr, idx) => {
          if (!dateStr) {
            return <div key={`empty-${idx}`} />;
          }

          const blocked = isBlocked(dateStr);
          const past = isPast(dateStr);
          const isCheckIn = dateStr === selectedCheckIn;
          const isCheckOut = dateStr === selectedCheckOut;
          const inRange = isInRange(dateStr);
          const dayNum = parseInt(dateStr.split("-")[2]);
          const dayOfWeek = (firstDay + dayNum - 1) % 7;

          let cellClass =
            "relative flex items-center justify-center h-9 text-sm transition-colors";

          if (blocked || past) {
            cellClass += " text-gray-300 cursor-not-allowed line-through";
          } else if (isCheckIn || isCheckOut) {
            cellClass += " bg-indigo-600 text-white font-bold rounded-full cursor-pointer z-10";
          } else if (inRange) {
            cellClass += " bg-indigo-100 text-indigo-800 cursor-pointer";
            if (isCheckIn) cellClass += " rounded-l-full";
            if (isCheckOut) cellClass += " rounded-r-full";
          } else {
            cellClass += " hover:bg-gray-100 rounded-full cursor-pointer";
            if (dayOfWeek === 0) cellClass += " text-red-500";
            else if (dayOfWeek === 6) cellClass += " text-blue-500";
            else cellClass += " text-gray-800";
          }

          return (
            <div
              key={dateStr}
              className={cellClass}
              onClick={() => handleClick(dateStr)}
              onMouseEnter={() => {
                if (selectedCheckIn && !selectedCheckOut) setHoverDate(dateStr);
              }}
              onMouseLeave={() => setHoverDate("")}
            >
              {dayNum}
              {blocked && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-300" />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-indigo-600" />
          <span>선택</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-indigo-100" />
          <span>기간</span>
        </div>
        <div className="flex items-center gap-1 text-gray-300">
          <div className="w-3 h-3 rounded-full bg-gray-200" />
          <span>예약불가</span>
        </div>
      </div>
    </div>
  );
}
