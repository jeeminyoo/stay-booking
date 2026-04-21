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

export default function StepPricing({ draft, onChange, errors }: Props) {
  const [activeRoom, setActiveRoom] = useState(0);
  const [samePrice, setSamePrice] = useState(false);
  const rooms = draft.rooms;

  function updateRoom(idx: number, updates: Partial<RoomDraft>) {
    onChange({ rooms: rooms.map((r, i) => (i === idx ? { ...r, ...updates } : r)) });
  }

  function addSpecialPrice(roomIdx: number) {
    const room = rooms[roomIdx];
    const sp: SpecialPriceDraft = { start_date: "", end_date: "", extra_amount: 0 };
    updateRoom(roomIdx, { special_prices: [...room.special_prices, sp] });
  }

  function updateSpecialPrice(roomIdx: number, spIdx: number, updates: Partial<SpecialPriceDraft>) {
    const next = rooms[roomIdx].special_prices.map((sp, i) => (i === spIdx ? { ...sp, ...updates } : sp));
    updateRoom(roomIdx, { special_prices: next });
  }

  function deleteSpecialPrice(roomIdx: number, spIdx: number) {
    updateRoom(roomIdx, { special_prices: rooms[roomIdx].special_prices.filter((_, i) => i !== spIdx) });
  }

  const room = rooms[activeRoom];
  const labelClass = "text-xs font-medium text-gray-500 mb-1 block";

  return (
    <div className="space-y-5 w-full">
      {/* 객실 탭 */}
      {rooms.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {rooms.map((r, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveRoom(idx)}
              className={`shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                activeRoom === idx
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {r.name || `객실 ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* 기본 요금 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">기본 요금</h3>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => {
                const next = !samePrice;
                setSamePrice(next);
                if (next) {
                  updateRoom(activeRoom, {
                    weekend_price: room.weekday_price,
                    sunday_price: room.weekday_price,
                  });
                }
              }}
              className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${samePrice ? "bg-indigo-500" : "bg-gray-200"}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${samePrice ? "translate-x-4" : "translate-x-0"}`} />
            </div>
            <span className="text-xs text-gray-500">모든 요일 동일</span>
          </label>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{samePrice ? "전체 요일" : "주중 (월~목)"}</label>
            <PriceInput value={room.weekday_price} onChange={(v) => {
              updateRoom(activeRoom, samePrice
                ? { weekday_price: v, weekend_price: v, sunday_price: v }
                : { weekday_price: v });
            }} placeholder="0" />
          </div>
          {!samePrice && (
            <>
              <div>
                <label className={labelClass}>주말 (금,토) · 공휴일</label>
                <PriceInput value={room.weekend_price}
                  onChange={(v) => updateRoom(activeRoom, { weekend_price: v })} placeholder="0" />
              </div>
              <div>
                <label className={labelClass}>일요일</label>
                <PriceInput value={room.sunday_price}
                  onChange={(v) => updateRoom(activeRoom, { sunday_price: v })} placeholder="0" />
              </div>
            </>
          )}
        </div>
        {errors[`room_${activeRoom}_price`] && (
          <p className="text-xs text-red-500 mt-2">{errors[`room_${activeRoom}_price`]}</p>
        )}
      </div>

      {/* 추가 인원 요금 — 최대인원 > 기준인원일 때만 표시 */}
      {room.max_guests > room.base_guests && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">추가 인원 요금</h3>
          <p className="text-xs text-gray-400 mb-4">기준 인원 {room.base_guests}명 초과 시 · 1인당 · 1박 기준</p>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>성인 1인당</label>
              <PriceInput value={room.extra_adult_price} onChange={(v) => updateRoom(activeRoom, { extra_adult_price: v })} placeholder="0" />
            </div>
            <div>
              <label className={labelClass}>어린이 1인당</label>
              <PriceInput value={room.extra_child_price} onChange={(v) => updateRoom(activeRoom, { extra_child_price: v })} placeholder="0" />
            </div>
          </div>
        </div>
      )}

      {/* 시즌 추가 요금 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">시즌 추가 요금</h3>
            <p className="text-xs text-gray-400 mt-0.5">특정 기간에 기본 요금에 추가되는 금액</p>
          </div>
          <button
            type="button"
            onClick={() => addSpecialPrice(activeRoom)}
            className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors shrink-0"
          >
            + 추가
          </button>
        </div>

        {room.special_prices.length === 0 ? (
          <div className="text-center py-5 bg-gray-50 rounded-xl text-xs text-gray-400">
            등록된 시즌 요금이 없습니다
          </div>
        ) : (
          <div className="space-y-3">
            {room.special_prices.map((sp, spIdx) => (
              <div key={spIdx} className="p-3 bg-gray-50 rounded-xl space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={labelClass}>시작일</label>
                    <input type="date" value={sp.start_date} onChange={(e) => updateSpecialPrice(activeRoom, spIdx, { start_date: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <label className={labelClass}>종료일</label>
                    <input type="date" value={sp.end_date} onChange={(e) => updateSpecialPrice(activeRoom, spIdx, { end_date: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                  </div>
                  <button type="button" onClick={() => deleteSpecialPrice(activeRoom, spIdx)}
                    className="text-red-400 hover:text-red-600 text-lg self-end pb-1 transition-colors">×</button>
                </div>
                <div>
                  <label className={labelClass}>기본 요금에서 추가 (1박)</label>
                  <PriceInput value={sp.extra_amount} onChange={(v) => updateSpecialPrice(activeRoom, spIdx, { extra_amount: v })} placeholder="0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
