"use client";

interface Bank {
  name: string;
  bg: string;
  svg?: string;    // /banks/XXX.svg — white SVG on colored bg
  label?: string;  // fallback text (no svg)
  dark?: boolean;  // dark label text (e.g. 카카오뱅크 yellow bg)
}

const BANKS: Bank[] = [
  { name: "카카오뱅크",       bg: "#FEE500", svg: "/banks/089.svg", dark: true },
  { name: "국민은행",         bg: "#FFBC00", svg: "/banks/004.svg" },
  { name: "기업은행",         bg: "#1D4ED8", svg: "/banks/003.svg" },
  { name: "농협은행",         bg: "#007B40", svg: "/banks/011.svg" },
  { name: "신한은행",         bg: "#0046FF", svg: "/banks/088.svg" },
  { name: "iM뱅크",          bg: "#00A99D", label: "iM" },
  { name: "산업은행",         bg: "#003087", svg: "/banks/002.svg" },
  { name: "우리은행",         bg: "#0066B3", svg: "/banks/020.svg" },
  { name: "한국씨티은행",     bg: "#003B8E", svg: "/banks/027.svg" },
  { name: "하나은행",         bg: "#009B77", svg: "/banks/081.svg" },
  { name: "SC제일은행",       bg: "#1E6F5C", svg: "/banks/023.svg" },
  { name: "경남은행",         bg: "#C8102E", svg: "/banks/039.svg" },
  { name: "광주은행",         bg: "#003087", label: "광주" },
  { name: "도이치은행",       bg: "#003366", label: "DB" },
  { name: "뱅크오브아메리카", bg: "#C8102E", label: "BoA" },
  { name: "부산은행",         bg: "#C8102E", svg: "/banks/032.svg" },
  { name: "산림조합중앙회",   bg: "#1B5E20", label: "산림" },
  { name: "저축은행",         bg: "#388E3C", svg: "/banks/050.svg" },
  { name: "새마을금고",       bg: "#00ACC1", svg: "/banks/045.svg" },
  { name: "수협",             bg: "#006699", svg: "/banks/007.svg" },
  { name: "신협중앙회",       bg: "#00796B", svg: "/banks/048.svg" },
  { name: "우체국",           bg: "#E65100", svg: "/banks/071.svg" },
  { name: "전북은행",         bg: "#1565C0", label: "JB" },
  { name: "제주은행",         bg: "#0277BD", svg: "/banks/035.svg" },
  { name: "중국건설은행",     bg: "#1565C0", label: "CCB" },
  { name: "중국공상은행",     bg: "#C8102E", label: "ICBC" },
  { name: "중국은행",         bg: "#B71C1C", label: "BOC" },
  { name: "BNP파리바은행",    bg: "#00965E", label: "BNP" },
  { name: "HSBC은행",         bg: "#DB0011", label: "HSBC" },
  { name: "JP모간체이스은행", bg: "#003087", label: "JP" },
  { name: "케이뱅크",         bg: "#1A237E", svg: "/banks/090.svg" },
  { name: "토스뱅크",         bg: "#4285F4", svg: "/banks/092.svg" },
];

interface Props {
  onSelect: (name: string) => void;
  onClose: () => void;
}

export default function BankSelectModal({ onSelect, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl px-4 pt-5 pb-10 max-h-[82vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 shrink-0" />
        <p className="text-base font-bold text-gray-900 mb-5 text-center shrink-0">은행 선택</p>

        <div className="overflow-y-auto grid grid-cols-4 gap-y-5 gap-x-2 pb-2">
          {BANKS.map((bank) => (
            <button
              key={bank.name}
              type="button"
              onClick={() => { onSelect(bank.name); onClose(); }}
              className="flex flex-col items-center gap-1.5 active:opacity-60 transition-opacity"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ backgroundColor: bank.bg }}
              >
                {bank.svg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bank.svg}
                    alt={bank.name}
                    className="w-9 h-9 object-contain"
                    style={bank.dark ? { filter: "brightness(0)" } : undefined}
                  />
                ) : (
                  <span
                    className="text-[11px] font-bold leading-tight text-center px-1"
                    style={{ color: bank.dark ? "#3A1D1D" : "#fff" }}
                  >
                    {bank.label}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-700 text-center leading-tight w-full px-0.5">{bank.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
