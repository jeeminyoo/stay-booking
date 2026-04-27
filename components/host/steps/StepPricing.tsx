"use client";

import { useState } from "react";
import { PropertyDraft, RoomDraft, SpecialPriceDraft } from "@/lib/types";

interface Props {
  draft: PropertyDraft;
  onChange: (updates: Partial<PropertyDraft>) => void;
  errors: Record<string, string>;
}

function PriceInput({ value, onChange, placeholder }: { value: number; onChange: (v: number) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={value === 0 ? "" : value.toLocaleString()}
        onChange={(e) => {
          const raw = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
          onChange(raw === "" ? 0 : parseInt(raw));
        }}
        placeholder={placeholder ?? "0"}
        className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-right pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
    </div>
  );
}

// 요일별 요금 행
function DayPriceRow({ label, sub, value, onChange, placeholder }: { label: string; sub?: string; value: number; onChange: (v: number) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-20 shrink-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <div className="flex-1">
        <PriceInput value={value} onChange={onChange} placeholder={placeholder} />
      </div>
    </div>
  );
}

const NEW_SPECIAL = (): SpecialPriceDraft => ({
  start_date: "",
  end_date: "",
  weekday_price: 0,
  friday_price: 0,
  saturday_price: 0,
  sunday_price: 0,
});

export default function StepPricing({ draft, onChange, errors }: Props) {
  const [activeRoom, setActiveRoom] = useState(0);
  const [samePrice, setSamePrice] = useState(false);
  const rooms = draft.rooms;

  function updateRoom(idx: number, updates: Partial<RoomDraft>) {
    onChange({ rooms: rooms.map((r, i) => (i === idx ? { ...r, ...updates } : r)) });
  }

  function addSpecialPrice(roomIdx: number) {
    const room = rooms[roomIdx];
    updateRoom(roomIdx, { special_prices: [...room.special_prices, NEW_SPECIAL()] });
  }

  function updateSpecialPrice(roomIdx: number, spIdx: number, updates: Partial<SpecialPriceDraft>) {
    const next = rooms[roomIdx].special_prices.map((sp, i) => (i === spIdx ? { ...sp, ...updates } : sp));
    updateRoom(roomIdx, { special_prices: next });
  }

  function deleteSpecialPrice(roomIdx: number, spIdx: number) {
    updateRoom(roomIdx, { special_prices: rooms[roomIdx].special_prices.filter((_, i) => i !== spIdx) });
  }

  const room = rooms[activeRoom];

  return (
    <div className="space-y-5 w-full">
      {/* 객실 탭 */}
      {rooms.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {rooms.map((r, idx) => (
            <button key={idx} type="button" onClick={() => setActiveRoom(idx)}
              className={`shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors
                ${activeRoom === idx ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {r.name || `객실 ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* 기본 요금 */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h3 className="text-sm font-semibold text-gray-900">기본 요금</h3>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => {
                const next = !samePrice;
                setSamePrice(next);
                if (next) {
                  updateRoom(activeRoom, {
                    friday_price: room.weekday_price,
                    weekend_price: room.weekday_price,
                    sunday_price: room.weekday_price,
                  });
                }
              }}
              className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${samePrice ? "bg-indigo-500" : "bg-gray-200"}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${samePrice ? "translate-x-4" : "translate-x-0"}`} />
            </div>
            <span className="text-xs text-gray-500">모든 요일 동일</span>
          </label>
        </div>

        <div className="px-5 pb-4">
          {samePrice ? (
            <PriceInput value={room.weekday_price} onChange={(v) =>
              updateRoom(activeRoom, { weekday_price: v, friday_price: v, weekend_price: v, sunday_price: v })} />
          ) : (
            <div>
              <DayPriceRow label="월 – 목" value={room.weekday_price}
                onChange={(v) => updateRoom(activeRoom, { weekday_price: v })} />
              <DayPriceRow label="금요일" value={room.friday_price}
                onChange={(v) => updateRoom(activeRoom, { friday_price: v })} />
              <DayPriceRow label="토요일" sub="공휴일 포함" value={room.weekend_price}
                onChange={(v) => updateRoom(activeRoom, { weekend_price: v })} />
              <DayPriceRow label="일요일" value={room.sunday_price}
                onChange={(v) => updateRoom(activeRoom, { sunday_price: v })} />
            </div>
          )}
        </div>

        {errors[`room_${activeRoom}_price`] && (
          <p className="text-xs text-red-500 px-5 pb-3">{errors[`room_${activeRoom}_price`]}</p>
        )}
      </div>

      {/* 추가 인원 요금 */}
      {room.max_guests > room.base_guests && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-0.5">추가 인원 요금</h3>
          <p className="text-xs text-gray-400 mb-4">기준 인원 {room.base_guests}명 초과 시 · 1인당 · 1박</p>
          <div className="space-y-3">
            <DayPriceRow label="성인" placeholder="0 (무료)" onChange={(v) => updateRoom(activeRoom, { extra_adult_price: v })} value={room.extra_adult_price} />
            <DayPriceRow label="어린이" placeholder="0 (무료)" onChange={(v) => updateRoom(activeRoom, { extra_child_price: v })} value={room.extra_child_price} />
          </div>
        </div>
      )}

      {/* 시즌 요금 */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex items-start justify-between px-5 pt-4 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">시즌 요금</h3>
            <p className="text-xs text-gray-400 mt-0.5">특정 기간에 적용되는 별도 요금 (기본 요금 대체)</p>
          </div>
          <button type="button" onClick={() => addSpecialPrice(activeRoom)}
            className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors shrink-0">
            + 추가
          </button>
        </div>

        {room.special_prices.length === 0 ? (
          <div className="mx-5 mb-5 text-center py-5 bg-gray-50 rounded-xl text-xs text-gray-400">
            등록된 시즌 요금이 없습니다
          </div>
        ) : (
          <div className="space-y-3 px-5 pb-5">
            {room.special_prices.map((sp, spIdx) => (
              <div key={spIdx} className="border border-gray-100 rounded-xl overflow-hidden">
                {/* 기간 */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-500">적용 기간</p>
                    <button type="button" onClick={() => deleteSpecialPrice(activeRoom, spIdx)}
                      className="text-red-400 hover:text-red-600 text-lg transition-colors">×</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 mb-1">시작일</p>
                      <input type="date" value={sp.start_date}
                        onChange={(e) => updateSpecialPrice(activeRoom, spIdx, { start_date: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white" />
                    </div>
                    <span className="text-gray-300 text-sm mt-4">–</span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 mb-1">종료일</p>
                      <input type="date" value={sp.end_date}
                        onChange={(e) => updateSpecialPrice(activeRoom, spIdx, { end_date: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white" />
                    </div>
                  </div>
                </div>
                {/* 요금 */}
                <div className="px-4 py-2">
                  <DayPriceRow label="월 – 목" value={sp.weekday_price}
                    onChange={(v) => updateSpecialPrice(activeRoom, spIdx, { weekday_price: v })} />
                  <DayPriceRow label="금요일" value={sp.friday_price}
                    onChange={(v) => updateSpecialPrice(activeRoom, spIdx, { friday_price: v })} />
                  <DayPriceRow label="토요일" sub="공휴일 포함" value={sp.saturday_price}
                    onChange={(v) => updateSpecialPrice(activeRoom, spIdx, { saturday_price: v })} />
                  <DayPriceRow label="일요일" value={sp.sunday_price}
                    onChange={(v) => updateSpecialPrice(activeRoom, spIdx, { sunday_price: v })} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
