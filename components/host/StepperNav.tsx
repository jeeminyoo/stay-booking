"use client";

const STEPS = [
  { n: 1, label: "기본 정보" },
  { n: 2, label: "객실 설정" },
  { n: 3, label: "요금 설정" },
  { n: 4, label: "정책 & 링크" },
];

interface Props {
  current: number;
  onGoTo: (step: number) => void;
}

export default function StepperNav({ current, onGoTo }: Props) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, idx) => (
        <div key={s.n} className="flex items-center">
          <button
            type="button"
            onClick={() => s.n < current && onGoTo(s.n)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              s.n === current
                ? "bg-indigo-600 text-white"
                : s.n < current
                ? "text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                : "text-gray-400 cursor-default"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                s.n === current
                  ? "bg-white text-indigo-600"
                  : s.n < current
                  ? "bg-indigo-100 text-indigo-600"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {s.n < current ? "✓" : s.n}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
          {idx < STEPS.length - 1 && (
            <div className={`w-6 h-0.5 mx-1 ${s.n < current ? "bg-indigo-300" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
