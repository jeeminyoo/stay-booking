"use client";

interface Props {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  label: string;
  description?: string;
}

export default function NumberInput({ value, min = 0, max = 99, onChange, label, description }: Props) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 pr-3">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-base disabled:opacity-30 hover:bg-gray-200 active:bg-gray-300 transition-colors shrink-0"
        >
          −
        </button>
        <span className="w-5 text-center text-sm font-bold text-gray-900 tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-base disabled:opacity-30 hover:bg-gray-200 active:bg-gray-300 transition-colors shrink-0"
        >
          +
        </button>
      </div>
    </div>
  );
}
