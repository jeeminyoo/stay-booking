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
    <div className="flex items-center justify-between py-3.5">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 text-lg disabled:opacity-30 hover:border-gray-400 active:bg-gray-100 transition-colors shrink-0"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-bold text-gray-900 tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 text-lg disabled:opacity-30 hover:border-gray-400 active:bg-gray-100 transition-colors shrink-0"
        >
          +
        </button>
      </div>
    </div>
  );
}
