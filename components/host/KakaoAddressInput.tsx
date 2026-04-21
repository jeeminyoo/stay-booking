"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onSelect: (address: string, lat: number, lng: number) => void;
}

declare global {
  interface Window {
    daum: {
      Postcode: new (opts: {
        oncomplete: (data: { roadAddress: string; jibunAddress: string }) => void;
      }) => { open: () => void };
    };
  }
}

export default function KakaoAddressInput({ value, onSelect }: Props) {
  const restKey = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
  const [scriptReady, setScriptReady] = useState(false);
  const [baseAddress, setBaseAddress] = useState(value || "");
  const [detail, setDetail] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [geocoding, setGeocoding] = useState(false);
  const detailRef = useRef<HTMLInputElement>(null);

  // Load Daum Postcode script once
  useEffect(() => {
    if (typeof window !== "undefined" && (window as unknown as { daum?: unknown }).daum) {
      setScriptReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => setScriptReady(true);
    document.head.appendChild(script);
  }, []);

  async function geocode(addr: string): Promise<{ lat: number; lng: number }> {
    if (!restKey || restKey === "your_kakao_rest_api_key") return { lat: 0, lng: 0 };
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(addr)}`,
        { headers: { Authorization: `KakaoAK ${restKey}` } }
      );
      const json = await res.json();
      if (json.documents?.length > 0) {
        return { lat: parseFloat(json.documents[0].y), lng: parseFloat(json.documents[0].x) };
      }
    } catch {}
    return { lat: 0, lng: 0 };
  }

  function openPostcode() {
    if (!scriptReady || !window.daum) return;
    new window.daum.Postcode({
      oncomplete: async (data) => {
        const addr = data.jibunAddress || data.roadAddress;
        setBaseAddress(addr);
        setDetail("");
        setGeocoding(true);
        const c = await geocode(addr);
        setGeocoding(false);
        setCoords(c);
        onSelect(addr, c.lat, c.lng);
        setTimeout(() => detailRef.current?.focus(), 100);
      },
    }).open();
  }

  function handleDetailChange(v: string) {
    setDetail(v);
    if (baseAddress) {
      onSelect(v ? `${baseAddress} ${v}` : baseAddress, coords.lat, coords.lng);
    }
  }

  return (
    <div className="space-y-2.5 w-full">
      {/* Base address button / display */}
      {baseAddress ? (
        <div className="flex items-center gap-2 border border-indigo-300 bg-indigo-50 rounded-xl px-4 py-3.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500 shrink-0">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <p className="flex-1 text-sm text-gray-800 font-medium">{baseAddress}</p>
          {geocoding ? (
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
          ) : (
            <button type="button" onClick={openPostcode}
              className="text-xs text-indigo-500 font-semibold shrink-0 hover:text-indigo-700 transition-colors">
              변경
            </button>
          )}
        </div>
      ) : (
        <button type="button" onClick={openPostcode} disabled={!scriptReady}
          className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3.5 text-left hover:border-indigo-300 hover:bg-indigo-50 transition-all disabled:opacity-50 group">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-indigo-500 transition-colors shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span className={`text-base ${scriptReady ? "text-gray-400" : "text-gray-300"}`}>
            {scriptReady ? "도로명 주소 검색" : "주소 검색 로딩 중..."}
          </span>
        </button>
      )}

      {/* Detail address */}
      {baseAddress && (
        <input
          ref={detailRef}
          type="text"
          value={detail}
          onChange={(e) => handleDetailChange(e.target.value)}
          placeholder="상세 주소 입력 (동, 호수 등 · 선택사항)"
          className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-300"
        />
      )}
    </div>
  );
}
