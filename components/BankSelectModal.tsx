"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Bank {
  name: string;
  // app-icon PNGs: display as-is (already colored square icons)
  // svg: white vector on colored bg (bankmeister FSS standard)
  // svgColored: colored SVG on white/colored bg
  img?: string;        // PNG app icon — display directly, no bg color needed
  svg?: string;        // white SVG — needs bg color
  svgColored?: string; // colored SVG — display on neutral bg
  bg?: string;         // background color (for svg / fallback)
  label?: string;      // text fallback
  dark?: boolean;      // dark text on light bg (카카오뱅크 etc)
}

const BANKS: Bank[] = [
  { name: "카카오뱅크",       img: "/banks/kakaobank.png" },
  { name: "국민은행",         svg: "/banks/004.svg",  bg: "#FFBC00" },
  { name: "기업은행",         svg: "/banks/003.svg",  bg: "#1D4ED8" },
  { name: "농협은행",         svg: "/banks/011.svg",  bg: "#007B40" },
  { name: "신한은행",         svg: "/banks/088.svg",  bg: "#0046FF" },
  { name: "iM뱅크",           img: "/banks/im.png" },
  { name: "산업은행",         svg: "/banks/002.svg",  bg: "#003087" },
  { name: "우리은행",         svg: "/banks/020.svg",  bg: "#0066B3" },
  { name: "한국씨티은행",     svg: "/banks/027.svg",  bg: "#003B8E" },
  { name: "하나은행",         svg: "/banks/081.svg",  bg: "#009B77" },
  { name: "SC제일은행",       svg: "/banks/023.svg",  bg: "#1E6F5C" },
  { name: "경남은행",         svg: "/banks/039.svg",  bg: "#C8102E" },
  { name: "광주은행",         img: "/banks/gwangju.png" },
  { name: "도이치은행",       svgColored: "/banks/deutsche.svg", bg: "#0018A8" },
  { name: "뱅크오브아메리카", svg: "/banks/boa.svg",  bg: "#C8102E" },
  { name: "부산은행",         svg: "/banks/032.svg",  bg: "#C8102E" },
  { name: "산림조합중앙회",   img: "/banks/nfcf.png" },
  { name: "저축은행",         svg: "/banks/050.svg",  bg: "#388E3C" },
  { name: "새마을금고",       svg: "/banks/045.svg",  bg: "#00ACC1" },
  { name: "수협",             svg: "/banks/007.svg",  bg: "#006699" },
  { name: "신협중앙회",       svg: "/banks/048.svg",  bg: "#00796B" },
  { name: "우체국",           svg: "/banks/071.svg",  bg: "#E65100" },
  { name: "전북은행",         img: "/banks/jeonbuk.png" },
  { name: "제주은행",         svg: "/banks/035.svg",  bg: "#0277BD" },
  { name: "중국건설은행",     svgColored: "/banks/ccb.svg", bg: "#1565C0" },
  { name: "중국공상은행",     img: "/banks/icbc.png" },
  { name: "중국은행",         svgColored: "/banks/boc.svg", bg: "#C8102E" },
  { name: "BNP파리바은행",    img: "/banks/bnp.png" },
  { name: "HSBC은행",         svg: "/banks/hsbc.svg", bg: "#DB0011" },
  { name: "JP모간체이스은행", img: "/banks/jpmorgan.png" },
  { name: "케이뱅크",         svg: "/banks/090.svg",  bg: "#1A237E" },
  { name: "토스뱅크",         svg: "/banks/092.svg",  bg: "#4285F4" },
];

interface Props {
  onSelect: (name: string) => void;
  onClose: () => void;
}

export default function BankSelectModal({ onSelect, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40"
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
              {bank.img ? (
                <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bank.img} alt={bank.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ backgroundColor: bank.bg ?? "#6B7280" }}
                >
                  {(bank.svg || bank.svgColored) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(bank.svg ?? bank.svgColored)!}
                      alt={bank.name}
                      className="w-9 h-9 object-contain"
                      style={bank.svg ? { filter: "brightness(0) invert(1)" } : undefined}
                    />
                  ) : (
                    <span className="text-[11px] font-bold text-white text-center px-1 leading-tight">
                      {bank.label}
                    </span>
                  )}
                </div>
              )}
              <span className="text-[11px] text-gray-700 text-center leading-tight w-full px-0.5">{bank.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
