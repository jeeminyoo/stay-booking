"use client";

interface Props {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  label: string;
  unit?: string;
}

export default function NumberInput({ value, min = 0, max = 99, onChange, label, unit }: Props) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 text-base disabled:opacity-30 hover:bg-gray-100 transition-colors"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-semibold text-gray-900">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 text-base disabled:opacity-30 hover:bg-gray-100 transition-colors"
        >
          +
        </button>
      </div>
      {unit && <span className="text-xs text-gray-400">{unit}</span>}
    </div>
  );
}
