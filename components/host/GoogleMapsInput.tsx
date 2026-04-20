"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onSelect: (address: string, lat: number, lng: number) => void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
    initGoogleMaps?: () => void;
  }
}

export default function GoogleMapsInput({ value, onSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || apiKey === "your_google_maps_api_key") {
      setNoKey(true);
      return;
    }

    function init() {
      if (!inputRef.current) return;
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "kr" },
        fields: ["formatted_address", "geometry"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (place.formatted_address && place.geometry?.location) {
          onSelect(
            place.formatted_address,
            place.geometry.location.lat(),
            place.geometry.location.lng()
          );
        }
      });
      setLoaded(true);
    }

    if (typeof window.google !== "undefined") {
      init();
      return;
    }

    window.initGoogleMaps = init;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ko&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      delete window.initGoogleMaps;
    };
  }, [apiKey, onSelect]);

  if (noKey) {
    return (
      <div className="space-y-2">
        <input
          type="text"
          defaultValue={value}
          onChange={(e) => onSelect(e.target.value, 0, 0)}
          placeholder="주소를 입력해주세요 (예: 제주특별자치도 서귀포시 성산읍)"
          className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <p className="text-xs text-orange-500">
          구글 맵스 API 키를 설정하면 주소 자동완성이 활성화됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        placeholder="도로명 주소로 검색해주세요"
        className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      {!loaded && (
        <p className="text-xs text-gray-400 mt-2">지도 로딩 중...</p>
      )}
    </div>
  );
}
