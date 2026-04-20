"use client";

import { PropertyDraft, RoomDraft } from "@/lib/types";
import NumberInput from "@/components/host/NumberInput";
import ImageUpload from "@/components/host/ImageUpload";

interface Props {
  draft: PropertyDraft;
  onChange: (updates: Partial<PropertyDraft>) => void;
  errors: Record<string, string>;
}

const DEFAULT_ROOM = (): RoomDraft => ({
  name: "",
  max_guests: 1,
  base_guests: 1,
  max_infants: 0,
  bedrooms: 0,
  beds: 1,
  bathrooms: 1,
  image_url: "",
  weekday_price: 0,
  weekend_price: 0,
  sunday_price: 0,
  extra_adult_price: 0,
  extra_child_price: 0,
  special_prices: [],
});

export default function StepRooms({ draft, onChange, errors }: Props) {
  const rooms = draft.rooms;

  function updateRoom(idx: number, updates: Partial<RoomDraft>) {
    onChange({ rooms: rooms.map((r, i) => (i === idx ? { ...r, ...updates } : r)) });
  }

  function addRoom() {
    if (rooms.length >= 5) return;
    onChange({ rooms: [...rooms, DEFAULT_ROOM()] });
  }

  function removeRoom(idx: number) {
    if (rooms.length <= 1) return;
    onChange({ rooms: rooms.filter((_, i) => i !== idx) });
  }

  function copyFromFirst(idx: number) {
    const src = rooms[0];
    updateRoom(idx, {
      max_guests: src.max_guests,
      base_guests: src.base_guests,
      bedrooms: src.bedrooms,
      beds: src.beds,
      bathrooms: src.bathrooms,
      image_url: src.image_url,
    });
  }

  return (
    <div className="space-y-4 w-full">
      {rooms.map((room, idx) => (
        <div key={idx} className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                {idx + 1}
              </span>
              <input
                type="text"
                value={room.name}
                onChange={(e) => updateRoom(idx, { name: e.target.value })}
                className="text-sm font-semibold text-gray-800 border border-gray-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-400 bg-white w-36"
                placeholder="객실 이름"
              />
            </div>
            <div className="flex items-center gap-2">
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => copyFromFirst(idx)}
                  className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  1번 복사
                </button>
              )}
              {rooms.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRoom(idx)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  삭제
                </button>
              )}
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* 사진 */}
            <ImageUpload
              value={room.image_url}
              onChange={(url) => updateRoom(idx, { image_url: url })}
              aspectRatio="square"
              placeholder="객실 사진 선택"
            />

            {/* 인원 */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">인원 설정</p>
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl">
                <NumberInput
                  label="최대 인원"
                  unit="성인+어린이"
                  value={room.max_guests}
                  min={1}
                  max={99}
                  onChange={(v) => updateRoom(idx, { max_guests: v, base_guests: Math.min(room.base_guests, v) })}
                />
                <NumberInput
                  label="기준 인원"
                  unit="요금 포함"
                  value={room.base_guests}
                  min={1}
                  max={99}
                  onChange={(v) => updateRoom(idx, { base_guests: v })}
                />
                <NumberInput
                  label="유아 최대"
                  unit="요금 미포함"
                  value={room.max_infants ?? 0}
                  min={0}
                  max={99}
                  onChange={(v) => updateRoom(idx, { max_infants: v })}
                />
              </div>
            </div>

            {/* 시설 */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">시설</p>
              <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-xl">
                <NumberInput label="침실" value={room.bedrooms} min={0} max={10} onChange={(v) => updateRoom(idx, { bedrooms: v })} />
                <NumberInput label="침대" value={room.beds} min={1} max={20} onChange={(v) => updateRoom(idx, { beds: v })} />
                <NumberInput label="욕실" value={room.bathrooms} min={1} max={10} onChange={(v) => updateRoom(idx, { bathrooms: v })} />
              </div>
            </div>

            {errors[`room_${idx}_name`] && (
              <p className="text-xs text-red-500">{errors[`room_${idx}_name`]}</p>
            )}
          </div>
        </div>
      ))}

      {rooms.length < 5 && (
        <button
          type="button"
          onClick={addRoom}
          className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-4 text-sm font-medium text-gray-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          + 객실 추가 ({rooms.length}/5)
        </button>
      )}
    </div>
  );
}
